// Synthetic Matters for the LOIS proof of concept. No real case or client names appear here;
// the two live Matters are DTL training projects. Phases and types mirror the warehouse.

export interface FixtureMatter {
  readonly matterId: string;
  readonly name: string;
  readonly orgId: number;
  readonly orgName: string;
  readonly isProduction: boolean;
  readonly office: string;
  readonly projectType: string;
  readonly phase: string;
  readonly live: boolean;
  readonly client: string;
  readonly incidentDate: string;
  readonly primary: string;
  readonly vitals: ReadonlyArray<{ readonly label: string; readonly value: string }>;
  readonly notes: ReadonlyArray<FixtureNote>;
  readonly tasks: ReadonlyArray<FixtureTask>;
  readonly documents: ReadonlyArray<FixtureDocument>;
}

export interface FixtureNote {
  readonly id: string;
  readonly subject: string;
  readonly body: string;
  readonly author: string;
  readonly createdAt: string;
}

export interface FixtureTask {
  readonly id: string;
  readonly subject: string;
  readonly body: string;
  readonly assignee: string;
  readonly dueDate: string;
  readonly completed: boolean;
}

export interface FixtureDocument {
  readonly id: string;
  readonly fileName: string;
  readonly pageCount: number;
  readonly pages: ReadonlyArray<{
    readonly page: number;
    readonly text: string;
    readonly highlight: { x: number; y: number; width: number; height: number };
    readonly excerpt: string;
  }>;
}

const BOCA = { orgId: 6315, orgName: "DTL Personal Injury Attorneys", office: "boca" } as const;
const ORLANDO = { orgId: 9224, orgName: "DTL Orlando", office: "orlando" } as const;
const SANDBOX = { orgId: 9234, orgName: "DTL Sandbox", office: "sandbox" } as const;

const STAFF = ["R. Alvarez (paralegal)", "J. Okafor (case manager)", "M. Chen (attorney)"];

function synthetic(input: {
  matterId: string;
  name: string;
  org: typeof BOCA | typeof ORLANDO | typeof SANDBOX;
  isProduction: boolean;
  phase: string;
  incidentDate: string;
  solDate: string;
  adjuster: string;
  policyLimits: string;
  treatment: string;
  demandAmount?: string;
}): FixtureMatter {
  const id = input.matterId;
  return {
    matterId: id,
    name: input.name,
    orgId: input.org.orgId,
    orgName: input.org.orgName,
    isProduction: input.isProduction,
    office: input.org.office,
    projectType: "Personal Injury",
    phase: input.phase,
    live: false,
    client: "Sample Client",
    incidentDate: input.incidentDate,
    primary: STAFF[2]!,
    vitals: [
      { label: "Date of incident", value: input.incidentDate },
      { label: "Statute of limitations", value: input.solDate },
      { label: "Adjuster", value: input.adjuster },
      { label: "BI policy limits", value: input.policyLimits },
      { label: "Treatment status", value: input.treatment },
      ...(input.demandAmount ? [{ label: "Demand amount", value: input.demandAmount }] : []),
    ],
    notes: [
      {
        id: `${id}01`,
        subject: "Intake call",
        body: `Client described a ${input.name.includes("slip") ? "fall on a wet floor" : "rear-end collision"} on ${input.incidentDate}. Reports neck and lower back pain. Went to urgent care the same day. No prior injuries to the same areas.`,
        author: STAFF[1]!,
        createdAt: `${input.incidentDate}T18:12:00Z`,
      },
      {
        id: `${id}02`,
        subject: "LOR sent to carrier",
        body: `Letter of representation sent to ${input.adjuster.split(",")[1]?.trim() ?? "the carrier"}. Claim number requested. Adjuster ${input.adjuster.split(",")[0]} assigned.`,
        author: STAFF[0]!,
        createdAt: `2026-05-03T14:40:00Z`,
      },
      {
        id: `${id}03`,
        subject: "Treatment update",
        body: `${input.treatment}. Chiropractic 3x weekly. MRI of the cervical spine ordered; results pending. Client reports pain 6/10, down from 8/10.`,
        author: STAFF[1]!,
        createdAt: `2026-06-21T16:05:00Z`,
      },
      {
        id: `${id}04`,
        subject: "Policy limits confirmed",
        body: `Carrier disclosed BI limits of ${input.policyLimits} in writing. Copy saved to Correspondence folder. No UM coverage on the client's own policy.`,
        author: STAFF[0]!,
        createdAt: `2026-07-09T13:22:00Z`,
      },
      {
        id: `${id}05`,
        subject: "Records request status",
        body: `Urgent care records received (14 pages). Orthopedic records still outstanding; second request sent 2026-08-02. Billing ledger from chiropractor shows $4,860 to date.`,
        author: STAFF[1]!,
        createdAt: `2026-08-02T15:48:00Z`,
      },
    ],
    tasks: [
      {
        id: `${id}T1`,
        subject: "Follow up on orthopedic records",
        body: "Call records department; second request sent 2026-08-02.",
        assignee: STAFF[1]!,
        dueDate: "2026-11-12",
        completed: false,
      },
      {
        id: `${id}T2`,
        subject: "Calendar SOL",
        body: `Confirm SOL ${input.solDate} is on the firm calendar with 90 and 30 day reminders.`,
        assignee: STAFF[0]!,
        dueDate: "2026-11-06",
        completed: input.phase.startsWith("Lit"),
      },
    ],
    documents: [
      {
        id: `${id}D1`,
        fileName: "Urgent care records.pdf",
        pageCount: 14,
        pages: [
          {
            page: 3,
            text: `URGENT CARE VISIT SUMMARY\n\nDate of service: ${input.incidentDate}\nChief complaint: Neck pain and low back pain following motor vehicle collision earlier today.\n\nAssessment: Cervical strain. Lumbar strain. No focal neurological deficit.\n\nPlan: NSAIDs, muscle relaxant, follow up with orthopedics within 2 weeks. Imaging if symptoms persist beyond 14 days.`,
            highlight: { x: 0.08, y: 0.42, width: 0.84, height: 0.12 },
            excerpt:
              "Assessment: Cervical strain. Lumbar strain. No focal neurological deficit.",
          },
        ],
      },
      {
        id: `${id}D2`,
        fileName: "Carrier policy limits letter.pdf",
        pageCount: 2,
        pages: [
          {
            page: 1,
            text: `RE: Claim for Sample Client\nDate of loss: ${input.incidentDate}\n\nIn response to your request, our insured carries bodily injury liability coverage with limits of ${input.policyLimits}.\n\nThis disclosure is made pursuant to Fla. Stat. 627.4137.\n\nAdjuster: ${input.adjuster}`,
            highlight: { x: 0.08, y: 0.3, width: 0.84, height: 0.1 },
            excerpt: `Our insured carries bodily injury liability coverage with limits of ${input.policyLimits}.`,
          },
        ],
      },
    ],
  };
}

export const FIXTURE_MATTERS: ReadonlyArray<FixtureMatter> = [
  {
    matterId: "14415990",
    name: "XFER TEST Intake shape",
    orgId: SANDBOX.orgId,
    orgName: SANDBOX.orgName,
    isProduction: false,
    office: SANDBOX.office,
    projectType: "Personal Injury",
    phase: "Intake - Setup",
    live: true,
    client: "Training project",
    incidentDate: "2026-01-15",
    primary: STAFF[2]!,
    vitals: [{ label: "Purpose", value: "Sandbox training project; the only Matter this proof of concept writes to" }],
    notes: [],
    tasks: [],
    documents: [],
  },
  {
    matterId: "13108823",
    name: "Mary Ann Training TEST",
    orgId: BOCA.orgId,
    orgName: BOCA.orgName,
    isProduction: true,
    office: BOCA.office,
    projectType: "Personal Injury",
    phase: "TEST",
    live: true,
    client: "Training project",
    incidentDate: "2025-11-01",
    primary: STAFF[2]!,
    vitals: [{ label: "Purpose", value: "Training project in the Boca production org; read only here" }],
    notes: [],
    tasks: [],
    documents: [],
  },
  synthetic({
    matterId: "90000101",
    name: "Sample Matter 01: rear-end, I-95 Delray",
    org: BOCA,
    isProduction: true,
    phase: "PreSuit - Treating",
    incidentDate: "2026-04-18",
    solDate: "2028-04-18",
    adjuster: "T. Nguyen, Sample Mutual",
    policyLimits: "$100,000 / $300,000",
    treatment: "Treating with chiropractor and orthopedics",
  }),
  synthetic({
    matterId: "90000102",
    name: "Sample Matter 02: slip and fall, grocery",
    org: BOCA,
    isProduction: true,
    phase: "PreSuit - Demand Prep",
    incidentDate: "2026-02-02",
    solDate: "2028-02-02",
    adjuster: "K. Patel, Sample Casualty",
    policyLimits: "$500,000 CSL",
    treatment: "Treatment complete; MMI reached 2026-09-10",
    demandAmount: "$185,000",
  }),
  synthetic({
    matterId: "90000103",
    name: "Sample Matter 03: intersection T-bone, Boca",
    org: BOCA,
    isProduction: true,
    phase: "Lit - Complaint Filed",
    incidentDate: "2025-08-30",
    solDate: "2027-08-30",
    adjuster: "D. Rossi, Sample Indemnity",
    policyLimits: "$25,000 / $50,000",
    treatment: "Treatment complete; surgery recommended",
    demandAmount: "$25,000 (policy limits)",
  }),
  synthetic({
    matterId: "90000104",
    name: "Sample Matter 04: rideshare passenger, Orlando",
    org: ORLANDO,
    isProduction: true,
    phase: "PreSuit - Demanded",
    incidentDate: "2026-03-11",
    solDate: "2028-03-11",
    adjuster: "A. Brooks, Sample Rideshare Ins.",
    policyLimits: "$1,000,000 CSL",
    treatment: "Physical therapy ongoing",
    demandAmount: "$240,000",
  }),
  synthetic({
    matterId: "90000105",
    name: "Sample Matter 05: dog bite, Lake Nona",
    org: ORLANDO,
    isProduction: true,
    phase: "Intake - LOR Sent",
    incidentDate: "2026-09-22",
    solDate: "2028-09-22",
    adjuster: "Unassigned, Sample Homeowners",
    policyLimits: "Pending disclosure",
    treatment: "Wound care; plastic surgery consult scheduled",
  }),
  synthetic({
    matterId: "90000106",
    name: "Sample Matter 06: parking lot backing, Boynton",
    org: BOCA,
    isProduction: true,
    phase: "PreSuit - Negotiations",
    incidentDate: "2025-12-05",
    solDate: "2027-12-05",
    adjuster: "L. Ferreira, Sample Auto",
    policyLimits: "$50,000 / $100,000",
    treatment: "Treatment complete",
    demandAmount: "$50,000 (policy limits); offer $31,500",
  }),
  synthetic({
    matterId: "90000107",
    name: "Sample Matter 07: sandbox demo, motorcycle",
    org: SANDBOX,
    isProduction: false,
    phase: "PreSuit - Treating",
    incidentDate: "2026-06-30",
    solDate: "2028-06-30",
    adjuster: "P. Sato, Sample Cycle Ins.",
    policyLimits: "$10,000 / $20,000",
    treatment: "Treating with orthopedics; fracture healing",
  }),
  synthetic({
    matterId: "90000108",
    name: "Sample Matter 08: sandbox demo, premises",
    org: SANDBOX,
    isProduction: false,
    phase: "Closing - Draft Init Statement",
    incidentDate: "2025-05-14",
    solDate: "2027-05-14",
    adjuster: "C. Dubois, Sample Property",
    policyLimits: "$300,000 CSL",
    treatment: "Treatment complete; settled",
    demandAmount: "$95,000; settled $72,000",
  }),
];
