import * as Schema from "effect/Schema";

import { TrimmedNonEmptyString } from "./baseSchemas.ts";

/** A Filevine case. `matterId` is the Filevine project ID as a string. */
export const MatterRef = Schema.Struct({
  matterId: TrimmedNonEmptyString,
  name: TrimmedNonEmptyString,
  orgId: Schema.Int,
  orgName: TrimmedNonEmptyString,
  isProduction: Schema.Boolean,
  phase: Schema.optional(Schema.String),
  projectType: Schema.optional(Schema.String),
  office: Schema.optional(Schema.String),
});
export type MatterRef = typeof MatterRef.Type;

export const MATTER_SELECTION_MAX = 6;

export const MatterSelection = Schema.Array(MatterRef).check(
  Schema.isMinLength(1),
  Schema.isMaxLength(MATTER_SELECTION_MAX),
  Schema.makeFilter(
    (matters) => new Set(matters.map((matter) => matter.matterId)).size === matters.length,
  ),
);
export type MatterSelection = typeof MatterSelection.Type;

/** Ask reads only; Work may propose writes, each of which waits for approval. */
export const MatterMode = Schema.Literals(["ask", "work"]);
export type MatterMode = typeof MatterMode.Type;
export const DEFAULT_MATTER_MODE: MatterMode = "ask";

export const MatterRole = Schema.Literals(["paralegal", "attorney"]);
export type MatterRole = typeof MatterRole.Type;
export const DEFAULT_MATTER_ROLE: MatterRole = "paralegal";

/** A paralegal's ceiling is Ask on a production org; an attorney's is Work everywhere. */
export const matterModeCeiling = (role: MatterRole, matter: MatterRef): MatterMode =>
  role === "attorney" || !matter.isProduction ? "work" : "ask";

export const matterModeAllowed = (
  role: MatterRole,
  mode: MatterMode,
  selection: ReadonlyArray<MatterRef>,
): boolean => mode === "ask" || selection.every((matter) => matterModeCeiling(role, matter) === "work");

export const FilevineWriteKind = Schema.Literals(["note", "task", "removal"]);
export type FilevineWriteKind = typeof FilevineWriteKind.Type;

/** What an Approval card shows for one proposed Write, before it happens. */
export const FilevineWriteProposal = Schema.Struct({
  matter: MatterRef,
  kind: FilevineWriteKind,
  subject: Schema.optional(Schema.String),
  body: Schema.String,
  /** Prefix the server adds to the record body; kept outside the editable body. */
  assistantMarker: Schema.String,
  dueDate: Schema.optional(Schema.String),
  /** For a removal: the record being removed. */
  targetRecordId: Schema.optional(Schema.String),
});
export type FilevineWriteProposal = typeof FilevineWriteProposal.Type;

export const FilevineWriteStatus = Schema.Literals(["sent", "confirmed", "failed"]);
export type FilevineWriteStatus = typeof FilevineWriteStatus.Type;

/** The tool result of a Filevine write; the web renders it as a Write receipt. */
export const FilevineWriteReceipt = Schema.Struct({
  receipt: Schema.Literal(true),
  matter: MatterRef,
  kind: FilevineWriteKind,
  status: FilevineWriteStatus,
  recordId: Schema.optional(Schema.String),
  recordUrl: Schema.optional(Schema.String),
  subject: Schema.optional(Schema.String),
  confirmedAt: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
});
export type FilevineWriteReceipt = typeof FilevineWriteReceipt.Type;

export const FilevineProofKind = Schema.Literals(["note", "section", "task", "document"]);
export type FilevineProofKind = typeof FilevineProofKind.Type;

/** A Citation target: a Filevine record or a region of a document in the Matter. */
export const FilevineProof = Schema.Struct({
  citeId: TrimmedNonEmptyString,
  matterId: TrimmedNonEmptyString,
  kind: FilevineProofKind,
  title: Schema.String,
  excerpt: Schema.String,
  recordUrl: Schema.optional(Schema.String),
  author: Schema.optional(Schema.String),
  createdAt: Schema.optional(Schema.String),
  /** Document proofs: file name, page and a highlight box in page-fraction units. */
  document: Schema.optional(
    Schema.Struct({
      fileName: Schema.String,
      page: Schema.Int,
      pageCount: Schema.Int,
      highlight: Schema.Struct({
        x: Schema.Number,
        y: Schema.Number,
        width: Schema.Number,
        height: Schema.Number,
      }),
      pageText: Schema.String,
    }),
  ),
});
export type FilevineProof = typeof FilevineProof.Type;

export const FILEVINE_MCP_SERVER_NAME = "t3-filevine";
export const FILEVINE_TOOL_PREFIX = `mcp__${FILEVINE_MCP_SERVER_NAME}__`;
export const FILEVINE_WRITE_TOOLS = [
  "filevine_create_note",
  "filevine_create_task",
  "filevine_remove_record",
] as const;

export const isFilevineWriteToolName = (toolName: string): boolean =>
  toolName.startsWith(FILEVINE_TOOL_PREFIX) &&
  FILEVINE_WRITE_TOOLS.some((name) => toolName === `${FILEVINE_TOOL_PREFIX}${name}`);

export const isFilevineToolName = (toolName: string): boolean =>
  toolName.startsWith(FILEVINE_TOOL_PREFIX);

export const CITATION_MARKER_PATTERN = /\[\[cite:([A-Za-z0-9_.:-]+)\]\]/g;
