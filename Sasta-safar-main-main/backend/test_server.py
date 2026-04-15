from fastapi.testclient import TestClient
from server import app
import sys

client = TestClient(app)

response = client.post("/api/auth/register", json={
    "name": "Test User",
    "email": "test45@test.com",
    "phone": "1234567890",
    "password": "password"
})

print(response.status_code)
print(response.text)
