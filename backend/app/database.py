"""
Database setup using SQLAlchemy async with SQLite (aiosqlite).

SQLite is appropriate for this project's scope — single-instance,
academic submission. The seam to swap for PostgreSQL is here: change
DATABASE_URL to postgresql+asyncpg://... and install asyncpg.
"""
import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./solaragent.db")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def get_db():
    """FastAPI dependency — yields a database session per request."""
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    """Create all tables on startup."""
    from app.models import User  # noqa: F401 — imported for side effect
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
