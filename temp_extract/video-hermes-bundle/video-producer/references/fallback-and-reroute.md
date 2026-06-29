# Fallback and Reroute

## Purpose

Use this file when the chosen downstream skill cannot proceed cleanly or when the task reveals a better lane.

## Reroute Triggers

### From `video-concept-architect`

Reroute when:
- the concept is already stable and a specialist should take over
- the real challenge is style translation rather than concept definition

Common reroutes:
- `video-style-translator`
- `video-story-editor`
- `video-motion-designer`

### From `video-style-translator`

Reroute when:
- the reference role is clear and execution should continue in another lane

Common reroutes:
- `video-demo-director`
- `video-speaker-editor`
- `video-motion-designer`
- `video-story-editor`

### From `video-clips-editor`

Reroute when:
- the request is really speaker polishing, not multi-clip extraction
- localization is the primary need

Common reroutes:
- `video-speaker-editor`
- `video-localization-producer`

### From `video-speaker-editor`

Reroute when:
- screen proof or product interaction becomes the main value
- the speaker footage is just one layer inside a more hybrid concept

Common reroutes:
- `video-demo-director`
- `video-hybrid-director`
- `video-story-editor`

### From `video-demo-director`

Reroute when:
- the product is not the main source of truth
- the job is really animation or story-led positioning

Common reroutes:
- `video-motion-designer`
- `video-story-editor`
- `video-hybrid-director`

### From `video-localization-producer`

Reroute when:
- the source needs a real editorial rework before localization

Common reroutes:
- `video-speaker-editor`
- `video-story-editor`
- `video-demo-director`

### From `video-motion-designer`

Reroute when:
- the piece needs a concept pass first
- source footage should actually anchor the work

Common reroutes:
- `video-concept-architect`
- `video-hybrid-director`
- `video-story-editor`

### From `video-story-editor`

Reroute when:
- emotion is not the primary challenge after all
- the work is mostly product, speaker, or animation planning

Common reroutes:
- `video-demo-director`
- `video-speaker-editor`
- `video-motion-designer`

## Fallback Strategy

If a downstream skill is the right lane but inputs are insufficient:
1. keep the same owner
2. surface the missing inputs precisely
3. ask the user only for what unblocks that lane

If the lane itself is wrong:
1. say why
2. propose the next-best owner
3. repackage the job instead of forwarding the raw failure

## Low-Confidence Rule

If routing confidence drops below `0.65` after a downstream review:
- ask one high-value clarifying question, or
- reroute with explicit assumptions if the user previously delegated the choice
