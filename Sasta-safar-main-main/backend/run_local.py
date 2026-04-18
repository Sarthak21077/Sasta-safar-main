import asyncio
from httpx import AsyncClient
from server import app, db

async def test_reg():
    # Make sure we clean up the db before to avoid 409
    await db.users.delete_one({"email": "farzikhaata12@gmail.com"})
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post(
            "/api/auth/register",
            json={
                "name": "Sarthak Pandey",
                "phone": "9555979978",
                "email": "farzikhaata12@gmail.com",
                "password": "mypassword123"
            }
        )
        print("Status code:", response.status_code)
        print("Response body:", response.text)

if __name__ == "__main__":
    asyncio.run(test_reg())
