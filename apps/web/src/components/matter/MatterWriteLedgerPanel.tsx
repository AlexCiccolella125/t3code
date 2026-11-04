import type { ScopedThreadRef } from "@t3tools/contracts";
import { ExternalLinkIcon } from "lucide-react";

import { useMatterThreadData } from "../../hooks/useMatterThreadData";
import { Badge } from "../ui/badge";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { FILEVINE_WRITE_KIND_LABEL } from "./FilevineApprovalCard";
import { MatterOrgBadge } from "./MatterOrgBadge";
import type { MatterLedgerStatus } from "./matterThreadData";

export const LEDGER_STATUS_BADGE = {
  proposed: { label: "Proposed", variant: "warning" },
  approved: { label: "Approved", variant: "info" },
  rejected: { label: "Rejected", variant: "secondary" },
  sent: { label: "Sent", variant: "info" },
  confirmed: { label: "Confirmed", variant: "success" },
  failed: { label: "Failed", variant: "error" },
} as const satisfies Record<MatterLedgerStatus, { label: string; variant: string }>;

// Filevine failures arrive as a JSON blob; the first human sentence is enough for the list.
function shortError(error: string): string {
  const quoted =
    /"errors":\["([^"]+)"/.exec(error)?.[1] ??
    error.replace(/^Filevine [A-Z]+ \S+ failed \(\d+\): ?/, "");
  const sentence = quoted.split(/(?<=\.)\s/)[0] ?? quoted;
  return sentence.length > 120 ? `${sentence.slice(0, 117)}…` : sentence;
}

function ledgerTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

/** The Write ledger: every Write this thread proposed or made, in order. */
export function MatterWriteLedgerPanel({ threadRef }: { threadRef: ScopedThreadRef }) {
  const { ledger } = useMatterThreadData(threadRef);
  if (ledger.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        No writes yet. Every Write this thread proposes or makes is listed here.
      </p>
    );
  }
  return (
    <div className="h-full min-h-0 overflow-auto p-3">
      <ol aria-label="Write ledger" className="flex flex-col gap-2">
        {ledger.map((row) => {
          const status = LEDGER_STATUS_BADGE[row.status];
          return (
            <li
              key={row.id}
              data-ledger-status={row.status}
              className="flex flex-col gap-1 rounded-md border border-border bg-card px-3 py-2"
            >
              <div className="flex min-w-0 items-start justify-between gap-2">
                <span className="min-w-0 text-sm font-medium wrap-anywhere">
                  {row.subject ?? FILEVINE_WRITE_KIND_LABEL[row.kind]}
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <Badge variant={status.variant} size="sm">
                    {status.label}
                  </Badge>
                  {row.recordUrl ? (
                    <a
                      href={row.recordUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${row.subject ?? "record"} in Filevine`}
                      className="inline-flex items-center text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLinkIcon aria-hidden className="size-3.5" />
                    </a>
                  ) : null}
                </span>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className="tabular-nums">{ledgerTime(row.at)}</span>
                <span aria-hidden>·</span>
                <span>{FILEVINE_WRITE_KIND_LABEL[row.kind]}</span>
                <span aria-hidden>·</span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="max-w-48 truncate">{row.matter.name}</span>
                  <MatterOrgBadge matter={row.matter} />
                </span>
              </div>
              {row.error ? (
                <Tooltip>
                  <TooltipTrigger render={<span className="text-xs text-destructive" />}>
                    {shortError(row.error)}
                  </TooltipTrigger>
                  <TooltipPopup side="top" className="max-w-96 whitespace-pre-wrap">
                    {row.error}
                  </TooltipPopup>
                </Tooltip>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
