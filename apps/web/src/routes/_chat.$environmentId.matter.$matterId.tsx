import type { EnvironmentId } from "@t3tools/contracts";
import { createFileRoute } from "@tanstack/react-router";

import { MatterPage } from "../components/matter/MatterPage";
import { parseMatterPageSearch } from "../components/matter/matterPage.logic";

function MatterPageRoute() {
  const { environmentId, matterId } = Route.useParams();
  const { tab } = Route.useSearch();
  return (
    <MatterPage
      environmentId={environmentId as EnvironmentId}
      matterId={matterId}
      tab={tab ?? "threads"}
    />
  );
}

export const Route = createFileRoute("/_chat/$environmentId/matter/$matterId")({
  validateSearch: parseMatterPageSearch,
  component: MatterPageRoute,
});
