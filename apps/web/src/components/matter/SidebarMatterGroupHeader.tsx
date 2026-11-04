import type { MatterRef } from "@t3tools/contracts";
import { memo } from "react";

import { MatterOrgBadge } from "./MatterOrgBadge";

/** Labels the active threads whose first Matter is this one. */
export const SidebarMatterGroupHeader = memo(function SidebarMatterGroupHeader(props: {
  matter: MatterRef;
  count: number;
}) {
  return (
    <li
      data-testid="sidebar-matter-group"
      data-matter-group={props.matter.matterId}
      className="mt-2 flex h-7 list-none items-center gap-2 px-(--sidebar-row-content-inset) first:mt-0"
    >
      <span className="min-w-0 flex-1 truncate text-2xs font-medium uppercase tracking-eyebrow text-sidebar-muted-foreground">
        {props.matter.name}
      </span>
      <MatterOrgBadge matter={props.matter} />
      <span className="shrink-0 text-xs tabular-nums text-sidebar-muted-foreground">
        {props.count}
      </span>
    </li>
  );
});
