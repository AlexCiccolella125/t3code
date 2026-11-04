import {
  FILEVINE_TOOL_PREFIX,
  type FilevineWriteKind,
  type FilevineWriteReceipt,
  type FilevineWriteStatus,
  type ScopedThreadRef,
} from "@t3tools/contracts";
import { ExternalLinkIcon } from "lucide-react";
import { useState } from "react";

import { useMatterThreadData } from "../../hooks/useMatterThreadData";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { FILEVINE_WRITE_KIND_LABEL, MATTER_EYEBROW_CLASS_NAME } from "./FilevineApprovalCard";
import { MatterOrgBadge } from "./MatterOrgBadge";

export const FILEVINE_WRITE_STATUS_BADGE = {
  sent: { label: "Sent", variant: "info" },
  confirmed: { label: "Confirmed", variant: "success" },
  failed: { label: "Failed", variant: "error" },
} as const satisfies Record<FilevineWriteStatus, { label: string; variant: string }>;

export function filevineWriteKindFromToolName(toolName: string | null): FilevineWriteKind {
  switch (toolName) {
    case `${FILEVINE_TOOL_PREFIX}filevine_create_note`:
      return "note";
    case `${FILEVINE_TOOL_PREFIX}filevine_create_task`:
      return "task";
    default:
      return "removal";
  }
}

export function removalPrompt(receipt: FilevineWriteReceipt): string {
  return `Remove the task ${receipt.subject ?? "(no subject)"} (${receipt.recordId}) you created in this thread on ${receipt.matter.name}`;
}

function formatConfirmedAt(value: string | undefined): string | null {
  if (value === undefined) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** The Write receipt: what Filevine did with an approved Write, and a link to the record. */
export function FilevineWriteReceiptCard({
  receipt,
  onProposeRemoval,
}: {
  receipt: FilevineWriteReceipt;
  onProposeRemoval: (() => Promise<void>) | undefined;
}) {
  const [removal, setRemoval] = useState<"idle" | "sending" | "sent" | string>("idle");
  const status = FILEVINE_WRITE_STATUS_BADGE[receipt.status];
  const confirmedAt = formatConfirmedAt(receipt.confirmedAt);
  return (
    <section
      aria-label={`Write receipt: ${FILEVINE_WRITE_KIND_LABEL[receipt.kind]} on ${receipt.matter.name}`}
      data-filevine-receipt={receipt.status}
      className="my-1 flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={MATTER_EYEBROW_CLASS_NAME}>Write receipt</span>
        <Badge variant={status.variant} size="sm">
          {status.label}
        </Badge>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="font-medium text-foreground">
          {FILEVINE_WRITE_KIND_LABEL[receipt.kind]}
        </span>
        <span aria-hidden className="text-muted-foreground">
          ·
        </span>
        <span className="min-w-0 truncate text-foreground">{receipt.matter.name}</span>
        <MatterOrgBadge matter={receipt.matter} />
      </div>
      {receipt.subject ? (
        <p className="text-xs wrap-anywhere text-muted-foreground">{receipt.subject}</p>
      ) : null}
      {receipt.status === "failed" && receipt.error ? (
        <p role="alert" className="text-xs wrap-anywhere text-destructive">
          {receipt.error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {receipt.recordUrl && receipt.kind !== "removal" ? (
          <Button
            size="xs"
            variant="outline"
            render={<a href={receipt.recordUrl} target="_blank" rel="noopener noreferrer" />}
          >
            Open in Filevine
            <ExternalLinkIcon aria-hidden />
          </Button>
        ) : null}
        {onProposeRemoval ? (
          <Button
            size="xs"
            variant="ghost-muted"
            disabled={removal === "sending" || removal === "sent"}
            onClick={() => {
              setRemoval("sending");
              onProposeRemoval().then(
                () => setRemoval("sent"),
                (error: unknown) =>
                  setRemoval(error instanceof Error ? error.message : "Could not send."),
              );
            }}
          >
            {removal === "sent" ? "Removal requested" : "Propose removal"}
          </Button>
        ) : null}
        {confirmedAt && receipt.status !== "failed" ? (
          <span className="ms-auto text-2xs text-muted-foreground tabular-nums">
            Confirmed {confirmedAt}
          </span>
        ) : null}
      </div>
      {removal !== "idle" && removal !== "sending" && removal !== "sent" ? (
        <p role="alert" className="text-xs text-destructive">
          {removal}
        </p>
      ) : null}
    </section>
  );
}

/** A Filevine write tool call in the timeline, shown as its Write receipt. */
export function FilevineWriteReceiptRow({
  threadRef,
  itemId,
  toolName,
  failed,
  onSendMessage,
}: {
  threadRef: ScopedThreadRef;
  itemId: string;
  toolName: string | null;
  failed: boolean;
  onSendMessage: ((text: string) => Promise<void>) | undefined;
}) {
  const data = useMatterThreadData(threadRef);
  const entry = data.writesByItemId.get(itemId);
  if (entry === undefined) {
    const kind = FILEVINE_WRITE_KIND_LABEL[filevineWriteKindFromToolName(toolName)];
    return (
      <p
        data-filevine-receipt={failed ? "failed" : "loading"}
        className="my-1 rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground"
      >
        {failed ? `${kind} was not written.` : `Loading the ${kind.toLowerCase()} receipt…`}
      </p>
    );
  }
  const { receipt } = entry;
  const removable =
    receipt.kind === "task" &&
    receipt.status !== "failed" &&
    receipt.recordId !== undefined &&
    !data.removedRecordIds.has(receipt.recordId);
  return (
    <FilevineWriteReceiptCard
      receipt={receipt}
      onProposeRemoval={
        removable && onSendMessage ? () => onSendMessage(removalPrompt(receipt)) : undefined
      }
    />
  );
}
