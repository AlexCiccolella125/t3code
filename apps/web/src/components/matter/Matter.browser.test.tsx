import { MATTER_CATALOG } from "@t3tools/shared/matterCatalog";
import type { MatterRef } from "@t3tools/contracts";
import { useState } from "react";
import { expect, it } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";

import { render } from "../../../test/render";
import { MatterHeaderSummary } from "./MatterHeaderSummary";
import { MatterModeControl } from "./MatterModeControl";
import { MatterPickerDialog } from "./MatterPickerDialog";
import { seedMatterSelection } from "./activeMatter";
import { STARRED_MATTERS_STORAGE_KEY } from "./starredMatters";

const matter = (matterId: string) => MATTER_CATALOG.find((entry) => entry.matterId === matterId)!;

function PickerHarness() {
  const [selection, setSelection] = useState<ReadonlyArray<MatterRef>>([]);
  return (
    <MatterPickerDialog
      open
      onOpenChange={() => {}}
      selection={selection}
      onChange={setSelection}
      role="paralegal"
    />
  );
}

it("lists only starred Matters until the user types, and caps the selection at six", async () => {
  localStorage.setItem(STARRED_MATTERS_STORAGE_KEY, JSON.stringify(["90000107"]));
  using _starred = {
    [Symbol.dispose]: () => localStorage.removeItem(STARRED_MATTERS_STORAGE_KEY),
  };
  await using _screen = await render(<PickerHarness />);

  await expect
    .element(page.getByRole("checkbox", { name: `Select ${matter("90000107").name}` }))
    .toBeInTheDocument();
  expect(page.getByRole("checkbox").elements()).toHaveLength(1);

  await userEvent.type(page.getByRole("searchbox", { name: "Search Matters" }), "Sample Matter");
  const sampleIds = ["90000101", "90000102", "90000103", "90000104", "90000105", "90000106"];
  for (const id of sampleIds) {
    await page.getByText(matter(id).name, { exact: true }).click();
  }
  await expect.element(page.getByText("6 of 6 selected")).toBeInTheDocument();
  await expect
    .element(page.getByRole("checkbox", { name: `Select ${matter("90000108").name}` }))
    .toHaveAttribute("data-disabled");
});

it("disables Work for a paralegal on a production Matter", async () => {
  await using screen = await render(
    <MatterModeControl
      mode="ask"
      role="paralegal"
      selection={[matter("90000101")]}
      onModeChange={() => {}}
    />,
  );
  await expect
    .element(screen.getByRole("radio", { name: /Work/ }))
    .toHaveAttribute("aria-disabled", "true");
  await expect
    .element(screen.getByRole("radio", { name: /Ask/ }))
    .not.toHaveAttribute("aria-disabled", "true");
});

it("shows the first two Matters and +N once the header holds more than three", async () => {
  const selection = ["90000101", "90000102", "90000103", "90000107"].map(matter);
  await using screen = await render(<MatterHeaderSummary selection={selection} mode="ask" />);
  await expect.element(screen.getByText("+2")).toBeVisible();
  expect(screen.container.querySelectorAll("[data-matter-chip]")).toHaveLength(2);
});

it("seeds a new thread with the active Matter unless its selection already holds it", () => {
  const active = matter("90000107");
  const other = matter("90000101");
  expect(seedMatterSelection([], null)).toBeNull();
  expect(seedMatterSelection([], active)).toEqual([active]);
  expect(seedMatterSelection([other], active)).toEqual([active]);
  expect(seedMatterSelection([other, active], active)).toBeNull();
});
