# Downstream Skill Map

## Purpose

Use this file to map the front-door `video-producer` brief into a backend execution skill. These names are intentionally generic and portable.

## Backend Skill Set

### `video-concept-architect`

Purpose:
- Turn an idea into a production-ready concept
- Choose video format, narrative angle, asset strategy, and first deliverable shape

Use when:
- the user mostly has an idea
- the user says "you decide"
- asset strategy is still undefined

Expected outputs:
- creative brief
- format recommendation
- first-pass production plan

### `video-style-translator`

Purpose:
- Translate a reference video into reusable style guidance
- Separate style, structure, tone, pacing, and shot grammar

Use when:
- reference videos dominate the request
- the user wants inspiration rather than direct copying

Expected outputs:
- style analysis
- adaptation rules
- do-follow / do-not-copy notes

### `video-clips-editor`

Purpose:
- Convert long-form source media into multiple short clips

Use when:
- long video or audio exists
- the user wants highlights, hooks, shorts, reels, teasers, or social cutdowns

Expected outputs:
- clip candidates
- per-clip hooks
- cut list
- packaging notes per platform

### `video-speaker-editor`

Purpose:
- Polish speaker-led or talking-head source footage

Use when:
- a real person on camera is the anchor
- the main work is cleanup, reframing, subtitles, pacing, and emphasis

Expected outputs:
- edit brief
- pacing plan
- subtitle and emphasis overlay plan

### `video-demo-director`

Purpose:
- Produce screen demos, walkthroughs, tutorials, and product showcases

Use when:
- software, browser, app, UI, workflow, or terminal content is the core

Expected outputs:
- capture plan or synthetic demo plan
- beat-by-beat walkthrough
- callout and zoom guidance

### `video-localization-producer`

Purpose:
- Create translated subtitle, dub, or lip-sync versions from existing source video

Use when:
- the primary job is language adaptation

Expected outputs:
- localization brief
- translation rules
- dubbing or subtitle mode selection

### `video-story-editor`

Purpose:
- Build cinematic, mood-led, or montage-led pieces

Use when:
- emotion, tone, rhythm, and editorial shape are primary

Expected outputs:
- beat map
- asset mood plan
- audio and pacing direction

### `video-motion-designer`

Purpose:
- Create animation-first, explainer, diagram, or generated-visual videos

Use when:
- visuals must be designed or generated rather than captured

Expected outputs:
- visual system
- scene plan
- motion approach

### `video-hybrid-director`

Purpose:
- Combine source footage with generated or designed support elements

Use when:
- neither source footage nor designed support alone is sufficient

Expected outputs:
- anchor-medium decision
- support-layer map
- edit/composition plan

## Shared Specialists

These can exist as separate skills or internal modules behind the main backend skills:

- `video-brief-writer`
- `video-script-writer`
- `video-asset-planner`
- `video-subtitle-planner`
- `video-audio-finisher`
- `video-quality-reviewer`
- `video-publish-packager`

## Mapping Rule

Map one selected pipeline to one primary backend skill:

| Pipeline | Primary backend skill |
|---|---|
| `idea-to-video` | `video-concept-architect` |
| `reference-style-video` | `video-style-translator` |
| `clip-repurpose-video` | `video-clips-editor` |
| `talking-head-video` | `video-speaker-editor` |
| `screen-demo-video` | `video-demo-director` |
| `localized-dub-video` | `video-localization-producer` |
| `cinematic-montage-video` | `video-story-editor` |
| `generated-animation-video` | `video-motion-designer` |
| `hybrid-video` | `video-hybrid-director` |

If a request clearly spans two backend skills, choose one primary owner and record the secondary support in the execution plan rather than splitting ownership.
