"""Regression tests for driving licence validation, persisted driver defaults, and safety eligibility lock state."""

import os
import uuid
from typing import Dict

import pytest
import requests


BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")


def _headers(token: str | None = None) -> Dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


@pytest.fixture(scope="session")
def base_url() -> str:
    if not BASE_URL:
        pytest.skip("REACT_APP_BACKEND_URL is not set")
    return BASE_URL.rstrip("/")


@pytest.fixture(scope="session")
def session() -> requests.Session:
    return requests.Session()


@pytest.fixture(scope="session")
def users(base_url: str, session: requests.Session):
    """Authentication module: register and login temporary driver/rider users for regression flows."""
    suffix = uuid.uuid4().hex[:8]

    driver_payload = {
        "name": "TEST_DL_Driver",
        "phone": f"8{suffix}",
        "email": f"test_dl_driver_{suffix}@example.com",
        "password": "testpass123",
    }
    rider_payload = {
        "name": "TEST_DL_Rider",
        "phone": f"9{suffix}",
        "email": f"test_dl_rider_{suffix}@example.com",
        "password": "testpass123",
    }

    driver_register = session.post(f"{base_url}/api/auth/register", json=driver_payload)
    assert driver_register.status_code == 200
    driver_register_data = driver_register.json()
    assert driver_register_data["user"]["email"] == driver_payload["email"]

    rider_register = session.post(f"{base_url}/api/auth/register", json=rider_payload)
    assert rider_register.status_code == 200
    rider_register_data = rider_register.json()
    assert rider_register_data["user"]["email"] == rider_payload["email"]

    driver_login = session.post(
        f"{base_url}/api/auth/login",
        json={"email": driver_payload["email"], "password": driver_payload["password"]},
    )
    assert driver_login.status_code == 200

    rider_login = session.post(
        f"{base_url}/api/auth/login",
        json={"email": rider_payload["email"], "password": rider_payload["password"]},
    )
    assert rider_login.status_code == 200

    return {
        "driver": {
            "token": driver_login.json()["token"],
            "user": driver_register_data["user"],
            "payload": driver_payload,
        },
        "rider": {
            "token": rider_login.json()["token"],
            "user": rider_register_data["user"],
            "payload": rider_payload,
        },
    }


def test_auth_me_returns_registered_user(base_url: str, session: requests.Session, users):
    """Auth module: verify /auth/me returns the signed-in driver profile."""
    response = session.get(
        f"{base_url}/api/auth/me",
        headers=_headers(users["driver"]["token"]),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == users["driver"]["payload"]["email"]
    assert data["name"] == users["driver"]["payload"]["name"]


def test_post_ride_rejects_invalid_driving_licence(base_url: str, session: requests.Session, users):
    """Ride module: invalid driving licence number must be rejected."""
    response = session.post(
        f"{base_url}/api/rides",
        json={
            "from_city": "Jaipur",
            "to_city": "Delhi",
            "date": "2026-04-10",
            "time": "08:00",
            "seats_available": 2,
            "price_per_seat": 450,
            "driving_licence_number": "INVALID123",
            "vehicle_number": "UP32AB1234",
        },
        headers=_headers(users["driver"]["token"]),
    )
    assert response.status_code == 400
    assert "invalid driving licence" in response.json()["detail"].lower()


def test_post_ride_requires_driving_licence_field_not_legacy_boolean(base_url: str, session: requests.Session, users):
    """Ride module: legacy has_driving_licence boolean is not accepted as replacement for licence number."""
    response = session.post(
        f"{base_url}/api/rides",
        json={
            "from_city": "Jaipur",
            "to_city": "Delhi",
            "date": "2026-04-11",
            "time": "09:00",
            "seats_available": 2,
            "price_per_seat": 450,
            "has_driving_licence": True,
            "vehicle_number": "UP32AB1234",
        },
        headers=_headers(users["driver"]["token"]),
    )
    assert response.status_code == 422
    detail = str(response.json()).lower()
    assert "driving_licence_number" in detail


def test_driver_preferences_persist_licence_and_vehicle(base_url: str, session: requests.Session, users):
    """Ride + preferences modules: create ride then verify persisted driver licence/vehicle defaults."""
    create_response = session.post(
        f"{base_url}/api/rides",
        json={
            "from_city": "Lucknow",
            "to_city": "Kanpur",
            "date": "2026-04-12",
            "time": "10:30",
            "seats_available": 3,
            "price_per_seat": 325.5,
            "driving_licence_number": "UP3220200012345",
            "vehicle_number": "up32xy4321",
        },
        headers=_headers(users["driver"]["token"]),
    )
    assert create_response.status_code == 200
    created = create_response.json()
    assert created["vehicle_number"] == "UP32XY4321"

    ride_id = created["id"]
    get_ride = session.get(f"{base_url}/api/rides/{ride_id}")
    assert get_ride.status_code == 200
    fetched = get_ride.json()
    assert fetched["from_city"] == "Lucknow"
    assert fetched["to_city"] == "Kanpur"
    assert float(fetched["price_per_seat"]) == 325.5

    prefs_response = session.get(
        f"{base_url}/api/driver/preferences",
        headers=_headers(users["driver"]["token"]),
    )
    assert prefs_response.status_code == 200
    prefs = prefs_response.json()
    assert prefs["driving_licence_number"] == "UP3220200012345"
    assert prefs["vehicle_number"] == "UP32XY4321"
    assert prefs["from_city"] == "Lucknow"
    assert prefs["to_city"] == "Kanpur"


def test_safety_eligibility_locked_without_paid_booked_ride(base_url: str, session: requests.Session, users):
    """Safety module: eligibility remains locked when no paid booked ride exists."""
    response = session.get(
        f"{base_url}/api/safety/eligibility",
        headers=_headers(users["rider"]["token"]),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is False
    assert "unlock" in data["reason"].lower()
    assert data.get("ride_id") is None
    assert data.get("seconds_to_start") in (None, 0)
