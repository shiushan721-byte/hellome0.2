# Review Checklist

## Purpose

Use this checklist to evaluate whether an agent run followed the reusable video protocol correctly.

## Clarification

- Did the agent ask only the highest-value questions?
- Did it avoid asking for details that could be safely defaulted?
- Did it clearly identify the user's state: idea, preparation, execution, or revision?

## Routing

- Did the chosen owner match the real production challenge?
- If a reference was provided, did the agent decide whether it was style, structure, source, or mixed?
- If confidence was low, did the agent ask one more strong question or make explicit assumptions?

## Dispatch Quality

- Was there one clear owner?
- Was the goal sentence specific?
- Were missing inputs explicit?
- Were deliverables concrete?

## Downstream Return Quality

- Did the returned packet include the expected deliverables for that skill?
- Were blockers stated clearly?
- If the lane was wrong, did the agent reroute cleanly instead of forcing a bad fit?

## Overall

- Could another agent continue the workflow from the artifacts alone?
- Did the system preserve portability, or did it accidentally depend on one tool/vendor stack?
