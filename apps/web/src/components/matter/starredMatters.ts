import * as Schema from "effect/Schema";

import { useLocalStorage } from "~/hooks/useLocalStorage";

export const STARRED_MATTERS_STORAGE_KEY = "t3code:matters:starred:v1";
const StarredMatterIds = Schema.Array(Schema.String);

/** Starred Matter ids live in this browser only; the Picker shows them before the user types. */
export function useStarredMatterIds(): [
  ReadonlyArray<string>,
  (matterId: string, starred: boolean) => void,
] {
  const [starred, setStarred] = useLocalStorage<ReadonlyArray<string>, ReadonlyArray<string>>(
    STARRED_MATTERS_STORAGE_KEY,
    [],
    StarredMatterIds,
  );
  const setStar = (matterId: string, isStarred: boolean) => {
    setStarred((current) => {
      const without = current.filter((id) => id !== matterId);
      return isStarred ? [...without, matterId] : without;
    });
  };
  return [starred, setStar];
}
