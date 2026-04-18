from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.testclient import TestClient

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.options("/")
def read_root(): return {}

@app.get("/")
def read_get(): return {}

client = TestClient(app)

response = client.options("/", headers={"Origin": "https://sastasafar.online", "Access-Control-Request-Method": "POST"})
print("OPTIONS Headers:", response.headers)
