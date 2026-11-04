import {
  DEFAULT_MATTER_MODE,
  matterModeAllowed,
  type EnvironmentId,
  type MatterMode,
  type MatterRef,
  type MatterRole,
  type ThreadId,
} from "@t3tools/contracts";

import {
  type ComposerThreadTarget,
  toMatterSelection,
  useComposerDraftStore,
} from "../../composerDraftStore";
import { useEnvironmentSettings } from "../../hooks/useSettings";
import { threadEnvironment } from "../../state/threads";
import { useOrchestrationCommand } from "../../state/use-orchestration-command";

const EMPTY_SELECTION: ReadonlyArray<MatterRef> = [];

export interface ThreadMatter {
  /** The thread's environment decides the role, since its server enforces the ceiling. */
  readonly role: MatterRole;
  readonly selection: ReadonlyArray<MatterRef>;
  /** Ask whenever the stored mode is above the signed-in role's ceiling for this selection. */
  readonly mode: MatterMode;
  readonly setSelection: (selection: ReadonlyArray<MatterRef>) => void;
  readonly setMode: (mode: MatterMode) => void;
}

/**
 * A server thread's Matter lives on its shell and changes through thread.matter.set; a new
 * thread keeps it on the draft session until the first send creates the thread.
 */
export function useThreadMatter(input: {
  environmentId: EnvironmentId;
  threadId: ThreadId;
  draftTarget: ComposerThreadTarget;
  serverThread: {
    matterSelection?: ReadonlyArray<MatterRef> | undefined;
    matterMode?: MatterMode | undefined;
  } | null;
  draftThread: { matterSelection: ReadonlyArray<MatterRef>; matterMode: MatterMode } | null;
}): ThreadMatter {
  const role = useEnvironmentSettings(input.environmentId, (settings) => settings.matterRole);
  const setDraftThreadContext = useComposerDraftStore((store) => store.setDraftThreadContext);
  const setThreadMatter = useOrchestrationCommand(threadEnvironment.setMatter);
  const source = input.serverThread ?? input.draftThread;
  const selection = source?.matterSelection ?? EMPTY_SELECTION;
  const storedMode = source?.matterMode ?? DEFAULT_MATTER_MODE;
  const mode = matterModeAllowed(role, storedMode, selection) ? storedMode : "ask";

  const commit = (nextSelection: ReadonlyArray<MatterRef>, requestedMode: MatterMode) => {
    const nextMode =
      nextSelection.length > 0 && matterModeAllowed(role, requestedMode, nextSelection)
        ? requestedMode
        : "ask";
    if (input.serverThread !== null) {
      const matterSelection = toMatterSelection(nextSelection);
      void setThreadMatter({
        environmentId: input.environmentId,
        input: {
          threadId: input.threadId,
          ...(matterSelection === undefined ? {} : { matterSelection }),
          matterMode: nextMode,
        },
      });
      return;
    }
    setDraftThreadContext(input.draftTarget, {
      matterSelection: nextSelection,
      matterMode: nextMode,
    });
  };

  return {
    role,
    selection,
    mode,
    setSelection: (nextSelection) => commit(nextSelection, mode),
    setMode: (nextMode) => commit(selection, nextMode),
  };
}
