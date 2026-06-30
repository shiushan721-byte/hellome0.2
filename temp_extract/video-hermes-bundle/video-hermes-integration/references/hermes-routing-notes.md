# Hermes Routing Notes

## Front Door

Hermes should behave as if only one public video capability exists:
- `video-producer`

The rest should feel internal unless:
- the operator is debugging
- the user explicitly asks for a specialist
- a workflow requires direct specialist invocation for testing

## Primary Owner Rule

At any point in time, Hermes should choose one primary owner, not many equal owners.

Good:
- `video-producer` -> `video-demo-director`
- `video-producer` -> `video-style-translator` -> `video-speaker-editor`

Bad:
- `video-producer` -> `video-demo-director + video-style-translator + video-motion-designer` all at once with no clear owner

## Recommended Hermes Mental Model

Use this mental model:
- `video-producer` = coordinator
- specialist skill = lane owner
- examples package = evaluator / test oracle

## Typical Routing Patterns

### Idea-heavy

`video-producer` -> `video-concept-architect`

### Reference-led but still execution-bound

`video-producer` -> `video-style-translator` -> execution owner

### Long-form repurposing

`video-producer` -> `video-clips-editor`

### Speaker-led

`video-producer` -> `video-speaker-editor`

### Product / screen proof

`video-producer` -> `video-demo-director`

### Localization

`video-producer` -> `video-localization-producer`

### Motion-first / generated

`video-producer` -> `video-motion-designer`

### Emotional / cinematic

`video-producer` -> `video-story-editor`

## Hermes Error Handling

When Hermes receives a weak downstream result, it should:
1. check whether the lane was wrong
2. check whether the lane was right but under-specified
3. reroute or ask one high-value question

Hermes should not silently accept a stylish but functionally weak return packet.
