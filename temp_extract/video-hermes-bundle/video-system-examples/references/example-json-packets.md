# Example JSON Packets

## 1. Rough Idea -> Concept Development

### Standard Dispatch JSON

```json
{
  "request_state": "idea",
  "selected_pipeline": "idea-to-video",
  "confidence": 0.79,
  "user_goal": "Create the right launch video concept for an AI note-taking app.",
  "audience": "new users evaluating whether the product feels useful and exciting",
  "source_assets": {
    "raw_video": false,
    "raw_audio": false,
    "script": false,
    "screenshots": false,
    "slides_or_docs": false,
    "reference_video": false,
    "brand_assets": true,
    "notes_only": true
  },
  "available_inputs": [
    "product description",
    "brand direction",
    "rough launch intent"
  ],
  "missing_inputs": [
    "whether any product footage exists",
    "whether launch priority is excitement or product understanding"
  ],
  "output_spec": {
    "deliverable_type": "launch video concept",
    "count": 1,
    "duration": "30-60 seconds",
    "aspect_ratio": "undecided",
    "platform": "undecided",
    "language": "en"
  },
  "style_reference": {
    "provided": false,
    "role": "none",
    "notes": ""
  },
  "production_strategy": "Choose the strongest launch-video format before committing to execution, with emphasis on audience fit and asset realism.",
  "assumptions": [
    "Assume this is an early launch-stage request rather than a fully prepared production brief."
  ],
  "approval_mode": "ask-before-production",
  "next_actions": [
    "Clarify launch objective",
    "Clarify available assets",
    "Recommend the best video format"
  ],
  "dispatch_target": "video-concept-architect",
  "dispatch_goal": "Turn the rough launch idea into a production-ready concept and format choice.",
  "success_definition": [
    "Defines the best video format for the launch goal",
    "Explains why the chosen angle fits the audience",
    "Chooses a realistic asset strategy"
  ],
  "deliverables": [
    "recommended format",
    "chosen angle",
    "asset strategy",
    "production concept"
  ]
}
```

### Standard Return JSON

```json
{
  "dispatch_target": "video-concept-architect",
  "summary": "Recommend a hybrid launch video that opens with emotional promise and quickly proves the product through a small number of product moments.",
  "recommended_format": "hybrid-showcase",
  "chosen_angle": "From scattered notes to calm clarity in seconds",
  "audience_fit_rationale": "New users need both emotional pull and immediate product comprehension.",
  "asset_strategy": "hybrid",
  "production_concept": "Open on the pain of messy ideas, pivot into the app as a calming transformation tool, and support the promise with a few crisp product moments.",
  "fallback_concepts": [
    "product-demo-led launch cut",
    "founder-led launch message"
  ],
  "open_risks": [
    "Need to confirm whether real product capture exists"
  ],
  "blockers": [],
  "reroute_recommendation": "video-demo-director if real product proof is prioritized; video-motion-designer if product footage does not exist."
}
```

## 2. Podcast Episode -> Short Clips

### Standard Dispatch JSON

```json
{
  "request_state": "execution",
  "selected_pipeline": "clip-repurpose-video",
  "confidence": 0.94,
  "user_goal": "Turn a 50-minute founder podcast into 6 vertical short clips for Douyin and Xiaohongshu.",
  "audience": "Chinese startup and tech-curious short-video viewers",
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
    "50-minute podcast video"
  ],
  "missing_inputs": [
    "platform priority if packaging should differ between Douyin and Xiaohongshu"
  ],
  "output_spec": {
    "deliverable_type": "short social clips",
    "count": 6,
    "duration": "30-60 seconds each",
    "aspect_ratio": "9:16",
    "platform": "Douyin/Xiaohongshu",
    "language": "zh-CN"
  },
  "style_reference": {
    "provided": false,
    "role": "none",
    "notes": ""
  },
  "production_strategy": "Extract insight-dense and hook-strong moments that can survive independently as vertical clips.",
  "assumptions": [
    "Default to subtitle-led vertical packaging",
    "Default to one core insight per clip"
  ],
  "approval_mode": "ask-before-production",
  "next_actions": [
    "Transcribe the source",
    "Identify candidate moments",
    "Package the strongest six"
  ],
  "dispatch_target": "video-clips-editor",
  "dispatch_goal": "Extract six strong vertical clips from the long-form source.",
  "success_definition": [
    "Finds moments with standalone hook value",
    "Matches vertical social packaging needs",
    "Returns a ranked shortlist with clip logic"
  ],
  "deliverables": [
    "ranked clip shortlist",
    "hook line per clip",
    "platform packaging notes"
  ]
}
```

### Standard Return JSON

```json
{
  "dispatch_target": "video-clips-editor",
  "summary": "Selected six clips centered on founder insight, tension, and useful examples, all viable as independent vertical cuts.",
  "clip_strategy": "insight-first",
  "clips": [
    {
      "title": "Why most founders drown in busywork",
      "hook_line": "Most founders are not short on ideas. They're short on clean thinking time.",
      "timestamp_range": "00:03:10-00:03:52",
      "packaging_notes": "Fast subtitle emphasis; open immediately on the first sentence."
    },
    {
      "title": "The note-taking mistake that compounds daily",
      "hook_line": "The problem is not taking notes. It's never finding them again when they matter.",
      "timestamp_range": "00:08:41-00:09:19",
      "packaging_notes": "Use slightly slower subtitle pacing for clarity."
    }
  ],
  "platform_notes": [
    "Douyin versions can open more aggressively",
    "Xiaohongshu versions can keep one extra clarifying line"
  ],
  "open_risks": [
    "Some candidate moments need transcript cleanup before final subtitle timing"
  ],
  "blockers": [],
  "reroute_recommendation": ""
}
```

## 3. Product Walkthrough -> Demo Plan

### Standard Dispatch JSON

```json
{
  "request_state": "execution",
  "selected_pipeline": "screen-demo-video",
  "confidence": 0.92,
  "user_goal": "Create a 45-second onboarding demo for the dashboard.",
  "audience": "new trial users",
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
    "staging access",
    "screenshots",
    "rough script",
    "reference onboarding demo"
  ],
  "missing_inputs": [],
  "output_spec": {
    "deliverable_type": "onboarding demo",
    "count": 1,
    "duration": "45 seconds",
    "aspect_ratio": "16:9",
    "platform": "landing page",
    "language": "en"
  },
  "style_reference": {
    "provided": true,
    "role": "style",
    "notes": "Borrow clean onboarding pacing, not exact layout."
  },
  "production_strategy": "Use a proof-first walkthrough that gets to the first meaningful action quickly.",
  "assumptions": [
    "Default to polished SaaS onboarding tone"
  ],
  "approval_mode": "proceed-with-defaults",
  "next_actions": [
    "Choose demo mode",
    "Map proof moments",
    "Prepare capture plan"
  ],
  "dispatch_target": "video-demo-director",
  "dispatch_goal": "Turn the product brief into a capture-ready and edit-ready demo structure.",
  "success_definition": [
    "Chooses the right demo mode",
    "Builds a clear beat map",
    "Identifies proof moments and emphasis notes"
  ],
  "deliverables": [
    "demo mode",
    "beat map",
    "proof moments",
    "capture plan"
  ]
}
```

### Standard Return JSON

```json
{
  "dispatch_target": "video-demo-director",
  "summary": "Recommend a live-capture demo with one fast promise, one key setup action, and a clear product payoff beat.",
  "demo_mode": "live-capture",
  "beat_map": [
    "Hook: show the dashboard's instant clarity benefit",
    "Context: orient the viewer to the main workspace",
    "Action: complete the first meaningful task",
    "Proof: show the outcome in one glance",
    "Close: direct the viewer to try it"
  ],
  "proof_moments": [
    "first task completion",
    "dashboard transformation state"
  ],
  "capture_notes": [
    "Avoid cursor wandering before the first action",
    "Cut any loading or unstable states"
  ],
  "open_risks": [
    "Staging data quality may affect realism"
  ],
  "blockers": [],
  "reroute_recommendation": ""
}
```

## 4. Selfie Video -> Talking-Head Polish

### Standard Dispatch JSON

```json
{
  "request_state": "execution",
  "selected_pipeline": "talking-head-video",
  "confidence": 0.9,
  "user_goal": "Polish a selfie feature-update video so it feels sharper and more social-friendly.",
  "audience": "existing followers and current users",
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
    "selfie video recording"
  ],
  "missing_inputs": [
    "whether the goal is trust/authority or maximum short-form reach"
  ],
  "output_spec": {
    "deliverable_type": "speaker-led social update",
    "count": 1,
    "duration": "30-90 seconds",
    "aspect_ratio": "9:16",
    "platform": "social media",
    "language": "en"
  },
  "style_reference": {
    "provided": false,
    "role": "none",
    "notes": ""
  },
  "production_strategy": "Tighten the speaker's delivery while preserving authenticity and making the message land faster.",
  "assumptions": [
    "Default to creator-punchy posture unless trust-heavy positioning is required"
  ],
  "approval_mode": "proceed-with-defaults",
  "next_actions": [
    "Choose editing posture",
    "Map thought units",
    "Plan subtitles and emphasis"
  ],
  "dispatch_target": "video-speaker-editor",
  "dispatch_goal": "Turn the selfie source into a polished speaker-led edit plan.",
  "success_definition": [
    "Chooses the right editing posture",
    "Improves pacing without killing authenticity",
    "Returns subtitle and framing guidance"
  ],
  "deliverables": [
    "editing posture",
    "segment map",
    "subtitle plan",
    "framing notes"
  ]
}
```

### Standard Return JSON

```json
{
  "dispatch_target": "video-speaker-editor",
  "summary": "Recommend a creator-punchy treatment with tighter openings, visible subtitle emphasis, and modest punch-ins.",
  "editing_posture": "creator-punchy",
  "segment_map": [
    "Immediate feature hook",
    "Quick problem statement",
    "Feature explanation",
    "User benefit close"
  ],
  "subtitle_plan": [
    "Use full subtitles",
    "Emphasize only benefit-heavy keywords"
  ],
  "framing_notes": [
    "Punch in after the opening line",
    "Keep the face readable during the benefit statement"
  ],
  "open_risks": [
    "If the footage audio is weak, pacing alone will not fully save it"
  ],
  "blockers": [],
  "reroute_recommendation": ""
}
```

## 5. Existing Video -> English Localization

### Standard Dispatch JSON

```json
{
  "request_state": "preparation",
  "selected_pipeline": "localized-dub-video",
  "confidence": 0.91,
  "user_goal": "Adapt a Chinese product video into English for overseas customers.",
  "audience": "English-speaking prospective customers",
  "source_assets": {
    "raw_video": true,
    "raw_audio": false,
    "script": false,
    "screenshots": false,
    "slides_or_docs": false,
    "reference_video": false,
    "brand_assets": true,
    "notes_only": false
  },
  "available_inputs": [
    "source product video",
    "brand terminology"
  ],
  "missing_inputs": [
    "whether the deliverable should be subtitle-only, dubbed, or lip-synced",
    "full glossary of protected product terms"
  ],
  "output_spec": {
    "deliverable_type": "localized product video",
    "count": 1,
    "duration": "same as source",
    "aspect_ratio": "same as source",
    "platform": "overseas marketing",
    "language": "en"
  },
  "style_reference": {
    "provided": false,
    "role": "none",
    "notes": ""
  },
  "production_strategy": "Preserve meaning, product terminology, and pacing while selecting the least risky localization mode.",
  "assumptions": [
    "If no preference is given, start with subtitle-plus-voiceover as the safest middle path"
  ],
  "approval_mode": "ask-before-production",
  "next_actions": [
    "Choose localization mode",
    "Create protected-term list",
    "Assess timing risk"
  ],
  "dispatch_target": "video-localization-producer",
  "dispatch_goal": "Build the language-adaptation plan for the English version.",
  "success_definition": [
    "Chooses the right localization mode",
    "Protects product terminology",
    "Flags timing constraints clearly"
  ],
  "deliverables": [
    "localization mode",
    "terminology notes",
    "timing risks",
    "delivery plan"
  ]
}
```

### Standard Return JSON

```json
{
  "dispatch_target": "video-localization-producer",
  "summary": "Recommend voiceover-dub with English subtitles as the safest first English version while preserving product terminology.",
  "localization_mode": {
    "en": "voiceover-dub"
  },
  "terminology_notes": [
    "Protect product and feature names exactly",
    "Review pricing, claims, and numbers manually"
  ],
  "timing_risks": [
    "Some Chinese lines may expand significantly in English"
  ],
  "delivery_plan": [
    "Clean transcript",
    "Create protected-term list",
    "Draft English script for timing",
    "Produce dub and subtitle pass"
  ],
  "open_risks": [],
  "blockers": [
    "Need glossary confirmation before final script lock"
  ],
  "reroute_recommendation": ""
}
```

## 6. Reference-Led Request -> Style Translation

### Standard Dispatch JSON

```json
{
  "request_state": "preparation",
  "selected_pipeline": "reference-style-video",
  "confidence": 0.86,
  "user_goal": "Use a reference video's clean confidence for a founder-led video without copying it.",
  "audience": "prospective customers and partners",
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
    "founder footage",
    "reference video"
  ],
  "missing_inputs": [
    "whether the reference matters more for pacing, tone, or structure"
  ],
  "output_spec": {
    "deliverable_type": "founder-led brand or product video",
    "count": 1,
    "duration": "30-90 seconds",
    "aspect_ratio": "undecided",
    "platform": "undecided",
    "language": "en"
  },
  "style_reference": {
    "provided": true,
    "role": "style",
    "notes": "Use the feeling of calm confidence, not direct imitation."
  },
  "production_strategy": "Translate the reference into reusable style rules, then hand the execution path to the right specialist.",
  "assumptions": [
    "Treat the reference as style-first unless structure becomes clearly dominant"
  ],
  "approval_mode": "ask-before-production",
  "next_actions": [
    "Analyze the reference",
    "Extract adaptation rules",
    "Hand off to the next execution owner"
  ],
  "dispatch_target": "video-style-translator",
  "dispatch_goal": "Convert the reference video into style guidance the execution lane can use.",
  "success_definition": [
    "Separates style from content",
    "Defines reusable adaptation rules",
    "Sets non-copying boundaries"
  ],
  "deliverables": [
    "style summary",
    "adaptation rules",
    "non-copying boundaries",
    "next-owner notes"
  ]
}
```

### Standard Return JSON

```json
{
  "dispatch_target": "video-style-translator",
  "summary": "The reference's transferable value comes from composed pacing, restrained text, and trust-heavy framing rather than flashy edit tricks.",
  "reference_role": "style",
  "style_summary": [
    "calm, deliberate openings",
    "clean framing",
    "low graphic density",
    "confidence through restraint"
  ],
  "adaptation_rules": [
    "Avoid rapid-fire captions",
    "Let key lines breathe",
    "Use minimal support graphics",
    "Keep tone composed rather than hype-driven"
  ],
  "non_copying_boundaries": [
    "Do not recreate the same shot order",
    "Do not mimic specific phrases or on-screen layout"
  ],
  "next_owner_notes": [
    "Likely execution owner: video-speaker-editor"
  ],
  "open_risks": [],
  "blockers": [],
  "reroute_recommendation": "video-speaker-editor"
}
```

## 7. Abstract Topic -> Motion-First Explainer

### Standard Dispatch JSON

```json
{
  "request_state": "preparation",
  "selected_pipeline": "generated-animation-video",
  "confidence": 0.9,
  "user_goal": "Explain retrieval-augmented generation in a 60-second animated video.",
  "audience": "smart non-specialists who want a clear mental model",
  "source_assets": {
    "raw_video": false,
    "raw_audio": false,
    "script": false,
    "screenshots": false,
    "slides_or_docs": true,
    "reference_video": false,
    "brand_assets": false,
    "notes_only": true
  },
  "available_inputs": [
    "topic outline",
    "some educational notes"
  ],
  "missing_inputs": [
    "desired visual tone",
    "whether the audience is more technical or more general"
  ],
  "output_spec": {
    "deliverable_type": "animated explainer",
    "count": 1,
    "duration": "60 seconds",
    "aspect_ratio": "16:9",
    "platform": "web or presentation",
    "language": "en"
  },
  "style_reference": {
    "provided": false,
    "role": "none",
    "notes": ""
  },
  "production_strategy": "Use a motion-first visual system that simplifies the abstract concept into one clear progression.",
  "assumptions": [
    "Default to diagram-led explanation unless a more emotional visual treatment is requested"
  ],
  "approval_mode": "ask-before-production",
  "next_actions": [
    "Choose visual mode",
    "Create visual system",
    "Plan scenes"
  ],
  "dispatch_target": "video-motion-designer",
  "dispatch_goal": "Plan the animation-first structure and visual system for the topic.",
  "success_definition": [
    "Chooses an appropriate visual mode",
    "Creates a coherent visual system",
    "Returns a scene plan feasible to build"
  ],
  "deliverables": [
    "visual mode",
    "visual system",
    "scene plan",
    "motion constraints"
  ]
}
```

### Standard Return JSON

```json
{
  "dispatch_target": "video-motion-designer",
  "summary": "Recommend a diagram-led explainer that moves from problem, to retrieval step, to improved answer outcome.",
  "visual_mode": "diagram-led",
  "visual_system": [
    "simple node-and-flow diagrams",
    "minimal color-coded states",
    "light kinetic text only for key terms"
  ],
  "scene_plan": [
    "Scene 1: why plain answers fail",
    "Scene 2: query reaches external knowledge",
    "Scene 3: retrieved context improves answer quality",
    "Scene 4: recap the mental model"
  ],
  "motion_constraints": [
    "Keep transitions structurally consistent",
    "Avoid decorative motion that distracts from explanation"
  ],
  "open_risks": [
    "Need to calibrate technical depth for the final audience"
  ],
  "blockers": [],
  "reroute_recommendation": ""
}
```

## 8. Brand Film / Mood Piece -> Story Planning

### Standard Dispatch JSON

```json
{
  "request_state": "idea",
  "selected_pipeline": "cinematic-montage-video",
  "confidence": 0.85,
  "user_goal": "Create a short emotional brand film about why the team built the company.",
  "audience": "prospective customers, partners, and future hires",
  "source_assets": {
    "raw_video": false,
    "raw_audio": false,
    "script": false,
    "screenshots": false,
    "slides_or_docs": false,
    "reference_video": true,
    "brand_assets": true,
    "notes_only": true
  },
  "available_inputs": [
    "brand story notes",
    "reference mood pieces",
    "team context"
  ],
  "missing_inputs": [
    "whether real footage exists",
    "whether a founder voiceover is available"
  ],
  "output_spec": {
    "deliverable_type": "brand film",
    "count": 1,
    "duration": "45-90 seconds",
    "aspect_ratio": "16:9",
    "platform": "website/social/pitch use",
    "language": "en"
  },
  "style_reference": {
    "provided": true,
    "role": "tone-and-mood",
    "notes": "Emotion matters more than literal structure matching."
  },
  "production_strategy": "Shape the story around emotional progression and editorial rhythm before choosing exact execution assets.",
  "assumptions": [
    "Treat the brief as mood-first and narrative-first"
  ],
  "approval_mode": "ask-before-production",
  "next_actions": [
    "Choose story shape",
    "Map emotional arc",
    "Plan visual and audio roles"
  ],
  "dispatch_target": "video-story-editor",
  "dispatch_goal": "Turn the brand intent into an emotional editorial blueprint.",
  "success_definition": [
    "Defines the emotional arc",
    "Chooses the right story shape",
    "Returns a usable beat map and audio/visual plan"
  ],
  "deliverables": [
    "story shape",
    "emotional arc",
    "beat map",
    "visual/audio plan"
  ]
}
```

### Standard Return JSON

```json
{
  "dispatch_target": "video-story-editor",
  "summary": "Recommend a thesis-proof brand film that starts with the pain behind the company mission and resolves into conviction and forward movement.",
  "story_shape": "thesis-proof",
  "emotional_arc": "frustration to clarity to conviction",
  "beat_map": [
    "Beat 1: the problem feels personal",
    "Beat 2: the team's belief takes shape",
    "Beat 3: the product or mission proves itself",
    "Beat 4: the ending lands on forward confidence"
  ],
  "visual_audio_plan": [
    "Use restrained imagery early",
    "Let music build slowly rather than peaking at the start",
    "Reserve the strongest visual proof for the final third"
  ],
  "open_risks": [
    "If no real footage exists, execution may need concept or motion support"
  ],
  "blockers": [],
  "reroute_recommendation": "video-concept-architect if asset reality remains unclear."
}
```
