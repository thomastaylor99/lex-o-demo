"""Tests for in-memory sessions (spec 001)."""

from app.conversation.session import SessionStore


class FakeClock:
    """A monotonic-clock stand-in whose time an agent advances by hand."""

    def __init__(self, start: float = 0.0) -> None:
        self.now = start

    def __call__(self) -> float:
        return self.now


def test_create_gives_first_agent_language_en_and_profile_language_en():
    store = SessionStore(first_agent="concierge", ttl_s=60, clock=FakeClock())

    session = store.create()

    assert session.active_agent == "concierge"
    assert session.language == "en"
    assert session.profile.language == "en"


def test_get_refreshes_last_seen():
    clock = FakeClock()
    store = SessionStore(first_agent="concierge", ttl_s=60, clock=clock)
    session = store.create()

    clock.now = 10
    fetched = store.get(session.id)

    assert fetched is not None
    assert fetched.last_seen == 10


def test_session_idle_past_ttl_returns_none_and_is_removed():
    clock = FakeClock()
    store = SessionStore(first_agent="concierge", ttl_s=60, clock=clock)
    session = store.create()

    clock.now = 61

    assert store.get(session.id) is None
    assert store.sweep() == 0  # already gone, nothing left to sweep


def test_sweep_counts_removals():
    clock = FakeClock()
    store = SessionStore(first_agent="concierge", ttl_s=60, clock=clock)
    store.create()
    store.create()

    clock.now = 61

    assert store.sweep() == 2
    assert store.sweep() == 0


def test_end_returns_true_once_then_false():
    store = SessionStore(first_agent="concierge", ttl_s=60, clock=FakeClock())
    session = store.create()

    assert store.end(session.id) is True
    assert store.end(session.id) is False


def test_repr_does_not_contain_personal_data():
    store = SessionStore(first_agent="concierge", ttl_s=60, clock=FakeClock())
    session = store.create()
    session.profile.first_name = "Alexandra"

    assert "Alexandra" not in repr(session)
