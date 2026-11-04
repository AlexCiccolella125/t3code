import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import { threadKey } from "@t3tools/client-runtime/state/entities";
import type { EnvironmentId, MatterRef } from "@t3tools/contracts";
import { Link, useNavigate } from "@tanstack/react-router";
import { ExternalLinkIcon, MessageSquarePlusIcon } from "lucide-react";
import { useState } from "react";

import { isElectron } from "../../env";
import { useMatterThreadDataList } from "../../hooks/useMatterThreadData";
import { cn } from "~/lib/utils";
import { useRightPanelStore } from "../../rightPanelStore";
import { useHiddenThreadKeys, useQuietThreadShells } from "../../state/entities";
import { buildThreadRouteParams } from "../../threadRoutes";
import { formatRelativeTimeLabel } from "../../timestampFormat";
import { COLLAPSED_SIDEBAR_TITLEBAR_INSET_CLASS } from "../../workspaceTitlebar";
import { WorkspacePageHeader } from "../WorkspacePageHeader";
import { Button } from "../ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "../ui/empty";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "../ui/menu";
import { SidebarInset } from "../ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { DocumentProofPage } from "./DocumentProofPage";
import { MATTER_EYEBROW_CLASS_NAME } from "./FilevineApprovalCard";
import { MatterChip } from "./MatterChip";
import { MatterOrgBadge } from "./MatterOrgBadge";
import { OpenInFilevine, PROOF_KIND_ICON, proofByline } from "./MatterProofsPanel";
import { MatterLedgerEntry } from "./MatterWriteLedgerPanel";
import {
  MATTER_PAGE_TAB_LABEL,
  MATTER_PAGE_TABS,
  MATTER_PAGE_THREAD_DATA_LIMIT,
  collectMatterLedger,
  collectMatterProofs,
  matterFilevineUrl,
  matterPageTabSearch,
  resolveMatterPageMatter,
  selectMatterThreads,
  type MatterPageTab,
} from "./matterPage.logic";
import { useStartMatterThread } from "./useMatterPageNavigation";

/** Serif for arrival: the Matter name is the page's only display type. */
const MATTER_DISPLAY_CLASS_NAME = "font-(family-name:--font-display) font-semibold text-foreground";

function useMatterThreads(matterId: string) {
  const shells = useQuietThreadShells();
  const hiddenKeys = useHiddenThreadKeys();
  return {
    shells,
    threads: selectMatterThreads(shells, matterId, (thread) =>
      hiddenKeys.has(threadKey(scopeThreadRef(thread.environmentId, thread.id))),
    ),
  };
}

function threadRouteParams(thread: Pick<EnvironmentThreadShell, "environmentId" | "id">) {
  return buildThreadRouteParams(scopeThreadRef(thread.environmentId, thread.id));
}

function MatterFacts({ matter }: { matter: MatterRef }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span className="font-mono tabular-nums">{matter.matterId}</span>
      <MatterOrgBadge matter={matter} />
      <span className="truncate">{matter.orgName}</span>
      {matter.phase ? <span className="truncate">· {matter.phase}</span> : null}
    </div>
  );
}

function NewMatterThreadButton({
  environmentId,
  matter,
}: {
  environmentId: EnvironmentId;
  matter: MatterRef;
}) {
  const start = useStartMatterThread(environmentId);
  const button = (
    <Button
      size="sm"
      disabled={start === null}
      onClick={start === null ? undefined : () => void start(matter)}
    >
      <MessageSquarePlusIcon aria-hidden />
      New thread on this Matter
    </Button>
  );
  if (start !== null) return button;
  return (
    <Tooltip>
      <TooltipTrigger render={<span />}>{button}</TooltipTrigger>
      <TooltipPopup side="bottom">Add a project to this environment first.</TooltipPopup>
    </Tooltip>
  );
}

/** Threads, Proofs, Ledger, Overview; links, so each tab has its own URL. */
export function MatterPageTabs({
  environmentId,
  matterId,
  active,
  threadCount,
}: {
  environmentId: EnvironmentId;
  matterId: string;
  active: MatterPageTab;
  threadCount?: number | undefined;
}) {
  return (
    <nav aria-label="Matter" className="flex min-w-0 items-end gap-4 overflow-x-auto">
      {MATTER_PAGE_TABS.map((tab) => (
        <Link
          key={tab}
          to="/$environmentId/matter/$matterId"
          params={{ environmentId, matterId }}
          search={matterPageTabSearch(tab)}
          aria-current={tab === active ? "page" : undefined}
          data-matter-tab={tab}
          className={cn(
            "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 pb-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
            tab === active
              ? "border-primary font-medium text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {MATTER_PAGE_TAB_LABEL[tab]}
          {tab === "threads" && threadCount !== undefined ? (
            <span className="font-mono text-2xs tabular-nums text-muted-foreground">
              {threadCount}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

/** With six Matters on a thread, chrome names two of the others and folds the rest into "+N". */
const OTHER_MATTERS_SHOWN = 2;

function OtherMatterLinks({
  environmentId,
  others,
}: {
  environmentId: EnvironmentId;
  others: ReadonlyArray<MatterRef>;
}) {
  const navigate = useNavigate();
  const shown = others.slice(0, OTHER_MATTERS_SHOWN);
  const folded = others.slice(OTHER_MATTERS_SHOWN);
  const open = (matter: MatterRef) =>
    void navigate({
      to: "/$environmentId/matter/$matterId",
      params: { environmentId, matterId: matter.matterId },
    });
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className={MATTER_EYEBROW_CLASS_NAME}>Also</span>
      {shown.map((other) => (
        <Link
          key={other.matterId}
          to="/$environmentId/matter/$matterId"
          params={{ environmentId, matterId: other.matterId }}
          className="min-w-0"
        >
          <MatterChip matter={other} compact />
        </Link>
      ))}
      {folded.length > 0 ? (
        <Menu>
          <MenuTrigger
            render={
              <Button size="micro" variant="outline" aria-label={`${folded.length} more Matters`} />
            }
          >
            +{folded.length}
          </MenuTrigger>
          <MenuPopup align="start">
            {folded.map((other) => (
              <MenuItem key={other.matterId} onClick={() => open(other)}>
                <span className="min-w-0 flex-1 truncate">{other.name}</span>
                <MatterOrgBadge matter={other} />
              </MenuItem>
            ))}
          </MenuPopup>
        </Menu>
      ) : null}
    </span>
  );
}

/**
 * The compact Matter page header a thread opens under: its first Matter, the other Matters in
 * its selection, and the Matter tabs with Threads active, since the chat below is the thread.
 */
export function MatterThreadFrameHeader({
  environmentId,
  selection,
}: {
  environmentId: EnvironmentId;
  selection: ReadonlyArray<MatterRef>;
}) {
  const [matter, ...others] = selection;
  if (matter === undefined) return null;
  return (
    <div
      data-matter-thread-frame={matter.matterId}
      className={cn(
        "flex shrink-0 flex-col gap-2 border-b border-border px-3 pt-2 sm:px-5",
        COLLAPSED_SIDEBAR_TITLEBAR_INSET_CLASS,
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <Link
          to="/$environmentId/matter/$matterId"
          params={{ environmentId, matterId: matter.matterId }}
          className={cn(
            MATTER_DISPLAY_CLASS_NAME,
            "min-w-0 truncate text-lg leading-tight hover:underline",
          )}
        >
          {matter.name}
        </Link>
        <MatterFacts matter={matter} />
        {others.length > 0 ? (
          <OtherMatterLinks environmentId={environmentId} others={others} />
        ) : null}
      </div>
      <MatterPageTabs environmentId={environmentId} matterId={matter.matterId} active="threads" />
    </div>
  );
}

function MatterThreadsTab({
  environmentId,
  matter,
  threads,
}: {
  environmentId: EnvironmentId;
  matter: MatterRef;
  threads: ReadonlyArray<EnvironmentThreadShell>;
}) {
  if (threads.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No threads on this Matter yet</EmptyTitle>
          <EmptyDescription>Start one to ask about {matter.name}.</EmptyDescription>
        </EmptyHeader>
        <NewMatterThreadButton environmentId={environmentId} matter={matter} />
      </Empty>
    );
  }
  return (
    <ul aria-label="Threads" className="flex flex-col divide-y divide-border">
      {threads.map((thread) => {
        const others = (thread.matterSelection ?? []).filter(
          (other) => other.matterId !== matter.matterId,
        );
        return (
          <li key={`${thread.environmentId}:${thread.id}`}>
            <Link
              to="/$environmentId/$threadId"
              params={threadRouteParams(thread)}
              data-matter-thread={thread.id}
              className="flex min-w-0 items-center gap-3 px-1 py-2.5 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {thread.title}
              </span>
              {others.length > 0 ? (
                <span className="hidden min-w-0 shrink items-center gap-1 sm:flex">
                  {others.slice(0, OTHER_MATTERS_SHOWN).map((other) => (
                    <MatterChip key={other.matterId} matter={other} compact />
                  ))}
                  {others.length > OTHER_MATTERS_SHOWN ? (
                    <span className="shrink-0 font-mono text-2xs tabular-nums text-muted-foreground">
                      +{others.length - OTHER_MATTERS_SHOWN}
                    </span>
                  ) : null}
                </span>
              ) : null}
              <span className="shrink-0 text-2xs font-medium uppercase tracking-eyebrow text-muted-foreground">
                {thread.matterMode === "work" ? "Work" : "Ask"}
              </span>
              <span className="w-16 shrink-0 text-right font-mono text-2xs tabular-nums text-muted-foreground">
                {formatRelativeTimeLabel(thread.updatedAt)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ThreadDataScope({ read, total }: { read: number; total: number }) {
  if (total <= read) return null;
  return (
    <p className="text-xs text-muted-foreground">
      From the {read} most recent of {total} threads on this Matter.
    </p>
  );
}

function MatterProofsTab({
  matterId,
  threads,
}: {
  matterId: string;
  threads: ReadonlyArray<EnvironmentThreadShell>;
}) {
  const navigate = useNavigate();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const read = threads.slice(0, MATTER_PAGE_THREAD_DATA_LIMIT);
  const refs = read.map((thread) => scopeThreadRef(thread.environmentId, thread.id));
  const dataList = useMatterThreadDataList(refs);
  const groups = collectMatterProofs(
    read.map((thread, index) => ({ thread, data: dataList[index]! })),
    matterId,
  );
  const openInThread = (thread: EnvironmentThreadShell, citeId: string) => {
    void navigate({ to: "/$environmentId/$threadId", params: threadRouteParams(thread) });
    useRightPanelStore
      .getState()
      .openMatterProof(scopeThreadRef(thread.environmentId, thread.id), citeId);
  };

  return (
    <div className="flex flex-col gap-4">
      <ThreadDataScope read={read.length} total={threads.length} />
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No proofs yet. They appear here when an agent reads this Matter in one of its threads.
        </p>
      ) : null}
      {groups.map(({ thread, proofs }) => (
        <section key={`${thread.environmentId}:${thread.id}`} className="flex flex-col gap-1.5">
          <header className="flex min-w-0 items-center gap-2">
            <span className={MATTER_EYEBROW_CLASS_NAME}>Thread</span>
            <Link
              to="/$environmentId/$threadId"
              params={threadRouteParams(thread)}
              className="min-w-0 truncate text-sm font-medium text-foreground hover:underline"
            >
              {thread.title}
            </Link>
          </header>
          <ul className="flex flex-col gap-1">
            {proofs.map((entry) => {
              const Icon = PROOF_KIND_ICON[entry.proof.kind];
              const byline = proofByline(entry);
              const key = `${thread.id}:${entry.proof.citeId}`;
              const expanded = expandedKey === key;
              return (
                <li
                  key={entry.proof.citeId}
                  data-proof={entry.proof.citeId}
                  className="flex min-w-0 flex-col gap-1 rounded-(--control-radius) border border-border bg-card p-2"
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <span className="mt-px min-w-5 rounded-xs bg-secondary px-1 text-center font-mono text-2xs font-semibold leading-4 tabular-nums text-secondary-foreground">
                      {entry.index}
                    </span>
                    <Icon aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-xs font-medium wrap-anywhere text-foreground">
                        {entry.proof.title}
                      </span>
                      <span className="line-clamp-3 text-xs wrap-anywhere text-muted-foreground">
                        {entry.proof.excerpt}
                      </span>
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-2 ps-7">
                    {byline ? (
                      <span className="min-w-0 truncate text-2xs text-muted-foreground">
                        {byline}
                      </span>
                    ) : null}
                    <span className="ms-auto flex items-center gap-1">
                      {entry.proof.document ? (
                        <Button
                          size="xs"
                          variant="ghost-muted"
                          aria-expanded={expanded}
                          onClick={() => setExpandedKey(expanded ? null : key)}
                        >
                          {expanded ? "Hide page" : "Show page"}
                        </Button>
                      ) : null}
                      <Button
                        size="xs"
                        variant="ghost-muted"
                        onClick={() => openInThread(thread, entry.proof.citeId)}
                      >
                        Open in thread
                      </Button>
                      <OpenInFilevine url={entry.proof.recordUrl} />
                    </span>
                  </div>
                  {expanded && entry.proof.document ? (
                    <DocumentProofPage document={entry.proof.document} />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function MatterLedgerTab({
  matterId,
  threads,
}: {
  matterId: string;
  threads: ReadonlyArray<EnvironmentThreadShell>;
}) {
  const read = threads.slice(0, MATTER_PAGE_THREAD_DATA_LIMIT);
  const refs = read.map((thread) => scopeThreadRef(thread.environmentId, thread.id));
  const dataList = useMatterThreadDataList(refs);
  const rows = collectMatterLedger(
    read.map((thread, index) => ({ thread, data: dataList[index]! })),
    matterId,
  );
  return (
    <div className="flex flex-col gap-3">
      <ThreadDataScope read={read.length} total={threads.length} />
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No writes yet. Every Write a thread proposes or makes on this Matter is listed here.
        </p>
      ) : (
        <ol aria-label="Write ledger" className="flex flex-col gap-2">
          {rows.map(({ thread, row }) => (
            <MatterLedgerEntry key={`${thread.id}:${row.id}`} row={row}>
              <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <span className="shrink-0">In</span>
                <Link
                  to="/$environmentId/$threadId"
                  params={threadRouteParams(thread)}
                  className="min-w-0 truncate text-foreground hover:underline"
                >
                  {thread.title}
                </Link>
              </span>
            </MatterLedgerEntry>
          ))}
        </ol>
      )}
    </div>
  );
}

// Placeholders until the Overview reads the Matter's sections from Filevine.
const PLACEHOLDER_VITALS = [
  "Date of incident",
  "Statute of limitations",
  "Primary attorney",
  "Case manager",
  "Medical specials",
  "Policy limits",
] as const;

function MatterOverviewTab({ matter, threadCount }: { matter: MatterRef; threadCount: number }) {
  const facts: ReadonlyArray<readonly [string, string]> = [
    ["Filevine project ID", matter.matterId],
    ["Org", `${matter.orgName} (${matter.orgId})`],
    ["Phase", matter.phase ?? "Unknown"],
    ["Project type", matter.projectType ?? "Unknown"],
    ["Office", matter.office ?? "Unknown"],
    ["Threads here", String(threadCount)],
  ];
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className={MATTER_EYEBROW_CLASS_NAME}>Catalog</h2>
        <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-(--control-radius) border border-border bg-border sm:grid-cols-2">
          {facts.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5 bg-card px-3 py-2">
              <dt className="text-2xs text-muted-foreground">{label}</dt>
              <dd className="text-sm text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className={MATTER_EYEBROW_CLASS_NAME}>Vitals</h2>
        <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-(--control-radius) border border-border bg-border sm:grid-cols-3">
          {PLACEHOLDER_VITALS.map((label) => (
            <div key={label} className="flex flex-col gap-0.5 bg-card px-3 py-2">
              <dt className="text-2xs text-muted-foreground">{label}</dt>
              <dd className="text-sm text-muted-foreground">Not loaded</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">
          Placeholders. Ask an agent in a thread for the live values from Filevine.
        </p>
      </section>
      <div>
        <Button
          size="sm"
          variant="outline"
          render={<a href={matterFilevineUrl(matter)} target="_blank" rel="noopener noreferrer" />}
        >
          Open in Filevine
          <ExternalLinkIcon aria-hidden />
        </Button>
      </div>
    </div>
  );
}

/** A Matter as a page: its heading, then its threads, Proofs, Write ledger and overview. */
export function MatterPage({
  environmentId,
  matterId,
  tab,
}: {
  environmentId: EnvironmentId;
  matterId: string;
  tab: MatterPageTab;
}) {
  const { shells, threads } = useMatterThreads(matterId);
  const matter = resolveMatterPageMatter(matterId, shells);

  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden bg-background">
        <WorkspacePageHeader electron={isElectron} className="border-b border-border">
          <span className={MATTER_EYEBROW_CLASS_NAME}>Matter</span>
        </WorkspacePageHeader>
        {matter === null ? (
          <Empty className="flex-1">
            <EmptyHeader>
              <EmptyTitle>Matter not found</EmptyTitle>
              <EmptyDescription>
                No Matter with Filevine project ID {matterId} is in the catalog or on a thread.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-gutter-both">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-6 sm:px-8">
              <header data-matter-page={matter.matterId} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h1 className={cn(MATTER_DISPLAY_CLASS_NAME, "min-w-0 text-3xl leading-tight")}>
                    {matter.name}
                  </h1>
                  <NewMatterThreadButton environmentId={environmentId} matter={matter} />
                </div>
                <MatterFacts matter={matter} />
              </header>
              <div className="border-b border-border">
                <MatterPageTabs
                  environmentId={environmentId}
                  matterId={matter.matterId}
                  active={tab}
                  threadCount={threads.length}
                />
              </div>
              {tab === "threads" ? (
                <MatterThreadsTab environmentId={environmentId} matter={matter} threads={threads} />
              ) : tab === "proofs" ? (
                <MatterProofsTab matterId={matter.matterId} threads={threads} />
              ) : tab === "ledger" ? (
                <MatterLedgerTab matterId={matter.matterId} threads={threads} />
              ) : (
                <MatterOverviewTab matter={matter} threadCount={threads.length} />
              )}
            </div>
          </div>
        )}
      </div>
    </SidebarInset>
  );
}
