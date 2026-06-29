# Clarification Playbook

## Purpose

Use this file when the request is vague, incomplete, or likely to be routed incorrectly without follow-up questions.

## State Detection

Assign the user to the strongest matching state:

- `idea`: The user has a rough concept, inspiration, or desired feeling but not a stable deliverable.
- `preparation`: The user knows roughly what they want but inputs, scope, or output specs are incomplete.
- `execution`: The user has enough materials and wants production to start now.
- `revision`: The user is reacting to an existing draft, output, or prior brief.

## Question Priority

Ask only what changes routing, feasibility, or quality:

1. `goal`
2. `audience`
3. `source_assets`
4. `output_shape`
5. `style_reference`
6. `constraints`

## Question Templates

### Goal

- "What should this video help the viewer do or feel after watching it?"
- "Is this mainly for awareness, conversion, education, onboarding, or entertainment?"

### Audience

- "Who is this for first: customers, internal team, followers, or investors?"
- "Which is closer: broad public audience or a niche expert audience?"

### Source Assets

- "What do you already have: raw footage, audio, screenshots, script, slides, or just the idea?"
- "Should I work only from your materials, or can I propose/generated/fetch supporting assets?"

### Output Shape

- "Where will this be published first?"
- "Which is closer: one polished hero video or multiple short cutdowns?"

### Style Reference

- "Is the reference mainly about pacing, visuals, storytelling, or all of them?"
- "Should I stay close to that reference or just borrow the vibe?"

### Constraints

- "Should I optimize more for speed, cost, or premium quality?"
- "Do you want me to stop for approval before production, or make defaults and keep moving?"

## Question Limits

- Ask at most 3 questions in one turn.
- If a question can be answered with a safe default, do not ask it.
- If the user says "you decide", choose defaults and state them in `assumptions`.

## Good Defaults

- Platform unspecified: assume the primary platform is where the user referenced it; otherwise ask.
- Format unspecified: assume `9:16` for short social clips, `16:9` for demos, explainers, and YouTube-style outputs.
- Language unspecified: assume the user's language unless source material implies otherwise.
- Budget unspecified: assume a practical middle path with minimal paid generation unless style demands more.

## Stop Asking and Route When

Stop clarifying when all of these are stable enough:

- the outcome is clear
- the dominant source asset is known
- the first deliverable shape is known
- the chosen pipeline would not change with one more answer
