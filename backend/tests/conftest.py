import sys
import os
import pytest
from fastapi.testclient import TestClient

# Ensure root scratch directory and backend directory are in path
test_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(test_dir)
root_dir = os.path.dirname(backend_dir)
for p in [root_dir, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app.main import app

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client
