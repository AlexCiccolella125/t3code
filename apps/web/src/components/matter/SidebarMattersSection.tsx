import {
  DEFAULT_MATTER_ROLE,
  type EnvironmentId,
  type MatterRef,
  type MatterRole,
  type ScopedThreadRef,
} from "@t3tools/contracts";
import { MATTER_CATALOG } from "@t3tools/shared/matterCatalog";
import * as Schema from "effect/Schema";
import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useMatterThreadData } from "../../hooks/useMatterThreadData";
import { useEnvironmentSettings } from "../../hooks/useSettings";
import { countSidebarThreadsByMatter } from "../Sidebar.logic";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { CollapsibleSectionHeader } from "../ui/collapsible-section-header";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { FILEVINE_WRITE_KIND_LABEL } from "./FilevineApprovalCard";
import { MatterOrgBadge } from "./MatterOrgBadge";
import { MatterPickerDialog } from "./MatterPickerDialog";
import { LEDGER_STATUS_BADGE } from "./MatterWriteLedgerPanel";
import { useStarredMatterIds } from "./starredMatters";

const FALLBACK_MATTER_COUNT = 3;
const LEDGER_EXPANDED_STORAGE_KEY = "t3code:matters:sidebar-ledger-expanded:v1";

/** Starred Matters in catalog order, plus the active one; the first few when nothing is starred. */
export function resolveSidebarMatters(
  starredIds: ReadonlyArray<string>,
  active: MatterRef | null,
): ReadonlyArray<MatterRef> {
  const starred = MATTER_CATALOG.filter((matter) => starredIds.includes(matter.matterId));
  const listed = starred.length > 0 ? starred : MATTER_CATALOG.slice(0, FALLBACK_MATTER_COUNT);
  return active === null || listed.some((matter) => matter.matterId === active.matterId)
    ? listed
    : [...listed, active];
}

/** Matters above the thread list: picking one filters the threads and seeds new ones. */
export function SidebarMattersSection({
  threads,
  activeMatter,
  onActiveMatterChange,
  routeThreadRef,
  environmentId,
}: {
  threads: ReadonlyArray<{
    readonly archivedAt: string | null;
    readonly matterSelection?: ReadonlyArray<MatterRef> | undefined;
  }>;
  activeMatter: MatterRef | null;
  onActiveMatterChange: (matter: MatterRef | null) => void;
  routeThreadRef: ScopedThreadRef | null;
  environmentId: EnvironmentId | null;
}) {
  const [starredIds, setStar] = useStarredMatterIds();
  const [pickerOpen, setPickerOpen] = useState(false);
  const matters = resolveSidebarMatters(starredIds, activeMatter);
  const counts = countSidebarThreadsByMatter(threads);

  return (
    <section aria-label="Matters" data-testid="sidebar-matters" className="mb-2">
      <div className="flex h-7 items-center gap-1 ps-(--sidebar-row-content-inset)">
        <h2 className="min-w-0 flex-1 truncate text-2xs font-medium uppercase tracking-eyebrow text-sidebar-muted-foreground">
          Matters
        </h2>
        {activeMatter ? (
          <Button size="xs" variant="ghost-muted" onClick={() => onActiveMatterChange(null)}>
            All matters
          </Button>
        ) : null}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                size="icon-xs"
                variant="ghost-muted"
                aria-label="Add matter"
                onClick={() => setPickerOpen(true)}
              />
            }
          >
            <PlusIcon aria-hidden />
          </TooltipTrigger>
          <TooltipPopup side="top">Find and star a Matter</TooltipPopup>
        </Tooltip>
      </div>
      <SidebarMenu>
        {matters.map((matter) => {
          const isActive = activeMatter?.matterId === matter.matterId;
          return (
            <SidebarMenuItem key={matter.matterId} data-sidebar-matter={matter.matterId}>
              <SidebarMenuButton
                size="sm"
                isActive={isActive}
                aria-pressed={isActive}
                onClick={() => onActiveMatterChange(isActive ? null : matter)}
              >
                <span className="min-w-0 flex-1 truncate">{matter.name}</span>
                <MatterOrgBadge matter={matter} />
                <span className="w-5 shrink-0 text-right font-mono text-2xs tabular-nums text-sidebar-muted-foreground">
                  {counts.get(matter.matterId) ?? 0}
                </span>
              </SidebarMenuButton>
              {isActive ? <ActiveMatterLedger matter={matter} threadRef={routeThreadRef} /> : null}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
      <SidebarMatterPicker
        environmentId={environmentId}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        activeMatter={activeMatter}
        onPick={(matter) => {
          if (matter !== null) setStar(matter.matterId, true);
          onActiveMatterChange(matter);
          setPickerOpen(false);
        }}
      />
    </section>
  );
}

interface SidebarMatterPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeMatter: MatterRef | null;
  onPick: (matter: MatterRef | null) => void;
}

function SidebarMatterPicker({
  environmentId,
  ...props
}: SidebarMatterPickerProps & { environmentId: EnvironmentId | null }) {
  return environmentId === null ? (
    <SidebarMatterPickerDialog {...props} role={DEFAULT_MATTER_ROLE} />
  ) : (
    <EnvironmentMatterPicker {...props} environmentId={environmentId} />
  );
}

function EnvironmentMatterPicker({
  environmentId,
  ...props
}: SidebarMatterPickerProps & { environmentId: EnvironmentId }) {
  const role = useEnvironmentSettings(environmentId, (settings) => settings.matterRole);
  return <SidebarMatterPickerDialog {...props} role={role} />;
}

// Picking a Matter here makes it the active one, so the Picker acts as a single choice.
function SidebarMatterPickerDialog(props: SidebarMatterPickerProps & { role: MatterRole }) {
  const selection = props.activeMatter ? [props.activeMatter] : [];
  return (
    <MatterPickerDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      selection={selection}
      onChange={(next) =>
        props.onPick(
          next.find((matter) => matter.matterId !== props.activeMatter?.matterId) ?? null,
        )
      }
      role={props.role}
    />
  );
}

function ActiveMatterLedger({
  matter,
  threadRef,
}: {
  matter: MatterRef;
  threadRef: ScopedThreadRef | null;
}) {
  const [expanded, setExpanded] = useLocalStorage(
    LEDGER_EXPANDED_STORAGE_KEY,
    true,
    Schema.Boolean,
  );
  return (
    <div className="ps-3">
      <CollapsibleSectionHeader expanded={expanded} onClick={() => setExpanded(!expanded)}>
        Write ledger
      </CollapsibleSectionHeader>
      {expanded ? <ActiveMatterLedgerRows matter={matter} threadRef={threadRef} /> : null}
    </div>
  );
}

// Only the open thread's projection is loaded already; reading every thread on the Matter
// would subscribe to each one, so the ledger follows the open thread.
function ActiveMatterLedgerRows({
  matter,
  threadRef,
}: {
  matter: MatterRef;
  threadRef: ScopedThreadRef | null;
}) {
  const { ledger } = useMatterThreadData(threadRef);
  const rows = ledger.filter((row) => row.matter.matterId === matter.matterId);
  if (rows.length === 0) {
    return (
      <p className="px-2 pb-2 text-2xs text-sidebar-muted-foreground">
        {threadRef === null
          ? "Open a thread on this Matter to see its Writes."
          : "No Writes to this Matter in the open thread."}
      </p>
    );
  }
  return (
    <ol aria-label={`Write ledger for ${matter.name}`} className="flex flex-col pb-2">
      {rows.map((row) => {
        const status = LEDGER_STATUS_BADGE[row.status];
        return (
          <li
            key={row.id}
            data-ledger-status={row.status}
            className="flex h-7 min-w-0 items-center gap-2 px-2 text-xs"
          >
            {row.recordUrl ? (
              <a
                href={row.recordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-sidebar-foreground hover:underline"
              >
                {row.subject ?? FILEVINE_WRITE_KIND_LABEL[row.kind]}
              </a>
            ) : (
              <span className="min-w-0 flex-1 truncate text-sidebar-foreground">
                {row.subject ?? FILEVINE_WRITE_KIND_LABEL[row.kind]}
              </span>
            )}
            <Badge variant={status.variant} size="sm">
              {status.label}
            </Badge>
          </li>
        );
      })}
    </ol>
  );
}
