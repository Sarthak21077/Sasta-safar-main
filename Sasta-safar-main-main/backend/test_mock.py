import asyncio
from unittest.mock import AsyncMock
import server  # Imports our server
from fastapi.testclient import TestClient

# Mock the database calls
server.db.users.find_one = AsyncMock(return_value=None)
server.db.users.insert_one = AsyncMock()

client = TestClient(server.app)

try:
    response = client.post("/api/auth/register", json={
        "name": "Test User",
        "email": "test99@test.com",
        "phone": "1234567890",
        "password": "password"
    })
    print(response.status_code)
    print(response.text)
except Exception as e:
    import traceback
    traceback.print_exc()
