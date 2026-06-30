---
name: video-hermes-integration
description: Hermes integration pack for the reusable video skill system. Use when you need to wire `video-producer`, the downstream video specialist skills, and the example/test layers into Hermes through a portable system prompt, routing rules, and operator instructions.
---

# Video Hermes Integration

Use this package to connect the reusable video skill system to Hermes without binding the setup to one codebase or API stack.

This package is for integration, not for video production itself.

## What This Package Provides

- a Hermes-ready system prompt template
- routing and ownership rules for the video skills
- operator guidance for test and production use
- suggested loading order for the skill packs

## Core Integration Rule

In Hermes, `video-producer` should be the only front-door owner the user directly experiences. All other video skills should be treated as specialist backends unless the operator is intentionally testing a specialist in isolation.

## Load Order

Load these in order:
1. `video-producer`
2. all specialist backend skills
3. `video-system-examples` for testing, scoring, and pressure checks

## References

Use [references/hermes-system-template.md](./references/hermes-system-template.md) for the main prompt template.

Use [references/hermes-routing-notes.md](./references/hermes-routing-notes.md) for how Hermes should think about ownership and dispatch.

Use [references/hermes-operator-playbook.md](./references/hermes-operator-playbook.md) for rollout, validation, and day-to-day operator guidance.
