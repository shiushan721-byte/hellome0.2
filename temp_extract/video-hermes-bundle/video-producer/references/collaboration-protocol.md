# Collaboration Protocol

## Purpose

Use this protocol when `video-producer` hands work to a downstream skill and when it receives work back.

## Dispatch Checklist

Before dispatching, make sure the handoff includes:
- one clear owner skill
- one clear job sentence
- enough context to work without rereading the entire conversation
- explicit assumptions
- explicit missing inputs
- concrete deliverables expected back

If any of these are weak, repair the handoff before sending it downstream.

## Ownership Rules

- `video-producer` owns user alignment, routing, and final coordination.
- The downstream skill owns specialization inside its lane.
- If the downstream skill discovers that another lane is primary, it should say so explicitly instead of stretching beyond scope.

## Handoff Compression

Do not dump the entire conversation into the dispatch object. Compress into:
- user goal
- audience
- source truth
- output spec
- style signal
- production strategy
- success definition
- next actions

## Assumption Discipline

Assumptions must be:
- visible
- actionable
- easy to challenge

Good:
- "Assume a vertical-first cut unless the user prioritizes YouTube."

Bad:
- "Assume a good style."

## Return Packet

When a downstream skill returns work, expect:
- summary of what it chose
- requested deliverables
- open risks
- blockers if any
- reroute recommendation if the job changed shape

## Completion Test

A downstream step is complete only if:
- the requested deliverables are present
- the result is coherent enough for the next stage
- unresolved blockers are made explicit

If not, either request one tighter pass or reroute.
