import {
  MATTER_SELECTION_MAX,
  type MatterMode,
  type MatterRef,
  type MatterRole,
} from "@t3tools/contracts";
import { PlusIcon } from "lucide-react";

import { Button } from "../ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { MatterChip } from "./MatterChip";
import { MatterModeControl } from "./MatterModeControl";

/** The row above the composer: one chip per Matter, Add matter, and the Ask/Work control. */
export function MatterSelectionBar({
  selection,
  mode,
  role,
  onEdit,
  onRemove,
  onModeChange,
  disabledReason,
}: {
  selection: ReadonlyArray<MatterRef>;
  mode: MatterMode;
  role: MatterRole;
  onEdit: () => void;
  onRemove: (matter: MatterRef) => void;
  onModeChange: (mode: MatterMode) => void;
  disabledReason?: string | null | undefined;
}) {
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
        {selection.map((matter) => (
          <MatterChip
            key={matter.matterId}
            matter={matter}
            onRemove={disabledReason ? undefined : onRemove}
          />
        ))}
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
        <MatterModeControl
          mode={mode}
          role={role}
          selection={selection}
          onModeChange={onModeChange}
          disabledReason={disabledReason}
        />
      ) : null}
    </div>
  );
}
