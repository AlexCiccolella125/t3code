import { useEffect, useState } from "react";

import { MatterPickerDialog } from "./MatterPickerDialog";
import { MatterSelectionBar } from "./MatterSelectionBar";
import type { ThreadMatter } from "./useThreadMatter";

const OPEN_MATTER_PICKER_EVENT = "t3code:open-matter-picker";

/** Opens the Picker of whichever composer is on screen; the command palette uses this. */
export function openMatterPicker(): void {
  window.dispatchEvent(new Event(OPEN_MATTER_PICKER_EVENT));
}

export function ComposerMatterBar({
  matter,
  disabledReason,
}: {
  matter: ThreadMatter;
  disabledReason: string | null;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- listens for the command palette's window event
  useEffect(() => {
    const open = () => setPickerOpen(true);
    window.addEventListener(OPEN_MATTER_PICKER_EVENT, open);
    return () => window.removeEventListener(OPEN_MATTER_PICKER_EVENT, open);
  }, []);
  return (
    <>
      <MatterSelectionBar
        selection={matter.selection}
        mode={matter.mode}
        role={matter.role}
        onEdit={() => setPickerOpen(true)}
        onRemove={(removed) =>
          matter.setSelection(
            matter.selection.filter((selected) => selected.matterId !== removed.matterId),
          )
        }
        onModeChange={matter.setMode}
        disabledReason={disabledReason}
      />
      <MatterPickerDialog
        open={pickerOpen && disabledReason === null}
        onOpenChange={setPickerOpen}
        selection={matter.selection}
        onChange={matter.setSelection}
        role={matter.role}
      />
    </>
  );
}
