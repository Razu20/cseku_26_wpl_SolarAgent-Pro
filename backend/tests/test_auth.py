"""
Integration tests — authentication endpoints.

Uses httpx.AsyncClient against the FastAPI app directly (no live server).
A fresh in-memory SQLite database is created for each test via a
dependency override.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# ── Fixtures ───────────────────────────────────────────────────────────────────
@pytest_asyncio.fixture
async def client():
    """Create a test client with its own isolated in-memory database."""
    # Dynamic import to avoid module-level DB initialisation running too early
    from app.database import Base, get_db
    from app.main import app

    # Isolated in-memory SQLite per test
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    TestSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def override_get_db():
        async with TestSession() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()
    await test_engine.dispose()


REGISTER_PAYLOAD = {
    "email": "razu@example.com",
    "username": "razu_dev",
    "password": "SecurePass123",
    "full_name": "Razu Sarder",
}


# ── Registration tests ─────────────────────────────────────────────────────────
class TestRegister:
    @pytest.mark.asyncio
    async def test_register_success(self, client):
        r = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
        assert r.status_code == 201
        data = r.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["username"] == "razu_dev"

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client):
        await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
        r = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
        assert r.status_code == 400
        assert "Email" in r.json()["detail"]

    @pytest.mark.asyncio
    async def test_register_duplicate_username(self, client):
        await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
        payload = {**REGISTER_PAYLOAD, "email": "other@example.com"}
        r = await client.post("/api/auth/register", json=payload)
        assert r.status_code == 400
        assert "Username" in r.json()["detail"]

    @pytest.mark.asyncio
    async def test_register_weak_password(self, client):
        payload = {**REGISTER_PAYLOAD, "password": "short"}
        r = await client.post("/api/auth/register", json=payload)
        assert r.status_code == 422  # Pydantic validation error

    @pytest.mark.asyncio
    async def test_register_invalid_username(self, client):
        payload = {**REGISTER_PAYLOAD, "username": "has spaces!"}
        r = await client.post("/api/auth/register", json=payload)
        assert r.status_code == 422

    @pytest.mark.asyncio
    async def test_register_invalid_email(self, client):
        payload = {**REGISTER_PAYLOAD, "email": "not-an-email"}
        r = await client.post("/api/auth/register", json=payload)
        assert r.status_code == 422


# ── Login tests ────────────────────────────────────────────────────────────────
class TestLogin:
    @pytest.mark.asyncio
    async def test_login_success(self, client):
        await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
        r = await client.post("/api/auth/login", json={
            "email": REGISTER_PAYLOAD["email"],
            "password": REGISTER_PAYLOAD["password"],
        })
        assert r.status_code == 200
        assert "access_token" in r.json()

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client):
        await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
        r = await client.post("/api/auth/login", json={
            "email": REGISTER_PAYLOAD["email"],
            "password": "wrongpassword",
        })
        assert r.status_code == 401

    @pytest.mark.asyncio
    async def test_login_unknown_email(self, client):
        r = await client.post("/api/auth/login", json={
            "email": "nobody@example.com",
            "password": "anything",
        })
        assert r.status_code == 401


# ── Token / Me tests ───────────────────────────────────────────────────────────
class TestMeAndToken:
    @pytest.mark.asyncio
    async def test_me_returns_profile(self, client):
        reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
        token = reg.json()["access_token"]
        r = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert r.json()["username"] == "razu_dev"
        assert r.json()["email"] == REGISTER_PAYLOAD["email"]

    @pytest.mark.asyncio
    async def test_me_without_token_returns_401(self, client):
        r = await client.get("/api/auth/me")
        assert r.status_code == 401

    @pytest.mark.asyncio
    async def test_me_invalid_token_returns_401(self, client):
        r = await client.get("/api/auth/me", headers={"Authorization": "Bearer bad.token.here"})
        assert r.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_token_returns_new_access(self, client):
        reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
        refresh_token = reg.json()["refresh_token"]
        r = await client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
        assert r.status_code == 200
        assert "access_token" in r.json()

    @pytest.mark.asyncio
    async def test_refresh_with_access_token_fails(self, client):
        reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
        access_token = reg.json()["access_token"]
        r = await client.post("/api/auth/refresh", json={"refresh_token": access_token})
        assert r.status_code == 401

    @pytest.mark.asyncio
    async def test_update_me_full_name(self, client):
        reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
        token = reg.json()["access_token"]
        r = await client.put("/api/auth/me",
                             json={"full_name": "Razu Updated"},
                             headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert r.json()["full_name"] == "Razu Updated"

    @pytest.mark.asyncio
    async def test_update_password_success(self, client):
        reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
        token = reg.json()["access_token"]
        r = await client.put("/api/auth/me",
                             json={"current_password": REGISTER_PAYLOAD["password"],
                                   "new_password": "NewPassword456"},
                             headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        # Verify old password no longer works
        login = await client.post("/api/auth/login", json={
            "email": REGISTER_PAYLOAD["email"], "password": REGISTER_PAYLOAD["password"]
        })
        assert login.status_code == 401

    @pytest.mark.asyncio
    async def test_logout_returns_204(self, client):
        reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
        token = reg.json()["access_token"]
        r = await client.post("/api/auth/logout",
                              headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 204


# ── Health check ───────────────────────────────────────────────────────────────
class TestHealth:
    @pytest.mark.asyncio
    async def test_health_ok(self, client):
        r = await client.get("/api/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
