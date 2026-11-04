import { useNavigate } from "@tanstack/react-router";
import { BriefcaseIcon } from "lucide-react";

import type { CommandPaletteSubmenuItem } from "../CommandPalette.logic";
import { ADDON_ICON_CLASS, ITEM_ICON_CLASS } from "../CommandPalette.logic";
import { MatterOrgBadge } from "./MatterOrgBadge";
import { MATTER_CATALOG_BY_ORG } from "./matterPage.logic";
import { useMatterPageEnvironmentId } from "./useMatterPageNavigation";

/** "Open Matter page…": every catalog Matter, grouped by Org. */
export function useMatterPageCommandItem(): CommandPaletteSubmenuItem | null {
  const environmentId = useMatterPageEnvironmentId();
  const navigate = useNavigate();
  if (environmentId === null) return null;
  return {
    kind: "submenu",
    value: "action:open-matter-page",
    searchTerms: ["matter", "matter page", "filevine", "case", "proofs", "ledger", "overview"],
    title: "Open Matter page…",
    icon: <BriefcaseIcon className={ITEM_ICON_CLASS} />,
    addonIcon: <BriefcaseIcon className={ADDON_ICON_CLASS} />,
    groups: MATTER_CATALOG_BY_ORG.map((org) => ({
      value: `matter-org:${org.orgId}`,
      label: org.orgName,
      items: org.matters.map((matter) => ({
        kind: "action" as const,
        value: `matter-page:${matter.matterId}`,
        title: matter.name,
        description: [matter.matterId, matter.phase].filter(Boolean).join(" · "),
        searchTerms: [matter.name, matter.matterId, matter.orgName],
        icon: <BriefcaseIcon className={ITEM_ICON_CLASS} />,
        titleTrailingContent: <MatterOrgBadge matter={matter} />,
        run: async () => {
          await navigate({
            to: "/$environmentId/matter/$matterId",
            params: { environmentId, matterId: matter.matterId },
          });
        },
      })),
    })),
  };
}
