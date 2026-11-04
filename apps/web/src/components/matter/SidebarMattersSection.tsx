import type { MatterRef } from "@t3tools/contracts";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ChevronDownIcon } from "lucide-react";

import { useQuietThreadShells } from "../../state/entities";
import { Button } from "../ui/button";
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuTrigger } from "../ui/menu";
import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";
import { MatterOrgBadge } from "./MatterOrgBadge";
import { MATTER_CATALOG_BY_ORG, sidebarMatters } from "./matterPage.logic";
import { useStarredMatterIds } from "./starredMatters";
import { useMatterPageEnvironmentId } from "./useMatterPageNavigation";

/** Starred Matters (else the Matters on recent threads), each one click from its page. */
export function SidebarMattersSection() {
  const environmentId = useMatterPageEnvironmentId();
  const navigate = useNavigate();
  const activeMatterId = useParams({ strict: false, select: (params) => params.matterId });
  const [starredIds] = useStarredMatterIds();
  const shells = useQuietThreadShells();
  const { starred, matters } = sidebarMatters(starredIds, shells);
  if (environmentId === null) return null;
  const open = (matter: MatterRef) =>
    void navigate({
      to: "/$environmentId/matter/$matterId",
      params: { environmentId, matterId: matter.matterId },
    });

  return (
    <SidebarGroup aria-label="Matters" data-sidebar-matters>
      <div className="flex h-7 items-center gap-2 px-(--sidebar-row-content-inset)">
        <span className="min-w-0 flex-1 truncate text-2xs font-medium uppercase tracking-eyebrow text-sidebar-muted-foreground">
          {starred ? "Matters" : "Recent Matters"}
        </span>
        <Menu>
          <MenuTrigger render={<Button size="micro" variant="ghost-muted" />}>
            All
            <ChevronDownIcon aria-hidden />
          </MenuTrigger>
          <MenuPopup align="end">
            {MATTER_CATALOG_BY_ORG.map((org) => (
              <MenuGroup key={org.orgId}>
                <MenuGroupLabel>{org.orgName}</MenuGroupLabel>
                {org.matters.map((matter) => (
                  <MenuItem key={matter.matterId} onClick={() => open(matter)}>
                    <span className="min-w-0 flex-1 truncate">{matter.name}</span>
                    <MatterOrgBadge matter={matter} />
                  </MenuItem>
                ))}
              </MenuGroup>
            ))}
          </MenuPopup>
        </Menu>
      </div>
      {matters.length === 0 ? (
        <p className="px-(--sidebar-row-content-inset) py-1 text-xs text-sidebar-muted-foreground">
          Star a Matter in the Picker to keep it here.
        </p>
      ) : (
        <SidebarMenu>
          {matters.map((matter) => (
            <SidebarMenuItem key={matter.matterId}>
              <SidebarMenuButton
                size="sm"
                isActive={activeMatterId === matter.matterId}
                render={
                  <Link
                    to="/$environmentId/matter/$matterId"
                    params={{ environmentId, matterId: matter.matterId }}
                    data-sidebar-matter={matter.matterId}
                  />
                }
              >
                <span className="min-w-0 flex-1 truncate">{matter.name}</span>
                <MatterOrgBadge matter={matter} />
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      )}
    </SidebarGroup>
  );
}
