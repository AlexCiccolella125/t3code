import { RuntimeRequestId, type FilevineWriteProposal } from "@t3tools/contracts";
import { describe, expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

import "~/index.css";
import { render } from "../../../test/render";
import { FilevineApprovalCard } from "./FilevineApprovalCard";

const requestId = RuntimeRequestId.make("request-1");
const proposal: FilevineWriteProposal = {
  matter: {
    matterId: "9001",
    name: "Test Matter Alpha",
    orgId: 7,
    orgName: "Example Sandbox",
    isProduction: false,
  },
  kind: "note",
  subject: "Adjuster call",
  body: "Spoke with the adjuster.",
  assistantMarker: "[Assistant] Drafted in T3 Code thread t-1; approved by Test User.",
};

const card = (onRespond: () => Promise<void>) => (
  <FilevineApprovalCard
    requestId={requestId}
    proposal={proposal}
    canRespond
    isResponding={false}
    onRespond={onRespond}
  />
);

describe("FilevineApprovalCard", () => {
  it("approves with the edited body as feedback", async () => {
    const onRespond = vi.fn(async () => {});
    // The card never links or navigates.
    await using screen = await render(card(onRespond), { router: false });
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    const body = screen.getByRole("textbox", { name: "Body" });
    await userEvent.clear(body);
    await userEvent.type(body, "Spoke with the adjuster about limits.");
    await userEvent.click(screen.getByRole("button", { name: "Approve edited" }));
    expect(onRespond).toHaveBeenCalledWith(
      requestId,
      "accept",
      "Spoke with the adjuster about limits.",
    );
  });

  it("declines on Reject", async () => {
    const onRespond = vi.fn(async () => {});
    // The card never links or navigates.
    await using screen = await render(card(onRespond), { router: false });
    await userEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(onRespond).toHaveBeenCalledWith(requestId, "decline");
  });
});
