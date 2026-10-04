"""Tests for the /health endpoint."""

from fastapi.testclient import TestClient

from app.main import create_app


def test_health_reports_true_when_mistral_key_is_set(monkeypatch):
    monkeypatch.setenv("MISTRAL_API_KEY", "dummy-key")

    client = TestClient(create_app())
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "mistral_key": True}


def test_health_reports_false_when_mistral_key_is_empty(monkeypatch):
    monkeypatch.setenv("MISTRAL_API_KEY", "")

    client = TestClient(create_app())
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "mistral_key": False}
