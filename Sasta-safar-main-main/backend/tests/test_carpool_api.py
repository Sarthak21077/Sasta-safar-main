"""Core API regression tests for auth, ride posting/search, booking flow, and payment polling."""

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
def users_and_tokens(base_url: str, session: requests.Session):
    """Auth module coverage: register + login for driver and rider accounts."""
    suffix = uuid.uuid4().hex[:8]
    driver_payload = {
        "name": "TEST_Driver",
        "phone": f"9000{suffix[:4]}",
        "email": f"test_driver_{suffix}@example.com",
        "password": "testpass123",
    }
    rider_payload = {
        "name": "TEST_Rider",
        "phone": f"9111{suffix[:4]}",
        "email": f"test_rider_{suffix}@example.com",
        "password": "testpass123",
    }

    driver_register = session.post(f"{base_url}/api/auth/register", json=driver_payload)
    assert driver_register.status_code == 200
    driver_data = driver_register.json()
    assert driver_data["user"]["email"] == driver_payload["email"]
    assert isinstance(driver_data["token"], str) and len(driver_data["token"]) > 10

    rider_register = session.post(f"{base_url}/api/auth/register", json=rider_payload)
    assert rider_register.status_code == 200
    rider_data = rider_register.json()
    assert rider_data["user"]["email"] == rider_payload["email"]
    assert isinstance(rider_data["token"], str) and len(rider_data["token"]) > 10

    driver_login = session.post(
        f"{base_url}/api/auth/login",
        json={"email": driver_payload["email"], "password": driver_payload["password"]},
    )
    assert driver_login.status_code == 200
    driver_token = driver_login.json()["token"]

    rider_login = session.post(
        f"{base_url}/api/auth/login",
        json={"email": rider_payload["email"], "password": rider_payload["password"]},
    )
    assert rider_login.status_code == 200
    rider_token = rider_login.json()["token"]

    return {
        "driver": {"payload": driver_payload, "token": driver_token, "user": driver_data["user"]},
        "rider": {"payload": rider_payload, "token": rider_token, "user": rider_data["user"]},
    }


@pytest.fixture(scope="session")
def ride_and_request(base_url: str, session: requests.Session, users_and_tokens):
    """Ride + request module coverage: post ride, search ride, send request, and driver decision."""
    driver_token = users_and_tokens["driver"]["token"]
    rider_token = users_and_tokens["rider"]["token"]
    suffix = uuid.uuid4().hex[:4]

    ride_payload = {
        "from_city": f"Pune{suffix}",
        "to_city": f"Mumbai{suffix}",
        "date": "2026-03-01",
        "time": "09:15",
        "seats_available": 3,
        "price_per_seat": 25.5,
    }
    create_ride = session.post(
        f"{base_url}/api/rides",
        json=ride_payload,
        headers=_headers(driver_token),
    )
    assert create_ride.status_code == 200
    ride_data = create_ride.json()
    assert ride_data["from_city"] == ride_payload["from_city"]
    assert ride_data["to_city"] == ride_payload["to_city"]
    assert ride_data["driver_id"] == users_and_tokens["driver"]["user"]["id"]
    ride_id = ride_data["id"]

    search = session.get(
        f"{base_url}/api/rides/search",
        params={"from_city": ride_payload["from_city"], "to_city": ride_payload["to_city"]},
    )
    assert search.status_code == 200
    search_data = search.json()
    assert any(item["id"] == ride_id for item in search_data)

    create_request = session.post(
        f"{base_url}/api/requests",
        json={"ride_id": ride_id, "offered_price": 20.0, "seats_requested": 1},
        headers=_headers(rider_token),
    )
    assert create_request.status_code == 200
    request_data = create_request.json()
    assert request_data["ride_id"] == ride_id
    assert request_data["status"] == "pending"
    request_id = request_data["id"]

    incoming = session.get(
        f"{base_url}/api/requests/incoming",
        headers=_headers(driver_token),
    )
    assert incoming.status_code == 200
    incoming_data = incoming.json()
    assert any(item["id"] == request_id for item in incoming_data)

    accept = session.patch(
        f"{base_url}/api/requests/{request_id}/decision",
        json={"decision": "accept"},
        headers=_headers(driver_token),
    )
    assert accept.status_code == 200
    accepted = accept.json()
    assert accepted["status"] == "accepted"
    assert accepted["payment_status"] == "pending_payment"

    mine = session.get(
        f"{base_url}/api/requests/mine",
        headers=_headers(rider_token),
    )
    assert mine.status_code == 200
    mine_data = mine.json()
    matched = next(item for item in mine_data if item["id"] == request_id)
    assert matched["status"] == "accepted"

    return {"ride_id": ride_id, "request_id": request_id}


def test_auth_me(base_url: str, session: requests.Session, users_and_tokens):
    response = session.get(
        f"{base_url}/api/auth/me",
        headers=_headers(users_and_tokens["driver"]["token"]),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == users_and_tokens["driver"]["payload"]["email"]


def test_duplicate_request_blocked(base_url: str, session: requests.Session, users_and_tokens, ride_and_request):
    response = session.post(
        f"{base_url}/api/requests",
        json={"ride_id": ride_and_request["ride_id"], "offered_price": 19.0, "seats_requested": 1},
        headers=_headers(users_and_tokens["rider"]["token"]),
    )
    assert response.status_code == 409
    assert "already requested" in response.json()["detail"].lower()


def test_checkout_session_and_status_poll(base_url: str, session: requests.Session, users_and_tokens, ride_and_request):
    """Payments module coverage: checkout session creation and status polling endpoint stability."""
    rider_token = users_and_tokens["rider"]["token"]
    driver_token = users_and_tokens["driver"]["token"]

    create_checkout = session.post(
        f"{base_url}/api/payments/checkout/session",
        json={
            "request_id": ride_and_request["request_id"],
            "origin_url": base_url,
        },
        headers=_headers(rider_token),
    )
    assert create_checkout.status_code == 200
    checkout_data = create_checkout.json()
    assert checkout_data["session_id"]
    assert checkout_data["checkout_url"].startswith("http")

    session_id = checkout_data["session_id"]
    status_poll = session.get(
        f"{base_url}/api/payments/checkout/status/{session_id}",
        headers=_headers(rider_token),
    )
    assert status_poll.status_code == 200
    poll_data = status_poll.json()
    assert poll_data["session_id"] == session_id
    assert isinstance(poll_data["payment_status"], str)
    assert isinstance(poll_data["status"], str)
    assert isinstance(poll_data["metadata"], dict)

    forbidden = session.get(
        f"{base_url}/api/payments/checkout/status/{session_id}",
        headers=_headers(driver_token),
    )
    assert forbidden.status_code == 403
    assert "cannot access" in forbidden.json()["detail"].lower()


def test_checkout_status_not_found(base_url: str, session: requests.Session, users_and_tokens):
    response = session.get(
        f"{base_url}/api/payments/checkout/status/nonexistent-session-id",
        headers=_headers(users_and_tokens["rider"]["token"]),
    )
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
