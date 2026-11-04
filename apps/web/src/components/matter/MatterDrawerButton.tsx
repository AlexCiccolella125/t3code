import { parseScopedThreadKey, scopedThreadKey } from "@t3tools/client-runtime/environment";
import type { ScopedThreadRef } from "@t3tools/contracts";
import { ScaleIcon } from "lucide-react";
import { useEffect } from "react";

import { useMatterThreadData } from "../../hooks/useMatterThreadData";
import { selectActiveRightPanel, useRightPanelStore } from "../../rightPanelStore";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import {
  type MatterWriteWatch,
  observeMatterWrites,
  pendingMatterWriteCount,
} from "./matterThreadData";

// Outlives ChatView remounts so switching threads does not replay old Writes.
const writeWatches = new Map<string, MatterWriteWatch>();

/** Toggles the Matter drawer, counts pending Writes, and opens the Ledger when a Write arrives. */
export function MatterDrawerButton({ threadRef }: { threadRef: ScopedThreadRef }) {
  const data = useMatterThreadData(threadRef);
  const threadKey = scopedThreadKey(threadRef);
  const drawerActive = useRightPanelStore(
    (state) => selectActiveRightPanel(state.byThreadKey, threadRef) === "matter",
  );
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Writes arrive from the server with no client handler; the drawer opening is the reaction
  useEffect(() => {
    const { watch, open } = observeMatterWrites(writeWatches.get(threadKey), data);
    writeWatches.set(threadKey, watch);
    // The key, not the ref, is the dependency: callers rebuild the ref every render.
    const ref = parseScopedThreadKey(threadKey);
    if (open && ref) useRightPanelStore.getState().openMatterDrawer(ref, "ledger", true);
  }, [threadKey, data]);

  const pending = pendingMatterWriteCount(data);
  const label =
    pending === 0
      ? "Matter drawer"
      : `Matter drawer, ${pending} pending ${pending === 1 ? "write" : "writes"}`;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="xs"
            variant="outline"
            aria-label={label}
            aria-pressed={drawerActive}
            data-matter-drawer-button
            onClick={() => useRightPanelStore.getState().toggle(threadRef, "matter")}
          />
        }
      >
        <ScaleIcon aria-hidden />
        Matter
        {pending > 0 ? (
          <Badge variant="warning" size="sm" data-matter-pending-writes>
            {pending}
          </Badge>
        ) : null}
      </TooltipTrigger>
      <TooltipPopup side="top">Overview, Proofs and the Write ledger</TooltipPopup>
    </Tooltip>
  );
}
