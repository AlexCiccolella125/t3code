import type { MatterRef } from "@t3tools/contracts";
import { MATTER_CATALOG } from "@t3tools/shared/matterCatalog";
import * as Schema from "effect/Schema";

import { type DraftId, useComposerDraftStore } from "../../composerDraftStore";
import { readLocalStorageValue, useLocalStorage } from "../../hooks/useLocalStorage";

export const ACTIVE_MATTER_STORAGE_KEY = "t3code:matters:active:v1";
const ActiveMatterId = Schema.NullOr(Schema.String);

const catalogMatter = (matterId: string | null) =>
  MATTER_CATALOG.find((matter) => matter.matterId === matterId) ?? null;

/** The Matter the sidebar is filtered to; null lists every thread. Lives in this browser only. */
export function useActiveMatter(): [MatterRef | null, (matter: MatterRef | null) => void] {
  const [matterId, setMatterId] = useLocalStorage<string | null, string | null>(
    ACTIVE_MATTER_STORAGE_KEY,
    null,
    ActiveMatterId,
  );
  return [catalogMatter(matterId), (matter) => setMatterId(matter?.matterId ?? null)];
}

export function readActiveMatter(): MatterRef | null {
  return catalogMatter(readLocalStorageValue(ACTIVE_MATTER_STORAGE_KEY, null, ActiveMatterId));
}

/**
 * The selection a new thread starts with while a Matter is active, or null to leave it alone.
 * A draft that already holds the active Matter keeps its selection; any other starts on it alone.
 */
export function seedMatterSelection(
  current: ReadonlyArray<MatterRef>,
  active: MatterRef | null,
): ReadonlyArray<MatterRef> | null {
  if (active === null) return null;
  if (current.some((matter) => matter.matterId === active.matterId)) return null;
  return [active];
}

/** Puts the active Matter on a draft that a New thread action just opened. */
export function seedDraftWithActiveMatter(draftId: DraftId): void {
  const { getDraftSession, setDraftThreadContext } = useComposerDraftStore.getState();
  const draft = getDraftSession(draftId);
  if (draft === null) return;
  const next = seedMatterSelection(draft.matterSelection, readActiveMatter());
  if (next === null) return;
  setDraftThreadContext(draftId, { matterSelection: next, matterMode: "ask" });
}
