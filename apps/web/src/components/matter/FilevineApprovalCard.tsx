import type {
  FilevineWriteKind,
  FilevineWriteProposal,
  ProviderApprovalDecision,
  RuntimeRequestId,
} from "@t3tools/contracts";
import { useId, useState } from "react";

import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { MatterOrgBadge } from "./MatterOrgBadge";

export const FILEVINE_WRITE_KIND_LABEL = {
  note: "Note",
  task: "Task",
  removal: "Removal",
} satisfies Record<FilevineWriteKind, string>;

export const MATTER_EYEBROW_CLASS_NAME =
  "text-2xs font-medium uppercase tracking-eyebrow text-muted-foreground";

/** The Approval card for one proposed Write: Approve, Edit then Approve, or Reject. */
export function FilevineApprovalCard({
  requestId,
  proposal,
  canRespond,
  isResponding,
  disabled = false,
  onRespond,
}: {
  requestId: RuntimeRequestId;
  proposal: FilevineWriteProposal;
  canRespond: boolean;
  isResponding: boolean;
  disabled?: boolean;
  onRespond:
    | ((
        requestId: RuntimeRequestId,
        decision: ProviderApprovalDecision,
        feedback?: string,
      ) => Promise<unknown>)
    | undefined;
}) {
  const bodyId = useId();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(proposal.body);
  const locked = disabled || isResponding || !canRespond || onRespond === undefined;
  const edited = editing && body !== proposal.body;
  const kindLabel = FILEVINE_WRITE_KIND_LABEL[proposal.kind];

  const approve = () => {
    if (locked || (editing && body.trim() === "")) return;
    void (edited ? onRespond(requestId, "accept", body) : onRespond(requestId, "accept"));
  };
  const reject = () => {
    if (!locked) void onRespond(requestId, "decline");
  };

  return (
    <section
      aria-label={`Proposed ${kindLabel.toLowerCase()} on ${proposal.matter.name}`}
      data-filevine-approval={requestId}
      data-v2-item-type="approval_request"
      className="my-1 flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={MATTER_EYEBROW_CLASS_NAME}>Proposed write</span>
        <span className="text-xs font-medium text-foreground">{kindLabel}</span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 truncate text-sm font-semibold text-foreground">
          {proposal.matter.name}
        </span>
        <MatterOrgBadge matter={proposal.matter} />
        <span className="shrink-0 text-xs text-muted-foreground">{proposal.matter.orgName}</span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {proposal.subject ? (
          <>
            <dt className="text-muted-foreground">Subject</dt>
            <dd className="min-w-0 wrap-anywhere text-foreground">{proposal.subject}</dd>
          </>
        ) : null}
        {proposal.kind === "task" && proposal.dueDate ? (
          <>
            <dt className="text-muted-foreground">Due</dt>
            <dd className="text-foreground tabular-nums">{proposal.dueDate}</dd>
          </>
        ) : null}
        {proposal.targetRecordId ? (
          <>
            <dt className="text-muted-foreground">Record</dt>
            <dd className="font-mono text-foreground">{proposal.targetRecordId}</dd>
          </>
        ) : null}
      </dl>
      {proposal.kind === "removal" ? null : (
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="font-mono text-2xs wrap-anywhere text-muted-foreground">
            {proposal.assistantMarker}
          </p>
          <label htmlFor={bodyId} className="sr-only">
            Body
          </label>
          <Textarea
            id={bodyId}
            size="sm"
            value={body}
            readOnly={!editing}
            aria-readonly={!editing}
            disabled={locked && editing}
            onChange={(event) => setBody(event.currentTarget.value)}
          />
        </div>
      )}
      {onRespond === undefined ? null : !canRespond ? (
        <p className="text-xs text-warning">
          Provider process is gone. Interrupt or restart the run to respond.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="default"
            disabled={locked || (editing && body.trim() === "")}
            onClick={approve}
          >
            {edited ? "Approve edited" : "Approve"}
          </Button>
          {proposal.kind === "removal" ? null : (
            <Button
              size="sm"
              variant="outline"
              disabled={locked}
              aria-pressed={editing}
              onClick={() => {
                if (editing) setBody(proposal.body);
                setEditing(!editing);
              }}
            >
              {editing ? "Discard edits" : "Edit"}
            </Button>
          )}
          <Button size="sm" variant="outline" disabled={locked} onClick={reject}>
            Reject
          </Button>
        </div>
      )}
    </section>
  );
}
