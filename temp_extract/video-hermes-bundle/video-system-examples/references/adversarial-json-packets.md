# Adversarial JSON Packets

## Purpose

Each case below includes:
- an adversarial dispatch JSON
- a representative wrong return packet
- a corrected return packet

Use them to test whether an agent can detect a bad lane, avoid shallow keyword matching, and recover into the correct coordination path.

## 1. "Demo" Without a Real Product

### Adversarial Dispatch JSON

```json
{
  "request_state": "idea",
  "selected_pipeline": "screen-demo-video",
  "confidence": 0.58,
  "user_goal": "Make a slick demo video for an AI app.",
  "audience": "prospective users",
  "source_assets": {
    "raw_video": false,
    "raw_audio": false,
    "script": false,
    "screenshots": true,
    "slides_or_docs": false,
    "reference_video": false,
    "brand_assets": true,
    "notes_only": true
  },
  "available_inputs": [
    "landing page",
    "mockups",
    "rough product idea"
  ],
  "missing_inputs": [
    "real product build",
    "real walkthrough path"
  ],
  "output_spec": {
    "deliverable_type": "demo video",
    "count": 1,
    "duration": "30-60 seconds",
    "aspect_ratio": "16:9",
    "platform": "website",
    "language": "en"
  },
  "style_reference": {
    "provided": false,
    "role": "none",
    "notes": ""
  },
  "production_strategy": "Make the app feel polished and real even though the product is early.",
  "assumptions": [
    "Assume a demo path can be built from mockups alone."
  ],
  "approval_mode": "ask-before-production",
  "next_actions": [
    "Create capture plan",
    "Choose demo beats"
  ],
  "dispatch_target": "video-demo-director",
  "dispatch_goal": "Turn the app idea into a polished demo structure.",
  "success_definition": [
    "Creates a convincing demo path",
    "Returns a demo beat map"
  ],
  "deliverables": [
    "demo mode",
    "beat map",
    "capture notes"
  ]
}
```

### Standard Wrong Return

```json
{
  "dispatch_target": "video-demo-director",
  "summary": "Recommend a live-capture walkthrough of the core app flow.",
  "demo_mode": "live-capture",
  "beat_map": [
    "Open in dashboard",
    "Show first task",
    "Show output state"
  ],
  "capture_notes": [
    "Record the product smoothly from the live app"
  ],
  "open_risks": [],
  "blockers": [],
  "reroute_recommendation": ""
}
```

### Correct Return

```json
{
  "dispatch_target": "video-demo-director",
  "summary": "The requested lane is premature because there is no real product walkthrough path yet.",
  "demo_mode": "not-ready",
  "beat_map": [],
  "capture_notes": [],
  "open_risks": [
    "Mockups cannot support an honest live-capture demo"
  ],
  "blockers": [
    "No real product build or validated screen flow exists"
  ],
  "reroute_recommendation": "video-concept-architect"
}
```

## 2. "Cut It Into Clips" When It Is Already One Short Clip

### Adversarial Dispatch JSON

```json
{
  "request_state": "execution",
  "selected_pipeline": "clip-repurpose-video",
  "confidence": 0.61,
  "user_goal": "Cut a 70-second founder selfie into a better short clip.",
  "audience": "social viewers",
  "source_assets": {
    "raw_video": true,
    "raw_audio": false,
    "script": false,
    "screenshots": false,
    "slides_or_docs": false,
    "reference_video": false,
    "brand_assets": false,
    "notes_only": false
  },
  "available_inputs": [
    "70-second selfie video"
  ],
  "missing_inputs": [],
  "output_spec": {
    "deliverable_type": "short social clip",
    "count": 1,
    "duration": "under 70 seconds",
    "aspect_ratio": "9:16",
    "platform": "social media",
    "language": "en"
  },
  "style_reference": {
    "provided": false,
    "role": "none",
    "notes": ""
  },
  "production_strategy": "Make the clip stronger for social.",
  "assumptions": [
    "Assume this should be treated as repurposing."
  ],
  "approval_mode": "proceed-with-defaults",
  "next_actions": [
    "Find multiple clip candidates"
  ],
  "dispatch_target": "video-clips-editor",
  "dispatch_goal": "Extract the strongest short clips from the source.",
  "success_definition": [
    "Returns useful short clip options"
  ],
  "deliverables": [
    "ranked clip shortlist"
  ]
}
```

### Standard Wrong Return

```json
{
  "dispatch_target": "video-clips-editor",
  "summary": "Found three possible clips from the source video.",
  "clip_strategy": "hook-first",
  "clips": [
    {
      "title": "Founder intro",
      "hook_line": "Let me tell you about our feature.",
      "timestamp_range": "00:00-00:18"
    },
    {
      "title": "Main explanation",
      "hook_line": "Here's what it does.",
      "timestamp_range": "00:19-00:46"
    }
  ],
  "platform_notes": [],
  "open_risks": [],
  "blockers": [],
  "reroute_recommendation": ""
}
```

### Correct Return

```json
{
  "dispatch_target": "video-clips-editor",
  "summary": "The source is already one short speaker-led asset, so batch clip extraction is the wrong lane.",
  "clip_strategy": "not-applicable",
  "clips": [],
  "platform_notes": [],
  "open_risks": [
    "The material likely supports one polished cut, not multiple independent clips"
  ],
  "blockers": [],
  "reroute_recommendation": "video-speaker-editor"
}
```

## 3. Reference Video That Is Actually the Source Asset

### Adversarial Dispatch JSON

```json
{
  "request_state": "revision",
  "selected_pipeline": "reference-style-video",
  "confidence": 0.63,
  "user_goal": "Use this video as the base and make it feel more premium.",
  "audience": "prospective customers",
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
    "current video file"
  ],
  "missing_inputs": [
    "whether this file is inspiration only or the editable source"
  ],
  "output_spec": {
    "deliverable_type": "premium-feeling revised video",
    "count": 1,
    "duration": "same as source",
    "aspect_ratio": "same as source",
    "platform": "marketing",
    "language": "en"
  },
  "style_reference": {
    "provided": true,
    "role": "mixed",
    "notes": "The same video may be both source and reference."
  },
  "production_strategy": "Improve quality and perceived polish.",
  "assumptions": [
    "Assume the file is a style reference."
  ],
  "approval_mode": "ask-before-production",
  "next_actions": [
    "Extract style rules"
  ],
  "dispatch_target": "video-style-translator",
  "dispatch_goal": "Turn the reference into style rules.",
  "success_definition": [
    "Returns premium-style guidance"
  ],
  "deliverables": [
    "style summary",
    "adaptation rules"
  ]
}
```

### Standard Wrong Return

```json
{
  "dispatch_target": "video-style-translator",
  "summary": "The video feels premium because it uses cleaner pacing and restrained text.",
  "reference_role": "style",
  "style_summary": [
    "clean pacing",
    "restrained overlays"
  ],
  "adaptation_rules": [
    "use less text",
    "hold on shots longer"
  ],
  "non_copying_boundaries": [],
  "next_owner_notes": [],
  "open_risks": [],
  "blockers": [],
  "reroute_recommendation": ""
}
```

### Correct Return

```json
{
  "dispatch_target": "video-style-translator",
  "summary": "The current packet is ambiguous because the video appears to be the editable source asset, not just an inspiration reference.",
  "reference_role": "mixed",
  "style_summary": [
    "clean pacing",
    "restrained overlays"
  ],
  "adaptation_rules": [
    "keep text minimal if the edit lane remains premium and trust-led"
  ],
  "non_copying_boundaries": [],
  "next_owner_notes": [
    "Clarify whether this file is the asset being re-edited"
  ],
  "open_risks": [
    "Wrong lane if this is actually a source-edit request"
  ],
  "blockers": [
    "Cannot finalize owner until source-vs-reference role is clarified"
  ],
  "reroute_recommendation": "video-speaker-editor or video-story-editor after clarification"
}
```

## 4. Localization Request With Hidden Editorial Problems

### Adversarial Dispatch JSON

```json
{
  "request_state": "preparation",
  "selected_pipeline": "localized-dub-video",
  "confidence": 0.67,
  "user_goal": "Translate this webinar to English, but people say it is too long and rambly.",
  "audience": "English-speaking prospects",
  "source_assets": {
    "raw_video": true,
    "raw_audio": false,
    "script": false,
    "screenshots": false,
    "slides_or_docs": false,
    "reference_video": false,
    "brand_assets": false,
    "notes_only": false
  },
  "available_inputs": [
    "webinar recording"
  ],
  "missing_inputs": [
    "whether the English version should preserve full length"
  ],
  "output_spec": {
    "deliverable_type": "English webinar version",
    "count": 1,
    "duration": "unknown",
    "aspect_ratio": "same as source",
    "platform": "web",
    "language": "en"
  },
  "style_reference": {
    "provided": false,
    "role": "none",
    "notes": ""
  },
  "production_strategy": "Translate the webinar for English viewers.",
  "assumptions": [
    "Assume localization is the only primary task."
  ],
  "approval_mode": "ask-before-production",
  "next_actions": [
    "Choose localization mode",
    "Draft translated script"
  ],
  "dispatch_target": "video-localization-producer",
  "dispatch_goal": "Create the English localization plan.",
  "success_definition": [
    "Returns a clean localization approach"
  ],
  "deliverables": [
    "localization mode",
    "delivery plan"
  ]
}
```

### Standard Wrong Return

```json
{
  "dispatch_target": "video-localization-producer",
  "summary": "Recommend full English subtitles and voiceover dubbing.",
  "localization_mode": {
    "en": "voiceover-dub"
  },
  "terminology_notes": [],
  "timing_risks": [],
  "delivery_plan": [
    "Transcribe",
    "Translate",
    "Dub"
  ],
  "open_risks": [],
  "blockers": [],
  "reroute_recommendation": ""
}
```

### Correct Return

```json
{
  "dispatch_target": "video-localization-producer",
  "summary": "Localization alone will not solve the user's stated pacing problem; the source likely needs editorial tightening first.",
  "localization_mode": {
    "en": "undecided"
  },
  "terminology_notes": [],
  "timing_risks": [
    "Translating a rambly source may preserve the same structural weakness in another language"
  ],
  "delivery_plan": [
    "Clarify whether the English version should be shortened",
    "Consider editorial pass before localization"
  ],
  "open_risks": [
    "Wrong ordering if translation happens before structural cleanup"
  ],
  "blockers": [],
  "reroute_recommendation": "video-speaker-editor or video-story-editor"
}
```

## 5. Animation Request That Is Really Hybrid

### Adversarial Dispatch JSON

```json
{
  "request_state": "preparation",
  "selected_pipeline": "generated-animation-video",
  "confidence": 0.62,
  "user_goal": "Animate this customer interview with charts and screenshots so it feels dynamic.",
  "audience": "prospective customers",
  "source_assets": {
    "raw_video": true,
    "raw_audio": false,
    "script": false,
    "screenshots": true,
    "slides_or_docs": false,
    "reference_video": false,
    "brand_assets": false,
    "notes_only": false
  },
  "available_inputs": [
    "customer interview footage",
    "charts",
    "screenshots"
  ],
  "missing_inputs": [
    "whether interview footage remains the anchor medium"
  ],
  "output_spec": {
    "deliverable_type": "dynamic customer story video",
    "count": 1,
    "duration": "60-90 seconds",
    "aspect_ratio": "16:9",
    "platform": "marketing",
    "language": "en"
  },
  "style_reference": {
    "provided": false,
    "role": "none",
    "notes": ""
  },
  "production_strategy": "Use motion to increase energy.",
  "assumptions": [
    "Assume the video should be treated as animation-first."
  ],
  "approval_mode": "ask-before-production",
  "next_actions": [
    "Choose visual mode",
    "Plan scenes"
  ],
  "dispatch_target": "video-motion-designer",
  "dispatch_goal": "Plan the animated structure for the piece.",
  "success_definition": [
    "Returns a strong motion system"
  ],
  "deliverables": [
    "visual mode",
    "scene plan"
  ]
}
```

### Standard Wrong Return

```json
{
  "dispatch_target": "video-motion-designer",
  "summary": "Recommend a kinetic mixed-system with animated charts driving the story.",
  "visual_mode": "mixed-system",
  "visual_system": [
    "animated charts",
    "kinetic type"
  ],
  "scene_plan": [
    "Open with chart",
    "Add quote overlays",
    "End on numbers"
  ],
  "motion_constraints": [],
  "open_risks": [],
  "blockers": [],
  "reroute_recommendation": ""
}
```

### Correct Return

```json
{
  "dispatch_target": "video-motion-designer",
  "summary": "The request likely needs a hybrid owner because live interview footage appears to remain the truth source.",
  "visual_mode": "not-primary-owner",
  "visual_system": [],
  "scene_plan": [],
  "motion_constraints": [
    "Motion should support the interview rather than replace its ownership"
  ],
  "open_risks": [
    "Pure motion treatment may overpower the speaker-led credibility"
  ],
  "blockers": [],
  "reroute_recommendation": "video-hybrid-director"
}
```

## 6. Style-Led Request That Should Not Stop at Style

### Adversarial Dispatch JSON

```json
{
  "request_state": "preparation",
  "selected_pipeline": "reference-style-video",
  "confidence": 0.81,
  "user_goal": "Make our onboarding video feel like this Apple-style reference.",
  "audience": "new product users",
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
    "script",
    "screenshots",
    "reference video"
  ],
  "missing_inputs": [],
  "output_spec": {
    "deliverable_type": "onboarding video",
    "count": 1,
    "duration": "45 seconds",
    "aspect_ratio": "16:9",
    "platform": "landing page",
    "language": "en"
  },
  "style_reference": {
    "provided": true,
    "role": "style",
    "notes": "Premium onboarding reference"
  },
  "production_strategy": "Borrow premium reference language for onboarding.",
  "assumptions": [
    "Assume style extraction is the main task."
  ],
  "approval_mode": "proceed-with-defaults",
  "next_actions": [
    "Extract style rules"
  ],
  "dispatch_target": "video-style-translator",
  "dispatch_goal": "Translate the reference into style guidance.",
  "success_definition": [
    "Returns useful style rules"
  ],
  "deliverables": [
    "style summary",
    "adaptation rules"
  ]
}
```

### Standard Wrong Return

```json
{
  "dispatch_target": "video-style-translator",
  "summary": "Use slow confidence, sparse text, and clean transitions.",
  "reference_role": "style",
  "style_summary": [
    "premium pacing",
    "sparse overlays"
  ],
  "adaptation_rules": [
    "be clean",
    "be premium"
  ],
  "non_copying_boundaries": [],
  "next_owner_notes": [],
  "open_risks": [],
  "blockers": [],
  "reroute_recommendation": ""
}
```

### Correct Return

```json
{
  "dispatch_target": "video-style-translator",
  "summary": "Style extraction is useful here, but it is only an intermediate pass before demo execution.",
  "reference_role": "style",
  "style_summary": [
    "measured pacing",
    "clean composition",
    "low graphic clutter"
  ],
  "adaptation_rules": [
    "keep onboarding steps visually calm",
    "avoid dense text overlays",
    "let one proof moment breathe"
  ],
  "non_copying_boundaries": [
    "Do not mimic exact shot order or layout"
  ],
  "next_owner_notes": [
    "Apply these rules in the onboarding execution lane"
  ],
  "open_risks": [],
  "blockers": [],
  "reroute_recommendation": "video-demo-director"
}
```

## 7. User Says "You Decide" and the Agent Still Over-Questions

### Adversarial Dispatch JSON

```json
{
  "request_state": "idea",
  "selected_pipeline": "idea-to-video",
  "confidence": 0.73,
  "user_goal": "We need something good for launch.",
  "audience": "unknown",
  "source_assets": {
    "raw_video": false,
    "raw_audio": false,
    "script": false,
    "screenshots": false,
    "slides_or_docs": false,
    "reference_video": false,
    "brand_assets": false,
    "notes_only": true
  },
  "available_inputs": [
    "rough launch intent"
  ],
  "missing_inputs": [
    "audience",
    "distribution channel",
    "asset reality",
    "format preference"
  ],
  "output_spec": {
    "deliverable_type": "launch video",
    "count": 1,
    "duration": "unknown",
    "aspect_ratio": "unknown",
    "platform": "unknown",
    "language": "unknown"
  },
  "style_reference": {
    "provided": false,
    "role": "none",
    "notes": ""
  },
  "production_strategy": "Define the best launch path with minimal friction.",
  "assumptions": [
    "The user delegated a meaningful amount of choice authority."
  ],
  "approval_mode": "ask-before-production",
  "next_actions": [
    "Ask only the highest-leverage questions",
    "Choose a concept direction quickly"
  ],
  "dispatch_target": "video-concept-architect",
  "dispatch_goal": "Turn the broad launch desire into a viable concept.",
  "success_definition": [
    "Narrows the concept with minimal friction"
  ],
  "deliverables": [
    "recommended format",
    "chosen angle"
  ]
}
```

### Standard Wrong Return

```json
{
  "dispatch_target": "video-concept-architect",
  "summary": "Need more information before continuing.",
  "recommended_format": "",
  "chosen_angle": "",
  "audience_fit_rationale": "",
  "asset_strategy": "",
  "production_concept": "",
  "fallback_concepts": [],
  "open_risks": [
    "Need answers to target audience, brand tone, duration, platform, founder availability, product footage, competitor references, campaign timing, and budget."
  ],
  "blockers": [
    "Too many unknowns to proceed"
  ],
  "reroute_recommendation": ""
}
```

### Correct Return

```json
{
  "dispatch_target": "video-concept-architect",
  "summary": "Given delegated choice, the right move is to narrow to one practical launch direction rather than over-question.",
  "recommended_format": "hybrid-showcase",
  "chosen_angle": "Why this product matters now",
  "audience_fit_rationale": "A launch audience usually needs both emotional framing and one layer of concrete proof.",
  "asset_strategy": "hybrid",
  "production_concept": "Lead with the launch promise, support it with one simple proof layer, and keep the first version broad enough to travel across launch surfaces.",
  "fallback_concepts": [
    "founder-led launch message"
  ],
  "open_risks": [
    "Still need later confirmation of primary distribution surface"
  ],
  "blockers": [],
  "reroute_recommendation": ""
}
```

## 8. Product Demo Request That Is Actually a Brand Film

### Adversarial Dispatch JSON

```json
{
  "request_state": "idea",
  "selected_pipeline": "screen-demo-video",
  "confidence": 0.6,
  "user_goal": "We need a product video, but it is really about making people feel why we exist.",
  "audience": "prospective customers and partners",
  "source_assets": {
    "raw_video": false,
    "raw_audio": false,
    "script": false,
    "screenshots": true,
    "slides_or_docs": false,
    "reference_video": true,
    "brand_assets": true,
    "notes_only": true
  },
  "available_inputs": [
    "brand notes",
    "screenshots",
    "reference mood videos"
  ],
  "missing_inputs": [
    "whether feature explanation matters at all in the first cut"
  ],
  "output_spec": {
    "deliverable_type": "product video",
    "count": 1,
    "duration": "45-60 seconds",
    "aspect_ratio": "16:9",
    "platform": "website",
    "language": "en"
  },
  "style_reference": {
    "provided": true,
    "role": "tone-and-mood",
    "notes": "Emotion-first references"
  },
  "production_strategy": "Create a product video with emotional resonance.",
  "assumptions": [
    "Assume product equals demo lane."
  ],
  "approval_mode": "ask-before-production",
  "next_actions": [
    "Create demo structure"
  ],
  "dispatch_target": "video-demo-director",
  "dispatch_goal": "Plan the product video structure.",
  "success_definition": [
    "Returns a product-video plan"
  ],
  "deliverables": [
    "beat map"
  ]
}
```

### Standard Wrong Return

```json
{
  "dispatch_target": "video-demo-director",
  "summary": "Open with product UI, then walk through the main feature set.",
  "demo_mode": "hybrid-demo",
  "beat_map": [
    "Open on product",
    "Show feature one",
    "Show feature two",
    "Close with CTA"
  ],
  "proof_moments": [
    "feature reveal"
  ],
  "capture_notes": [],
  "open_risks": [],
  "blockers": [],
  "reroute_recommendation": ""
}
```

### Correct Return

```json
{
  "dispatch_target": "video-demo-director",
  "summary": "The brief's primary challenge is emotional positioning, not walkthrough clarity, so demo planning is not the best primary lane.",
  "demo_mode": "not-primary-owner",
  "beat_map": [],
  "proof_moments": [],
  "capture_notes": [],
  "open_risks": [
    "Feature walkthrough logic may dilute the emotional objective"
  ],
  "blockers": [],
  "reroute_recommendation": "video-story-editor or video-concept-architect"
}
```

## 9. Multi-Owner Request That Needs One Primary Owner

### Adversarial Dispatch JSON

```json
{
  "request_state": "preparation",
  "selected_pipeline": "hybrid-video",
  "confidence": 0.57,
  "user_goal": "Make a founder video that also uses product screens, animated diagrams, and could be localized later.",
  "audience": "prospects",
  "source_assets": {
    "raw_video": true,
    "raw_audio": false,
    "script": false,
    "screenshots": true,
    "slides_or_docs": false,
    "reference_video": false,
    "brand_assets": false,
    "notes_only": false
  },
  "available_inputs": [
    "founder footage",
    "product screens"
  ],
  "missing_inputs": [
    "anchor medium",
    "whether localization is phase one or later"
  ],
  "output_spec": {
    "deliverable_type": "mixed-format marketing video",
    "count": 1,
    "duration": "60 seconds",
    "aspect_ratio": "16:9",
    "platform": "marketing",
    "language": "en"
  },
  "style_reference": {
    "provided": false,
    "role": "none",
    "notes": ""
  },
  "production_strategy": "Combine several strengths in one piece.",
  "assumptions": [
    "Assume all these needs can be co-owned equally."
  ],
  "approval_mode": "ask-before-production",
  "next_actions": [
    "Pick a structure"
  ],
  "dispatch_target": "video-hybrid-director",
  "dispatch_goal": "Plan the mixed-format video.",
  "success_definition": [
    "Creates a usable integration plan"
  ],
  "deliverables": [
    "integration plan"
  ]
}
```

### Standard Wrong Return

```json
{
  "dispatch_target": "video-hybrid-director",
  "summary": "This will be handled by speaker editing, demo planning, motion design, and localization together.",
  "anchor_medium": "",
  "support_layer_map": [],
  "integration_plan": [
    "all owners collaborate equally"
  ],
  "open_risks": [],
  "blockers": [],
  "reroute_recommendation": ""
}
```

### Correct Return

```json
{
  "dispatch_target": "video-hybrid-director",
  "summary": "The brief needs one primary owner chosen around the anchor medium before secondary layers are assigned.",
  "anchor_medium": "undecided",
  "support_layer_map": [
    "founder footage may be primary",
    "product screens and diagrams likely support layers",
    "localization likely belongs to a later pass"
  ],
  "integration_plan": [
    "Clarify whether the founder or the product is the main truth source",
    "Assign one owner now",
    "Treat localization as downstream, not co-equal phase-one ownership"
  ],
  "open_risks": [
    "No primary lane selected yet"
  ],
  "blockers": [
    "Need anchor-medium decision before specialization can stabilize"
  ],
  "reroute_recommendation": "video-speaker-editor if founder is anchor; video-demo-director if product is anchor"
}
```

## 10. Contradictory Output Constraints

### Adversarial Dispatch JSON

```json
{
  "request_state": "idea",
  "selected_pipeline": "cinematic-montage-video",
  "confidence": 0.55,
  "user_goal": "Make it cinematic, super informative, under 20 seconds, and suitable for YouTube, TikTok, and investor presentations.",
  "audience": "broad mixed audience",
  "source_assets": {
    "raw_video": false,
    "raw_audio": false,
    "script": false,
    "screenshots": false,
    "slides_or_docs": false,
    "reference_video": false,
    "brand_assets": false,
    "notes_only": true
  },
  "available_inputs": [
    "rough idea"
  ],
  "missing_inputs": [
    "which goal outranks the others"
  ],
  "output_spec": {
    "deliverable_type": "multi-surface launch video",
    "count": 1,
    "duration": "under 20 seconds",
    "aspect_ratio": "multi-format",
    "platform": "YouTube/TikTok/investor deck",
    "language": "en"
  },
  "style_reference": {
    "provided": false,
    "role": "none",
    "notes": ""
  },
  "production_strategy": "Try to satisfy all constraints in one artifact.",
  "assumptions": [
    "Assume all output goals can fit one version."
  ],
  "approval_mode": "ask-before-production",
  "next_actions": [
    "Shape the concept"
  ],
  "dispatch_target": "video-concept-architect",
  "dispatch_goal": "Create a concept satisfying all constraints.",
  "success_definition": [
    "Returns one concept that fits everything"
  ],
  "deliverables": [
    "recommended format",
    "chosen angle"
  ]
}
```

### Standard Wrong Return

```json
{
  "dispatch_target": "video-concept-architect",
  "summary": "Recommend a cinematic, highly informative 20-second master video for all platforms.",
  "recommended_format": "cinematic-montage",
  "chosen_angle": "Everything everywhere at once",
  "audience_fit_rationale": "A single asset can satisfy all audiences if paced well enough.",
  "asset_strategy": "hybrid",
  "production_concept": "Pack emotional story, product proof, and investor clarity into one short piece.",
  "fallback_concepts": [],
  "open_risks": [],
  "blockers": [],
  "reroute_recommendation": ""
}
```

### Correct Return

```json
{
  "dispatch_target": "video-concept-architect",
  "summary": "The brief contains conflicting constraints that should not be accepted as one unquestioned master output.",
  "recommended_format": "",
  "chosen_angle": "",
  "audience_fit_rationale": "",
  "asset_strategy": "",
  "production_concept": "",
  "fallback_concepts": [
    "one hero emotional version plus derived variants",
    "one short social cut and one separate investor-facing cut"
  ],
  "open_risks": [
    "Under-20-seconds, cinematic tone, high information density, and multi-surface suitability conflict"
  ],
  "blockers": [
    "Need priority clarification on which goal wins"
  ],
  "reroute_recommendation": ""
}
```
