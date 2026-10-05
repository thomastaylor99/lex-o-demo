"""Fixtures for the golden tests (marker `golden`): the real app in process, on the live API.

The app starts once for the whole run, as uvicorn would start it: its lifespan builds the real
services from settings and synthesises every fixed line. Without a Mistral key, golden tests
skip. Run from backend/: uv run pytest -m golden -rP (-rP prints the logged timings).
"""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from mistralai.client import Mistral

from app.catalogue.store import Catalogue
from app.main import create_app
from app.settings import Settings
from tests.golden.judge import Judge


@pytest.fixture(scope="session")
def settings() -> Settings:
    settings = Settings()
    if not settings.mistral_api_key:
        pytest.skip("no MISTRAL_API_KEY in the environment or .env: golden tests call the live API")
    return settings


@pytest.fixture(scope="session")
def live(settings: Settings) -> Iterator[TestClient]:
    """The real app, with its real services and routes, shared by every golden test."""
    with TestClient(create_app()) as client:
        yield client


@pytest.fixture(scope="session")
def catalogue(settings: Settings) -> Catalogue:
    return Catalogue.load(settings.catalogue_path)


@pytest.fixture(scope="session")
def judge(settings: Settings, catalogue: Catalogue) -> Iterator[Judge]:
    """The claims judge, on a client of its own: it is no part of the app."""
    with Mistral(api_key=settings.mistral_api_key) as client:
        yield Judge(client, settings.judge_model, catalogue)
