import {
  matterModeAllowed,
  type MatterMode,
  type MatterRef,
  type MatterRole,
} from "@t3tools/contracts";

import { cn } from "~/lib/utils";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

export const MATTER_MODE_OPTIONS: ReadonlyArray<{
  mode: MatterMode;
  label: string;
  description: string;
}> = [
  { mode: "ask", label: "Ask", description: "Read the matters" },
  {
    mode: "work",
    label: "Work",
    description: "Read, and propose notes and tasks for your approval",
  },
];

export function workDisabledReason(
  role: MatterRole,
  selection: ReadonlyArray<MatterRef>,
): string | null {
  if (matterModeAllowed(role, "work", selection)) return null;
  const production = selection.filter((matter) => matter.isProduction).map((matter) => matter.name);
  return `A paralegal can only Ask on a production org (${production.join(", ")}).`;
}

/** Ask or Work as a two-option segmented control. Work disables, with the reason, above the role's ceiling. */
export function MatterModeControl({
  mode,
  role,
  selection,
  onModeChange,
  disabledReason,
}: {
  mode: MatterMode;
  role: MatterRole;
  selection: ReadonlyArray<MatterRef>;
  onModeChange: (mode: MatterMode) => void;
  disabledReason?: string | null | undefined;
}) {
  const workReason = workDisabledReason(role, selection);
  return (
    <div
      role="radiogroup"
      aria-label="Matter mode"
      data-matter-mode-control
      className="flex w-fit gap-0.5 rounded-(--control-radius) bg-input/40 p-0.5"
    >
      {MATTER_MODE_OPTIONS.map((option) => {
        const reason = disabledReason ?? (option.mode === "work" ? workReason : null);
        const checked = option.mode === mode;
        const button = (
          <button
            type="button"
            role="radio"
            aria-checked={checked}
            aria-disabled={reason !== null}
            data-matter-mode={option.mode}
            className={cn(
              "flex min-w-0 cursor-pointer flex-col items-start rounded-(--control-radius) px-2.5 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              checked
                ? "bg-background text-foreground shadow-xs/10 dark:bg-input/72"
                : "text-muted-foreground hover:bg-background/55 hover:text-foreground dark:hover:bg-input/32",
              reason !== null && "cursor-not-allowed opacity-50 hover:bg-transparent",
            )}
            onClick={() => {
              if (reason !== null || checked) return;
              onModeChange(option.mode);
            }}
          >
            <span className="text-xs font-medium">{option.label}</span>
            <span className="text-2xs">{option.description}</span>
          </button>
        );
        return reason === null ? (
          <span key={option.mode} className="contents">
            {button}
          </span>
        ) : (
          <Tooltip key={option.mode}>
            <TooltipTrigger render={button} />
            <TooltipPopup side="top">{reason}</TooltipPopup>
          </Tooltip>
        );
      })}
    </div>
  );
}
