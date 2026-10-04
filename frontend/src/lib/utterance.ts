/**
 * One spoken turn over `/ws/transcribe` (backend/app/api/transcribe.py): mic frames in, live
 * transcript deltas out, then the final text with its language. One socket per utterance; the
 * server closes it after `done`.
 */

import { transcribeUrl } from "@/lib/api";
import type { Language } from "@/lib/events";
import { pcmToBase64 } from "@/lib/mic";

export interface UtteranceHandlers {
  onDelta(text: string): void;
  onDone(text: string, language: Language, sttFinalMs: number): void;
  onError(message: string): void;
}

export class Utterance {
  private readonly socket: WebSocket;
  private pending: string[] = [];
  private ended = false;
  private finished = false;

  constructor(language: Language, private readonly handlers: UtteranceHandlers) {
    this.socket = new WebSocket(`${transcribeUrl()}?language=${language}`);
    this.socket.onopen = () => {
      this.pending.forEach((message) => this.socket.send(message));
      this.pending = [];
    };
    this.socket.onmessage = (event) => {
      let data: { type?: string; text?: string; language?: Language; stt_final_ms?: number; message?: string };
      try {
        data = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (data.type === "text_delta" && data.text) {
        handlers.onDelta(data.text);
      } else if (data.type === "done") {
        this.finished = true;
        handlers.onDone(data.text ?? "", data.language ?? language, data.stt_final_ms ?? 0);
      } else if (data.type === "error") {
        this.fail(data.message ?? "speech recognition failed");
      }
    };
    this.socket.onerror = () => this.fail("speech recognition connection failed");
    this.socket.onclose = () => {
      if (this.ended) this.fail("speech recognition closed before the final text");
    };
  }

  send(pcm: Int16Array): void {
    if (!this.ended) this.post(JSON.stringify({ type: "audio", audio: pcmToBase64(pcm) }));
  }

  end(): void {
    if (this.ended) return;
    this.ended = true;
    this.post(JSON.stringify({ type: "end" }));
  }

  close(): void {
    this.finished = true;
    try {
      this.socket.close();
    } catch {
      // already closed
    }
  }

  private post(message: string): void {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(message);
    else if (this.socket.readyState === WebSocket.CONNECTING) this.pending.push(message);
  }

  private fail(message: string): void {
    if (this.finished) return;
    this.finished = true;
    this.handlers.onError(message);
  }
}
