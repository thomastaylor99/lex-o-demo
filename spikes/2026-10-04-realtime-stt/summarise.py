"""Print markdown tables from /tmp/rtstt/results/*.jsonl (medians over runs). Re-scores text from final_text."""

from __future__ import annotations

import json
import statistics
from collections import defaultdict
from collections.abc import Callable
from typing import Any

from common import CLIPS_BY_NAME, RESULTS_DIR, SWITCH_NAME, SWITCH_PARTS, term_hits, wer


def load(experiment: str) -> list[dict[str, Any]]:
    path = RESULTS_DIR / f"{experiment}.jsonl"
    if not path.exists():
        return []
    rows = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
    for row in rows:
        clip = row["clip"]
        if clip == SWITCH_NAME:
            ref = " ".join(CLIPS_BY_NAME[p].text for p in SWITCH_PARTS)
            terms = tuple(t for p in SWITCH_PARTS for t in CLIPS_BY_NAME[p].terms)
        else:
            ref, terms = CLIPS_BY_NAME[clip].text, CLIPS_BY_NAME[clip].terms
        text = row.get("final_text") or ""
        row["wer"] = wer(ref, text)
        row["terms"] = term_hits(text, terms)
    return rows


def med(rows: list[dict[str, Any]], key: str) -> str:
    values = [r[key] for r in rows if r.get(key) is not None]
    return f"{statistics.median(values):.2f}" if values else "n/a"


def group(rows: list[dict[str, Any]], key: Callable[[dict[str, Any]], Any]) -> dict[Any, list[dict[str, Any]]]:
    out: dict[Any, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        out[key(row)].append(row)
    return out


def term_score(rows: list[dict[str, Any]]) -> str:
    """Terms recognised (exact or loose) over all runs, e.g. 14/18."""
    hits = sum(1 for r in rows for v in r["terms"].values() if v != "miss")
    total = sum(len(r["terms"]) for r in rows)
    return f"{hits}/{total}"


def timing_table(rows: list[dict[str, Any]], key: Callable[[dict[str, Any]], Any], label: str) -> None:
    print(
        f"| {label} | clip | runs | audio s | connect s | first delta after audio start s | text streamed before end |"
        " last delta after end s | done after end s | WER (median) | terms recognised |"
    )
    print("|---|---|---|---|---|---|---|---|---|---|---|")
    for (k, clip), rs in sorted(
        group(rows, lambda r: (key(r), r["clip"])).items(), key=lambda kv: (str(kv[0][0]), kv[0][1])
    ):
        ok = [r for r in rs if not r.get("error")]
        print(
            f"| {k} | {clip} | {len(ok)}/{len(rs)} | {med(ok, 'audio_s')} | {med(ok, 'connect_s')} | "
            f"{med(ok, 'first_delta_from_start_s')} | {med(ok, 'share_of_text_before_end')} | "
            f"{med(ok, 'last_delta_from_end_s')} | {med(ok, 'done_from_end_s')} | {med(ok, 'wer')} | {term_score(ok)} |"
        )
    print()
    print(
        f"| {label} | runs | done after end s (median, all clips) | max | last delta after end s | WER (mean) | terms |"
    )
    print("|---|---|---|---|---|---|---|")
    for k, rs in sorted(group(rows, key).items(), key=lambda kv: str(kv[0])):
        ok = [r for r in rs if not r.get("error")]
        done = [r["done_from_end_s"] for r in ok if r.get("done_from_end_s") is not None]
        print(
            f"| {k} | {len(ok)}/{len(rs)} | {med(ok, 'done_from_end_s')} | {max(done):.2f} | "
            f"{med(ok, 'last_delta_from_end_s')} | {statistics.mean(r['wer'] for r in ok):.3f} | {term_score(ok)} |"
        )
    print()


def transcripts(rows: list[dict[str, Any]], key: Callable[[dict[str, Any]], Any]) -> None:
    for (k, clip), rs in sorted(
        group(rows, lambda r: (key(r), r["clip"])).items(), key=lambda kv: (str(kv[0][0]), kv[0][1])
    ):
        seen: dict[str, int] = defaultdict(int)
        for r in rs:
            seen[r.get("final_text") or f"<error: {r.get('error')}>"] += 1
        for text, n in seen.items():
            print(f"- {k} {clip} x{n}: {text}")
    print()


def event_names(experiments: list[str]) -> None:
    keys: dict[str, set[str]] = defaultdict(set)
    for experiment in experiments:
        for row in load(experiment):
            for entry in row.get("log", []):
                if entry.get("dir") == "in":
                    keys[entry.get("type", "<none>")].update(k for k in entry if k not in ("t_from_end", "dir"))
            for ev in row.get("handshake", []):
                keys[ev.get("type", "<none>") + " (handshake, parsed by SDK)"].update(ev.keys())
    print("| event type (as received) | keys seen |")
    print("|---|---|")
    for name, ks in sorted(keys.items()):
        print(f"| `{name}` | {', '.join(f'`{k}`' for k in sorted(ks))} |")
    print()


def main() -> None:
    models = load("models")
    if models:
        print("## Models (default delay, flush then end)\n")
        timing_table(models, lambda r: r["model"], "model")
        transcripts(models, lambda r: r["model"])
    delay = load("delay")
    if delay:
        print("## target_streaming_delay_ms\n")
        timing_table(delay, lambda r: f"{r['model']} delay={r['delay_ms']}", "setting")
        transcripts(delay, lambda r: f"delay={r['delay_ms']}")
    bias = load("bias")
    if bias:
        print("## context_bias (raw session.update)\n")
        label = lambda r: (
            "none"
            if not r.get("bias")
            else ("multi-word list" if "La Roche-Posay" in r["bias"] else "single-word list")
        )
        timing_table(bias, label, "bias")
        print("| clip | bias | term: hits over runs |")
        print("|---|---|---|")
        for (clip, b), rs in sorted(group(bias, lambda r: (r["clip"], label(r))).items()):
            ok = [r for r in rs if not r.get("error")]
            per_term = defaultdict(list)
            for r in ok:
                for term, v in r["terms"].items():
                    per_term[term].append(v)
            cells = ", ".join(f"{t} {sum(v != 'miss' for v in vs)}/{len(vs)}" for t, vs in per_term.items())
            print(f"| {clip} | {b} | {cells} |")
        print()
        transcripts(bias, label)
        echoed = [r for r in bias if r.get("bias")]
        ok_echo = sum(1 for r in echoed if (r.get("server_session") or {}).get("context_bias") == r["bias"])
        print(f"server echoed the bias list in session.updated: {ok_echo}/{len(echoed)} biased runs\n")
    for experiment in ("bias_extra", "switch", "endonly", "turn"):
        rows = load(experiment)
        if not rows:
            continue
        print(f"## {experiment}\n")
        for r in rows:
            print(
                f"- {r['model']} {r['clip']} run {r['run']} flush={r.get('flush')} +silence {r.get('extra_silence_s')}s: "
                f"done+{r.get('done_from_end_s')}s (after end signal +{r.get('done_from_end_signal_s')}s), "
                f"last delta+{r.get('last_delta_from_end_s')}s, wer={r['wer']:.3f}, languages={r.get('languages')}, "
                f"done.language={r.get('done_language')}, events={r.get('event_counts')}, err={r.get('error')}\n"
                f"  text: {r.get('final_text')!r}"
            )
            if experiment == "turn":
                events = [(e["type"], e.get("time_s"), e.get("end_reason")) for e in r.get("turn_events", [])]
                print(f"  turn events (type, audio time_s, end_reason): {events}")
        print()
    print("## Event types and keys received\n")
    event_names(["models", "delay", "bias", "bias_extra", "switch", "endonly", "turn"])


if __name__ == "__main__":
    main()
