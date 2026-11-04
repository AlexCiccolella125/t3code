# 3. Writes are authored as the signed-in user and carry an assistant marker

Date: 2026-11-04

## Status

Accepted

## Context

LOIS writes land in Filevine with the user's own ID and no marker, so audit logs cannot tell an
assistant's note from the user's, and team members are notified as if the user typed it. A
dedicated service identity per org would fix this properly but no such account exists and creating
one needs a Filevine admin change the proof of concept cannot wait on.

## Decision

Writes go out as the signed-in user. The body of every Write begins with a fixed assistant marker
naming the assistant, the thread, and the approving user. The Write receipt links to the record so
a reviewer can match the marker to the thread.

## Consequences

- Works today on both allowed test Matters with no Filevine configuration.
- The marker is text, so a human could strip it when editing the Write before approval. The
  Approval card keeps the marker outside the editable body.
- A service identity remains the target. When one exists, the marker stays and the author changes;
  nothing in the UI needs to move.
