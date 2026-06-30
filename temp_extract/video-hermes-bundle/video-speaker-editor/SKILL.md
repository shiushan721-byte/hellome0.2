---
name: video-speaker-editor
description: Speaker-led video planning skill that turns talking-head, selfie, presenter, interview, or host footage into a polished edit plan with pacing, framing, subtitle, and emphasis guidance. Use when a real person on camera is the anchor and the main job is shaping clarity, energy, trust, and watchability.
---

# Video Speaker Editor

Polish videos where a real person is the primary reason the audience keeps watching.

Use this skill when the source-of-truth is speaker footage, not a product walkthrough, montage concept, or generated visual system.

## Inputs

Expect a dispatch object that includes:
- user goal
- audience
- source assets
- output spec
- style reference
- success definition

Useful inputs include:
- raw camera footage
- interview recordings
- selfie videos
- transcript or rough script
- brand or caption preferences

## Workflow

1. Evaluate the speaker footage.
2. Choose the editing posture.
3. Plan pacing and structure.
4. Plan framing, emphasis, and subtitles.
5. Return a publishable edit brief.

## Footage Evaluation

First determine:
- whether the speaker is confident, hesitant, high-energy, calm, or overly verbose
- whether the footage is single-camera, multi-angle, or phone-native
- whether the value is authority, intimacy, explanation, persuasion, or reaction
- whether the source is already close to final or needs strong tightening

Do not assume every speaking clip wants the same editing style. Let the speaker role, platform, and trust requirement decide the treatment.

## Editing Posture

Pick one dominant posture:
- `authority-clean`: composed, crisp, credible, minimal distraction
- `creator-punchy`: faster trims, stronger captions, social-first emphasis
- `interview-natural`: preserve conversational rhythm and authenticity
- `sales-conversion`: clarity, proof, CTA discipline, objection-aware pacing
- `educational-guided`: keep the viewer oriented with structural cues

Use [references/edit-postures.md](./references/edit-postures.md) when several are plausible.

## Pacing and Structure

Plan:
- opening line or entry point
- dead-time removal
- thought-unit boundaries
- moments needing pause, punch-in, or support text
- close or CTA behavior

The viewer should feel guided, not aggressively over-edited. If the footage depends on authenticity, leave a little human texture.

## Subtitle and Emphasis Planning

Define:
- caption density
- keyword emphasis strategy
- when to use full subtitles versus selective text
- when reframing or punch-ins help
- whether B-roll, screenshots, or proof overlays are necessary

Detailed subtitle and framing heuristics live in [references/subtitle-and-framing.md](./references/subtitle-and-framing.md).

## Failure and Escalation

Escalate when:
- the footage is too weak to support the requested result
- the real job is localization rather than speaker editing
- the request depends heavily on screen recordings or generated visuals
- there is no coherent speaker narrative to shape

## Output

Return:
- chosen editing posture
- segment or scene map
- pacing notes
- subtitle and emphasis plan
- identified risks and missing inputs
