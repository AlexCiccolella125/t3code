import type { ScopedThreadRef } from "@t3tools/contracts";

import { useMatterThreadData } from "../../hooks/useMatterThreadData";
import { useRightPanelStore } from "../../rightPanelStore";

/** A Citation in an answer: its Proof's number and title; opens it on the Matter drawer's Proofs tab. */
export function MatterCitationChip({
  citeId,
  threadRef,
}: {
  citeId: string;
  threadRef: ScopedThreadRef | undefined;
}) {
  const entry = useMatterThreadData(threadRef).proofsByCiteId.get(citeId);
  const title = entry?.proof.title ?? citeId;
  return (
    <button
      type="button"
      data-matter-citation={citeId}
      data-markdown-copy={`[[cite:${citeId}]]`}
      disabled={threadRef === undefined}
      aria-label={entry ? `Citation ${entry.index}: ${title}` : `Citation ${citeId}`}
      onClick={() => {
        if (threadRef) useRightPanelStore.getState().openMatterProof(threadRef, citeId);
      }}
      className="mx-0.5 inline-flex max-w-56 cursor-pointer items-center gap-1 rounded-xs border border-border bg-secondary py-px pe-1.5 ps-0.5 align-baseline text-2xs leading-4 text-secondary-foreground hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-default"
    >
      <span className="min-w-4 rounded-xs bg-background px-1 text-center font-mono font-semibold tabular-nums">
        {entry?.index ?? "?"}
      </span>
      <span className="min-w-0 truncate">{title}</span>
    </button>
  );
}
