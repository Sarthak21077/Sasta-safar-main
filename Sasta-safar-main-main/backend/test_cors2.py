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

try:
    response = client.options("/", headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"})
    print("OPTIONS Status:", response.status_code)
    print("OPTIONS Text:", response.text)
except Exception as e:
    print("OPTIONS Crash:", repr(e))

try:
    response = client.get("/", headers={"Origin": "http://localhost:3000"})
    print("GET Status:", response.status_code)
    print("GET Text:", response.text)
except Exception as e:
    print("GET Crash:", repr(e))

