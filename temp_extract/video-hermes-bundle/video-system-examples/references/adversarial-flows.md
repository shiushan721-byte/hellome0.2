# Adversarial Flows

## Purpose

Use these examples to stress-test the video skill system at its weak points. These are not normal happy-path prompts. They are designed to trigger over-questioning, wrong owner selection, premature execution, or failure to reroute.

## 1. "Demo" Without a Real Product

### User Request

"Make a slick demo video for our AI app. We only have a landing page, some mockups, and a rough idea of what it should feel like."

### Why This Is Tricky

- the word `demo` pulls toward `video-demo-director`
- the actual source truth is not a real product

### What a Weak Agent Does

- routes directly to demo planning
- starts discussing capture plans that are impossible

### What a Strong Agent Does

- recognizes this is concept-first
- asks whether the goal is product clarity or launch excitement
- routes to `video-concept-architect`

### Failure Signal

If the agent talks about real screen capture before confirming whether a real product exists, it is drifting.

## 2. "Cut It Into Clips" When It Is Already One Short Clip

### User Request

"Take this 70-second founder selfie and cut it into a better short clip."

### Why This Is Tricky

- `cut it into clips` sounds like repurposing
- the source is already short and speaker-led

### What a Weak Agent Does

- routes to `video-clips-editor`
- starts proposing multiple clips from a source that may only support one

### What a Strong Agent Does

- notices the real job is speaker polishing
- routes to `video-speaker-editor`

### Failure Signal

If the system proposes a batch of clips without checking whether the source actually supports multiple independent ideas, it is overfitting to keywords.

## 3. Reference Video That Is Actually the Source Asset

### User Request

"Use this video as the base and make it feel more premium."

### Why This Is Tricky

- a reference may be style-only
- here the same file might be the actual source being re-edited

### What a Weak Agent Does

- routes to `video-style-translator`
- ignores that the asset itself is being edited

### What a Strong Agent Does

- asks whether the video is just inspiration or the actual starting asset
- if it is the asset, routes based on what kind of edit it needs

### Failure Signal

If the agent treats a source asset as a pure style reference, it will likely miss the real lane.

## 4. Localization Request With Hidden Editorial Problems

### User Request

"Translate this webinar into English. Also, people say it's too long and the speaker rambles."

### Why This Is Tricky

- localization is explicit
- editorial repair may actually come first

### What a Weak Agent Does

- routes to `video-localization-producer`
- ignores the structural complaint

### What a Strong Agent Does

- asks whether the English version should preserve full length or be tightened
- may route first to `video-speaker-editor` or `video-story-editor`

### Failure Signal

If the agent assumes translation can solve pacing, it is confusing language adaptation with editorial shaping.

## 5. Animation Request That Is Really Hybrid

### User Request

"Animate this customer interview with charts and screenshots so it feels dynamic."

### Why This Is Tricky

- `animate` tempts `video-motion-designer`
- the interview footage may still be the anchor

### What a Weak Agent Does

- routes to pure motion design
- treats the interview as secondary decoration

### What a Strong Agent Does

- asks what the primary truth source is
- if the interview remains central, routes toward `video-hybrid-director`

### Failure Signal

If the system ignores the live footage's ownership of the message, it is probably in the wrong lane.

## 6. Style-Led Request That Should Not Stop at Style

### User Request

"I want our onboarding video to feel like this Apple-style reference."

### Why This Is Tricky

- the agent may stop after style extraction
- style translation is only intermediate, not final execution

### What a Weak Agent Does

- returns beautiful style notes and never advances the execution lane

### What a Strong Agent Does

- extracts the style rules
- then reroutes or dispatches to `video-demo-director`

### Failure Signal

If the run ends with style notes but no execution owner, coordination failed.

## 7. User Says "You Decide" and the Agent Still Over-Questions

### User Request

"I don't know, you decide. We just need something good for launch."

### Why This Is Tricky

- ambiguity is real
- but the user has delegated some choice authority

### What a Weak Agent Does

- asks 8-10 open-ended questions anyway
- creates friction instead of momentum

### What a Strong Agent Does

- asks only the highest-leverage questions
- states reasonable assumptions
- moves into concept development quickly

### Failure Signal

If the agent treats delegated choice as a reason to ask even more questions, it is missing the skill's intended behavior.

## 8. Product Demo Request That Is Actually a Brand Film

### User Request

"We need a product video, but honestly it's more about making people feel why we exist than showing features."

### Why This Is Tricky

- `product video` can trigger demo logic
- the emotional goal points elsewhere

### What a Weak Agent Does

- forces the request into a feature walkthrough

### What a Strong Agent Does

- recognizes the emotional objective dominates
- routes to `video-story-editor` or `video-concept-architect`

### Failure Signal

If the system optimizes for feature explanation despite the user explicitly privileging emotion, it chose the wrong primary challenge.

## 9. Multi-Owner Request That Needs One Primary Owner

### User Request

"Make a founder video, but also use product screens, and maybe some animated diagrams, and if possible localize it later."

### Why This Is Tricky

- several downstream skills could claim ownership
- the system may try to split ownership too early

### What a Weak Agent Does

- lists many owners without choosing one
- creates a vague plan with no clear lane

### What a Strong Agent Does

- asks what the anchor medium is
- chooses one primary owner now
- records the other needs as later support or future passes

### Failure Signal

If the dispatch has multiple equal owners and no primary lane, the system has failed at orchestration.

## 10. Contradictory Output Constraints

### User Request

"Make it cinematic, super informative, under 20 seconds, and suitable for YouTube, TikTok, and investor presentations."

### Why This Is Tricky

- many goals conflict
- a weak agent may pretend they can all be satisfied in one pass

### What a Weak Agent Does

- accepts every constraint without challenge
- creates a blurred, impossible brief

### What a Strong Agent Does

- surfaces the conflict directly
- asks which requirement wins
- may recommend one hero output plus derived variants

### Failure Signal

If the system never calls out the constraint conflict, it is not doing real production reasoning.
