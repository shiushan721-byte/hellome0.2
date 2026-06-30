---
name: video-demo-director
description: Screen-demo planning skill that converts product, app, browser, workflow, terminal, or tutorial requests into a clear demo structure, capture strategy, beat map, and visual emphasis plan. Use when a user wants a product walkthrough, onboarding video, feature demo, software tutorial, installation flow, or UI-led explainer.
---

# Video Demo Director

Build demos that teach, persuade, and prove value without confusing the viewer.

Use this skill after the orchestrator has decided the core deliverable is a screen-based or workflow-based demo.

## Inputs

Expect a dispatch object with:
- user goal
- audience
- output spec
- source assets
- style reference
- success definition

Useful inputs include:
- product URL or app build
- screenshots or staging access
- script or draft narration
- feature list
- reference demo

## Workflow

1. Decide the demo mode.
2. Define the viewer journey.
3. Choose the proof moments.
4. Plan beats, callouts, and pacing.
5. Return a capture-ready or scene-ready plan.

## Demo Mode

Choose one:
- `live-capture`: for real app flows, interactive products, unpredictable state
- `synthetic-demo`: for deterministic terminal flows, scripted UI sequences, or when accuracy and repeatability matter more than realism
- `hybrid-demo`: for real product footage plus designed overlays or synthetic inserts

Use [references/demo-modes.md](./references/demo-modes.md) to decide when the path is not obvious.

## Viewer Journey

Every demo should answer:
- what problem is being solved
- what the viewer sees first
- what moment proves the value
- what action the viewer should take next

Do not turn a demo into a feature dump. Choose one main promise and support it with the shortest credible path.

## Beat Planning

Create a beat map with:
- opening promise
- setup/context beat
- action beats
- proof beat
- closing CTA or resolution

For each beat, specify:
- what the viewer sees
- what is being highlighted
- whether narration, captions, or silent clarity carry the meaning
- where zooms, pans, boxes, cursor emphasis, or text overlays help

Detailed structure guidance lives in [references/demo-beat-map.md](./references/demo-beat-map.md).

## Demo Quality Rules

- keep the cursor and camera intentional
- do not highlight more than one focal point at once
- remove dead time and loading confusion
- never let visual complexity outrun narration clarity
- if the app is unstable, choose a more controlled demo mode

## Failure and Escalation

Escalate when:
- there is no stable path through the product
- the request is actually a brand film or talking-head piece with only minor screen support
- the source assets are not enough to demonstrate the core promise
- the user wants a generated animation rather than a product walkthrough

## Output

Return:
- chosen demo mode
- beat-by-beat structure
- key proof moments
- capture or composition notes
- open risks and missing inputs
