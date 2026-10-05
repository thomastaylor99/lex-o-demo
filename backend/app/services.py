"""The long-lived services every route shares, built once at startup (spec 001, task T15).

`build_services` wires the real ones as scripts/talk.py does; tests build `Services` from fakes.
"""

from collections.abc import Sequence
from dataclasses import dataclass, field

from mistralai.client import Mistral

from app.agents import FIRST_AGENT, build_agents
from app.catalogue.store import Catalogue
from app.conversation.agent import AgentConfig, Observer
from app.conversation.events import TurnTimings
from app.conversation.mistral_stream import MistralStreamer
from app.conversation.session import SessionStore
from app.conversation.stream import ChatStreamer
from app.profile.extractor import make_profile_observer, mistral_parser
from app.settings import Settings
from app.tools import build_tools
from app.voice.lines import LineCache
from app.voice.stt import MistralTranscriber, Transcriber
from app.voice.tts import MistralSynthesizer, Synthesizer

# Brand names the transcription is biased towards, after the product names (as in talk.py).
BRANDS = (
    "L'Oréal Paris",
    "CeraVe",
    "La Roche-Posay",
    "Elseve",
    "Elvive",
    "Revitalift",
    "Toleriane",
    "Anthelios",
)
TURN_TIMINGS_KEPT = 200


@dataclass
class Services:
    settings: Settings
    catalogue: Catalogue
    agents: dict[str, AgentConfig]
    sessions: SessionStore
    streamer: ChatStreamer
    transcriber: Transcriber
    synthesizer: Synthesizer
    lines: LineCache
    observers: Sequence[Observer] = ()
    stt_bias: list[str] = field(default_factory=list)
    turn_timings: dict[str, TurnTimings] = field(default_factory=dict)  # by turn id, oldest first

    def keep_timings(self, turn_id: str, timings: TurnTimings) -> None:
        """Keep a turn's backend timings for the browser's report, dropping the oldest past 200."""
        self.turn_timings[turn_id] = timings
        while len(self.turn_timings) > TURN_TIMINGS_KEPT:
            del self.turn_timings[next(iter(self.turn_timings))]


def context_bias(catalogue: Catalogue) -> list[str]:
    """Every product name in both languages, then the brands: whole names, each once."""
    names = [name for product in catalogue.all() for name in (product.name.en, product.name.fr)]
    return list(dict.fromkeys([*names, *BRANDS]))


def build_services(settings: Settings, client: Mistral) -> Services:
    """The real services over one Mistral client. The caller warms the fixed lines."""
    catalogue = Catalogue.load(settings.catalogue_path)
    bias = context_bias(catalogue)
    synthesizer = MistralSynthesizer(
        client,
        settings.tts_model,
        settings.tts_first_chunk_timeout_s,
        hedge_after_s=settings.tts_hedge_after_s,
        max_attempts=settings.tts_max_attempts,
    )
    return Services(
        settings=settings,
        catalogue=catalogue,
        agents=build_agents(settings, build_tools(catalogue, client, settings.recap_model)),
        sessions=SessionStore(first_agent=FIRST_AGENT, ttl_s=settings.session_ttl_s),
        streamer=MistralStreamer(
            client,
            fallback_model=settings.agent_fallback_model,
            temperature=settings.agent_temperature,
            first_token_timeout_s=settings.llm_first_token_timeout_s,
        ),
        transcriber=MistralTranscriber(
            client, settings.stt_model, settings.stt_streaming_delay_ms, context_bias=bias
        ),
        synthesizer=synthesizer,
        lines=LineCache(synthesizer),
        observers=[make_profile_observer(mistral_parser(client), settings.extractor_model)],
        stt_bias=bias,
    )
