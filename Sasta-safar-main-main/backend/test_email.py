from pydantic import BaseModel, EmailStr
import pydantic
print(pydantic.__version__)
class User(BaseModel):
    email: EmailStr
u = User(email="Test@Mail.com")
try:
    print(type(u.email))
    print(u.email.lower())
except Exception as e:
    print("Error:", repr(e))
