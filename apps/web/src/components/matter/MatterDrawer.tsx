import type { MatterRef, ScopedThreadRef } from "@t3tools/contracts";
import { MATTER_CATALOG } from "@t3tools/shared/matterCatalog";
import { ExternalLinkIcon } from "lucide-react";

import { useMatterThreadData } from "../../hooks/useMatterThreadData";
import {
  type MatterDrawerTab,
  type RightPanelSurface,
  useRightPanelStore,
} from "../../rightPanelStore";
import { useQuietThreadShell } from "../../state/entities";
import { Button } from "../ui/button";
import { Toggle, ToggleGroup } from "../ui/toggle-group";
import { MATTER_EYEBROW_CLASS_NAME } from "./FilevineApprovalCard";
import { MatterOrgBadge } from "./MatterOrgBadge";
import { MatterProofsPanel } from "./MatterProofsPanel";
import { MatterWriteLedgerPanel } from "./MatterWriteLedgerPanel";
import { type MatterThreadData, pendingMatterWriteCount } from "./matterThreadData";

const MATTER_DRAWER_TABS: ReadonlyArray<{ tab: MatterDrawerTab; label: string }> = [
  { tab: "overview", label: "Overview" },
  { tab: "proofs", label: "Proofs" },
  { tab: "ledger", label: "Ledger" },
];

const isMatterDrawerTab = (value: unknown): value is MatterDrawerTab =>
  MATTER_DRAWER_TABS.some((entry) => entry.tab === value);

const filevineMatterUrl = (matter: Pick<MatterRef, "matterId" | "orgId">) =>
  `https://demandthelimits.filevineapp.com/#/project/${matter.matterId}/activity?orgId=${matter.orgId}`;

const catalogById = new Map(MATTER_CATALOG.map((matter) => [matter.matterId, matter]));

/** The one right-hand drawer for a thread's Matters: Overview, Proofs and the Write ledger. */
export function MatterDrawer({
  threadRef,
  surface,
}: {
  threadRef: ScopedThreadRef;
  surface: Extract<RightPanelSurface, { kind: "matter" }>;
}) {
  const data = useMatterThreadData(threadRef);
  const tab = surface.tab ?? "overview";
  const counts: Record<MatterDrawerTab, number | null> = {
    overview: null,
    proofs: data.proofs.length,
    ledger: data.ledger.length,
  };
  const pending = pendingMatterWriteCount(data);
  return (
    <div data-matter-drawer={tab} className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center border-b border-border px-3 py-2">
        <ToggleGroup
          aria-label="Matter drawer"
          value={[tab]}
          onValueChange={(next) => {
            const value = next[0];
            if (isMatterDrawerTab(value)) {
              useRightPanelStore.getState().openMatterDrawer(threadRef, value);
            }
          }}
        >
          {MATTER_DRAWER_TABS.map((entry) => {
            const count = counts[entry.tab];
            return (
              <Toggle key={entry.tab} value={entry.tab}>
                {entry.label}
                {count ? <span className="font-mono tabular-nums">{count}</span> : null}
                {entry.tab === "ledger" && pending > 0 ? (
                  <span className="sr-only">, {pending} pending</span>
                ) : null}
              </Toggle>
            );
          })}
        </ToggleGroup>
      </div>
      <div className="min-h-0 flex-1">
        {tab === "overview" ? (
          <MatterOverview threadRef={threadRef} data={data} />
        ) : tab === "proofs" ? (
          <MatterProofsPanel threadRef={threadRef} selectedCiteId={surface.citeId} />
        ) : (
          <MatterWriteLedgerPanel threadRef={threadRef} />
        )}
      </div>
    </div>
  );
}

const OVERVIEW_KEY_FIELD_LIMIT = 4;

function MatterOverview({
  threadRef,
  data,
}: {
  threadRef: ScopedThreadRef;
  data: MatterThreadData;
}) {
  const selection = useQuietThreadShell(threadRef)?.matterSelection ?? [];
  if (selection.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        No Matters on this thread. Add one from the composer.
      </p>
    );
  }
  return (
    <ul aria-label="Matters" className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto p-3">
      {selection.map((matter) => {
        const read = data.overviews.get(matter.matterId);
        const catalog = catalogById.get(matter.matterId);
        const facts = [
          { label: "Org", value: read?.org ?? matter.orgName },
          { label: "Phase", value: read?.phase ?? matter.phase ?? catalog?.phase },
          {
            label: "Type",
            value: read?.projectType ?? matter.projectType ?? catalog?.projectType,
          },
          { label: "Office", value: read?.office ?? matter.office ?? catalog?.office },
        ];
        const keyFields = data.proofs
          .filter(
            (entry) => entry.proof.matterId === matter.matterId && entry.proof.kind === "section",
          )
          .slice(0, OVERVIEW_KEY_FIELD_LIMIT);
        const writes = data.ledger.filter((row) => row.matter.matterId === matter.matterId);
        const pending = writes.filter((row) => row.status === "proposed").length;
        return (
          <li
            key={matter.matterId}
            data-matter-overview={matter.matterId}
            className="flex min-w-0 flex-col gap-2 rounded-(--control-radius) border border-border bg-card p-3"
          >
            <header className="flex min-w-0 flex-col gap-1">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <h3 className="min-w-0 text-sm font-semibold wrap-anywhere text-foreground">
                  {matter.name}
                </h3>
                <MatterOrgBadge matter={matter} />
              </div>
              <span className="font-mono text-2xs tabular-nums text-muted-foreground">
                Matter {matter.matterId}
              </span>
            </header>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
              {facts.map((fact) =>
                fact.value ? (
                  <div key={fact.label} className="contents">
                    <dt className="text-muted-foreground">{fact.label}</dt>
                    <dd className="min-w-0 wrap-anywhere text-foreground">{fact.value}</dd>
                  </div>
                ) : null,
              )}
            </dl>
            {keyFields.length > 0 ? (
              <section className="flex min-w-0 flex-col gap-1">
                <h4 className={MATTER_EYEBROW_CLASS_NAME}>Key fields</h4>
                <ul className="flex min-w-0 flex-col">
                  {keyFields.map((entry) => (
                    <li key={entry.proof.citeId} className="min-w-0">
                      <Button
                        size="xs"
                        variant="ghost-muted"
                        aria-label={`Proof ${entry.index}: ${entry.proof.title}`}
                        onClick={() =>
                          useRightPanelStore
                            .getState()
                            .openMatterProof(threadRef, entry.proof.citeId)
                        }
                      >
                        <span className="font-mono tabular-nums">{entry.index}</span>
                        <span className="truncate">
                          {entry.proof.title}: {entry.proof.excerpt}
                        </span>
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              {writes.length > 0 ? (
                <Button
                  size="xs"
                  variant="ghost-muted"
                  onClick={() =>
                    useRightPanelStore.getState().openMatterDrawer(threadRef, "ledger")
                  }
                >
                  <span className="font-mono tabular-nums">{writes.length}</span>
                  {writes.length === 1 ? "write" : "writes"}
                  {pending > 0 ? `, ${pending} pending` : ""}
                </Button>
              ) : (
                <span className="text-2xs text-muted-foreground">No writes</span>
              )}
              <Button
                size="xs"
                variant="ghost-muted"
                render={
                  <a href={filevineMatterUrl(matter)} target="_blank" rel="noopener noreferrer" />
                }
              >
                Open in Filevine
                <ExternalLinkIcon aria-hidden />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
