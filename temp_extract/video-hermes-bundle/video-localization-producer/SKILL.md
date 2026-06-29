---
name: video-localization-producer
description: Video localization planning skill that converts an existing source video into translated subtitle, dubbed, voiceover, or lip-sync-ready versions with terminology control and timing-aware delivery planning. Use when the main job is adapting a video into another language without losing meaning, clarity, pacing, or audience fit.
---

# Video Localization Producer

Treat localization as adaptation, not mere translation.

Use this skill when an existing source video needs multilingual delivery through subtitles, dubbing, translated on-screen text, or lip-sync planning.

## Inputs

Expect:
- user goal
- source assets
- output spec
- audience
- success definition

Useful inputs include:
- source video
- transcript
- target languages
- glossary or protected terms
- brand voice notes

## Workflow

1. Evaluate the source.
2. Choose the localization mode.
3. Protect meaning and terminology.
4. Plan timing and delivery constraints.
5. Return a per-language execution brief.

## Source Evaluation

Check:
- original language and speaking style
- transcript quality
- on-screen text density
- whether the speaker's mouth visibility matters
- whether the original pacing leaves room for dubbing

If transcript truth is poor, say so early. Bad transcript quality poisons everything downstream.

## Localization Mode

Choose one dominant mode per target language:
- `subtitle-only`
- `voiceover-dub`
- `full-dub`
- `lip-sync-adaptation`
- `hybrid-localization`

Use [references/localization-modes.md](./references/localization-modes.md) when selecting.

## Meaning Protection

Preserve:
- product names
- technical terms
- claims and numbers
- legal or compliance language
- speaker intent and tone

Do not translate literally when the audience needs a more natural localized phrasing. Adapt for understanding while protecting meaning.

## Timing and Delivery Planning

Plan:
- whether translated speech must match the original duration tightly
- whether subtitles should be verbatim or readability-first
- how on-screen text should be replaced, annotated, or left as-is
- where dubbing may need script condensation

Use [references/timing-and-terminology.md](./references/timing-and-terminology.md) for timing-risk checks.

## Failure and Escalation

Escalate when:
- the source transcript is too unreliable
- the user expects lip-sync but the source conditions do not support it well
- the request is actually a fresh re-edit rather than a localization pass
- there are unresolved terminology or compliance risks

## Output

Return:
- selected localization mode per language
- terminology and tone notes
- timing risk notes
- per-language delivery plan
- blockers and review requirements
