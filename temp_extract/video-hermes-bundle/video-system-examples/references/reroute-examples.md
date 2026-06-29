# Reroute Examples

## 1. Clips Request That Is Really Speaker Editing

### User Request

"Cut this 90-second founder selfie into a better short video."

### Initial Risk

The words "cut into a short video" may look like a clips workflow.

### Better Interpretation

The source is already short and speaker-led. This is usually `video-speaker-editor`, not `video-clips-editor`.

### Expected Behavior

- `video-producer` should route to `video-speaker-editor`, or
- `video-clips-editor` should immediately recommend reroute if it receives the job

## 2. Demo Request That Is Really Concept Work

### User Request

"Make a demo for our product. We don't have a product yet, just mockups and a positioning idea."

### Initial Risk

The word "demo" may trigger `video-demo-director`.

### Better Interpretation

This is concept work first, because the product truth source is not real yet.

### Expected Behavior

- route to `video-concept-architect`
- possibly later hand off to `video-motion-designer` or `video-demo-director`

## 3. Localization Request That Needs Editorial Repair First

### User Request

"Translate this webinar video to English, but it's also too rambling and long."

### Initial Risk

Localization appears primary.

### Better Interpretation

If the structure is broken, editorial repair may need to happen before localization.

### Expected Behavior

- `video-localization-producer` should flag that the source may need editing first
- `video-producer` may reroute to `video-speaker-editor` or `video-story-editor` depending on the asset

## 4. Reference Style Request That Should Not Stay in Style Analysis

### User Request

"Use this reference feel for our product onboarding video."

### Initial Risk

The system may stop at `video-style-translator`.

### Better Interpretation

Style translation is only an intermediate lane. The owning execution lane is still likely `video-demo-director`.

### Expected Behavior

- style translation returns a compact ruleset
- `video-producer` then dispatches the execution owner

## 5. Motion Request That Should Really Be Hybrid

### User Request

"Animate this customer interview with some diagrams and product screenshots."

### Initial Risk

The word "animate" may trigger `video-motion-designer`.

### Better Interpretation

Because interview footage remains central, this is likely hybrid rather than pure motion-first.

### Expected Behavior

- ask whether the interview or the graphics are the anchor
- route to `video-hybrid-director` if the live footage remains primary
