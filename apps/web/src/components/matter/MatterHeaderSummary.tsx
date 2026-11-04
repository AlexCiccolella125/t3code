import type { MatterMode, MatterRef } from "@t3tools/contracts";

import { Badge } from "../ui/badge";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { MatterChip } from "./MatterChip";
import { MatterOrgBadge } from "./MatterOrgBadge";

const VISIBLE_LIMIT = 3;
const VISIBLE_WHEN_OVERFLOWING = 2;

/** Up to three Matters show in full; past that, the first two and a count of the rest. */
export function splitMatterOverflow<T>(selection: ReadonlyArray<T>): {
  visible: ReadonlyArray<T>;
  hidden: ReadonlyArray<T>;
} {
  if (selection.length <= VISIBLE_LIMIT) return { visible: selection, hidden: [] };
  return {
    visible: selection.slice(0, VISIBLE_WHEN_OVERFLOWING),
    hidden: selection.slice(VISIBLE_WHEN_OVERFLOWING),
  };
}

/** Each Matter by name with its Org badge; past three, the first two and "+N" listing the rest. */
export function MatterHeaderSummary({
  selection,
  mode,
}: {
  selection: ReadonlyArray<MatterRef>;
  mode: MatterMode;
}) {
  if (selection.length === 0) return null;
  const { visible, hidden: hiddenMatters } = splitMatterOverflow(selection);
  const hidden = hiddenMatters.length;
  return (
    <span
      data-matter-header-summary
      className="flex min-w-0 shrink items-center gap-1.5 overflow-hidden"
    >
      {visible.map((matter) => (
        <MatterChip key={matter.matterId} matter={matter} compact />
      ))}
      {hidden > 0 ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Badge
                variant="outline"
                size="sm"
                aria-label={`${hidden} more matters`}
                data-matter-header-overflow
              />
            }
          >
            +{hidden}
          </TooltipTrigger>
          <TooltipPopup side="bottom">
            <ul className="space-y-1">
              {selection.map((matter) => (
                <li key={matter.matterId} className="flex items-center gap-2">
                  <span>{matter.name}</span>
                  <MatterOrgBadge matter={matter} />
                </li>
              ))}
            </ul>
          </TooltipPopup>
        </Tooltip>
      ) : null}
      <span className="shrink-0 text-2xs font-medium uppercase tracking-eyebrow text-muted-foreground">
        {mode === "work" ? "Work" : "Ask"}
      </span>
    </span>
  );
}
