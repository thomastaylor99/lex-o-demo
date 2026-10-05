"""In-memory sessions (spec 001). One visitor conversation each; nothing persists."""

import asyncio
import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from app.catalogue.basket import Basket
from app.lang import Language
from app.profile.models import BeautyProfile
from app.usage.meter import UsageMeter


@dataclass
class Session:
    id: str
    active_agent: str
    language: Language = "en"
    history: list[dict[str, Any]] = field(default_factory=list, repr=False)
    profile: BeautyProfile = field(default_factory=BeautyProfile, repr=False)
    basket: Basket = field(default_factory=Basket, repr=False)
    usage: UsageMeter = field(default_factory=UsageMeter, repr=False)
    turn_index: int = 0
    active_since_turn: int = 0
    flags: dict[str, Any] = field(default_factory=dict, repr=False)
    last_seen: float = 0.0
    lock: asyncio.Lock = field(default_factory=asyncio.Lock, repr=False)


class SessionStore:
    def __init__(
        self, *, first_agent: str, ttl_s: float, clock: Callable[[], float] = time.monotonic
    ) -> None:
        self._first_agent = first_agent
        self._ttl_s = ttl_s
        self._clock = clock
        self._sessions: dict[str, Session] = {}

    def create(self, language: Language = "en") -> Session:
        self.sweep()
        session = Session(
            id=uuid.uuid4().hex,
            active_agent=self._first_agent,
            language=language,
            last_seen=self._clock(),
        )
        session.profile.language = language
        self._sessions[session.id] = session
        return session

    def get(self, session_id: str) -> Session | None:
        session = self._sessions.get(session_id)
        if session is None:
            return None
        if self._clock() - session.last_seen > self._ttl_s:
            del self._sessions[session_id]
            return None
        session.last_seen = self._clock()
        return session

    def end(self, session_id: str) -> bool:
        return self._sessions.pop(session_id, None) is not None

    def sweep(self) -> int:
        now = self._clock()
        expired = [sid for sid, s in self._sessions.items() if now - s.last_seen > self._ttl_s]
        for sid in expired:
            del self._sessions[sid]
        return len(expired)
