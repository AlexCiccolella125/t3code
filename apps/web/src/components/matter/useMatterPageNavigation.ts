import type { EnvironmentId, MatterRef } from "@t3tools/contracts";
import { useParams } from "@tanstack/react-router";

import { useComposerDraftStore } from "../../composerDraftStore";
import { resolveDefaultProjectRef, useNewThreadHandler } from "../../hooks/useHandleNewThread";
import { useProjects } from "../../state/entities";
import { usePrimaryEnvironmentId } from "../../state/environments";
import { useUiStateStore } from "../../uiStateStore";

/** Matter pages open on the routed environment, else the primary one. */
export function useMatterPageEnvironmentId(): EnvironmentId | null {
  const routeEnvironmentId = useParams({
    strict: false,
    select: (params) => params.environmentId,
  });
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  return (routeEnvironmentId as EnvironmentId | undefined) ?? primaryEnvironmentId;
}

/**
 * Opens a new-thread draft in the environment's default project with this Matter selected and
 * Ask mode, or returns null when the environment has no project to start one in.
 */
export function useStartMatterThread(environmentId: EnvironmentId) {
  const projects = useProjects();
  const projectOrder = useUiStateStore((store) => store.projectOrder);
  const handleNewThread = useNewThreadHandler();
  const projectRef = resolveDefaultProjectRef(
    projects.filter((project) => project.environmentId === environmentId),
    projectOrder,
  );
  if (projectRef === null) return null;
  return async (matter: MatterRef) => {
    const opened = await handleNewThread(projectRef);
    if (opened === null) return;
    useComposerDraftStore.getState().setDraftThreadContext(opened.draftId, {
      matterSelection: [matter],
      matterMode: "ask",
    });
  };
}
