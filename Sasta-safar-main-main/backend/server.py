from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal, Dict
import uuid
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import re
import asyncio
import requests

import json
import stripe

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
JWT_SECRET_KEY = os.environ["JWT_SECRET_KEY"]
JWT_ALGORITHM = "HS256"
STRIPE_API_KEY = os.environ["STRIPE_API_KEY"]
TOKEN_EXPIRE_HOURS = 48

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str


class UserRegister(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    phone: str = Field(min_length=8, max_length=20)
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    name: str
    email: EmailStr
    phone: str
    role: str
    created_at: str


class AuthResponse(BaseModel):
    token: str
    user: UserPublic


class RideCreate(BaseModel):
    from_city: str = Field(min_length=2, max_length=120)
    to_city: str = Field(min_length=2, max_length=120)
    date: str
    time: str
    seats_available: int = Field(ge=1, le=8)
    price_per_seat: float = Field(gt=0)
    driving_licence_number: str = Field(min_length=8, max_length=24)
    vehicle_number: str = Field(default="", max_length=20)


class RideOut(BaseModel):
    id: str
    driver_id: str
    driver_name: str
    from_city: str
    to_city: str
    date: str
    time: str
    seats_available: int
    price_per_seat: float
    vehicle_number: str = ""
    status: str
    created_at: str


class DriverPreferencesOut(BaseModel):
    driving_licence_number: str
    vehicle_number: str
    from_city: str
    to_city: str
    time: str
    seats_available: int
    price_per_seat: float


class SafetyEligibilityOut(BaseModel):
    allowed: bool
    reason: str
    ride_id: Optional[str] = None
    from_city: Optional[str] = None
    to_city: Optional[str] = None
    departure_at: Optional[str] = None
    role: Optional[str] = None
    seconds_to_start: Optional[int] = None


class BookingRequestCreate(BaseModel):
    ride_id: str
    offered_price: float = Field(gt=0)
    seats_requested: int = Field(default=1, ge=1, le=4)


class BookingDecision(BaseModel):
    decision: Literal["accept", "reject"]


class BookingRequestOut(BaseModel):
    id: str
    ride_id: str
    driver_id: str
    rider_id: str
    rider_name: str
    from_city: str
    to_city: str
    seats_requested: int
    offered_price: float
    base_price: float
    status: str
    payment_status: str
    created_at: str
    updated_at: str


class CheckoutCreate(BaseModel):
    request_id: str
    origin_url: str


class CheckoutStartResponse(BaseModel):
    checkout_url: str
    session_id: str


class CheckoutStatusResponse(BaseModel):
    status: str
    payment_status: str
    metadata: Dict[str, str] = {}


class PaymentStatusOut(BaseModel):
    session_id: str
    status: str
    payment_status: str
    amount: float
    currency: str
    metadata: Dict[str, str]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)


def create_token(user_id: str, email: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {"sub": user_id, "email": email, "exp": expires}
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def normalize_city(city: str) -> str:
    return city.strip().title()


def validate_origin(origin_url: str) -> str:
    origin = origin_url.strip().rstrip("/")
    if not origin.startswith("http://") and not origin.startswith("https://"):
        raise HTTPException(status_code=400, detail="Invalid origin URL")
    return origin



async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


DEFAULT_INDIAN_CITIES = [
    "Agra", "Ahmedabad", "Aizawl", "Ajmer", "Alappuzha", "Allahabad", "Aligarh", "Amaravati",
    "Ambala", "Amritsar", "Anand", "Asansol", "Aurangabad", "Ayodhya", "Balasore", "Bengaluru",
    "Berhampur", "Bhopal", "Bhubaneswar", "Bikaner", "Bilaspur", "Bokaro", "Chandigarh", "Chennai",
    "Coimbatore", "Cuttack", "Darbhanga", "Dehradun", "Delhi", "Dhanbad", "Dharamshala", "Dibrugarh",
    "Durg", "Ernakulam", "Erode", "Faridabad", "Gandhinagar", "Gangtok", "Ghaziabad", "Goa",
    "Gorakhpur", "Guntur", "Guwahati", "Gwalior", "Haridwar", "Hisar", "Hubli", "Hyderabad",
    "Imphal", "Indore", "Itanagar", "Jabalpur", "Jaipur", "Jalandhar", "Jammu", "Jamnagar",
    "Jamshedpur", "Jhansi", "Jodhpur", "Kakinada", "Kanpur", "Karnal", "Kochi", "Kohima",
    "Kolkata", "Kollam", "Kota", "Kozhikode", "Kurnool", "Lucknow", "Ludhiana", "Madurai",
    "Mangaluru", "Meerut", "Moradabad", "Mumbai", "Mysuru", "Nagpur", "Nashik", "Navi Mumbai",
    "Noida", "Patiala", "Patna", "Pondicherry", "Prayagraj", "Pune", "Raipur", "Rajkot",
    "Ranchi", "Rourkela", "Salem", "Shillong", "Shimla", "Siliguri", "Srinagar", "Surat",
    "Thane", "Thiruvananthapuram", "Thrissur", "Tiruchirappalli", "Tirupati", "Udaipur", "Ujjain",
    "Vadodara", "Varanasi", "Vellore", "Vijayawada", "Visakhapatnam", "Warangal"
]
INDIA_CITIES_CACHE: List[str] = []
INDIA_CITY_LOOKUP: Dict[str, str] = {}


def _fetch_india_cities_sync() -> List[str]:
    response = requests.post(
        "https://countriesnow.space/api/v0.1/countries/cities",
        json={"country": "India"},
        timeout=12,
    )
    data = response.json().get("data", [])
    cleaned = sorted({str(item).strip().title() for item in data if str(item).strip()})
    return cleaned


async def ensure_india_cities_loaded() -> None:
    global INDIA_CITIES_CACHE, INDIA_CITY_LOOKUP

    if INDIA_CITIES_CACHE:
        return

    try:
        fetched = await asyncio.to_thread(_fetch_india_cities_sync)
        INDIA_CITIES_CACHE = fetched or DEFAULT_INDIAN_CITIES
    except Exception:
        INDIA_CITIES_CACHE = DEFAULT_INDIAN_CITIES

    INDIA_CITY_LOOKUP = {city.lower(): city for city in INDIA_CITIES_CACHE}


def normalize_driving_licence_number(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9]", "", value).upper()


def is_valid_driving_licence_number(value: str) -> bool:
    normalized = normalize_driving_licence_number(value)
    return bool(re.fullmatch(r"[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}", normalized))


def parse_ride_departure(date_value: str, time_value: str) -> Optional[datetime]:
    try:
        dt = datetime.fromisoformat(f"{date_value}T{time_value}")
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)
        return dt
    except ValueError:
        return None


async def sync_paid_booking(session_id: str) -> None:
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx or tx.get("processed"):
        return

    process_result = await db.payment_transactions.update_one(
        {"session_id": session_id, "processed": {"$ne": True}},
        {"$set": {"processed": True, "updated_at": utc_now_iso()}},
    )
    if process_result.modified_count == 0:
        return

    request_doc = await db.booking_requests.find_one({"id": tx["request_id"]}, {"_id": 0})
    if not request_doc:
        return

    await db.booking_requests.update_one(
        {"id": request_doc["id"]},
        {
            "$set": {
                "status": "booked",
                "payment_status": "paid",
                "updated_at": utc_now_iso(),
            }
        },
    )

    if request_doc.get("seat_locked"):
        return

    await db.rides.update_one(
        {
            "id": request_doc["ride_id"],
            "seats_available": {"$gte": request_doc["seats_requested"]},
        },
        {"$inc": {"seats_available": -request_doc["seats_requested"]}},
    )

    updated_ride = await db.rides.find_one({"id": request_doc["ride_id"]}, {"_id": 0})
    if updated_ride and updated_ride["seats_available"] <= 0:
        await db.rides.update_one({"id": request_doc["ride_id"]}, {"$set": {"status": "full"}})

    await db.booking_requests.update_one(
        {"id": request_doc["id"]},
        {"$set": {"seat_locked": True, "updated_at": utc_now_iso()}},
    )


async def sync_checkout_state(
    session_id: str,
    checkout_status: CheckoutStatusResponse,
) -> None:
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        return

    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {
            "$set": {
                "status": checkout_status.status,
                "payment_status": checkout_status.payment_status,
                "metadata": checkout_status.metadata,
                "updated_at": utc_now_iso(),
            }
        },
    )

    if checkout_status.payment_status == "paid":
        await sync_paid_booking(session_id)

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Sasta Safar API is running"}


@api_router.post("/auth/register", response_model=AuthResponse)
async def register(input_data: UserRegister):
    email = input_data.email.lower().strip()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user_doc = {
        "id": str(uuid.uuid4()),
        "name": input_data.name.strip(),
        "email": email,
        "phone": input_data.phone.strip(),
        "role": "both",
        "password_hash": hash_password(input_data.password),
        "created_at": utc_now_iso(),
    }
    await db.users.insert_one(user_doc)

    token = create_token(user_doc["id"], user_doc["email"])
    user_public = UserPublic(**{k: user_doc[k] for k in ["id", "name", "email", "phone", "role", "created_at"]})
    return AuthResponse(token=token, user=user_public)


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(input_data: UserLogin):
    email = input_data.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(input_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user["id"], user["email"])
    user_public = UserPublic(**{k: user[k] for k in ["id", "name", "email", "phone", "role", "created_at"]})
    return AuthResponse(token=token, user=user_public)


@api_router.get("/auth/me", response_model=UserPublic)
async def me(current_user: dict = Depends(get_current_user)):
    return UserPublic(**current_user)


@api_router.post("/rides", response_model=RideOut)
async def create_ride(input_data: RideCreate, current_user: dict = Depends(get_current_user)):
    await ensure_india_cities_loaded()

    driving_licence_number = normalize_driving_licence_number(input_data.driving_licence_number)
    vehicle_number = input_data.vehicle_number.strip().upper()
    from_city_key = input_data.from_city.strip().lower()
    to_city_key = input_data.to_city.strip().lower()
    from_city = INDIA_CITY_LOOKUP.get(from_city_key)
    to_city = INDIA_CITY_LOOKUP.get(to_city_key)

    if not from_city or not to_city:
        raise HTTPException(
            status_code=400,
            detail="Please select valid Indian cities from autocomplete suggestions",
        )
    if not is_valid_driving_licence_number(driving_licence_number):
        raise HTTPException(
            status_code=400,
            detail="Invalid driving licence number format. Official API validation will be enabled when credentials are provided.",
        )
    if not vehicle_number:
        raise HTTPException(status_code=400, detail="Vehicle number is required")

    departure_at = parse_ride_departure(input_data.date, input_data.time)
    if not departure_at:
        raise HTTPException(status_code=400, detail="Invalid date or time format")

    ride_doc = {
        "id": str(uuid.uuid4()),
        "driver_id": current_user["id"],
        "driver_name": current_user["name"],
        "from_city": from_city,
        "to_city": to_city,
        "date": input_data.date,
        "time": input_data.time,
        "seats_available": input_data.seats_available,
        "price_per_seat": round(float(input_data.price_per_seat), 2),
        "vehicle_number": vehicle_number,
        "departure_at": departure_at.isoformat(),
        "status": "open",
        "created_at": utc_now_iso(),
    }
    await db.rides.insert_one(ride_doc)

    await db.users.update_one(
        {"id": current_user["id"]},
        {
            "$set": {
                "driver_profile": {
                    "driving_licence_number": driving_licence_number,
                    "vehicle_number": vehicle_number,
                },
                "last_ride_preferences": {
                    "from_city": ride_doc["from_city"],
                    "to_city": ride_doc["to_city"],
                    "time": ride_doc["time"],
                    "seats_available": ride_doc["seats_available"],
                    "price_per_seat": ride_doc["price_per_seat"],
                },
            }
        },
    )

    return RideOut(**ride_doc)


@api_router.get("/driver/preferences", response_model=DriverPreferencesOut)
async def get_driver_preferences(current_user: dict = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    profile = user_doc.get("driver_profile", {}) if user_doc else {}
    prefs = user_doc.get("last_ride_preferences", {}) if user_doc else {}

    return DriverPreferencesOut(
        driving_licence_number=str(profile.get("driving_licence_number", "")),
        vehicle_number=str(profile.get("vehicle_number", "")),
        from_city=str(prefs.get("from_city", "")),
        to_city=str(prefs.get("to_city", "")),
        time=str(prefs.get("time", "")),
        seats_available=int(prefs.get("seats_available", 1)),
        price_per_seat=float(prefs.get("price_per_seat", 0.0)),
    )


@api_router.get("/safety/eligibility", response_model=SafetyEligibilityOut)
async def safety_eligibility(current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    candidate_rides: List[Dict[str, object]] = []

    rider_bookings = await db.booking_requests.find(
        {"rider_id": current_user["id"], "status": "booked", "payment_status": "paid"},
        {"_id": 0},
    ).to_list(100)

    for booking in rider_bookings:
        ride = await db.rides.find_one({"id": booking["ride_id"]}, {"_id": 0})
        if not ride:
            continue
        departure_at = parse_ride_departure(ride.get("date", ""), ride.get("time", ""))
        if not departure_at:
            continue
        candidate_rides.append({"ride": ride, "departure_at": departure_at, "role": "rider"})

    driver_rides = await db.rides.find({"driver_id": current_user["id"]}, {"_id": 0}).to_list(200)
    for ride in driver_rides:
        booked_count = await db.booking_requests.count_documents(
            {
                "ride_id": ride["id"],
                "status": "booked",
                "payment_status": "paid",
            }
        )
        if booked_count < 1:
            continue
        departure_at = parse_ride_departure(ride.get("date", ""), ride.get("time", ""))
        if not departure_at:
            continue
        candidate_rides.append({"ride": ride, "departure_at": departure_at, "role": "driver"})

    if not candidate_rides:
        return SafetyEligibilityOut(
            allowed=False,
            reason="Safety sharing unlocks after a paid booked ride is available.",
        )

    candidate_rides.sort(key=lambda item: item["departure_at"])
    nearest = candidate_rides[0]
    ride = nearest["ride"]
    departure_at = nearest["departure_at"]
    seconds_to_start = int((departure_at - now).total_seconds())

    if seconds_to_start <= 0:
        return SafetyEligibilityOut(
            allowed=True,
            reason="Ride has started. Safety GPS sharing is active.",
            ride_id=ride["id"],
            from_city=ride["from_city"],
            to_city=ride["to_city"],
            departure_at=departure_at.isoformat(),
            role=nearest["role"],
            seconds_to_start=0,
        )

    return SafetyEligibilityOut(
        allowed=False,
        reason="Safety GPS sharing will unlock automatically when your ride starts.",
        ride_id=ride["id"],
        from_city=ride["from_city"],
        to_city=ride["to_city"],
        departure_at=departure_at.isoformat(),
        role=nearest["role"],
        seconds_to_start=seconds_to_start,
    )


@api_router.get("/metadata/india-cities", response_model=List[str])
async def get_india_cities():
    await ensure_india_cities_loaded()
    return INDIA_CITIES_CACHE


@api_router.get("/rides/search", response_model=List[RideOut])
async def search_rides(
    from_city: str = Query(default=""),
    to_city: str = Query(default=""),
    date: str = Query(default=""),
):
    query: Dict[str, object] = {"status": "open", "seats_available": {"$gt": 0}}
    if from_city.strip():
        query["from_city"] = {"$regex": re.escape(from_city.strip()), "$options": "i"}
    if to_city.strip():
        query["to_city"] = {"$regex": re.escape(to_city.strip()), "$options": "i"}
    if date.strip():
        query["date"] = date.strip()

    rides = await db.rides.find(query, {"_id": 0}).sort("created_at", -1).to_list(150)
    return [RideOut(**ride) for ride in rides]


@api_router.get("/rides/mine", response_model=List[RideOut])
async def my_rides(current_user: dict = Depends(get_current_user)):
    rides = await db.rides.find({"driver_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [RideOut(**ride) for ride in rides]


@api_router.get("/rides/{ride_id}", response_model=RideOut)
async def get_ride(ride_id: str):
    ride = await db.rides.find_one({"id": ride_id}, {"_id": 0})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    return RideOut(**ride)


@api_router.post("/requests", response_model=BookingRequestOut)
async def create_request(input_data: BookingRequestCreate, current_user: dict = Depends(get_current_user)):
    ride = await db.rides.find_one({"id": input_data.ride_id}, {"_id": 0})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if ride["driver_id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="You cannot book your own ride")
    if ride["status"] != "open":
        raise HTTPException(status_code=400, detail="Ride is not open for booking")
    if input_data.seats_requested > ride["seats_available"]:
        raise HTTPException(status_code=400, detail="Requested seats exceed availability")

    duplicate = await db.booking_requests.find_one(
        {
            "ride_id": ride["id"],
            "rider_id": current_user["id"],
            "status": {"$in": ["pending", "accepted", "booked"]},
        },
        {"_id": 0},
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="You already requested this ride")

    now = utc_now_iso()
    request_doc = {
        "id": str(uuid.uuid4()),
        "ride_id": ride["id"],
        "driver_id": ride["driver_id"],
        "rider_id": current_user["id"],
        "rider_name": current_user["name"],
        "from_city": ride["from_city"],
        "to_city": ride["to_city"],
        "seats_requested": input_data.seats_requested,
        "offered_price": round(float(input_data.offered_price), 2),
        "base_price": round(float(ride["price_per_seat"]), 2),
        "status": "pending",
        "payment_status": "unpaid",
        "payment_session_id": None,
        "seat_locked": False,
        "created_at": now,
        "updated_at": now,
    }
    await db.booking_requests.insert_one(request_doc)
    return BookingRequestOut(**request_doc)


@api_router.get("/requests/mine", response_model=List[BookingRequestOut])
async def my_requests(current_user: dict = Depends(get_current_user)):
    requests = (
        await db.booking_requests.find({"rider_id": current_user["id"]}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(300)
    )
    return [BookingRequestOut(**item) for item in requests]


@api_router.get("/requests/incoming", response_model=List[BookingRequestOut])
async def incoming_requests(current_user: dict = Depends(get_current_user)):
    requests = (
        await db.booking_requests.find({"driver_id": current_user["id"]}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(300)
    )
    return [BookingRequestOut(**item) for item in requests]


@api_router.patch("/requests/{request_id}/decision", response_model=BookingRequestOut)
async def decide_request(request_id: str, input_data: BookingDecision, current_user: dict = Depends(get_current_user)):
    request_doc = await db.booking_requests.find_one(
        {"id": request_id, "driver_id": current_user["id"]},
        {"_id": 0},
    )
    if not request_doc:
        raise HTTPException(status_code=404, detail="Request not found")
    if request_doc["status"] != "pending":
        raise HTTPException(status_code=400, detail="Only pending requests can be updated")

    if input_data.decision == "accept":
        ride = await db.rides.find_one({"id": request_doc["ride_id"]}, {"_id": 0})
        if not ride or ride["status"] != "open":
            raise HTTPException(status_code=400, detail="Ride is unavailable")
        if request_doc["seats_requested"] > ride["seats_available"]:
            raise HTTPException(status_code=400, detail="Not enough seats available")
        status = "accepted"
        payment_status = "pending_payment"
    else:
        status = "rejected"
        payment_status = "not_required"

    await db.booking_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": status,
                "payment_status": payment_status,
                "updated_at": utc_now_iso(),
            }
        },
    )

    updated = await db.booking_requests.find_one({"id": request_id}, {"_id": 0})
    return BookingRequestOut(**updated)


@api_router.post("/payments/checkout/session", response_model=CheckoutStartResponse)
async def create_checkout_session(
    input_data: CheckoutCreate,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    booking_request = await db.booking_requests.find_one(
        {"id": input_data.request_id, "rider_id": current_user["id"]},
        {"_id": 0},
    )
    if not booking_request:
        raise HTTPException(status_code=404, detail="Booking request not found")
    if booking_request["status"] not in ["accepted", "booked"]:
        raise HTTPException(status_code=400, detail="Request must be accepted before payment")
    if booking_request["payment_status"] == "paid":
        raise HTTPException(status_code=400, detail="Payment already completed")

    origin = validate_origin(input_data.origin_url)
    success_url = f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/payment/cancel?request_id={booking_request['id']}"
    amount = round(float(booking_request["offered_price"]), 2)

    metadata = {
        "request_id": booking_request["id"],
        "ride_id": booking_request["ride_id"],
        "rider_id": booking_request["rider_id"],
        "driver_id": booking_request["driver_id"],
        "price": f"{amount:.2f}",
    }

    stripe.api_key = STRIPE_API_KEY
    checkout_session = await asyncio.to_thread(
        stripe.checkout.Session.create,
        payment_method_types=['card'],
        line_items=[
            {
                'price_data': {
                    'currency': 'inr',
                    'product_data': {
                        'name': 'Sasta Safar Ride',
                    },
                    'unit_amount': int(amount * 100),
                },
                'quantity': 1,
            }
        ],
        mode='payment',
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )

    transaction_doc = {
        "id": str(uuid.uuid4()),
        "session_id": checkout_session.session_id,
        "request_id": booking_request["id"],
        "ride_id": booking_request["ride_id"],
        "user_id": current_user["id"],
        "amount": amount,
        "currency": "inr",
        "status": "initiated",
        "payment_status": "unpaid",
        "metadata": metadata,
        "payment_id": "",
        "processed": False,
        "created_at": utc_now_iso(),
        "updated_at": utc_now_iso(),
    }
    await db.payment_transactions.insert_one(transaction_doc)

    await db.booking_requests.update_one(
        {"id": booking_request["id"]},
        {
            "$set": {
                "payment_session_id": checkout_session.session_id,
                "payment_status": "pending_payment",
                "updated_at": utc_now_iso(),
            }
        },
    )

    return CheckoutStartResponse(
        checkout_url=checkout_session.url,
        session_id=checkout_session.session_id,
    )


@api_router.get("/payments/checkout/status/{session_id}", response_model=PaymentStatusOut)
async def get_checkout_status(
    session_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You cannot access this transaction")

    stripe.api_key = STRIPE_API_KEY
    stripe_session = await asyncio.to_thread(stripe.checkout.Session.retrieve, session_id)
    checkout_status = CheckoutStatusResponse(
        status=stripe_session.status,
        payment_status=stripe_session.payment_status,
        metadata=stripe_session.metadata or {}
    )
    await sync_checkout_state(session_id, checkout_status)

    updated_tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    return PaymentStatusOut(
        session_id=session_id,
        status=updated_tx.get("status", checkout_status.status),
        payment_status=updated_tx.get("payment_status", checkout_status.payment_status),
        amount=updated_tx.get("amount", 0.0),
        currency=updated_tx.get("currency", "inr"),
        metadata=updated_tx.get("metadata", {}),
    )


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("Stripe-Signature")

    stripe.api_key = STRIPE_API_KEY
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")
    try:
        if webhook_secret:
            event = stripe.Webhook.construct_event(
                payload, signature, webhook_secret
            )
        else:
            event = stripe.Event.construct_from(json.loads(payload), stripe.api_key)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    event_type = event['type']
    session_id = None

    if event_type in ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed']:
        session = event['data']['object']
        session_id = session.get('id')
        checkout_status = CheckoutStatusResponse(
            status=session.get('status'),
            payment_status=session.get('payment_status'),
            metadata=session.get('metadata') or {}
        )
        await sync_checkout_state(session_id, checkout_status)

    return {
        "received": True,
        "event_type": event_type,
        "session_id": session_id,
    }

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)

    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])

    return status_checks

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()