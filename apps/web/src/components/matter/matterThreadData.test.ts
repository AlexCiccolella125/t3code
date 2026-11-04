import { RuntimeRequestId, type FilevineWriteProposal, type MatterRef } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { extractMatterThreadData } from "./matterThreadData";

const sandboxMatter: MatterRef = {
  matterId: "9001",
  name: "Test Matter Alpha",
  orgId: 7,
  orgName: "Example Sandbox",
  isProduction: false,
};

const productionSummary = {
  matterId: "9002",
  name: "Test Matter Beta",
  org: "Example Office (8)",
  environment: "PRODUCTION",
};

const blocks = (value: unknown) => [{ type: "text", text: JSON.stringify(value) }];

const proposal = (subject: string): FilevineWriteProposal => ({
  matter: sandboxMatter,
  kind: "task",
  subject,
  body: "Call the adjuster.",
  assistantMarker: "[Assistant] Drafted in T3 Code thread t-1; approved by Test User.",
  dueDate: "2026-12-01",
});

describe("extractMatterThreadData", () => {
  const data = extractMatterThreadData({
    selection: [sandboxMatter],
    toolResults: [
      {
        itemId: "item-overview",
        toolName: "mcp__t3-filevine__filevine_matter_overview",
        nativeId: "tool-1",
        at: "2026-11-04T10:00:00.000Z",
        output: blocks({
          matter: { ...sandboxMatter, environment: "SANDBOX" },
          proofs: [
            {
              citeId: "9001:section:limits",
              matterId: "9001",
              kind: "section",
              title: "Policy limits",
              excerpt: "25/50",
            },
            { citeId: "broken" },
          ],
        }),
      },
      {
        itemId: "item-search",
        toolName: "mcp__t3-filevine__filevine_search_documents",
        nativeId: "tool-2",
        at: "2026-11-04T10:01:00.000Z",
        output: JSON.stringify({
          query: "estimate",
          results: [
            {
              matter: productionSummary,
              proofs: [
                {
                  citeId: "9002:document:d1:p2",
                  matterId: "9002",
                  kind: "document",
                  title: "estimate.pdf, page 2",
                  excerpt: "Repair estimate total.",
                  document: {
                    fileName: "estimate.pdf",
                    page: 2,
                    pageCount: 3,
                    highlight: { x: 0.1, y: 0.2, width: 0.5, height: 0.05 },
                    pageText: "Synthetic page text.",
                  },
                },
              ],
            },
            {
              matter: { ...sandboxMatter, environment: "SANDBOX" },
              proofs: [
                {
                  citeId: "9001:section:limits",
                  matterId: "9001",
                  kind: "section",
                  title: "Policy limits",
                  excerpt: "25/50",
                },
              ],
            },
          ],
        }),
      },
      {
        itemId: "item-task",
        toolName: "mcp__t3-filevine__filevine_create_task",
        nativeId: "tool-3",
        at: "2026-11-04T10:03:00.000Z",
        output: {
          content: blocks({
            receipt: true,
            matter: sandboxMatter,
            kind: "task",
            status: "confirmed",
            recordId: "task-77",
            recordUrl: "https://example.invalid/task-77",
            subject: "Call adjuster",
            confirmedAt: "2026-11-04T10:03:05.000Z",
          }),
        },
      },
      {
        itemId: "item-removal",
        toolName: "mcp__t3-filevine__filevine_remove_record",
        nativeId: "tool-4",
        at: "2026-11-04T10:05:00.000Z",
        output: blocks({
          receipt: true,
          matter: sandboxMatter,
          kind: "removal",
          status: "confirmed",
          recordId: "task-77",
          subject: "Removed task task-77",
        }),
      },
      {
        itemId: "item-error",
        toolName: "mcp__t3-filevine__filevine_create_note",
        nativeId: "tool-5",
        at: "2026-11-04T10:06:00.000Z",
        output: blocks("Matter 1 is not in this thread's selection."),
      },
    ],
    writeRequests: [
      {
        requestId: RuntimeRequestId.make("request-approved"),
        nativeIds: ["tool-3"],
        at: "2026-11-04T10:02:00.000Z",
        proposal: proposal("Call adjuster"),
        state: "accepted",
      },
      {
        requestId: RuntimeRequestId.make("request-declined"),
        nativeIds: ["tool-6"],
        at: "2026-11-04T10:04:00.000Z",
        proposal: proposal("Send letter"),
        state: "declined",
      },
      {
        requestId: RuntimeRequestId.make("request-pending"),
        nativeIds: ["tool-7"],
        at: "2026-11-04T10:07:00.000Z",
        proposal: proposal("Order records"),
        state: "pending",
      },
    ],
  });

  it("numbers each Proof once, in order of first appearance", () => {
    expect(data.proofs.map((entry) => [entry.index, entry.proof.citeId])).toEqual([
      [1, "9001:section:limits"],
      [2, "9002:document:d1:p2"],
    ]);
    expect(data.proofsByCiteId.get("9002:document:d1:p2")?.proof.document?.page).toBe(2);
  });

  it("names Matters from the selection and from read results", () => {
    expect(data.matters.get("9001")).toEqual({
      matterId: "9001",
      name: "Test Matter Alpha",
      isProduction: false,
    });
    expect(data.matters.get("9002")).toEqual({
      matterId: "9002",
      name: "Test Matter Beta",
      isProduction: true,
    });
  });

  it("reads Write receipts and the tasks a Removal deleted", () => {
    expect(data.writes.map((entry) => [entry.itemId, entry.receipt.kind])).toEqual([
      ["item-task", "task"],
      ["item-removal", "removal"],
    ]);
    expect(data.writesByItemId.get("item-task")?.receipt.recordUrl).toBe(
      "https://example.invalid/task-77",
    );
    expect([...data.removedRecordIds]).toEqual(["task-77"]);
  });

  it("lists every Write in the ledger, folding an approval into its receipt", () => {
    expect(data.ledger.map((row) => [row.subject, row.status])).toEqual([
      ["Call adjuster", "confirmed"],
      ["Send letter", "rejected"],
      ["Removed task task-77", "confirmed"],
      ["Order records", "proposed"],
    ]);
  });
});
