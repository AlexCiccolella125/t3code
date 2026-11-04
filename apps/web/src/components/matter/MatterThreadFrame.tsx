import type { MatterRef } from "@t3tools/contracts";

import { useComposerDraftStore } from "../../composerDraftStore";
import { useQuietThreadShell } from "../../state/entities";
import type { ThreadRouteTarget } from "../../threadRoutes";
import { MatterThreadFrameHeader } from "./MatterPage";

const EMPTY_SELECTION: ReadonlyArray<MatterRef> = [];

/**
 * Puts a thread with a Matter inside its first Matter's page. Rendered as a sibling above
 * ChatView, never around it, so gaining or losing a Matter never remounts the chat.
 */
export function MatterThreadFrame({ target }: { target: ThreadRouteTarget }) {
  const serverRef = target.kind === "server" ? target.threadRef : null;
  const shell = useQuietThreadShell(serverRef);
  const draft = useComposerDraftStore((store) =>
    target.kind === "draft"
      ? store.getDraftSession(target.draftId)
      : store.getDraftThreadByRef(target.threadRef),
  );
  const environmentId = shell?.environmentId ?? draft?.environmentId ?? null;
  const selection =
    (shell !== null ? shell.matterSelection : draft?.matterSelection) ?? EMPTY_SELECTION;
  if (environmentId === null || selection.length === 0) return null;
  return <MatterThreadFrameHeader environmentId={environmentId} selection={selection} />;
}
