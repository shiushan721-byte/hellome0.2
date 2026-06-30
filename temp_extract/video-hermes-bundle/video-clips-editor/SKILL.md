---
name: video-clips-editor
description: Short-form repurposing skill that turns long-form source media into multiple clip-ready edits, hook candidates, cut plans, and platform packaging guidance. Use when a user wants to extract reels, shorts, teasers, highlights, quote clips, or social cutdowns from podcasts, webinars, interviews, livestreams, keynotes, or any longer recording.
---

# Video Clips Editor

Turn long-form material into short-form outputs that can survive on their own.

Assume the upstream orchestrator has already selected a clip-repurposing path. If not, use this skill only when the source is clearly long-form and the requested outcome is multiple short deliverables.

## Inputs

Expect a dispatch object that includes:
- user goal
- audience
- source assets
- available inputs
- output spec
- style reference if any
- success definition

If the dispatch object is missing, reconstruct the minimum brief before proceeding.

## Workflow

1. Audit the source.
2. Choose a clip strategy.
3. Identify candidate moments.
4. Shape each clip into a self-contained unit.
5. Package for platform fit.
6. Return a clip plan or execution-ready cut brief.

## Source Audit

First determine:
- what the source actually is: podcast, interview, webinar, keynote, livestream, tutorial, founder monologue
- whether the clip value is insight, emotion, controversy, novelty, proof, or instruction
- whether the source has one strong voice or multiple speakers
- whether usable timestamps or transcripts already exist

Do not pretend every long-form asset should become many clips. If the source is low-signal, repetitive, or badly structured, say so and reduce the target clip count.

## Clip Strategy

Pick one dominant strategy per batch:
- `hook-first`: strongest opening line drives selection
- `insight-first`: compact, valuable ideas drive selection
- `emotion-first`: surprise, tension, or vulnerability drives selection
- `proof-first`: results, demo moments, or evidence drive selection
- `quote-first`: one memorable sentence anchors the clip

Use the audience and platform to break ties.

Detailed selection heuristics live in [references/clip-selection-playbook.md](./references/clip-selection-playbook.md).

## Clip Construction Rules

Each clip should:
- make sense without the full episode
- have a strong first three seconds
- avoid unnecessary preamble
- preserve speaker intent
- end on closure, tension, or a forward handoff

For each chosen clip, define:
- working title
- hook line
- timestamp range
- why it earns its own clip
- subtitle emphasis notes
- visual support notes if needed

## Packaging Rules

Default to the output spec. If the spec is weak, use these starting assumptions:
- `9:16` for social shorts
- subtitle-led packaging for speech-heavy clips
- one core idea per clip
- minimal overlays unless the source needs context

Adapt pacing, line breaks, caption density, and on-screen emphasis to the target platform. Use [references/platform-packaging.md](./references/platform-packaging.md) when platform behavior matters.

## Failure and Escalation

Escalate back to the orchestrator when:
- the source is too weak for the requested number of clips
- the requested platforms imply conflicting packaging styles
- the user wants heavy reconstruction rather than repurposing
- localization or talking-head cleanup is actually the primary task

## Output

Return:
- a short summary of the clip strategy
- a ranked clip shortlist
- platform packaging guidance
- missing dependencies or blockers

When asked for structured output, emit a flat object or markdown table with one row per candidate clip.
