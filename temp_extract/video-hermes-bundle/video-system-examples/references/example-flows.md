# Example Flows

## 1. Rough Idea -> Concept Development

### User Request

"I want a launch video for our AI note-taking app, but I'm not sure whether it should be more like a demo or a vibe piece."

### Expected `video-producer` Behavior

- identify this as `idea` state
- ask 2 to 3 questions about audience, launch goal, and available assets
- avoid choosing a format too early

### Good Clarifying Questions

- "Who is this launch video for first: new users, investors, or existing followers?"
- "Do you already have product footage or only the idea and branding?"
- "Which matters more for this first version: showing how it works or making it feel exciting?"

### Expected Primary Owner

`video-concept-architect`

### Example Dispatch Summary

- goal: define the best launch-video concept
- audience: likely new users
- missing input: whether product footage exists
- probable output: recommended format plus concept package

### Expected Downstream Return

- recommended format
- chosen angle
- asset strategy
- one-paragraph production concept

## 2. Podcast Episode -> Short Clips

### User Request

"Cut this 50-minute founder podcast into 6 strong vertical clips for Douyin and Xiaohongshu."

### Expected `video-producer` Behavior

- identify this as `execution` or late `preparation`
- ask only if platform priority or style reference is missing
- route quickly

### Expected Primary Owner

`video-clips-editor`

### Example Dispatch Object Shape

```json
{
  "selected_pipeline": "clip-repurpose-video",
  "dispatch_target": "video-clips-editor",
  "deliverables": [
    "ranked clip shortlist",
    "hook line per clip",
    "platform packaging notes"
  ]
}
```

### Expected Downstream Return

- ranked shortlist
- one-line hook per clip
- approximate timestamp ranges
- platform-specific packaging notes

## 3. Product Walkthrough -> Demo Plan

### User Request

"Make a 45-second onboarding demo for our dashboard. I have staging access, screenshots, and a rough script."

### Expected `video-producer` Behavior

- identify `execution`
- ask at most one question if audience or distribution surface is missing
- route to demo planning, not concept work

### Expected Primary Owner

`video-demo-director`

### Expected Downstream Return

- demo mode
- beat map
- proof moments
- capture plan

## 4. Selfie Video -> Talking-Head Polish

### User Request

"I recorded a selfie video explaining our new feature. Can you make it feel sharper and more social-friendly?"

### Expected `video-producer` Behavior

- identify `preparation` or `execution`
- ask whether this is for trust/authority or fast social reach if unclear
- route to speaker editing

### Expected Primary Owner

`video-speaker-editor`

### Expected Downstream Return

- editing posture
- segment map
- subtitle plan
- framing/emphasis notes

## 5. Existing Video -> English Localization

### User Request

"We have a Chinese product video and need an English version for overseas customers."

### Expected `video-producer` Behavior

- identify `preparation`
- ask whether subtitle-only, dub, or lip-sync is preferred if not stated
- ask for any glossary or protected terms

### Expected Primary Owner

`video-localization-producer`

### Expected Downstream Return

- localization mode
- terminology notes
- timing risks
- per-language delivery plan

## 6. Reference-Led Request -> Style Translation

### User Request

"I want our founder video to feel like this reference. Not copied, just that same clean confidence."

### Expected `video-producer` Behavior

- recognize that the reference influences execution
- determine if the reference is mainly style, structure, or both
- use style translation before final execution owner if needed

### Expected Primary Owner

`video-style-translator`

### Expected Downstream Return

- style summary
- adaptation rules
- non-copying boundaries
- notes for the likely next owner, probably `video-speaker-editor`

## 7. Abstract Topic -> Motion-First Explainer

### User Request

"Explain how retrieval-augmented generation works in a 60-second animated video."

### Expected `video-producer` Behavior

- identify `idea` or `preparation`
- ask only what affects density, audience, and output style
- route to motion planning rather than demo or speaker lanes

### Expected Primary Owner

`video-motion-designer`

### Expected Downstream Return

- selected visual mode
- visual system
- scene plan
- motion constraints

## 8. Brand Film / Mood Piece -> Story Planning

### User Request

"We want a short brand film about why our team built this company. More emotional than explanatory."

### Expected `video-producer` Behavior

- identify this as story-led
- ask about audience and emotional target if missing
- route to narrative shaping rather than direct demo or speaker editing

### Expected Primary Owner

`video-story-editor`

### Expected Downstream Return

- story shape
- emotional arc
- beat map
- visual/audio role plan
