from pydantic import BaseModel, Field, EmailStr

class UserRegister(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    phone: str = Field(min_length=8, max_length=20)
    password: str = Field(min_length=6, max_length=128)

try:
    payload = {
        "name": "Sarthak Pandey",
        "phone": "9555979978",
        "email": "farzikhaata12@gmail.com",
        "password": "mypassword123"
    }
    user = UserRegister(**payload)
    print("Success!")
    print(dict(user))
except Exception as e:
    import json
    print("Error:", e)
