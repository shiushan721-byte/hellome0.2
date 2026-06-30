---
name: video-system-examples
description: Example-flow skill for the reusable video production system. Use when Codex or another agent needs concrete end-to-end examples of how `video-producer` should clarify requests, choose a downstream skill, emit a dispatch object, interpret downstream returns, and handle reroutes or blockers without relying on real video APIs.
---

# Video System Examples

Use this skill as a reference and testing layer for the reusable video skill system.

This skill does not produce videos. It provides protocol-level examples showing how the front-door orchestrator and downstream specialist skills should collaborate.

## What This Skill Is For

Use it when you need:
- realistic request-to-dispatch examples
- examples of good clarification behavior
- examples of downstream return packets
- reroute and blocker handling examples
- a neutral sample set for porting the system to Hermes or another agent environment

## How To Use It

Start with [references/example-flows.md](./references/example-flows.md) for normal end-to-end flows.

Use [references/example-json-packets.md](./references/example-json-packets.md) when you need canonical dispatch and return packets for each example flow.

Use [references/reroute-examples.md](./references/reroute-examples.md) when testing fallback behavior, weak routing, or midstream ownership changes.

Use [references/review-checklist.md](./references/review-checklist.md) when evaluating whether an agent followed the video system correctly.

Use [references/scoring-rubric.md](./references/scoring-rubric.md) when you need to grade an agent run as acceptable, strong, or rerun-required.

Use [references/adversarial-flows.md](./references/adversarial-flows.md) when stress-testing whether the system over-questions, misroutes, ignores source truth, or fails to reroute under ambiguity.

Use [references/adversarial-json-packets.md](./references/adversarial-json-packets.md) when you need canonical three-part stress-test samples: adversarial dispatch, a representative wrong return, and the corrected return.

Use [references/stress-test-runbook.md](./references/stress-test-runbook.md) when you want to execute, score, and document a repeatable pressure test of the video skill system in Hermes or another agent environment.

## Evaluation Rule

Judge an example run by:
- whether the clarification was minimal but sufficient
- whether the selected downstream owner made sense
- whether the dispatch object was specific
- whether the returned deliverables matched the expected lane
- whether reroutes were handled cleanly when needed

## Portability Rule

Keep examples platform-neutral. They should validate the protocol, not one vendor, model, API, or editor.
