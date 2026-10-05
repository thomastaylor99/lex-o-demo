"""Observer events go out at the end of the turn and must carry the state at that moment."""

from app.conversation.agent import UiEvent
from app.conversation.loop import _stamp
from app.profile.models import BeautyProfile, Consent


def test_stamp_uses_latest_payload_when_an_observer_provides_it() -> None:
    profile = BeautyProfile()
    ui = UiEvent(
        type="profile.updated",
        payload={"profile": profile.model_dump(mode="json")},
        latest=lambda: {"profile": profile.model_dump(mode="json")},
    )
    profile.consent = Consent.GIVEN  # save_profile ran after the extractor's snapshot

    event = _stamp(ui, turn_id="t1", t_ms=10)

    assert event.model_dump(mode="json")["profile"]["consent"] == "given"


def test_stamp_uses_the_payload_when_there_is_no_latest() -> None:
    ui = UiEvent(
        type="profile.updated", payload={"profile": BeautyProfile().model_dump(mode="json")}
    )

    event = _stamp(ui, turn_id="t1", t_ms=10)

    assert event.model_dump(mode="json")["profile"]["consent"] == "pending"
