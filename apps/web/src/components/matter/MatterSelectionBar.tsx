import {
  MATTER_SELECTION_MAX,
  type MatterMode,
  type MatterRef,
  type MatterRole,
} from "@t3tools/contracts";
import { PlusIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "../ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "../ui/popover";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { MatterChip } from "./MatterChip";
import { splitMatterOverflow } from "./MatterHeaderSummary";
import { MatterModeControl } from "./MatterModeControl";

/**
 * The row above the composer: chips, Add matter, the Ask/Work control and `trailing`. Past three
 * Matters the chips collapse to two and "+N", so six Matters stay within two lines.
 */
export function MatterSelectionBar({
  selection,
  mode,
  role,
  onEdit,
  onRemove,
  onModeChange,
  disabledReason,
  trailing,
}: {
  selection: ReadonlyArray<MatterRef>;
  mode: MatterMode;
  role: MatterRole;
  onEdit: () => void;
  onRemove: (matter: MatterRef) => void;
  onModeChange: (mode: MatterMode) => void;
  disabledReason?: string | null | undefined;
  trailing?: ReactNode;
}) {
  const { visible, hidden } = splitMatterOverflow(selection);
  const removeMatter = disabledReason ? undefined : onRemove;
  const addDisabledReason =
    disabledReason ??
    (selection.length >= MATTER_SELECTION_MAX
      ? `A thread can hold at most ${MATTER_SELECTION_MAX} Matters.`
      : null);
  const addButton = (
    <Button
      size="xs"
      variant="outline"
      aria-label={selection.length === 0 ? "Add matter" : "Add another matter"}
      aria-disabled={addDisabledReason !== null}
      onClick={() => {
        if (addDisabledReason === null) onEdit();
      }}
    >
      <PlusIcon aria-hidden />
      Add matter
    </Button>
  );
  return (
    <div data-matter-selection-bar className="flex min-w-0 flex-wrap items-center gap-2 px-2 pb-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {visible.map((matter) => (
          <span key={matter.matterId} className="flex min-w-0 max-w-64">
            <MatterChip matter={matter} onRemove={removeMatter} />
          </span>
        ))}
        {hidden.length > 0 ? (
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  size="xs"
                  variant="outline"
                  aria-label={`${hidden.length} more matters`}
                  data-matter-chip-overflow
                />
              }
            >
              +{hidden.length}
            </PopoverTrigger>
            <PopoverPopup side="top" align="start">
              <ul aria-label="More matters" className="flex max-w-80 flex-col gap-1.5">
                {hidden.map((matter) => (
                  <li key={matter.matterId} className="flex min-w-0">
                    <MatterChip matter={matter} onRemove={removeMatter} />
                  </li>
                ))}
              </ul>
            </PopoverPopup>
          </Popover>
        ) : null}
        {addDisabledReason === null ? (
          addButton
        ) : (
          <Tooltip>
            <TooltipTrigger render={addButton} />
            <TooltipPopup side="top">{addDisabledReason}</TooltipPopup>
          </Tooltip>
        )}
      </div>
      {selection.length > 0 ? (
        <div className="flex shrink-0 items-center gap-2">
          <MatterModeControl
            mode={mode}
            role={role}
            selection={selection}
            onModeChange={onModeChange}
            disabledReason={disabledReason}
          />
          {trailing}
        </div>
      ) : null}
    </div>
  );
}
