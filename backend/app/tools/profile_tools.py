"""Save or discard the visitor's beauty profile, with consent (spec 002)."""

import json

from pydantic import BaseModel, Field

from app.conversation.agent import Tool, ToolResult, UiEvent
from app.conversation.session import Session
from app.profile.models import BeautyProfile, Consent


class SaveProfileArgs(BaseModel):
    consent: bool = Field(
        description=(
            "Whether the visitor agreed to save their beauty profile and routine for this session."
        )
    )
    first_name: str | None = Field(
        default=None, description="The visitor's first name, when they gave it."
    )


async def _handle_save_profile(session: Session, args: SaveProfileArgs) -> ToolResult:
    if args.consent:
        session.profile.consent = Consent.GIVEN
        if args.first_name is not None:
            session.profile.first_name = args.first_name
    else:
        session.profile = BeautyProfile(language=session.language, consent=Consent.DECLINED)

    profile_view = session.profile.model_dump(mode="json")
    content = json.dumps(
        {
            "saved": args.consent,
            "profile": profile_view,
            "basket_total_eur": float(session.basket.total_eur),
        },
        ensure_ascii=False,
    )
    return ToolResult(
        content=content,
        ui_events=[UiEvent(type="profile.updated", payload={"profile": profile_view})],
    )


def profile_tool() -> Tool:
    return Tool(
        name="save_profile",
        description=(
            "Save the visitor's beauty profile and routine with their consent, or discard it "
            "when declined."
        ),
        args_model=SaveProfileArgs,
        handler=_handle_save_profile,
    )
