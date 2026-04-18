from pydantic import BaseModel, EmailStr
import uuid
from datetime import datetime, timezone

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

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

user_doc = {
    "id": str(uuid.uuid4()),
    "name": "Sarthak Pandey",
    "email": "farzikhaata12@gmail.com",
    "phone": "9555979978",
    "role": "both",
    "password_hash": "hash_here",
    "created_at": utc_now_iso(),
}

try:
    user_public = UserPublic(**{k: user_doc[k] for k in ["id", "name", "email", "phone", "role", "created_at"]})
    auth_resp = AuthResponse(token="mytoken", user=user_public)
    print("Success:", auth_resp.model_dump())
except Exception as e:
    import traceback
    traceback.print_exc()
