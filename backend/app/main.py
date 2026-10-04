"""FastAPI application factory: CORS, the lifespan that builds the services, and every route."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mistralai.client import Mistral
from pydantic import BaseModel

from app.api import conversation, meta, sessions, transcribe, voice
from app.logging import configure_logging
from app.services import Services, build_services
from app.settings import Settings

configure_logging()

logger = structlog.get_logger()


class HealthResponse(BaseModel):
    status: str
    mistral_key: bool


def create_app(services: Services | None = None) -> FastAPI:
    """Build the app. Tests pass fake services; otherwise startup builds the real ones and
    synthesises every fixed line before the first request.
    """
    settings = services.settings if services is not None else Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        if services is not None:
            app.state.services = services
            yield
            return
        async with Mistral(api_key=settings.mistral_api_key) as client:
            built = build_services(settings, client)
            await built.lines.warm(built.agents.values())
            app.state.services = built
            logger.info(
                "services_ready",
                catalogue=str(settings.catalogue_path),
                products=len(built.catalogue.all()),
                stt_bias_names=len(built.stt_bias),
            )
            yield

    app = FastAPI(title="L'Oréal Learning Expedition voice demo", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Audio-Format"],
    )
    for module in (voice, transcribe, sessions, conversation, meta):
        app.include_router(module.router)

    @app.get("/health")
    def health() -> HealthResponse:
        return HealthResponse(status="ok", mistral_key=bool(settings.mistral_api_key))

    return app


app = create_app()
