import type { MatterRef } from "@t3tools/contracts";
import { XIcon } from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { MatterOrgBadge } from "./MatterOrgBadge";

/** One selected Matter: its name, its Org badge and, unless compact, a remove button. */
export function MatterChip({
  matter,
  onRemove,
  compact = false,
}: {
  matter: MatterRef;
  onRemove?: ((matter: MatterRef) => void) | undefined;
  compact?: boolean;
}) {
  return (
    <span
      data-matter-chip={matter.matterId}
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-(--control-radius) border border-border bg-secondary text-foreground",
        compact ? "h-5 px-1.5 text-2xs" : "h-7 ps-2 pe-1 text-xs",
        compact && onRemove === undefined && "pe-1.5",
      )}
    >
      <Tooltip>
        <TooltipTrigger render={<span className="min-w-0 truncate font-medium" />}>
          {matter.name}
        </TooltipTrigger>
        <TooltipPopup side="top">
          {matter.name} · {matter.matterId} · {matter.orgName}
        </TooltipPopup>
      </Tooltip>
      <MatterOrgBadge matter={matter} />
      {onRemove ? (
        <Button
          size="icon-xs"
          variant="ghost-muted"
          aria-label={`Remove ${matter.name}`}
          onClick={() => onRemove(matter)}
        >
          <XIcon aria-hidden />
        </Button>
      ) : null}
    </span>
  );
}
