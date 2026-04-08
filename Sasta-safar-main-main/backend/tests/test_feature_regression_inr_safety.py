"""Regression tests for INR payments, India cities metadata, and driver preference persistence."""

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
    """Auth module: create driver+rider users and return tokens for integration tests."""
    suffix = uuid.uuid4().hex[:8]
    driver_payload = {
        "name": "TEST_FeatureDriver",
        "phone": f"88{suffix[:8]}",
        "email": f"test_feature_driver_{suffix}@example.com",
        "password": "testpass123",
    }
    rider_payload = {
        "name": "TEST_FeatureRider",
        "phone": f"77{suffix[:8]}",
        "email": f"test_feature_rider_{suffix}@example.com",
        "password": "testpass123",
    }

    driver_register = session.post(f"{base_url}/api/auth/register", json=driver_payload)
    assert driver_register.status_code == 200
    driver_data = driver_register.json()
    assert driver_data["user"]["email"] == driver_payload["email"]

    rider_register = session.post(f"{base_url}/api/auth/register", json=rider_payload)
    assert rider_register.status_code == 200
    rider_data = rider_register.json()
    assert rider_data["user"]["email"] == rider_payload["email"]

    return {
        "driver": {"token": driver_data["token"], "user": driver_data["user"]},
        "rider": {"token": rider_data["token"], "user": rider_data["user"]},
    }


def test_india_city_metadata_endpoint(base_url: str, session: requests.Session):
    """Metadata module: verify India city list endpoint returns a populated array."""
    response = session.get(f"{base_url}/api/metadata/india-cities")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 100
    assert any(city.lower() == "delhi" for city in data)


def test_create_ride_requires_valid_licence_number(base_url: str, session: requests.Session, users):
    """Ride module: posting should fail when driving licence number format is invalid."""
    response = session.post(
        f"{base_url}/api/rides",
        json={
            "from_city": "Jaipur",
            "to_city": "Delhi",
            "date": "2026-04-10",
            "time": "08:00",
            "seats_available": 2,
            "price_per_seat": 400,
            "driving_licence_number": "INVALID123",
            "vehicle_number": "UP32AB1234",
        },
        headers=_headers(users["driver"]["token"]),
    )
    assert response.status_code == 400
    assert "licence" in response.json()["detail"].lower()


def test_create_ride_requires_vehicle_number(base_url: str, session: requests.Session, users):
    """Ride module: posting should fail when vehicle number is empty."""
    response = session.post(
        f"{base_url}/api/rides",
        json={
            "from_city": "Jaipur",
            "to_city": "Delhi",
            "date": "2026-04-10",
            "time": "08:00",
            "seats_available": 2,
            "price_per_seat": 400,
            "driving_licence_number": "DL0120201234567",
            "vehicle_number": "  ",
        },
        headers=_headers(users["driver"]["token"]),
    )
    assert response.status_code == 400
    assert "vehicle number" in response.json()["detail"].lower()


def test_create_ride_and_driver_preferences_persist(base_url: str, session: requests.Session, users):
    """Ride + preferences modules: create ride then fetch persisted defaults via /driver/preferences."""
    ride_payload = {
        "from_city": "Lucknow",
        "to_city": "Kanpur",
        "date": "2026-04-12",
        "time": "10:30",
        "seats_available": 3,
        "price_per_seat": 325.5,
        "driving_licence_number": "UP3220211234567",
        "vehicle_number": "up32xy4321",
    }
    create_ride = session.post(
        f"{base_url}/api/rides",
        json=ride_payload,
        headers=_headers(users["driver"]["token"]),
    )
    assert create_ride.status_code == 200
    created = create_ride.json()
    assert created["vehicle_number"] == "UP32XY4321"

    prefs_response = session.get(
        f"{base_url}/api/driver/preferences",
        headers=_headers(users["driver"]["token"]),
    )
    assert prefs_response.status_code == 200
    prefs = prefs_response.json()
    assert prefs["driving_licence_number"] == "UP3220211234567"
    assert prefs["vehicle_number"] == "UP32XY4321"
    assert prefs["from_city"] == "Lucknow"
    assert prefs["to_city"] == "Kanpur"
    assert prefs["time"] == "10:30"
    assert prefs["seats_available"] == 3
    assert float(prefs["price_per_seat"]) == 325.5


def test_checkout_status_reports_inr_currency(base_url: str, session: requests.Session, users):
    """Payments module: create accepted request and verify checkout status currency is INR."""
    create_ride = session.post(
        f"{base_url}/api/rides",
        json={
            "from_city": "Pune",
            "to_city": "Mumbai",
            "date": "2026-04-15",
            "time": "09:45",
            "seats_available": 2,
            "price_per_seat": 500,
            "driving_licence_number": "MH1220211234567",
            "vehicle_number": "MH12AB1234",
        },
        headers=_headers(users["driver"]["token"]),
    )
    assert create_ride.status_code == 200
    ride = create_ride.json()

    create_request = session.post(
        f"{base_url}/api/requests",
        json={"ride_id": ride["id"], "offered_price": 450, "seats_requested": 1},
        headers=_headers(users["rider"]["token"]),
    )
    assert create_request.status_code == 200
    booking_request = create_request.json()

    decision = session.patch(
        f"{base_url}/api/requests/{booking_request['id']}/decision",
        json={"decision": "accept"},
        headers=_headers(users["driver"]["token"]),
    )
    assert decision.status_code == 200
    assert decision.json()["status"] == "accepted"

    checkout = session.post(
        f"{base_url}/api/payments/checkout/session",
        json={"request_id": booking_request["id"], "origin_url": base_url},
        headers=_headers(users["rider"]["token"]),
    )
    assert checkout.status_code == 200
    checkout_data = checkout.json()
    assert checkout_data["session_id"]

    status = session.get(
        f"{base_url}/api/payments/checkout/status/{checkout_data['session_id']}",
        headers=_headers(users["rider"]["token"]),
    )
    assert status.status_code == 200
    status_data = status.json()
    assert status_data["currency"].lower() == "inr"
    assert isinstance(status_data["amount"], (float, int))
