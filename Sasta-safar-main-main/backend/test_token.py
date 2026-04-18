import os
from datetime import datetime, timezone, timedelta
from jose import jwt

TOKEN_EXPIRE_HOURS = 48
JWT_SECRET_KEY = "test_secret"
JWT_ALGORITHM = "HS256"

def create_token(user_id: str, email: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {"sub": user_id, "email": email, "exp": expires}
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

try:
    token = create_token("123", "test@example.com")
    print("Token created:", token)
except Exception as e:
    print("Error:", repr(e))
