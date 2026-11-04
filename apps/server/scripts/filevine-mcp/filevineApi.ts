// @effect-diagnostics nodeBuiltinImport:off globalFetch:off globalDate:off
// Minimal Filevine v2 client for the proof of concept. Reads ~/.env itself so no credential
// ever passes through T3 Code's process or its logs. Writes are hard-limited to one sandbox Matter.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

/** The only Filevine project this proof of concept may ever write to. Not configurable. */
export const WRITABLE_MATTER_IDS: ReadonlySet<string> = new Set(["14415990"]);
export const SANDBOX_ORG_ID = 9234;

const IDENTITY_URL = "https://identity.filevine.com/connect/token";
const API_BASE = "https://api.filevineapp.com";
const SCOPE = "fv.api.gateway.access tenant filevine.v2.api.* email openid fv.auth.tenant.read";

interface Credentials {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly pat: string;
}

function readDotEnv(): Record<string, string> {
  const file = NodePath.join(NodeOS.homedir(), ".env");
  if (!NodeFS.existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const line of NodeFS.readFileSync(file, "utf8").split("\n")) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    let value = match[2]!.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[match[1]!] = value;
  }
  return out;
}

function credentialsFor(orgId: number): Credentials | undefined {
  const env = readDotEnv();
  const pat = orgId === SANDBOX_ORG_ID ? (env.FVSANDBOXPAT ?? env.FVPAT) : env.FVPAT;
  if (!env.FVCID || !env.FVCS || !pat) return undefined;
  return { clientId: env.FVCID, clientSecret: env.FVCS, pat };
}

interface Session {
  readonly token: string;
  readonly userId: number;
  readonly expiresAt: number;
}

const sessions = new Map<number, Session>();

async function session(orgId: number): Promise<Session> {
  const cached = sessions.get(orgId);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached;
  const creds = credentialsFor(orgId);
  if (!creds) throw new Error("Filevine credentials are not configured on this machine.");
  const form = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    grant_type: "personal_access_token",
    scope: SCOPE,
    token: creds.pat,
  });
  const tokenResponse = await fetch(IDENTITY_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!tokenResponse.ok) throw new Error(`Filevine token request failed (${tokenResponse.status}).`);
  const tokenJson = (await tokenResponse.json()) as { access_token: string; expires_in: number };
  const orgsResponse = await fetch(`${API_BASE}/fv-app/v2/utils/GetUserOrgsWithToken`, {
    method: "POST",
    headers: { authorization: `Bearer ${tokenJson.access_token}`, "content-type": "application/json" },
    body: "{}",
  });
  if (!orgsResponse.ok) throw new Error(`Filevine org lookup failed (${orgsResponse.status}).`);
  const orgsJson = (await orgsResponse.json()) as {
    user?: { userId?: { native?: number } };
    userId?: { native?: number };
    orgs?: Array<{ orgId?: number }>;
  };
  const userId = orgsJson.user?.userId?.native ?? orgsJson.userId?.native;
  if (userId === undefined) throw new Error("Filevine org lookup returned no user id.");
  const next: Session = {
    token: tokenJson.access_token,
    userId,
    expiresAt: Date.now() + tokenJson.expires_in * 1000,
  };
  sessions.set(orgId, next);
  return next;
}

async function request<T>(
  orgId: number,
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const s = await session(orgId);
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${s.token}`,
      "x-fv-userid": String(s.userId),
      "x-fv-orgid": String(orgId),
      "content-type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Filevine ${method} ${path} failed (${response.status}): ${text.slice(0, 300)}`);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : {}) as T;
}

export interface LiveProject {
  readonly projectName: string;
  readonly phaseName: string;
  readonly projectTypeCode: string;
  readonly clientName: string;
  readonly incidentDate: string | null;
  readonly firstPrimaryName: string;
  readonly projectUrl: string | null;
}

export interface LiveNote {
  readonly id: string;
  readonly subject: string;
  readonly body: string;
  readonly authorId: string;
  readonly createdAt: string;
  readonly typeTag: string;
  readonly targetDate: string | null;
  readonly isCompleted: boolean;
}

interface RawNote {
  noteId?: { native?: number };
  subject?: string;
  body?: string;
  authorId?: { native?: number };
  createdAt?: string;
  typeTag?: string;
  targetDate?: string;
  isCompleted?: boolean;
}

function toNote(raw: RawNote): LiveNote {
  return {
    id: String(raw.noteId?.native ?? ""),
    subject: raw.subject ?? "",
    body: raw.body ?? "",
    authorId: String(raw.authorId?.native ?? ""),
    createdAt: raw.createdAt ?? "",
    typeTag: raw.typeTag ?? "note",
    targetDate: raw.targetDate ?? null,
    isCompleted: raw.isCompleted ?? false,
  };
}

export async function getProject(orgId: number, matterId: string): Promise<LiveProject> {
  const raw = await request<{
    projectName?: string;
    phaseName?: string;
    projectTypeCode?: string;
    clientName?: string;
    incidentDate?: string;
    firstPrimaryName?: string;
    projectUrl?: string;
  }>(orgId, "GET", `/fv-app/v2/Projects/${matterId}`);
  return {
    projectName: raw.projectName ?? "",
    phaseName: raw.phaseName ?? "",
    projectTypeCode: raw.projectTypeCode ?? "",
    clientName: raw.clientName ?? "",
    incidentDate: raw.incidentDate ?? null,
    firstPrimaryName: raw.firstPrimaryName ?? "",
    projectUrl: raw.projectUrl ?? null,
  };
}

export async function listNotes(orgId: number, matterId: string, limit = 50): Promise<LiveNote[]> {
  const raw = await request<{ items?: RawNote[] }>(
    orgId,
    "GET",
    `/fv-app/v2/Projects/${matterId}/Notes?limit=${limit}`,
  );
  return (raw.items ?? []).map(toNote);
}

export async function listTasks(orgId: number, matterId: string, limit = 50): Promise<LiveNote[]> {
  const raw = await request<{ items?: RawNote[] }>(
    orgId,
    "GET",
    `/fv-app/v2/projects/${matterId}/tasks?limit=${limit}`,
  );
  return (raw.items ?? []).map(toNote);
}

function assertWritable(matterId: string, orgId: number): void {
  if (!WRITABLE_MATTER_IDS.has(matterId) || orgId !== SANDBOX_ORG_ID) {
    throw new Error(
      `Refused: this proof of concept writes only to sandbox Matter ${[...WRITABLE_MATTER_IDS].join(", ")}; ${matterId} in org ${orgId} is read-only.`,
    );
  }
}

export async function createNote(input: {
  orgId: number;
  matterId: string;
  subject: string | undefined;
  body: string;
}): Promise<LiveNote> {
  assertWritable(input.matterId, input.orgId);
  const raw = await request<RawNote>(input.orgId, "POST", "/fv-app/v2/Notes", {
    ProjectId: { Native: Number(input.matterId) },
    Body: input.body,
    ...(input.subject === undefined ? {} : { Subject: input.subject }),
  });
  return toNote(raw);
}

export async function createTask(input: {
  orgId: number;
  matterId: string;
  subject: string;
  body: string;
  dueDate: string | undefined;
}): Promise<LiveNote> {
  assertWritable(input.matterId, input.orgId);
  // Filevine rejects a task without an assignee; the approving user is the default.
  const s = await session(input.orgId);
  const raw = await request<RawNote>(input.orgId, "POST", "/fv-app/v2/tasks", {
    ProjectId: { Native: Number(input.matterId) },
    Subject: input.subject,
    Body: input.body,
    AssigneeId: { Native: s.userId },
    ...(input.dueDate === undefined ? {} : { TargetDate: input.dueDate }),
  });
  return toNote(raw);
}

export async function deleteTask(input: { orgId: number; matterId: string; taskId: string }): Promise<void> {
  assertWritable(input.matterId, input.orgId);
  await request(input.orgId, "DELETE", `/fv-app/v2/tasks/${input.taskId}`);
}

export function recordUrl(orgId: number, matterId: string, kind: "note" | "task", recordId: string): string {
  const query = kind === "note" ? `note=${recordId}` : `task=${recordId}`;
  return `https://demandthelimits.filevineapp.com/#/project/${matterId}/activity?${query}&orgId=${orgId}`;
}

export function matterUrl(orgId: number, matterId: string): string {
  return `https://demandthelimits.filevineapp.com/#/project/${matterId}/activity?orgId=${orgId}`;
}
