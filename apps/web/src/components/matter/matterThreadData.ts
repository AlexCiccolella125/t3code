import {
  FilevineProof,
  FilevineWriteReceipt,
  type FilevineWriteKind,
  type FilevineWriteProposal,
  type FilevineWriteStatus,
  type MatterRef,
  type RuntimeRequestId,
} from "@t3tools/contracts";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";

/** A completed `mcp__t3-filevine__*` tool call with its fetched output. */
export interface MatterToolResult {
  readonly itemId: string;
  readonly toolName: string;
  readonly nativeId: string | null;
  readonly at: string;
  readonly output: unknown;
}

export type MatterWriteRequestState = "pending" | "accepted" | "declined" | "closed";

/** One `filevine-write` approval request, answered or not. */
export interface MatterWriteRequest {
  readonly requestId: RuntimeRequestId;
  readonly nativeIds: ReadonlyArray<string>;
  readonly at: string;
  readonly proposal: FilevineWriteProposal;
  readonly state: MatterWriteRequestState;
}

export interface MatterHeading {
  readonly matterId: string;
  readonly name: string;
  readonly isProduction: boolean;
}

/** What a Filevine read said about a Matter beyond its name, for the drawer's Overview. */
export interface MatterOverviewFacts {
  readonly org: string | undefined;
  readonly phase: string | undefined;
  readonly projectType: string | undefined;
  readonly office: string | undefined;
}

export interface MatterProofEntry {
  readonly index: number;
  readonly proof: FilevineProof;
}

export interface MatterWriteEntry {
  readonly itemId: string;
  readonly at: string;
  readonly receipt: FilevineWriteReceipt;
}

export type MatterLedgerStatus = "proposed" | "approved" | "rejected" | FilevineWriteStatus;

export interface MatterLedgerRow {
  readonly id: string;
  readonly at: string;
  readonly matter: MatterRef;
  readonly kind: FilevineWriteKind;
  readonly subject: string | undefined;
  readonly status: MatterLedgerStatus;
  readonly recordUrl: string | undefined;
  readonly error: string | undefined;
}

export interface MatterThreadData {
  readonly proofs: ReadonlyArray<MatterProofEntry>;
  readonly proofsByCiteId: ReadonlyMap<string, MatterProofEntry>;
  readonly matters: ReadonlyMap<string, MatterHeading>;
  readonly overviews: ReadonlyMap<string, MatterOverviewFacts>;
  readonly writes: ReadonlyArray<MatterWriteEntry>;
  readonly writesByItemId: ReadonlyMap<string, MatterWriteEntry>;
  readonly proposals: ReadonlyArray<MatterWriteRequest>;
  readonly ledger: ReadonlyArray<MatterLedgerRow>;
  /** Tasks a confirmed Removal already deleted. */
  readonly removedRecordIds: ReadonlySet<string>;
}

export const EMPTY_MATTER_THREAD_DATA: MatterThreadData = {
  proofs: [],
  proofsByCiteId: new Map(),
  matters: new Map(),
  overviews: new Map(),
  writes: [],
  writesByItemId: new Map(),
  proposals: [],
  ledger: [],
  removedRecordIds: new Set(),
};

const decodeProof = Schema.decodeUnknownOption(FilevineProof);
const decodeReceipt = Schema.decodeUnknownOption(FilevineWriteReceipt);
const MAX_PAYLOAD_DEPTH = 5;

type Payload = Readonly<Record<string, unknown>>;

const isPayload = (value: Payload) =>
  value.receipt === true || Array.isArray(value.proofs) || Array.isArray(value.results);

/** Finds the Filevine JSON inside a tool output: a string, MCP content blocks or a result envelope. */
export function filevineToolPayload(output: unknown, depth = 0): Payload | undefined {
  if (depth > MAX_PAYLOAD_DEPTH) return undefined;
  if (typeof output === "string") {
    const trimmed = output.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return undefined;
    try {
      return filevineToolPayload(JSON.parse(trimmed), depth + 1);
    } catch {
      return undefined;
    }
  }
  if (Array.isArray(output)) {
    for (const block of output) {
      const text = Predicate.isObject(block) && "text" in block ? block.text : block;
      const payload = filevineToolPayload(text, depth + 1);
      if (payload !== undefined) return payload;
    }
    return undefined;
  }
  if (!Predicate.isObject(output)) return undefined;
  const record = output as Payload;
  if (isPayload(record)) return record;
  for (const key of ["structuredContent", "content", "result"]) {
    if (record[key] === undefined) continue;
    const payload = filevineToolPayload(record[key], depth + 1);
    if (payload !== undefined) return payload;
  }
  return undefined;
}

function matterHeading(value: unknown): MatterHeading | undefined {
  if (!Predicate.isObject(value)) return undefined;
  const record = value as Payload;
  if (typeof record.matterId !== "string" || typeof record.name !== "string") return undefined;
  const isProduction =
    typeof record.isProduction === "boolean"
      ? record.isProduction
      : record.environment === "PRODUCTION";
  return { matterId: record.matterId, name: record.name, isProduction };
}

const optionalString = (value: unknown) => (typeof value === "string" ? value : undefined);

function overviewFacts(value: unknown): MatterOverviewFacts | undefined {
  if (!Predicate.isObject(value)) return undefined;
  const record = value as Payload;
  const facts = {
    org: optionalString(record.org) ?? optionalString(record.orgName),
    phase: optionalString(record.phase),
    projectType: optionalString(record.projectType),
    office: optionalString(record.office),
  };
  return Object.values(facts).some((fact) => fact !== undefined) ? facts : undefined;
}

function payloadMatterRecords(payload: Payload): ReadonlyArray<unknown> {
  return [
    payload.matter,
    ...(Array.isArray(payload.results)
      ? payload.results.map((result) =>
          Predicate.isObject(result) ? (result as Payload).matter : undefined,
        )
      : []),
  ];
}

function payloadProofs(payload: Payload): Array<{ heading?: MatterHeading; proofs: unknown }> {
  const groups: Array<{ heading?: MatterHeading; proofs: unknown }> = [];
  const heading = matterHeading(payload.matter);
  if (Array.isArray(payload.proofs)) {
    groups.push({ ...(heading === undefined ? {} : { heading }), proofs: payload.proofs });
  }
  if (Array.isArray(payload.results)) {
    for (const result of payload.results) {
      if (!Predicate.isObject(result)) continue;
      const resultHeading = matterHeading((result as Payload).matter);
      groups.push({
        ...(resultHeading === undefined ? {} : { heading: resultHeading }),
        proofs: (result as Payload).proofs,
      });
    }
  }
  return groups;
}

const parsedOutputs = new WeakMap<object, Payload | null>();

function cachedPayload(output: unknown): Payload | undefined {
  if (!Predicate.isObject(output)) return filevineToolPayload(output);
  const cached = parsedOutputs.get(output);
  if (cached !== undefined) return cached ?? undefined;
  const payload = filevineToolPayload(output);
  parsedOutputs.set(output, payload ?? null);
  return payload;
}

function requestStatus(state: MatterWriteRequestState): MatterLedgerStatus {
  switch (state) {
    case "pending":
      return "proposed";
    case "accepted":
      return "approved";
    case "declined":
    case "closed":
      return "rejected";
  }
}

export function extractMatterThreadData(input: {
  readonly selection: ReadonlyArray<MatterRef>;
  readonly toolResults: ReadonlyArray<MatterToolResult>;
  readonly writeRequests: ReadonlyArray<MatterWriteRequest>;
}): MatterThreadData {
  if (input.toolResults.length === 0 && input.writeRequests.length === 0) {
    return EMPTY_MATTER_THREAD_DATA;
  }
  const matters = new Map<string, MatterHeading>();
  for (const matter of input.selection) {
    matters.set(matter.matterId, {
      matterId: matter.matterId,
      name: matter.name,
      isProduction: matter.isProduction,
    });
  }
  const overviews = new Map<string, MatterOverviewFacts>();
  const proofs: MatterProofEntry[] = [];
  const proofsByCiteId = new Map<string, MatterProofEntry>();
  const writes: MatterWriteEntry[] = [];
  const writesByItemId = new Map<string, MatterWriteEntry>();
  const writeNativeIds = new Set<string>();

  for (const result of input.toolResults) {
    const payload = cachedPayload(result.output);
    if (payload === undefined) continue;
    if (payload.receipt === true) {
      const receipt = Option.getOrUndefined(decodeReceipt(payload));
      if (receipt === undefined) continue;
      const entry = { itemId: result.itemId, at: result.at, receipt };
      writes.push(entry);
      writesByItemId.set(result.itemId, entry);
      if (result.nativeId !== null) writeNativeIds.add(result.nativeId);
      continue;
    }
    for (const record of payloadMatterRecords(payload)) {
      const heading = matterHeading(record);
      const facts = overviewFacts(record);
      if (heading !== undefined && facts !== undefined) overviews.set(heading.matterId, facts);
    }
    for (const group of payloadProofs(payload)) {
      if (group.heading !== undefined && !matters.has(group.heading.matterId)) {
        matters.set(group.heading.matterId, group.heading);
      }
      if (!Array.isArray(group.proofs)) continue;
      for (const candidate of group.proofs) {
        const proof = Option.getOrUndefined(decodeProof(candidate));
        if (proof === undefined || proofsByCiteId.has(proof.citeId)) continue;
        const entry = { index: proofs.length + 1, proof };
        proofs.push(entry);
        proofsByCiteId.set(proof.citeId, entry);
      }
    }
  }

  for (const entry of writes) {
    const { matter } = entry.receipt;
    if (!matters.has(matter.matterId)) {
      matters.set(matter.matterId, {
        matterId: matter.matterId,
        name: matter.name,
        isProduction: matter.isProduction,
      });
    }
  }

  const removedRecordIds = new Set(
    writes.flatMap(({ receipt }) =>
      receipt.kind === "removal" && receipt.status !== "failed" && receipt.recordId !== undefined
        ? [receipt.recordId]
        : [],
    ),
  );

  const ledger: MatterLedgerRow[] = [
    ...writes.map(({ itemId, at, receipt }): MatterLedgerRow => ({
      id: itemId,
      at,
      matter: receipt.matter,
      kind: receipt.kind,
      subject: receipt.subject,
      status: receipt.status,
      recordUrl: receipt.recordUrl,
      error: receipt.error,
    })),
    ...input.writeRequests
      .filter((request) => !request.nativeIds.some((nativeId) => writeNativeIds.has(nativeId)))
      .map((request): MatterLedgerRow => ({
        id: request.requestId,
        at: request.at,
        matter: request.proposal.matter,
        kind: request.proposal.kind,
        subject:
          request.proposal.subject ??
          (request.proposal.targetRecordId === undefined
            ? undefined
            : `Remove task ${request.proposal.targetRecordId}`),
        status: requestStatus(request.state),
        recordUrl: undefined,
        error: undefined,
      })),
  ].toSorted((left, right) => left.at.localeCompare(right.at));

  return {
    proofs,
    proofsByCiteId,
    matters,
    overviews,
    writes,
    writesByItemId,
    proposals: input.writeRequests,
    ledger,
    removedRecordIds,
  };
}

/** What the composer last saw of a thread's Writes, to tell a new one from history. */
export interface MatterWriteWatch {
  readonly requestIds: ReadonlySet<string>;
  readonly receiptIds: ReadonlySet<string>;
  /** Set once a pending Write was seen; until then receipts are history still loading. */
  readonly armed: boolean;
}

/**
 * Opens the drawer on its Ledger for a new pending Write, or for a receipt landing after one.
 * Revisiting a thread leaves the panel alone, since its receipts load after its requests.
 */
export function observeMatterWrites(
  previous: MatterWriteWatch | undefined,
  data: MatterThreadData,
): { readonly watch: MatterWriteWatch; readonly open: boolean } {
  const pending = data.proposals.flatMap((request) =>
    request.state === "pending" ? [request.requestId as string] : [],
  );
  const receipts = data.writes.map((entry) => entry.itemId);
  const newPending = pending.some((id) => !previous?.requestIds.has(id));
  const newReceipt =
    previous?.armed === true && receipts.some((id) => !previous.receiptIds.has(id));
  return {
    open: newPending || newReceipt,
    watch: {
      requestIds: new Set([...(previous?.requestIds ?? []), ...pending]),
      receiptIds: new Set(receipts),
      armed: previous?.armed === true || pending.length > 0,
    },
  };
}

export const pendingMatterWriteCount = (data: MatterThreadData) =>
  data.proposals.filter((request) => request.state === "pending").length;
