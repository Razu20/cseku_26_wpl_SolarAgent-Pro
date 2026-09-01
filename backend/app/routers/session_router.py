"""
Session router — wraps the existing session_store logic with user ownership.

An authenticated user's sessions are scoped to their user_id.
An unauthenticated request can still create and use sessions (legacy
behaviour for the live demo), but authenticated sessions are listed
per-user and can be retrieved / deleted.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.models import User
from app.auth import get_current_user, get_current_user_optional
from app.session_store import session_store

router = APIRouter(prefix="/api/session", tags=["session"])


@router.post("")
async def create_session(
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    session = session_store.create(user_id=current_user.id if current_user else None)
    return {"session_id": session.session_id, "user_id": session.user_id}


@router.get("/my")
async def list_my_sessions(current_user: User = Depends(get_current_user)):
    """List all sessions belonging to the authenticated user."""
    sessions = session_store.get_by_user(current_user.id)
    return [
        {"session_id": s.session_id, "has_results": s.design_result is not None}
        for s in sessions
    ]


@router.get("/{session_id}/state")
async def get_state(
    session_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    session = session_store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Unknown session_id.")
    # Ownership check: if session is owned, only the owner may read it
    if session.user_id and (current_user is None or current_user.id != session.user_id):
        raise HTTPException(status_code=403, detail="Not authorised to access this session.")
    return session.to_public_dict()


@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
):
    session = session_store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Unknown session_id.")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorised to delete this session.")
    session_store.delete(session_id)
    return {"deleted": session_id}
