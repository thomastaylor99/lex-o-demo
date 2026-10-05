/**
 * Typed helpers over the backend's HTTP and streaming endpoints (spec 001).
 *
 * Plain `fetch`, no client library. The base URL comes from
 * `NEXT_PUBLIC_API_URL` (see `AGENTS.md`), defaulting to the local backend.
 */

import type { Language } from "./events";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

/** Thrown by every helper below when the backend answers with a non-OK status. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Reads a FastAPI error body (`{"detail": ...}`) into a message, falling back to the status line. */
async function describeError(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (body && typeof body === "object" && "detail" in body) {
      const { detail } = body as { detail: unknown };
      if (typeof detail === "string" && detail.length > 0) {
        return detail;
      }
      if (detail !== undefined) {
        return JSON.stringify(detail);
      }
    }
  } catch {
    // Response body was missing or not JSON; fall back to the status line below.
  }
  return res.statusText || "no detail";
}

async function fetchChecked(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API_BASE_URL}${path}`, init);
  if (!res.ok) {
    const method = init?.method ?? "GET";
    throw new ApiError(`${method} ${path} failed (${res.status}): ${await describeError(res)}`, res.status);
  }
  return res;
}

function postJson(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  return fetchChecked(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

// --- /sessions -------------------------------------------------------------

export interface CreateSessionResponse {
  session_id: string;
  agent: string;
  language: Language;
  welcome_line: string;
}

export async function createSession(
  language: Language,
  signal?: AbortSignal,
): Promise<CreateSessionResponse> {
  const res = await postJson("/sessions", { language }, signal);
  return res.json() as Promise<CreateSessionResponse>;
}

export async function endSession(id: string, signal?: AbortSignal): Promise<void> {
  await fetchChecked(`/sessions/${encodeURIComponent(id)}`, { method: "DELETE", signal });
}

/** `GET /sessions/{id}/usage`: the running cost in euros and what it is made of. */
export interface SessionUsage {
  cost_eur: number;
  llm_eur: number;
  stt_eur: number;
  tts_eur: number;
  /** Prompt and completion tokens by model id. */
  tokens: Record<string, { prompt: number; completion: number }>;
  stt_seconds: number;
  tts_characters: number;
}

export async function getUsage(id: string, signal?: AbortSignal): Promise<SessionUsage> {
  const res = await fetchChecked(`/sessions/${encodeURIComponent(id)}/usage`, { signal });
  return res.json() as Promise<SessionUsage>;
}

// --- /config -----------------------------------------------------------------

export interface LocalizedText {
  en: string;
  fr: string;
}

export interface ConfigAgent {
  id: string;
  display_name: LocalizedText;
  role_label: LocalizedText;
  lines: string[];
  /** What each fixed line says, so the transcript can show it. */
  line_texts: Record<string, LocalizedText>;
}

export interface AppConfig {
  agents: ConfigAgent[];
  languages: Language[];
  first_agent: string;
}

export async function getConfig(signal?: AbortSignal): Promise<AppConfig> {
  const res = await fetchChecked("/config", { signal });
  return res.json() as Promise<AppConfig>;
}

// --- /voice ------------------------------------------------------------------

/**
 * Starts a `/voice/speak` stream. The caller reads PCM (float32 little-endian,
 * 24 kHz, mono) from `response.body`. Throws `ApiError` on a non-OK status.
 * With a session id, the speech counts in that session's running cost.
 */
export function speak(
  agent: string,
  language: Language,
  text: string,
  sessionId: string | null,
  signal?: AbortSignal,
): Promise<Response> {
  return postJson("/voice/speak", { agent, language, text, session_id: sessionId }, signal);
}

/** Fetches one cached fixed line. Same PCM format as `speak`. */
export async function fetchLine(
  agent: string,
  line: string,
  language: Language,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  const path = `/voice/lines/${encodeURIComponent(agent)}/${encodeURIComponent(line)}/${encodeURIComponent(language)}`;
  const res = await fetchChecked(path, { signal });
  return res.arrayBuffer();
}

// --- /conversation -------------------------------------------------------------

export interface ConversationRequest {
  session_id: string;
  text: string;
  language?: Language;
}

/** Starts a `/conversation/stream` turn. The caller reads SSE frames from `response.body`. */
export function streamConversation(req: ConversationRequest, signal?: AbortSignal): Promise<Response> {
  return postJson("/conversation/stream", req, signal);
}

// --- /turns ------------------------------------------------------------------

export type MicMode = "auto" | "push_to_talk";
export type FirstAudioKind = "line" | "speech" | null;

export interface TurnTimingsReport {
  session_id: string;
  mode: MicMode;
  /** Milliseconds from end of speech, or null when not reached this turn. */
  stt_final: number | null;
  request_sent: number | null;
  first_delta: number | null;
  first_sentence: number | null;
  first_audio: number | null;
  first_audio_kind: FirstAudioKind;
}

export async function postTimings(
  turnId: string,
  body: TurnTimingsReport,
  signal?: AbortSignal,
): Promise<void> {
  await postJson(`/turns/${encodeURIComponent(turnId)}/timings`, body, signal);
}

// --- streaming URLs ------------------------------------------------------------

/**
 * `ws://` (or `wss://` when the API base is `https://`) URL of `/ws/transcribe`. `language` is the
 * default when the text cannot tell; with a session id, the audio counts in that session's cost.
 */
export function transcribeUrl(language: Language, sessionId: string | null): string {
  const query = new URLSearchParams({ language });
  if (sessionId) query.set("session_id", sessionId);
  return `${API_BASE_URL.replace(/^http/, "ws")}/ws/transcribe?${query}`;
}
