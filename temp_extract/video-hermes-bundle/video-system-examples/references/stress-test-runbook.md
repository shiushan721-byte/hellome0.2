# Stress Test Runbook

## Purpose

Use this runbook to pressure-test the reusable video skill system in a consistent way. It tells an operator:
- what to run
- in what order
- what to record
- how to score the result
- when to mark a case as pass, soft fail, or hard fail

This runbook is platform-neutral and assumes no real video APIs are required.

## Test Modes

Run tests in three modes:

1. `happy-path`
Use the normal examples from `example-flows.md` and `example-json-packets.md`.

2. `reroute`
Use the cases from `reroute-examples.md`.

3. `adversarial`
Use the cases from `adversarial-flows.md` and `adversarial-json-packets.md`.

## Recommended Test Order

Run in this order:

1. 2 happy-path cases
2. 1 reroute case
3. 2 adversarial cases
4. repeat with a different owner family

This keeps early failures easy to diagnose before moving to harder edge cases.

## Per-Case Procedure

For each case:

1. Present the user prompt or dispatch seed.
2. Let the agent respond naturally.
3. Capture the clarification questions.
4. Capture the selected owner.
5. Capture the dispatch object if produced.
6. Compare the result against the expected example packet.
7. Score it with `scoring-rubric.md`.
8. Record failure mode if it missed.

## What To Record

Record these fields for every run:

```json
{
  "case_id": "",
  "mode": "happy-path | reroute | adversarial",
  "prompt_used": "",
  "selected_owner": "",
  "expected_owner": "",
  "clarification_notes": [],
  "dispatch_quality_notes": [],
  "return_quality_notes": [],
  "score": 0,
  "verdict": "pass | soft-fail | hard-fail",
  "failure_modes": [],
  "reroute_behavior": "",
  "operator_notes": ""
}
```

## Verdict Rules

### `pass`

Use when:
- score is `8-10`, and
- no critical lane error occurred

### `soft-fail`

Use when:
- score is `5-7`, or
- the agent got to a workable result but with too much questioning, vague dispatch, or avoidable reroute friction

### `hard-fail`

Use when:
- score is `0-4`, or
- the wrong owner was chosen and never corrected, or
- the return packet would block a real workflow

## Failure Mode Taxonomy

Use these stable labels when logging problems:

- `over-questioning`
- `under-questioning`
- `wrong-owner`
- `missed-reroute`
- `style-source-confusion`
- `dispatch-too-vague`
- `return-too-vague`
- `constraint-conflict-ignored`
- `no-primary-owner`
- `premature-execution`
- `blocker-not-surfaced`

Use one or more labels per failure.

## Comparison Rules

Do not compare outputs word-for-word. Compare them by function:
- Did the agent identify the same production reality?
- Did it choose the same or a defensibly similar owner?
- Did it surface the same blockers?
- Did it preserve the same coordination logic?

Exact phrasing can differ. Functional behavior is what matters.

## Fast Triage

If an operator is short on time, use this triage sequence:

1. Was the owner correct?
2. Were the questions minimal but sufficient?
3. Was the dispatch packet specific enough to act on?
4. If wrong, did the agent reroute cleanly?

If two or more answers are "no", mark at least `soft-fail`.

If the owner is wrong and never corrected, mark `hard-fail`.

## Suggested Starter Test Pack

Start with these six:

1. `example-flows.md` case: podcast to clips
2. `example-flows.md` case: product walkthrough to demo
3. `reroute-examples.md` case: style request that should continue into execution
4. `adversarial-flows.md` case: demo without real product
5. `adversarial-flows.md` case: one short selfie misread as clip repurposing
6. `adversarial-flows.md` case: contradictory output constraints

This pack covers routing, reroute, under-specification, and conflict detection.

## Retest Rule

Retest a failure after:
- changing routing logic
- changing clarification rules
- changing dispatch schema
- changing any downstream skill contract

When retesting, keep the same prompt and same expected owner to preserve comparability.

## Session Summary Template

At the end of a run session, summarize like this:

```text
Session date:
Platform:
Cases run:
Pass:
Soft-fail:
Hard-fail:
Most common failure modes:
Most fragile owner lanes:
Recommended fixes:
```

## Operator Guidance

- Do not help the agent mid-run.
- Do not reveal the expected owner before the run.
- Do not silently correct weak assumptions.
- If the agent asks the operator a valid user-facing clarifying question, answer only with what the case would reasonably allow.

The point is to test the system's coordination behavior, not the operator's creativity.
