import type { MatterRef } from "@t3tools/contracts";
import { MATTER_CATALOG } from "@t3tools/shared/matterCatalog";

import type { MatterLedgerRow, MatterProofEntry, MatterThreadData } from "./matterThreadData";

export const MATTER_PAGE_TABS = ["threads", "proofs", "ledger", "overview"] as const;
export type MatterPageTab = (typeof MATTER_PAGE_TABS)[number];

export const MATTER_PAGE_TAB_LABEL = {
  threads: "Threads",
  proofs: "Proofs",
  ledger: "Ledger",
  overview: "Overview",
} satisfies Record<MatterPageTab, string>;

/** Threads is the default, so its URL carries no `tab`. */
export interface MatterPageSearch {
  readonly tab?: Exclude<MatterPageTab, "threads">;
}

export function parseMatterPageSearch(raw: Record<string, unknown>): MatterPageSearch {
  const tab = raw.tab;
  return tab === "proofs" || tab === "ledger" || tab === "overview" ? { tab } : {};
}

export function matterPageTabSearch(tab: MatterPageTab): MatterPageSearch {
  return tab === "threads" ? {} : { tab };
}

/** Proofs and Ledger read at most this many of the Matter's threads, newest first. */
export const MATTER_PAGE_THREAD_DATA_LIMIT = 10;

interface MatterPageThread {
  readonly environmentId: string;
  readonly id: string;
  readonly matterSelection?: ReadonlyArray<MatterRef> | undefined;
  readonly updatedAt: string;
  readonly archivedAt: string | null;
  readonly deletedAt: string | null;
}

/** The catalog entry, else the copy a thread carries, so a Matter outside the catalog still opens. */
export function resolveMatterPageMatter(
  matterId: string,
  threads: ReadonlyArray<Pick<MatterPageThread, "matterSelection">>,
): MatterRef | null {
  const fromCatalog = MATTER_CATALOG.find((matter) => matter.matterId === matterId);
  if (fromCatalog) return fromCatalog;
  for (const thread of threads) {
    const match = thread.matterSelection?.find((matter) => matter.matterId === matterId);
    if (match) return match;
  }
  return null;
}

/** Live threads whose selection includes the Matter, at any position, newest first. */
export function selectMatterThreads<TThread extends MatterPageThread>(
  threads: ReadonlyArray<TThread>,
  matterId: string,
  isHidden: (thread: TThread) => boolean,
): TThread[] {
  return selectLiveThreadsNewestFirst(threads).filter(
    (thread) =>
      !isHidden(thread) &&
      (thread.matterSelection?.some((matter) => matter.matterId === matterId) ?? false),
  );
}

export interface MatterPageThreadData<TThread> {
  readonly thread: TThread;
  readonly data: MatterThreadData;
}

/** One Matter's Write ledger across its threads, newest first, each row naming its thread. */
export function collectMatterLedger<TThread>(
  threads: ReadonlyArray<MatterPageThreadData<TThread>>,
  matterId: string,
): Array<{ thread: TThread; row: MatterLedgerRow }> {
  return threads
    .flatMap(({ thread, data }) =>
      data.ledger.filter((row) => row.matter.matterId === matterId).map((row) => ({ thread, row })),
    )
    .toSorted((left, right) => Date.parse(right.row.at) - Date.parse(left.row.at));
}

/** One Matter's Proofs, per thread, keeping each thread's own Citation numbers. */
export function collectMatterProofs<TThread>(
  threads: ReadonlyArray<MatterPageThreadData<TThread>>,
  matterId: string,
): Array<{ thread: TThread; proofs: MatterProofEntry[] }> {
  return threads.flatMap(({ thread, data }) => {
    const proofs = data.proofs.filter((entry) => entry.proof.matterId === matterId);
    return proofs.length === 0 ? [] : [{ thread, proofs }];
  });
}

export function matterFilevineUrl(matter: Pick<MatterRef, "matterId" | "orgId">): string {
  return `https://demandthelimits.filevineapp.com/#/project/${encodeURIComponent(matter.matterId)}/activity?orgId=${matter.orgId}`;
}

/** How many Matters the sidebar lists when none are starred. */
const SIDEBAR_RECENT_MATTER_LIMIT = 6;

/** Starred Matters in starring order; with none starred, the Matters on the newest threads. */
export function sidebarMatters(
  starredIds: ReadonlyArray<string>,
  threads: ReadonlyArray<MatterPageThread>,
): { starred: boolean; matters: MatterRef[] } {
  const starred = starredIds.flatMap((matterId) => {
    const matter = resolveMatterPageMatter(matterId, threads);
    return matter === null ? [] : [matter];
  });
  if (starred.length > 0) return { starred: true, matters: starred };
  const recent = new Map<string, MatterRef>();
  for (const thread of selectLiveThreadsNewestFirst(threads)) {
    for (const matter of thread.matterSelection ?? []) {
      if (recent.size >= SIDEBAR_RECENT_MATTER_LIMIT) break;
      if (!recent.has(matter.matterId)) recent.set(matter.matterId, matter);
    }
  }
  return { starred: false, matters: [...recent.values()] };
}

function selectLiveThreadsNewestFirst<TThread extends MatterPageThread>(
  threads: ReadonlyArray<TThread>,
): TThread[] {
  return threads
    .filter((thread) => thread.deletedAt === null && thread.archivedAt === null)
    .toSorted((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

function groupCatalogByOrg(): Array<{
  orgId: number;
  orgName: string;
  matters: MatterRef[];
}> {
  const byOrg = new Map<number, { orgId: number; orgName: string; matters: MatterRef[] }>();
  for (const matter of MATTER_CATALOG) {
    const org = byOrg.get(matter.orgId);
    if (org) org.matters.push(matter);
    else
      byOrg.set(matter.orgId, { orgId: matter.orgId, orgName: matter.orgName, matters: [matter] });
  }
  return [...byOrg.values()];
}

/** The catalog grouped by Org, Orgs in first-seen order. */
export const MATTER_CATALOG_BY_ORG = groupCatalogByOrg();
