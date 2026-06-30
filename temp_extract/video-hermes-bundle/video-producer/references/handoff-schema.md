# Handoff Schema

## Purpose

Use this schema as the portable contract between the front-door orchestrator and downstream video workflows.

## Required Fields

```json
{
  "request_state": "idea | preparation | execution | revision",
  "selected_pipeline": "idea-to-video | reference-style-video | clip-repurpose-video | talking-head-video | screen-demo-video | localized-dub-video | cinematic-montage-video | generated-animation-video | hybrid-video",
  "confidence": 0.0,
  "user_goal": "",
  "audience": "",
  "source_assets": {
    "raw_video": false,
    "raw_audio": false,
    "script": false,
    "screenshots": false,
    "slides_or_docs": false,
    "reference_video": false,
    "brand_assets": false,
    "notes_only": false
  },
  "available_inputs": [],
  "missing_inputs": [],
  "output_spec": {
    "deliverable_type": "",
    "count": 1,
    "duration": "",
    "aspect_ratio": "",
    "platform": "",
    "language": ""
  },
  "style_reference": {
    "provided": false,
    "role": "style | structure | source | mixed | none",
    "notes": ""
  },
  "production_strategy": "",
  "assumptions": [],
  "approval_mode": "ask-before-production | proceed-with-defaults",
  "next_actions": []
}
```

## Field Guidance

- `request_state`: Current stage of the user, not the system.
- `selected_pipeline`: The downstream workflow to invoke next.
- `confidence`: Use `0.0-1.0`. Below `0.65`, ask at least one more routing question unless the user asked you to decide.
- `available_inputs`: Use flat labels such as `founder-selfie-video`, `15-min-podcast-audio`, `product-homepage-url`, `brand-guidelines-pdf`.
- `missing_inputs`: Include only gaps that truly affect execution.
- `production_strategy`: One short paragraph explaining the chosen approach.
- `assumptions`: Make defaults explicit.
- `next_actions`: Imperative steps for the next agent or workflow.

## Example

```json
{
  "request_state": "preparation",
  "selected_pipeline": "clip-repurpose-video",
  "confidence": 0.91,
  "user_goal": "Turn a founder podcast episode into five short Chinese social clips.",
  "audience": "Chinese startup and AI-curious viewers on short-video platforms",
  "source_assets": {
    "raw_video": true,
    "raw_audio": false,
    "script": false,
    "screenshots": false,
    "slides_or_docs": false,
    "reference_video": true,
    "brand_assets": false,
    "notes_only": false
  },
  "available_inputs": [
    "42-minute podcast video",
    "one short-form reference clip"
  ],
  "missing_inputs": [
    "preferred platform priority between Douyin and Xiaohongshu"
  ],
  "output_spec": {
    "deliverable_type": "short clips",
    "count": 5,
    "duration": "30-60 seconds each",
    "aspect_ratio": "9:16",
    "platform": "Douyin/Xiaohongshu",
    "language": "zh-CN"
  },
  "style_reference": {
    "provided": true,
    "role": "style",
    "notes": "Use fast pacing and strong opening hooks from the reference, not a shot-for-shot remake."
  },
  "production_strategy": "Transcribe the source, identify insight-dense moments with clear hooks, shape five independent vertical clips, and carry subtitles plus bold first-three-second framing.",
  "assumptions": [
    "Default to vertical-first social edits",
    "Keep the original speaker voice",
    "Use subtitle-led emphasis rather than heavy motion graphics"
  ],
  "approval_mode": "ask-before-production",
  "next_actions": [
    "Confirm primary platform priority",
    "Transcribe source content",
    "Propose five clip candidates with hook lines"
  ]
}
```
