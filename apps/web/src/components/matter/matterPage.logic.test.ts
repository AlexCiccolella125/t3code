import type { MatterRef } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  collectMatterLedger,
  parseMatterPageSearch,
  resolveMatterPageMatter,
  selectMatterThreads,
  sidebarMatters,
} from "./matterPage.logic";
import { EMPTY_MATTER_THREAD_DATA, type MatterLedgerRow } from "./matterThreadData";

const matter = (matterId: string, isProduction = true): MatterRef => ({
  matterId,
  name: `Test Matter ${matterId}`,
  orgId: isProduction ? 1 : 2,
  orgName: isProduction ? "Example Office" : "Example Sandbox",
  isProduction,
});

const alpha = matter("9001");
const beta = matter("9002", false);

const thread = (
  id: string,
  updatedAt: string,
  matterSelection: ReadonlyArray<MatterRef> | undefined,
  overrides: { archivedAt?: string; deletedAt?: string } = {},
) => ({
  environmentId: "env-1",
  id,
  updatedAt,
  matterSelection,
  archivedAt: overrides.archivedAt ?? null,
  deletedAt: overrides.deletedAt ?? null,
});

describe("parseMatterPageSearch", () => {
  it("keeps a known tab and drops Threads, unknown tabs and non-strings", () => {
    expect(parseMatterPageSearch({ tab: "ledger" })).toEqual({ tab: "ledger" });
    expect(parseMatterPageSearch({ tab: "threads" })).toEqual({});
    expect(parseMatterPageSearch({ tab: "secrets" })).toEqual({});
    expect(parseMatterPageSearch({ tab: 3 })).toEqual({});
  });
});

describe("selectMatterThreads", () => {
  const threads = [
    thread("old-first", "2026-11-01T00:00:00.000Z", [alpha]),
    thread("new-second", "2026-11-03T00:00:00.000Z", [beta, alpha]),
    thread("other", "2026-11-04T00:00:00.000Z", [beta]),
    thread("none", "2026-11-04T00:00:00.000Z", undefined),
    thread("archived", "2026-11-04T00:00:00.000Z", [alpha], { archivedAt: "2026-11-04" }),
    thread("deleted", "2026-11-04T00:00:00.000Z", [alpha], { deletedAt: "2026-11-04" }),
    thread("hidden", "2026-11-04T00:00:00.000Z", [alpha]),
  ];

  it("lists live, visible threads holding the Matter at any position, newest first", () => {
    const selected = selectMatterThreads(threads, alpha.matterId, (t) => t.id === "hidden");
    expect(selected.map((t) => t.id)).toEqual(["new-second", "old-first"]);
  });
});

describe("resolveMatterPageMatter", () => {
  it("falls back to a thread's copy for a Matter outside the catalog", () => {
    expect(resolveMatterPageMatter("14415990", [])?.name).toBe("XFER TEST Intake shape");
    expect(resolveMatterPageMatter(alpha.matterId, [thread("t", "", [beta, alpha])])).toBe(alpha);
    expect(resolveMatterPageMatter("missing", [])).toBeNull();
  });
});

describe("sidebarMatters", () => {
  const threads = [
    thread("a", "2026-11-01T00:00:00.000Z", [alpha]),
    thread("b", "2026-11-02T00:00:00.000Z", [beta, alpha]),
  ];

  it("lists starred Matters in starring order and skips unknown ids", () => {
    expect(sidebarMatters(["90000104", "nope", "14415990"], threads)).toEqual({
      starred: true,
      matters: [
        expect.objectContaining({ matterId: "90000104" }),
        expect.objectContaining({ matterId: "14415990" }),
      ],
    });
  });

  it("falls back to the Matters on the newest threads when none are starred", () => {
    expect(sidebarMatters([], threads)).toEqual({ starred: false, matters: [beta, alpha] });
  });
});

describe("collectMatterLedger", () => {
  const row = (id: string, at: string, on: MatterRef): MatterLedgerRow => ({
    id,
    at,
    matter: on,
    kind: "note",
    subject: id,
    status: "confirmed",
    recordUrl: undefined,
    error: undefined,
  });

  it("keeps only this Matter's Writes across threads, newest first, naming each thread", () => {
    const rows = collectMatterLedger(
      [
        {
          thread: "t1",
          data: {
            ...EMPTY_MATTER_THREAD_DATA,
            ledger: [row("w1", "2026-11-01T00:00:00.000Z", alpha), row("x", "2026-11-05", beta)],
          },
        },
        {
          thread: "t2",
          data: {
            ...EMPTY_MATTER_THREAD_DATA,
            ledger: [row("w2", "2026-11-02T00:00:00.000Z", alpha)],
          },
        },
      ],
      alpha.matterId,
    );
    expect(rows.map(({ thread, row }) => [thread, row.id])).toEqual([
      ["t2", "w2"],
      ["t1", "w1"],
    ]);
  });
});
