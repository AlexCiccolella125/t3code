import { useAtomValue } from "@effect/atom-react";
import { parseScopedThreadKey, scopedThreadKey } from "@t3tools/client-runtime/environment";
import { turnItemDetailRevision } from "@t3tools/client-runtime/work-log/item-detail";
import { isFilevineToolName, type ScopedThreadRef } from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";
import { AsyncResult, Atom } from "effect/reactivity";

import {
  EMPTY_MATTER_THREAD_DATA,
  extractMatterThreadData,
  type MatterThreadData,
  type MatterToolResult,
  type MatterWriteRequest,
  type MatterWriteRequestState,
} from "../components/matter/matterThreadData";
import { orchestrationEnvironment } from "../state/orchestration";
import { environmentThreadDetails } from "../state/threads";

const EMPTY_MATTER_THREAD_DATA_ATOM = Atom.make(EMPTY_MATTER_THREAD_DATA).pipe(
  Atom.withLabel("matter-thread-data:empty"),
);

const sameToolResults = (
  left: ReadonlyArray<MatterToolResult>,
  right: ReadonlyArray<MatterToolResult>,
) =>
  left.length === right.length &&
  left.every(
    (result, index) =>
      result.itemId === right[index]!.itemId && result.output === right[index]!.output,
  );

const sameWriteRequests = (
  left: ReadonlyArray<MatterWriteRequest>,
  right: ReadonlyArray<MatterWriteRequest>,
) =>
  left.length === right.length &&
  left.every(
    (request, index) =>
      request.requestId === right[index]!.requestId &&
      request.state === right[index]!.state &&
      request.proposal === right[index]!.proposal,
  );

// Wire items carry no tool output, so each Filevine result is read through the turn-item query.
const matterThreadDataFamily = Atom.family((key: string) => {
  const ref = parseScopedThreadKey(key);
  let previous: {
    readonly selection: unknown;
    readonly toolResults: ReadonlyArray<MatterToolResult>;
    readonly writeRequests: ReadonlyArray<MatterWriteRequest>;
    readonly data: MatterThreadData;
  } | null = null;
  return Atom.make((get): MatterThreadData => {
    const thread = ref === null ? null : get(environmentThreadDetails.quietThreadAtom(ref));
    if (ref === null || thread === null) return EMPTY_MATTER_THREAD_DATA;
    const { projection } = thread;
    const toolResults: MatterToolResult[] = [];
    const writeRequests: MatterWriteRequest[] = [];
    const requestsById = new Map(
      projection.runtimeRequests.map((request) => [request.id, request]),
    );
    for (const item of projection.turnItems) {
      if (item.type === "dynamic_tool") {
        if (item.toolName === null || !isFilevineToolName(item.toolName)) continue;
        if (item.status !== "completed" && item.status !== "failed") continue;
        const detail = get(
          orchestrationEnvironment.turnItem({
            environmentId: ref.environmentId,
            input: {
              threadId: item.threadId,
              itemId: item.id,
              revision: turnItemDetailRevision(item),
            },
          }),
        );
        const fetched = AsyncResult.getOrElse(detail, () => null)?.item;
        const output = fetched?.type === "dynamic_tool" ? fetched.output : item.output;
        if (output === undefined) continue;
        toolResults.push({
          itemId: item.id,
          toolName: item.toolName,
          nativeId: item.nativeItemRef?.nativeId ?? null,
          at: DateTime.formatIso(item.startedAt ?? item.updatedAt),
          output,
        });
        continue;
      }
      if (item.type !== "approval_request" || item.filevineWrite === undefined) continue;
      const request = requestsById.get(item.requestId);
      const state: MatterWriteRequestState =
        request === undefined || request.status === "pending"
          ? "pending"
          : request.status === "resolved" &&
              (request.decision === "accept" || request.decision === "acceptForSession")
            ? "accepted"
            : request.status === "resolved"
              ? "declined"
              : "closed";
      writeRequests.push({
        requestId: item.requestId,
        nativeIds: [item.nativeItemRef?.nativeId, request?.nativeRequestRef?.nativeId].filter(
          (nativeId): nativeId is string => typeof nativeId === "string",
        ),
        at: DateTime.formatIso(request?.createdAt ?? item.startedAt ?? item.updatedAt),
        proposal: item.filevineWrite,
        state,
      });
    }
    const selection = projection.thread.matterSelection ?? [];
    if (
      previous !== null &&
      previous.selection === selection &&
      sameToolResults(previous.toolResults, toolResults) &&
      sameWriteRequests(previous.writeRequests, writeRequests)
    ) {
      return previous.data;
    }
    const data = extractMatterThreadData({ selection, toolResults, writeRequests });
    previous = { selection, toolResults, writeRequests, data };
    return data;
  }).pipe(Atom.withLabel(`matter-thread-data:${key}`));
});

/** Proofs, Write receipts and pending Writes of one thread, derived from its Filevine tool calls. */
export function useMatterThreadData(ref: ScopedThreadRef | null | undefined): MatterThreadData {
  return useAtomValue(
    ref ? matterThreadDataFamily(scopedThreadKey(ref)) : EMPTY_MATTER_THREAD_DATA_ATOM,
  );
}

const EMPTY_MATTER_THREAD_DATA_LIST: ReadonlyArray<MatterThreadData> = [];
const matterThreadDataListFamily = Atom.family((joinedKeys: string) =>
  Atom.make((get): ReadonlyArray<MatterThreadData> =>
    joinedKeys === ""
      ? EMPTY_MATTER_THREAD_DATA_LIST
      : joinedKeys.split("\n").map((key) => get(matterThreadDataFamily(key))),
  ).pipe(Atom.withLabel(`matter-thread-data-list:${joinedKeys}`)),
);

/** useMatterThreadData for several threads at once, in the order given. */
export function useMatterThreadDataList(
  refs: ReadonlyArray<ScopedThreadRef>,
): ReadonlyArray<MatterThreadData> {
  return useAtomValue(matterThreadDataListFamily(refs.map(scopedThreadKey).join("\n")));
}
