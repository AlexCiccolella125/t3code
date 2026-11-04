import type { MatterRef } from "@t3tools/contracts";

import { Badge } from "../ui/badge";

/** Production or Sandbox, shown wherever a Matter is named. */
export function MatterOrgBadge({ matter }: { matter: Pick<MatterRef, "isProduction"> }) {
  return matter.isProduction ? (
    <Badge variant="warning" size="sm" data-matter-org="production">
      Production
    </Badge>
  ) : (
    <Badge variant="info" size="sm" data-matter-org="sandbox">
      Sandbox
    </Badge>
  );
}
