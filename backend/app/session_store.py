"""
In-memory session store — now supports user ownership.

SessionState gains a user_id field. create() accepts an optional user_id.
get_by_user() returns all sessions for a given user.
delete() removes a session by id.

Everything else is unchanged from the original implementation.
Swap for Redis when multi-instance deployment is needed.
"""
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class SessionState:
    session_id: str
    user_id: Optional[str] = None          # None = anonymous / live-demo session
    history: List[Dict[str, Any]] = field(default_factory=list)
    site: Optional[Dict[str, Any]] = None
    site_analysis: Optional[Dict[str, Any]] = None
    load_input: Optional[Dict[str, Any]] = None
    energy_result: Optional[Dict[str, Any]] = None
    design_result: Optional[Dict[str, Any]] = None
    cost_result: Optional[Dict[str, Any]] = None
    roadmap_result: Optional[Dict[str, Any]] = None

    def to_public_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "site": self.site,
            "site_analysis": self.site_analysis,
            "load_input": self.load_input,
            "energy_result": self.energy_result,
            "design_result": self.design_result,
            "cost_result": self.cost_result,
            "roadmap_result": self.roadmap_result,
        }


class SessionStore:
    def __init__(self) -> None:
        self._sessions: Dict[str, SessionState] = {}

    def create(self, user_id: Optional[str] = None) -> SessionState:
        session_id = uuid.uuid4().hex[:12]
        session = SessionState(session_id=session_id, user_id=user_id)
        self._sessions[session_id] = session
        return session

    def get(self, session_id: str) -> Optional[SessionState]:
        return self._sessions.get(session_id)

    def get_or_404(self, session_id: str) -> SessionState:
        session = self.get(session_id)
        if session is None:
            raise KeyError(f"Unknown session_id: {session_id}")
        return session

    def get_by_user(self, user_id: str) -> List[SessionState]:
        return [s for s in self._sessions.values() if s.user_id == user_id]

    def delete(self, session_id: str) -> bool:
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False


session_store = SessionStore()
