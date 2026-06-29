# Scoring Rubric

## Purpose

Use this rubric to score a run of the reusable video skill system without relying on subjective impressions alone.

Score each run across five dimensions:
- clarification
- routing
- dispatch quality
- downstream return quality
- coordination behavior

Use a 0-2 scale for each dimension:
- `0`: failed
- `1`: acceptable
- `2`: strong

Maximum score: `10`

## 1. Clarification

### `0` Failed

- asked irrelevant or excessive questions
- missed a critical question that changed the workflow
- did not identify whether the user was in idea, preparation, execution, or revision mode

### `1` Acceptable

- asked mostly useful questions
- identified the user state well enough
- left some minor ambiguity but not enough to break routing

### `2` Strong

- asked only the highest-value questions
- identified the user state clearly
- used defaults intelligently and made them explicit

## 2. Routing

### `0` Failed

- chose the wrong primary owner
- confused style reference with source truth
- stayed in the wrong lane even after evidence suggested otherwise

### `1` Acceptable

- chose a workable owner
- may have needed minor rerouting later
- generally matched the dominant production reality

### `2` Strong

- selected the best owner early
- handled mixed signals well
- used reroute only when genuinely appropriate

## 3. Dispatch Quality

### `0` Failed

- dispatch object was vague, incomplete, or contradictory
- missing inputs were hidden
- expected deliverables were unclear

### `1` Acceptable

- dispatch object was usable
- job sentence and deliverables were mostly clear
- some fields could have been more specific

### `2` Strong

- dispatch object was clean, specific, and easy to act on
- assumptions were visible
- missing inputs and success definition were explicit

## 4. Downstream Return Quality

### `0` Failed

- return packet did not match the lane
- deliverables were missing or too generic
- blockers or reroute needs were not surfaced

### `1` Acceptable

- return packet matched the lane well enough
- required deliverables were mostly present
- minor vagueness remained

### `2` Strong

- return packet clearly fulfilled the lane contract
- deliverables were concrete and next-stage-ready
- blockers and reroute signals were handled cleanly

## 5. Coordination Behavior

### `0` Failed

- the system acted like dispatch ended ownership
- no one reconciled blockers, reroutes, or mismatches
- user alignment was lost after handoff

### `1` Acceptable

- the system preserved enough coordination to keep moving
- some follow-up responsibility was visible

### `2` Strong

- `video-producer` clearly remained the coordinator
- blockers were translated into precise next questions or reroutes
- the workflow stayed coherent across handoffs

## Score Interpretation

### `0-4`: Rerun Required

The run is not reliable. Do not treat it as a stable example or production-safe protocol execution.

Typical causes:
- wrong owner
- missing critical clarification
- vague dispatch or unusable return packet

### `5-7`: Acceptable

The run is usable but not polished. It can move forward, though some outputs may need tightening before reuse as a canonical example.

Typical pattern:
- mostly correct lane
- decent dispatch
- some ambiguity or over-questioning

### `8-10`: Strong

The run is a good reference example. It is well clarified, well routed, and easy for another agent to continue from.

Typical pattern:
- minimal but sufficient clarification
- clean owner selection
- strong dispatch packet
- concrete return artifacts

## Fast Review Shortcut

If time is limited, ask these three questions first:
1. Did it choose the right owner?
2. Could the downstream skill act on the dispatch without rereading the whole conversation?
3. Could the next stage continue from the return packet alone?

If any answer is clearly "no", the run is usually `0-4` and should be treated as rerun-required.
