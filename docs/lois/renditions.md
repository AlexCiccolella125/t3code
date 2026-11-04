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

Scored on 2026-11-04 after one integrated run of each rendition against the same thread
(two Matters, one sandbox and one synthetic production, four ledger entries). Screenshots live
outside the repo. Scores are 1 (worst) to 5 (best).

| Criterion | A. Sidebar | B. Chip + drawer | C. Page per Matter |
| --- | --- | --- | --- |
| Time to first answer | **5.** Click the Matter, click New thread, type. The active Matter seeds the composer. | 4. New thread, pick the Matter from the chip picker, type. One extra step on every thread. | 4. Click the Matter, click "New thread on this Matter", type. Same count as A, but the page loads first. |
| Clarity of which Matter a Write hit | 3. The receipt names the Matter and Org, but the sidebar ledger is scoped to the current thread, so a reviewer still opens each thread. | 4. Receipt plus the drawer Ledger tab, both inside the thread. Pending-write badge on the composer button says a write is waiting. | **5.** Receipt in the thread, and the Matter page Ledger tab aggregates writes across the Matter's recent threads with a link back to the thread each came from. |
| Discoverability of Proofs | 3. Citation click opens the Proofs panel; no standing entry point outside a thread. | **5.** Citation click opens the drawer on that citation, and the drawer button is always in the composer. | 4. Proofs tab on the Matter page, plus citation click inside the thread. Two homes, which is fine for review and slightly confusing for authoring. |
| Upstream delta (files outside `components/matter` and the shared layer) | **4 files, +86 / -4.** Sidebar, its logic and test, new-thread hook. | 5 files, +95 / -79. Rewrites `rightPanelStore` and `RightPanelTabs`; the biggest surface-area change. | 6 files, +68. A new route and route tree, plus two-line hooks into Sidebar, ThreadRouteView and the command palette. Small per file, but it adds a page type T3 does not have. |
| Survives six Matters | 2. Six sidebar rows above the thread list plus a per-Matter ledger section push threads below the fold. | **4.** Chips collapse to two plus "+N" from the fourth Matter on. Drawer is per thread so it does not grow. Breaks the glossary rule that chips never collapse. | 3. "Recent Matters" list and a page per Matter scale, but a thread on six Matters repeats the Matter name twice in its header and the "Also" strip wraps. |
| Total | 17 | 22 | 20 |

### Defects seen in the runs

- A: a thread drops out of the list when the open thread lacks the active Matter.
- B: the composer "Matter drawer" button is clipped by the right panel edge; the Overview "Key fields" line overflows its card.
- C: the Matter name shows twice on a thread (page header and thread breadcrumb chips).
- All: the task receipt keeps the "Removal requested" label after the removal is rejected.

### Recommendation

Build on **B (composer chip + drawer)** as the base. It is the closest to upstream T3, keeps
every Matter control inside the thread a paralegal is already looking at, and is the only
rendition where a citation is one click from its proof. Take two pieces from the others:

1. From C, the cross-thread Ledger. Attorneys reviewing a Matter need every write in one list,
   not one list per thread. Mount it as a third drawer tab scoped to the Matter, backed by the
   same aggregation C uses, and later as a route if a standing page proves necessary.
2. From A, the active Matter that seeds new threads. Store it the way A does and have the
   composer chips start from it, so the paralegal's first-answer path matches A's.

Resolve the chip-collapse conflict by amending the glossary: chips collapse to two plus a count
from the fourth Matter on, and the full set is always visible in the drawer Overview tab.
