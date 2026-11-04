# Renditions: three placements of the Matter UI

Three branches share `lois/shared` (contracts, Filevine MCP server, server plumbing, timeline
pieces, theme) and differ only in where the Matter controls live. Each is a worktree that runs
with `vp run dev`.

| Rendition | Branch | Where the Matter lives |
| --- | --- | --- |
| A. Sidebar first | `lois/r1-sidebar` | Matters are a sidebar section above threads. Picking one filters the thread list and seeds new threads. The Write ledger is a sidebar section under the active Matter. |
| B. Composer chip + drawer | `lois/r2-composer-drawer` | Matter chips sit in the composer. A right drawer carries Proofs and Ledger tabs. Closest to upstream T3. |
| C. Page per Matter | `lois/r3-matter-page` | Each Matter is a page with Threads, Proofs, Ledger and Overview tabs. A thread opens inside its Matter page. |

## Rubric

| Criterion | What we measure |
| --- | --- |
| Time to first answer (paralegal) | Clicks from app open to a cited Ask answer on a starred Matter |
| Clarity of which Matter a Write hit | Can a reviewer tell, from the thread alone, which Matter and Org every Write went to |
| Discoverability of Proofs | How many steps from a citation to its document region |
| Upstream delta | Files changed outside `components/matter` and the shared layer |
| Survives six Matters | Whether the chrome stays legible with six Matters across two Orgs |

## Scores

Filled in after the integrated runs. Screenshots live outside the repo.
