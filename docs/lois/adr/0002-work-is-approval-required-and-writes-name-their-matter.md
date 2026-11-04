# 2. Work runs under approval-required and every Write names its Matter

Date: 2026-11-04

## Status

Accepted

## Context

The LOIS teardown found three linked problems: confirmation before a write depends on how the
prompt is worded; the model fills the org header per call, so one prompt can write to several orgs
by its own choice; and a write is reported after it has already landed, so Stop cannot block it.

T3 Code has four runtime modes. Mapping LOIS's Work onto "auto" or "full-access" would reproduce
all three problems.

## Decision

- Ask maps to approval-required with no write tools available.
- Work maps to approval-required with write tools available. The "auto" and "full-access" modes
  stay in the code but sit above the policy ceiling, so no user can reach them.
- Every write tool takes a required Matter argument that must be one of the thread's Matter
  selection. The org header is derived from that Matter on the server. The model never supplies
  an org.
- Each proposed Write gets its own Approval card. There is no per-turn batch approval.

## Consequences

- Confirmation becomes a control instead of a habit. A firm rule like "always confirm" is enforced
  by the mode, not by a skill.
- Stop can always block a Write, because nothing is sent until the user approves.
- A Write to a Matter outside the selection fails at the tool boundary with a clear error.
- Six notes across six Matters means six cards. That is slower than LOIS and is the point.
- A later "attorney approves a paralegal's Write" flow would add a second approver to the same
  card, not a new mechanism.
