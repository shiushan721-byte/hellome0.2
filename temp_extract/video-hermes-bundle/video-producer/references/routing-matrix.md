# Routing Matrix

## Core Rule

Choose the pipeline that best matches the production reality, not just the wording of the request.

## Pipelines

### `idea-to-video`

Use when the user mostly has a concept and needs the system to define the format, approach, and asset strategy before execution.

Signals:
- "I have an idea"
- "I want something like this"
- no stable assets yet
- likely need concept development

### `reference-style-video`

Use when a reference video is the main decision anchor.

Signals:
- "Make something in this style"
- "Use this as reference"
- pacing, edit grammar, tone, or visual treatment matters more than exact source footage

### `clip-repurpose-video`

Use when long source material should become many short deliverables.

Signals:
- podcast, webinar, livestream, interview, keynote
- request for multiple shorts, highlight clips, hooks, teaser cuts

### `talking-head-video`

Use when a real on-camera speaker is the primary content.

Signals:
- selfie video, host video, interview answer, presenter footage
- needs cleanup, subtitles, jump cuts, reframing, emphasis graphics

### `screen-demo-video`

Use when the main value is showing a workflow, UI, product, browser, app, or terminal.

Signals:
- product demo
- walkthrough
- tutorial
- software feature showcase

### `localized-dub-video`

Use when the primary job is language adaptation of an existing video.

Signals:
- dub, subtitle, translate, localize, multilingual versions, lip-sync to new language

### `cinematic-montage-video`

Use when tone, emotion, mood, and editorial rhythm are the main production challenge.

Signals:
- trailer, manifesto, montage, sizzle, brand film, documentary-feel

### `generated-animation-video`

Use when the visuals must be largely designed, illustrated, motion-graphic, diagrammatic, or generative.

Signals:
- explainer animation
- conceptual visuals
- no footage exists and visuals need to be synthesized

### `hybrid-video`

Use when source footage plus designed/generated support are both central.

Signals:
- product footage plus overlays
- interview plus diagrams
- screen capture plus motion graphics

## Tie-Breakers

- If there is a strong source video with a human speaker, prefer `talking-head-video` unless the real job is localization.
- If there is a long-form source and the user wants multiple outputs, prefer `clip-repurpose-video`.
- If the user gives a style reference but also has strong source footage, use the production pipeline that fits the source and keep `reference-style-video` as a style constraint.
- If no assets exist and the user still wants a finished piece, prefer `idea-to-video` first, then hand off into `generated-animation-video` or `cinematic-montage-video`.
