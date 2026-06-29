---
name: video-style-translator
description: Reference-analysis skill that turns one or more videos into reusable style rules covering pacing, visual grammar, mood, story shape, audio intent, and adaptation boundaries. Use when a user says "make it like this", provides references, or wants inspiration translated into an actionable video direction without copying the original work.
---

# Video Style Translator

Translate references into usable direction. Do not simply praise the reference or describe it vaguely.

Use this skill when reference media is the main source of decision-making and the next step is to extract principles another workflow can apply.

## Inputs

Expect:
- user goal
- audience
- reference video or videos
- output spec if known
- success definition

Useful extra inputs:
- user's own brand or product context
- whether the user wants a close adaptation or loose inspiration

## Workflow

1. Identify the role of the reference.
2. Decompose the style.
3. Separate style from source-specific content.
4. Convert findings into adaptation rules.
5. Return a reusable style brief.

## Reference Role

Clarify whether the reference is mainly:
- `visual-style`
- `edit-grammar`
- `story-structure`
- `tone-and-mood`
- `all-of-the-above`

If the role is unclear and would change the downstream workflow, ask. Otherwise infer and state the assumption.

## Style Decomposition

Analyze:
- pace and cut rhythm
- framing and camera feeling
- graphic density
- typography and text behavior
- sound and music role
- emotional register
- structural arc

Use [references/style-lenses.md](./references/style-lenses.md) to keep the analysis concrete.

## Adaptation Rules

Always produce:
- what to emulate
- what to avoid copying directly
- what can transfer even if the subject matter changes
- what production constraints may block faithful adaptation

The output should be useful to a demo, clips, speaker, story, or motion workflow without needing the original reference open beside it.

## Failure and Escalation

Escalate when:
- the reference is too broad or contradictory
- the user wants a shot-for-shot imitation
- there is not enough context to tell whether the adaptation should stay premium, lean, raw, or brand-safe

## Output

Return:
- reference role
- style summary
- adaptation rule set
- explicit non-copying boundaries
- notes for likely downstream workflows
