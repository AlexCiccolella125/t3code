import type { ScopedThreadRef } from "@t3tools/contracts";
import { ExternalLinkIcon } from "lucide-react";

import { useMatterThreadData } from "../../hooks/useMatterThreadData";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { FILEVINE_WRITE_KIND_LABEL } from "./FilevineApprovalCard";
import { MatterOrgBadge } from "./MatterOrgBadge";
import type { MatterLedgerStatus } from "./matterThreadData";

const LEDGER_STATUS_BADGE = {
  proposed: { label: "Proposed", variant: "warning" },
  approved: { label: "Approved", variant: "info" },
  rejected: { label: "Rejected", variant: "secondary" },
  sent: { label: "Sent", variant: "info" },
  confirmed: { label: "Confirmed", variant: "success" },
  failed: { label: "Failed", variant: "error" },
} as const satisfies Record<MatterLedgerStatus, { label: string; variant: string }>;

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
      <Table aria-label="Write ledger">
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Matter</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>
              <span className="sr-only">Record</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ledger.map((row) => {
            const status = LEDGER_STATUS_BADGE[row.status];
            return (
              <TableRow key={row.id} data-ledger-status={row.status}>
                <TableCell>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {ledgerTime(row.at)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="max-w-40 truncate text-xs">{row.matter.name}</span>
                    <MatterOrgBadge matter={row.matter} />
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs">{FILEVINE_WRITE_KIND_LABEL[row.kind]}</span>
                </TableCell>
                <TableCell>
                  <span className="block max-w-56 text-xs wrap-anywhere whitespace-normal">
                    {row.subject}
                    {row.error ? <span className="block text-destructive">{row.error}</span> : null}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant} size="sm">
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell>
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
