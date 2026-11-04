import type { FilevineProofKind, ScopedThreadRef } from "@t3tools/contracts";
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  FileTextIcon,
  ListChecksIcon,
  type LucideIcon,
  NotebookPenIcon,
  TableOfContentsIcon,
} from "lucide-react";

import { useMatterThreadData } from "../../hooks/useMatterThreadData";
import { cn } from "~/lib/utils";
import { useRightPanelStore } from "../../rightPanelStore";
import { Button } from "../ui/button";
import { DocumentProofPage } from "./DocumentProofPage";
import { MATTER_EYEBROW_CLASS_NAME } from "./FilevineApprovalCard";
import { MatterOrgBadge } from "./MatterOrgBadge";
import type { MatterProofEntry } from "./matterThreadData";

export const PROOF_KIND_ICON = {
  note: NotebookPenIcon,
  section: TableOfContentsIcon,
  task: ListChecksIcon,
  document: FileTextIcon,
} satisfies Record<FilevineProofKind, LucideIcon>;

export function proofByline(entry: MatterProofEntry): string | null {
  const { author, createdAt } = entry.proof;
  const date = createdAt ? createdAt.slice(0, 10) : undefined;
  return [author, date].filter(Boolean).join(" · ") || null;
}

export function OpenInFilevine({ url }: { url: string | undefined }) {
  if (url === undefined) return null;
  return (
    <Button
      size="xs"
      variant="ghost-muted"
      render={<a href={url} target="_blank" rel="noopener noreferrer" />}
    >
      Open in Filevine
      <ExternalLinkIcon aria-hidden />
    </Button>
  );
}

/** Every Proof the thread's Filevine reads returned, grouped by Matter. */
export function MatterProofsPanel({
  threadRef,
  selectedCiteId,
}: {
  threadRef: ScopedThreadRef;
  selectedCiteId: string | undefined;
}) {
  const data = useMatterThreadData(threadRef);
  const select = (citeId: string | null) =>
    useRightPanelStore.getState().openMatterProof(threadRef, citeId);
  const selected =
    selectedCiteId === undefined ? undefined : data.proofsByCiteId.get(selectedCiteId);

  if (selected?.proof.document) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3">
        <div className="flex items-center gap-2">
          <Button size="xs" variant="ghost-muted" onClick={() => select(null)}>
            <ArrowLeftIcon aria-hidden />
            All proofs
          </Button>
          <span className={MATTER_EYEBROW_CLASS_NAME}>Proof {selected.index}</span>
        </div>
        <DocumentProofPage document={selected.proof.document} />
        <p className="text-xs wrap-anywhere text-muted-foreground">{selected.proof.excerpt}</p>
      </div>
    );
  }

  if (data.proofs.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        No proofs yet. They appear here when the agent reads a Matter.
      </p>
    );
  }

  const groups = new Map<string, MatterProofEntry[]>();
  for (const entry of data.proofs) {
    const group = groups.get(entry.proof.matterId);
    if (group) group.push(entry);
    else groups.set(entry.proof.matterId, [entry]);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-3" aria-label="Proofs">
      {[...groups].map(([matterId, entries]) => {
        const matter = data.matters.get(matterId);
        return (
          <section key={matterId} className="flex min-w-0 flex-col gap-1.5">
            <header className="flex min-w-0 items-center gap-2 px-1">
              <h3 className="min-w-0 truncate text-sm font-semibold text-foreground">
                {matter?.name ?? matterId}
              </h3>
              {matter ? <MatterOrgBadge matter={matter} /> : null}
            </header>
            <ul className="flex min-w-0 flex-col gap-1">
              {entries.map((entry) => {
                const Icon = PROOF_KIND_ICON[entry.proof.kind];
                const isSelected = entry.proof.citeId === selectedCiteId;
                const byline = proofByline(entry);
                return (
                  <li
                    key={entry.proof.citeId}
                    data-proof={entry.proof.citeId}
                    aria-current={isSelected ? "true" : undefined}
                    ref={
                      isSelected ? (node) => node?.scrollIntoView({ block: "nearest" }) : undefined
                    }
                    className={cn(
                      "flex min-w-0 flex-col gap-1 rounded-(--control-radius) border p-2",
                      isSelected ? "border-primary bg-primary/8" : "border-border bg-card",
                    )}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 cursor-pointer items-start gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      onClick={() => select(entry.proof.citeId)}
                    >
                      <span className="mt-px min-w-5 rounded-xs bg-secondary px-1 text-center font-mono text-2xs font-semibold leading-4 tabular-nums text-secondary-foreground">
                        {entry.index}
                      </span>
                      <Icon
                        aria-hidden
                        className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                      />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-xs font-medium wrap-anywhere text-foreground">
                          {entry.proof.title}
                        </span>
                        <span className="line-clamp-3 text-xs wrap-anywhere text-muted-foreground">
                          {entry.proof.excerpt}
                        </span>
                      </span>
                    </button>
                    {byline || entry.proof.recordUrl ? (
                      <div className="flex min-w-0 items-center gap-2 ps-7">
                        {byline ? (
                          <span className="min-w-0 truncate text-2xs text-muted-foreground">
                            {byline}
                          </span>
                        ) : null}
                        <span className="ms-auto">
                          <OpenInFilevine url={entry.proof.recordUrl} />
                        </span>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
