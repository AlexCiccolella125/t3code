import {
  MATTER_SELECTION_MAX,
  matterModeCeiling,
  type MatterRef,
  type MatterRole,
} from "@t3tools/contracts";
import { MATTER_CATALOG, searchMatterCatalog } from "@t3tools/shared/matterCatalog";
import { StarIcon } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { MatterOrgBadge } from "./MatterOrgBadge";
import { useStarredMatterIds } from "./starredMatters";

const MIN_QUERY_LENGTH = 2;

/** Which rows the Picker lists for a query, before any selection state is layered on. */
export function resolvePickerSections(input: {
  query: string;
  selection: ReadonlyArray<MatterRef>;
  starredIds: ReadonlyArray<string>;
}): ReadonlyArray<{ id: string; title: string; matters: ReadonlyArray<MatterRef> }> {
  const trimmed = input.query.trim();
  if (trimmed.length >= MIN_QUERY_LENGTH) {
    return [{ id: "results", title: "Results", matters: searchMatterCatalog(trimmed) }];
  }
  const starredSet = new Set(input.starredIds);
  const starred = [
    ...input.selection.filter((matter) => starredSet.has(matter.matterId)),
    ...MATTER_CATALOG.filter(
      (matter) =>
        starredSet.has(matter.matterId) &&
        !input.selection.some((selected) => selected.matterId === matter.matterId),
    ),
  ];
  return [
    { id: "starred", title: "Starred", matters: starred },
    { id: "in-thread", title: "In this thread", matters: input.selection },
  ];
}

export function MatterPickerDialog({
  selection,
  onChange,
  open,
  onOpenChange,
  role,
}: {
  selection: ReadonlyArray<MatterRef>;
  onChange: (selection: ReadonlyArray<MatterRef>) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: MatterRole;
}) {
  const [query, setQuery] = useState("");
  const [starredIds, setStar] = useStarredMatterIds();
  const limitReached = selection.length >= MATTER_SELECTION_MAX;
  const limitReason = `A thread can hold at most ${MATTER_SELECTION_MAX} Matters. Remove one to add another.`;
  const sections = resolvePickerSections({ query, selection, starredIds });
  const trimmedQuery = query.trim();
  const hintId = useId();

  const toggle = (matter: MatterRef, checked: boolean) => {
    if (checked) {
      if (limitReached || selection.some((selected) => selected.matterId === matter.matterId)) {
        return;
      }
      onChange([...selection, matter]);
    } else {
      onChange(selection.filter((selected) => selected.matterId !== matter.matterId));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery("");
        onOpenChange(next);
      }}
    >
      <DialogPopup className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Matters</DialogTitle>
          <DialogDescription>
            Search by name or Filevine project ID. Type at least {MIN_QUERY_LENGTH} characters.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="space-y-3">
            <Input
              autoFocus
              type="search"
              aria-label="Search Matters"
              placeholder="Search Matters"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {sections.map((section) => (
              <section key={section.id} aria-label={section.title} className="space-y-1">
                <h3 className="text-2xs font-medium uppercase tracking-eyebrow text-muted-foreground">
                  {section.title}
                </h3>
                {section.matters.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {section.id === "results" && trimmedQuery.length > 0
                      ? `No Matter matches "${trimmedQuery}".`
                      : section.id === "starred"
                        ? "Star a Matter to keep it here."
                        : "No Matter in this thread yet."}
                  </p>
                ) : (
                  <ul className="divide-y divide-border rounded-(--control-radius) border border-border">
                    {section.matters.map((matter) => {
                      const checked = selection.some(
                        (selected) => selected.matterId === matter.matterId,
                      );
                      const disabled = !checked && limitReached;
                      const starred = starredIds.includes(matter.matterId);
                      return (
                        <li
                          key={`${section.id}:${matter.matterId}`}
                          data-matter-row={matter.matterId}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2",
                            disabled && "opacity-64",
                          )}
                        >
                          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                            <Checkbox
                              aria-label={`Select ${matter.name}`}
                              aria-describedby={disabled ? hintId : undefined}
                              checked={checked}
                              disabled={disabled}
                              onCheckedChange={(next) => toggle(matter, next === true)}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="min-w-0 truncate text-sm font-medium text-foreground">
                                  {matter.name}
                                </span>
                                <span className="shrink-0 font-mono text-2xs text-muted-foreground">
                                  {matter.matterId}
                                </span>
                              </div>
                              <div className="flex min-w-0 items-center gap-2 text-2xs text-muted-foreground">
                                <span className="truncate">{matter.orgName}</span>
                                {matter.phase ? (
                                  <span className="truncate">· {matter.phase}</span>
                                ) : null}
                                {matterModeCeiling(role, matter) === "ask" ? (
                                  <span className="truncate">· Ask only for your role</span>
                                ) : null}
                              </div>
                            </div>
                          </label>
                          <MatterOrgBadge matter={matter} />
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  size="icon-xs"
                                  variant="ghost-muted"
                                  aria-pressed={starred}
                                  aria-label={
                                    starred ? `Unstar ${matter.name}` : `Star ${matter.name}`
                                  }
                                  onClick={() => setStar(matter.matterId, !starred)}
                                />
                              }
                            >
                              <StarIcon
                                aria-hidden
                                className={cn(starred && "fill-current text-warning-foreground")}
                              />
                            </TooltipTrigger>
                            <TooltipPopup side="top">{starred ? "Unstar" : "Star"}</TooltipPopup>
                          </Tooltip>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            ))}
            {limitReached ? (
              <p id={hintId} className="text-xs text-warning-foreground">
                {limitReason}
              </p>
            ) : null}
          </div>
        </DialogPanel>
        <DialogFooter className="sm:justify-between">
          <span className="self-center text-xs text-muted-foreground" aria-live="polite">
            {selection.length} of {MATTER_SELECTION_MAX} selected
          </span>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
