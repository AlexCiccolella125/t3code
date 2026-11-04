#!/usr/bin/env node
// @effect-diagnostics nodeBuiltinImport:off
// Stdio MCP server over the thread's Matter selection. Kept separate from T3 Code's own MCP
// server so Claude's permission callback fires for every write (that is the Approval card).
// Env: T3_FILEVINE_SELECTION (JSON MatterRef[]), T3_FILEVINE_MODE ask|work,
// T3_FILEVINE_ROLE paralegal|attorney, T3_FILEVINE_THREAD_ID, T3_FILEVINE_USER, T3_FILEVINE_LIVE=1.
import * as NodeReadline from "node:readline";

import { FIXTURE_MATTERS, type FixtureMatter } from "./fixtures.ts";
import * as Filevine from "./filevineApi.ts";

interface MatterRef {
  readonly matterId: string;
  readonly name: string;
  readonly orgId: number;
  readonly orgName: string;
  readonly isProduction: boolean;
  readonly phase?: string;
  readonly projectType?: string;
  readonly office?: string;
}

interface Proof {
  citeId: string;
  matterId: string;
  kind: "note" | "section" | "task" | "document";
  title: string;
  excerpt: string;
  recordUrl?: string;
  author?: string;
  createdAt?: string;
  document?: {
    fileName: string;
    page: number;
    pageCount: number;
    highlight: { x: number; y: number; width: number; height: number };
    pageText: string;
  };
}

const selection: ReadonlyArray<MatterRef> = JSON.parse(process.env.T3_FILEVINE_SELECTION ?? "[]");
const mode = process.env.T3_FILEVINE_MODE === "work" ? "work" : "ask";
const role = process.env.T3_FILEVINE_ROLE === "attorney" ? "attorney" : "paralegal";
const threadId = process.env.T3_FILEVINE_THREAD_ID ?? "unknown-thread";
const userName = process.env.T3_FILEVINE_USER ?? "the signed-in user";
const live = process.env.T3_FILEVINE_LIVE === "1";

const fixtureById = new Map(FIXTURE_MATTERS.map((matter) => [matter.matterId, matter]));

function selected(matterId: string): MatterRef {
  const matter = selection.find((candidate) => candidate.matterId === matterId);
  if (!matter) {
    throw new Error(
      `Matter ${matterId} is not in this thread's selection (${selection.map((m) => m.matterId).join(", ")}). Ask the user to add it before reading or writing it.`,
    );
  }
  return matter;
}

function assistantMarker(): string {
  return `[Assistant] Drafted in T3 Code thread ${threadId}; approved by ${userName}.`;
}

function fixtureProofs(matter: FixtureMatter): Proof[] {
  const out: Proof[] = [];
  for (const vital of matter.vitals) {
    out.push({
      citeId: `${matter.matterId}:section:${vital.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      matterId: matter.matterId,
      kind: "section",
      title: vital.label,
      excerpt: vital.value,
      recordUrl: Filevine.matterUrl(matter.orgId, matter.matterId),
    });
  }
  for (const note of matter.notes) {
    out.push({
      citeId: `${matter.matterId}:note:${note.id}`,
      matterId: matter.matterId,
      kind: "note",
      title: note.subject,
      excerpt: note.body,
      author: note.author,
      createdAt: note.createdAt,
      recordUrl: Filevine.recordUrl(matter.orgId, matter.matterId, "note", note.id),
    });
  }
  for (const task of matter.tasks) {
    out.push({
      citeId: `${matter.matterId}:task:${task.id}`,
      matterId: matter.matterId,
      kind: "task",
      title: task.subject,
      excerpt: `${task.body} Due ${task.dueDate}. Assigned to ${task.assignee}. ${task.completed ? "Completed." : "Open."}`,
      author: task.assignee,
      recordUrl: Filevine.recordUrl(matter.orgId, matter.matterId, "task", task.id),
    });
  }
  for (const document of matter.documents) {
    for (const page of document.pages) {
      out.push({
        citeId: `${matter.matterId}:document:${document.id}:p${page.page}`,
        matterId: matter.matterId,
        kind: "document",
        title: `${document.fileName}, page ${page.page}`,
        excerpt: page.excerpt,
        document: {
          fileName: document.fileName,
          page: page.page,
          pageCount: document.pageCount,
          highlight: page.highlight,
          pageText: page.text,
        },
      });
    }
  }
  return out;
}

async function liveProofs(matter: MatterRef): Promise<Proof[]> {
  const [project, notes, tasks] = await Promise.all([
    Filevine.getProject(matter.orgId, matter.matterId),
    Filevine.listNotes(matter.orgId, matter.matterId),
    Filevine.listTasks(matter.orgId, matter.matterId),
  ]);
  const out: Proof[] = [
    {
      citeId: `${matter.matterId}:section:vitals`,
      matterId: matter.matterId,
      kind: "section",
      title: "Project vitals",
      excerpt: `Phase ${project.phaseName}. Type ${project.projectTypeCode}. Primary ${project.firstPrimaryName}.${project.incidentDate ? ` Incident ${project.incidentDate.slice(0, 10)}.` : ""}`,
      recordUrl: Filevine.matterUrl(matter.orgId, matter.matterId),
    },
  ];
  for (const note of notes) {
    if (note.typeTag === "task") continue;
    out.push({
      citeId: `${matter.matterId}:note:${note.id}`,
      matterId: matter.matterId,
      kind: "note",
      title: note.subject || "(no subject)",
      excerpt: note.body,
      author: `user ${note.authorId}`,
      createdAt: note.createdAt,
      recordUrl: Filevine.recordUrl(matter.orgId, matter.matterId, "note", note.id),
    });
  }
  for (const task of tasks) {
    out.push({
      citeId: `${matter.matterId}:task:${task.id}`,
      matterId: matter.matterId,
      kind: "task",
      title: task.subject || "(no subject)",
      excerpt: `${task.body}${task.targetDate ? ` Due ${task.targetDate.slice(0, 10)}.` : ""} ${task.isCompleted ? "Completed." : "Open."}`,
      createdAt: task.createdAt,
      recordUrl: Filevine.recordUrl(matter.orgId, matter.matterId, "task", task.id),
    });
  }
  return out;
}

const proofCache = new Map<string, Proof[]>();

async function proofsFor(matter: MatterRef): Promise<Proof[]> {
  const cached = proofCache.get(matter.matterId);
  if (cached) return cached;
  const fixture = fixtureById.get(matter.matterId);
  let proofs: Proof[];
  if (fixture?.live && live) {
    try {
      proofs = await liveProofs(matter);
    } catch (error) {
      proofs = [
        ...fixtureProofs(fixture),
        {
          citeId: `${matter.matterId}:section:live-error`,
          matterId: matter.matterId,
          kind: "section",
          title: "Live read unavailable",
          excerpt: String(error instanceof Error ? error.message : error),
        },
      ];
    }
  } else if (fixture) {
    proofs = fixtureProofs(fixture);
  } else {
    proofs = [];
  }
  proofCache.set(matter.matterId, proofs);
  return proofs;
}

function scoreMatch(query: string, proof: Proof): number {
  const terms = query.toLowerCase().split(/\s+/).filter((term) => term.length > 2);
  if (terms.length === 0) return 1;
  const haystack = `${proof.title} ${proof.excerpt} ${proof.document?.pageText ?? ""}`.toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

const CITE_INSTRUCTION =
  "Cite every fact you take from a result by placing its citeId in the answer as [[cite:<citeId>]] right after the sentence it supports.";

function text(value: unknown): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function matterSummary(matter: MatterRef) {
  const fixture = fixtureById.get(matter.matterId);
  return {
    matterId: matter.matterId,
    name: matter.name,
    org: `${matter.orgName} (${matter.orgId})`,
    environment: matter.isProduction ? "PRODUCTION" : "SANDBOX",
    phase: matter.phase ?? fixture?.phase,
    projectType: matter.projectType ?? fixture?.projectType,
    office: matter.office ?? fixture?.office,
    writable: mode === "work" && Filevine.WRITABLE_MATTER_IDS.has(matter.matterId) && !(role === "paralegal" && matter.isProduction),
  };
}

const readTools = [
  {
    name: "filevine_list_matters",
    description:
      "List the Matters bound to this thread with their org, environment (PRODUCTION or SANDBOX), phase and whether writes are allowed. Call this first.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "filevine_matter_overview",
    description:
      "Read a Matter's vitals (key fields such as dates, limits, adjuster) and recent activity. Returns proofs with citeIds. " + CITE_INSTRUCTION,
    inputSchema: {
      type: "object",
      properties: { matterId: { type: "string", description: "A matterId from filevine_list_matters." } },
      required: ["matterId"],
      additionalProperties: false,
    },
  },
  {
    name: "filevine_search_activity",
    description:
      "Search notes, tasks and section fields across the selected Matters (or one Matter) for a query. Returns matching proofs with citeIds. " + CITE_INSTRUCTION,
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        matterId: { type: "string", description: "Optional. Restrict to one Matter." },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "filevine_search_documents",
    description:
      "Search the documents in the selected Matters (or one Matter). Returns document excerpts with page numbers and citeIds. " + CITE_INSTRUCTION,
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        matterId: { type: "string", description: "Optional. Restrict to one Matter." },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
];

const writeTools = [
  {
    name: "filevine_create_note",
    description:
      "Propose a note on one Matter. The user sees the full body on an Approval card and must approve before anything is written. The body must not include a signature or the assistant marker; the server adds the marker.",
    inputSchema: {
      type: "object",
      properties: {
        matterId: { type: "string", description: "A matterId from filevine_list_matters." },
        subject: { type: "string" },
        body: { type: "string" },
      },
      required: ["matterId", "body"],
      additionalProperties: false,
    },
  },
  {
    name: "filevine_create_task",
    description:
      "Propose a task on one Matter. The user approves it on an Approval card first. dueDate is YYYY-MM-DD.",
    inputSchema: {
      type: "object",
      properties: {
        matterId: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" },
        dueDate: { type: "string" },
      },
      required: ["matterId", "subject"],
      additionalProperties: false,
    },
  },
  {
    name: "filevine_remove_record",
    description:
      "Propose removing a task this thread created earlier. The user approves it first. Only records created in this thread may be removed.",
    inputSchema: {
      type: "object",
      properties: {
        matterId: { type: "string" },
        kind: { type: "string", enum: ["task"] },
        recordId: { type: "string" },
      },
      required: ["matterId", "kind", "recordId"],
      additionalProperties: false,
    },
  },
];

const createdHere = new Set<string>();

async function callTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "filevine_list_matters":
      return text({
        mode,
        role,
        matters: selection.map(matterSummary),
        note:
          mode === "ask"
            ? "This thread is in Ask mode: reads only. If the user wants a note or task created, tell them to switch the thread to Work."
            : "This thread is in Work mode. Every write you propose goes to the user for approval before it happens.",
      });
    case "filevine_matter_overview": {
      const matter = selected(String(args.matterId));
      const proofs = await proofsFor(matter);
      return text({ matter: matterSummary(matter), proofs });
    }
    case "filevine_search_activity":
    case "filevine_search_documents": {
      const query = String(args.query ?? "");
      const matters = args.matterId ? [selected(String(args.matterId))] : selection;
      const wantDocuments = name === "filevine_search_documents";
      const results: Array<{ matter: ReturnType<typeof matterSummary>; proofs: Proof[] }> = [];
      for (const matter of matters) {
        const proofs = (await proofsFor(matter)).filter((proof) =>
          wantDocuments ? proof.kind === "document" : proof.kind !== "document",
        );
        const ranked = proofs
          .map((proof) => ({ proof, score: scoreMatch(query, proof) }))
          .filter((entry) => entry.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 12)
          .map((entry) => entry.proof);
        results.push({ matter: matterSummary(matter), proofs: ranked });
      }
      return text({ query, results });
    }
    case "filevine_create_note":
    case "filevine_create_task":
    case "filevine_remove_record": {
      if (mode !== "work") throw new Error("This thread is in Ask mode; writes are not available.");
      const matter = selected(String(args.matterId));
      if (role === "paralegal" && matter.isProduction) {
        throw new Error(
          `A paralegal's ceiling on ${matter.orgName} (production) is Ask. An attorney must make this change, or it must go to a sandbox Matter.`,
        );
      }
      const kind = name === "filevine_create_note" ? "note" : name === "filevine_create_task" ? "task" : "removal";
      const base = { receipt: true as const, matter, kind };
      try {
        if (kind === "note") {
          const note = await Filevine.createNote({
            orgId: matter.orgId,
            matterId: matter.matterId,
            subject: typeof args.subject === "string" ? args.subject : undefined,
            body: `${assistantMarker()}\n\n${String(args.body ?? "")}`,
          });
          createdHere.add(`task:${note.id}`);
          return text({
            ...base,
            status: "confirmed",
            recordId: note.id,
            recordUrl: Filevine.recordUrl(matter.orgId, matter.matterId, "note", note.id),
            subject: note.subject,
            confirmedAt: note.createdAt || new Date().toISOString(),
          });
        }
        if (kind === "task") {
          const task = await Filevine.createTask({
            orgId: matter.orgId,
            matterId: matter.matterId,
            subject: String(args.subject ?? ""),
            body: `${assistantMarker()}\n\n${String(args.body ?? "")}`,
            dueDate: typeof args.dueDate === "string" ? args.dueDate : undefined,
          });
          createdHere.add(`task:${task.id}`);
          return text({
            ...base,
            status: "confirmed",
            recordId: task.id,
            recordUrl: Filevine.recordUrl(matter.orgId, matter.matterId, "task", task.id),
            subject: task.subject,
            confirmedAt: task.createdAt || new Date().toISOString(),
          });
        }
        const recordId = String(args.recordId ?? "");
        if (!createdHere.has(`task:${recordId}`)) {
          throw new Error(`Task ${recordId} was not created in this thread, so it cannot be removed here.`);
        }
        await Filevine.deleteTask({ orgId: matter.orgId, matterId: matter.matterId, taskId: recordId });
        createdHere.delete(`task:${recordId}`);
        return text({
          ...base,
          status: "confirmed",
          recordId,
          subject: `Removed task ${recordId}`,
          confirmedAt: new Date().toISOString(),
        });
      } catch (error) {
        return text({
          ...base,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    default:
      throw new Error(`Unknown tool ${name}`);
  }
}

const tools = mode === "work" ? [...readTools, ...writeTools] : readTools;

function send(message: unknown): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

const reader = NodeReadline.createInterface({ input: process.stdin, crlfDelay: Infinity });
reader.on("line", (line) => {
  if (!line.trim()) return;
  let message: { id?: unknown; method?: string; params?: Record<string, unknown> };
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }
  const { id, method, params } = message;
  const reply = (result: unknown) => {
    if (id !== undefined) send({ jsonrpc: "2.0", id, result });
  };
  const fail = (error: unknown) => {
    if (id !== undefined)
      send({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
          isError: true,
        },
      });
  };
  switch (method) {
    case "initialize":
      reply({
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "t3-filevine", version: "0.1.0" },
      });
      break;
    case "notifications/initialized":
      break;
    case "ping":
      reply({});
      break;
    case "tools/list":
      reply({ tools });
      break;
    case "tools/call": {
      const name = String(params?.name ?? "");
      const args = (params?.arguments ?? {}) as Record<string, unknown>;
      void callTool(name, args).then(reply, fail);
      break;
    }
    default:
      if (id !== undefined)
        send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
  }
});
