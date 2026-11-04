# 1. A Matter binds to a thread, not to a T3 project

Date: 2026-11-04

## Status

Accepted

## Context

T3 Code has no notion of a Filevine case. Its own "project" is a directory-rooted workspace and
every thread lives under one. We need each thread to know which Filevine cases it may read and
write, and the sidebar to show an attorney every thread that touched a given case.

Three placements were possible: one T3 project per Matter (a directory per case), a composer
context reference like an attached file (what LOIS effectively does), or a durable property on the
thread.

## Decision

A thread carries a Matter selection of one to six Matters as a durable thread property, next to
its runtime mode. The T3 project stays a firm-level workspace. The sidebar groups threads by Matter
and a multi-Matter thread appears under each Matter it touches.

## Consequences

- No directory per case, so thousands of Matters do not become thousands of workspaces.
- The selection survives reconnects, remote and tunnel connections, and mobile, because it is
  projected like any other thread field.
- Writes can be validated against the selection on the server, which a composer-only reference
  could not guarantee.
- Changing the selection after a Write has landed must be reflected in the Write ledger; the
  ledger is thread history, not a view of the current selection.
