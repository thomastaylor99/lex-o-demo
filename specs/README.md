# Specs

One folder per stream of work: `specs/<nnn>-<name>/`. The number sets the build order. `000-architecture` frames every stream.

## Lifecycle

1. Brainstorm the stream with Thomas (superpowers `brainstorming` skill): one question at a time, scope settled before design.
2. Write `spec.md` from `_template/spec.md`. Thomas approves it before any plan.
3. Write `plan.md` (superpowers `writing-plans`): small steps, each naming the files it touches and the check that proves it.
4. Track execution in `tasks.md`. Subagents take one task each, in parallel when their files do not overlap. For the demo, the check is `scripts/verify` plus a run by Thomas; there is no per-task review (decided 2026-10-04, see `context/decisions.md`).
5. Done means `scripts/verify` passes, the success criteria are met with evidence, and the spec describes what was built.

## Rules

- `spec.md` covers what and why, `plan.md` covers how, `tasks.md` tracks who does what and in which order.
- A change in behaviour updates the spec in the same change.
- A spec reads in two minutes and points to `context/` files by path.
- Superpowers skills default to `docs/superpowers/`. In this repo, their specs and plans go in the stream's folder here.

## Planned streams

From `000-architecture`: 001 voice core, 002 discovery, 003 journey and UI, 004 camera (if kept), 005 show control.

## Versions

| Version | What the visitor gets | Specs | Target |
|---|---|---|---|
| V0 | The skincare journey by voice, end to end, in the terminal (`backend/scripts/talk.py`) | 001, 002 | done 2026-10-04 |
| V1 | The designed screen in the browser (spec 003), then a haircare expert and presenter controls | 003, 005, 002 extended | 2026-10-05 at the latest |
| V2 | Richer screens and interaction, camera behind a switch | 003, 004 | Night of 2026-10-05, if possible |

2026-10-06 is kept for adjustments and the 15:30 dry run.

A version that spans several streams gets one plan and one task list in `specs/v<n>/`. V0's are `specs/v0/plan.md` and `specs/v0/tasks.md`.
