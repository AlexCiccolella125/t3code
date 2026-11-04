import type { MatterRef } from "@t3tools/contracts";

/**
 * The Matters the Picker can find in the proof of concept. Two are DTL training projects read
 * live from Filevine; the rest are synthetic and mirror apps/server/scripts/filevine-mcp/fixtures.ts.
 * No real case or client names appear here.
 */
export const MATTER_CATALOG: ReadonlyArray<MatterRef> = [
  { matterId: "14415990", name: "XFER TEST Intake shape", orgId: 9234, orgName: "DTL Sandbox", isProduction: false, phase: "Intake - Setup", projectType: "Personal Injury", office: "sandbox" },
  { matterId: "13108823", name: "Mary Ann Training TEST", orgId: 6315, orgName: "DTL Personal Injury Attorneys", isProduction: true, phase: "TEST", projectType: "Personal Injury", office: "boca" },
  { matterId: "90000101", name: "Sample Matter 01: rear-end, I-95 Delray", orgId: 6315, orgName: "DTL Personal Injury Attorneys", isProduction: true, phase: "PreSuit - Treating", projectType: "Personal Injury", office: "boca" },
  { matterId: "90000102", name: "Sample Matter 02: slip and fall, grocery", orgId: 6315, orgName: "DTL Personal Injury Attorneys", isProduction: true, phase: "PreSuit - Demand Prep", projectType: "Personal Injury", office: "boca" },
  { matterId: "90000103", name: "Sample Matter 03: intersection T-bone, Boca", orgId: 6315, orgName: "DTL Personal Injury Attorneys", isProduction: true, phase: "Lit - Complaint Filed", projectType: "Personal Injury", office: "boca" },
  { matterId: "90000104", name: "Sample Matter 04: rideshare passenger, Orlando", orgId: 9224, orgName: "DTL Orlando", isProduction: true, phase: "PreSuit - Demanded", projectType: "Personal Injury", office: "orlando" },
  { matterId: "90000105", name: "Sample Matter 05: dog bite, Lake Nona", orgId: 9224, orgName: "DTL Orlando", isProduction: true, phase: "Intake - LOR Sent", projectType: "Personal Injury", office: "orlando" },
  { matterId: "90000106", name: "Sample Matter 06: parking lot backing, Boynton", orgId: 6315, orgName: "DTL Personal Injury Attorneys", isProduction: true, phase: "PreSuit - Negotiations", projectType: "Personal Injury", office: "boca" },
  { matterId: "90000107", name: "Sample Matter 07: sandbox demo, motorcycle", orgId: 9234, orgName: "DTL Sandbox", isProduction: false, phase: "PreSuit - Treating", projectType: "Personal Injury", office: "sandbox" },
  { matterId: "90000108", name: "Sample Matter 08: sandbox demo, premises", orgId: 9234, orgName: "DTL Sandbox", isProduction: false, phase: "Closing - Draft Init Statement", projectType: "Personal Injury", office: "sandbox" },
];

export function searchMatterCatalog(query: string): ReadonlyArray<MatterRef> {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [];
  return MATTER_CATALOG.filter(
    (matter) =>
      matter.matterId.startsWith(needle) ||
      matter.name.toLowerCase().includes(needle) ||
      matter.orgName.toLowerCase().includes(needle),
  );
}
