# Execution Contracts

## Purpose

Use these contracts so `video-producer` can hand work to downstream skills without relying on one specific codebase.

## Universal Dispatch Envelope

Every downstream handoff should preserve the front-door schema and add four fields:

```json
{
  "dispatch_target": "",
  "dispatch_goal": "",
  "success_definition": [],
  "deliverables": []
}
```

Field guidance:
- `dispatch_target`: the backend skill or workflow name
- `dispatch_goal`: one-sentence job to complete next
- `success_definition`: flat list of outcome checks
- `deliverables`: concrete artifacts expected from the backend skill

## Contract by Backend Skill

### `video-concept-architect`

Dispatch goal:
- Turn a rough concept into an approved video concept and production path.

Success definition:
- Defines the recommended video format
- Identifies audience and objective fit
- Proposes asset strategy
- Produces a brief stable enough for execution routing

Deliverables:
- concept brief
- recommended format
- asset strategy
- production options

### `video-style-translator`

Dispatch goal:
- Analyze the reference and convert it into usable adaptation guidance.

Success definition:
- Distinguishes style from content
- Identifies what to emulate versus avoid copying
- Produces reusable style rules for the next workflow

Deliverables:
- reference analysis
- style rule set
- adaptation notes

### `video-clips-editor`

Dispatch goal:
- Extract and package short-form clips from long-form source material.

Success definition:
- Identifies clip-worthy moments
- Produces clear hook logic per clip
- Matches platform and aspect-ratio needs
- Preserves coherence in each short

Deliverables:
- clip shortlist
- clip script or transcript excerpts
- platform packaging notes

### `video-speaker-editor`

Dispatch goal:
- Turn speaker-led footage into a polished publishable piece.

Success definition:
- Improves pacing and clarity
- Plans subtitles and emphasis moments
- Respects the speaker as the anchor

Deliverables:
- edit plan
- subtitle plan
- scene or segment map

### `video-demo-director`

Dispatch goal:
- Build a clear, convincing demo or walkthrough.

Success definition:
- Chooses real capture or synthetic presentation path
- Structures the viewer journey
- Identifies key beats, callouts, and proof moments

Deliverables:
- demo outline
- capture or synthetic plan
- visual emphasis plan

### `video-localization-producer`

Dispatch goal:
- Adapt an existing video into one or more target languages.

Success definition:
- Protects meaning and terminology
- Preserves timing feasibility
- Chooses subtitle, dub, or lip-sync approach

Deliverables:
- localization brief
- translated script package
- per-language delivery plan

### `video-story-editor`

Dispatch goal:
- Shape a mood-led, montage-led, or cinematic editorial piece.

Success definition:
- Defines emotional progression
- Aligns visuals, pacing, and audio intent
- Produces a beat-driven structure

Deliverables:
- beat map
- visual sourcing plan
- audio direction

### `video-motion-designer`

Dispatch goal:
- Plan and structure an animation-first or generated-visual video.

Success definition:
- Chooses an appropriate motion language
- Matches visuals to explanation needs
- Produces scenes that are feasible to build

Deliverables:
- scene plan
- visual system
- motion direction

### `video-hybrid-director`

Dispatch goal:
- Combine source and designed/generated layers into one coherent production plan.

Success definition:
- Identifies the anchor medium
- Prevents support layers from overwhelming the source
- Produces a clear integration plan

Deliverables:
- hybrid brief
- support-layer map
- composition strategy

## Example Dispatch Object

```json
{
  "request_state": "execution",
  "selected_pipeline": "screen-demo-video",
  "confidence": 0.88,
  "user_goal": "Create a 45-second onboarding demo for our new dashboard.",
  "audience": "new SaaS trial users",
  "source_assets": {
    "raw_video": false,
    "raw_audio": false,
    "script": true,
    "screenshots": true,
    "slides_or_docs": false,
    "reference_video": true,
    "brand_assets": true,
    "notes_only": false
  },
  "available_inputs": [
    "product staging URL",
    "brand kit",
    "draft narration script",
    "reference onboarding demo"
  ],
  "missing_inputs": [],
  "output_spec": {
    "deliverable_type": "product onboarding demo",
    "count": 1,
    "duration": "45 seconds",
    "aspect_ratio": "16:9",
    "platform": "landing page",
    "language": "en"
  },
  "style_reference": {
    "provided": true,
    "role": "style",
    "notes": "Borrow pacing and onboarding clarity, not exact layouts."
  },
  "production_strategy": "Use a demo-first structure with a fast problem-to-solution arc, focused callouts, and a simple CTA ending.",
  "assumptions": [
    "Default to a polished SaaS onboarding tone",
    "Use synthetic capture if live capture is unstable"
  ],
  "approval_mode": "proceed-with-defaults",
  "next_actions": [
    "Create the walkthrough beat map",
    "Choose real or synthetic demo path",
    "Prepare callouts and zoom points"
  ],
  "dispatch_target": "video-demo-director",
  "dispatch_goal": "Turn the approved brief into a capture-ready and edit-ready demo plan.",
  "success_definition": [
    "Chooses the right demo production mode",
    "Maps key beats to product value moments",
    "Produces a clear visual emphasis plan"
  ],
  "deliverables": [
    "demo outline",
    "capture plan",
    "callout plan"
  ]
}
```
