# Hermes Operator Playbook

## Purpose

Use this playbook when setting up or supervising the video skill system inside Hermes.

## Recommended Rollout

### Phase 1: Protocol Validation

Load:
- `video-producer`
- all backend skills
- `video-system-examples`

Run:
- 2 happy-path cases
- 2 reroute cases
- 2 adversarial cases

Success condition:
- Hermes selects sensible owners
- dispatch packets are coherent
- reroutes happen cleanly

### Phase 2: Live Dry Runs

Use real user-style prompts, but do not connect real generation APIs yet.

Success condition:
- the system behaves consistently outside the canned example set

### Phase 3: Tool-Connected Operation

Only after coordination quality is stable should you attach real toolchains such as transcription, captioning, dubbing, or rendering.

## Operator Defaults

- expose only the front door in normal use
- use specialist-only tests in debugging mode
- keep score using the example package rubric

## What To Watch For

- over-questioning when the user has delegated decisions
- keyword routing instead of production-reality routing
- style analysis that never advances into execution
- multiple equal owners with no clear lane
- blockers hidden inside confident language

## Minimal Hermes Deployment Checklist

- `video-producer` loaded
- backend skills loaded
- `video-system-examples` available for scoring
- system prompt updated from `hermes-system-template.md`
- operator understands pass / soft-fail / hard-fail logic

## Suggested Operator Note Format

```text
Run date:
Prompt:
Expected owner:
Actual owner:
Score:
Verdict:
Failure modes:
Fix needed:
```
