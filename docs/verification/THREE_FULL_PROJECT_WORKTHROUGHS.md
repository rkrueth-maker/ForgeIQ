# Three Complete Project Workthroughs

Status: active build on `feature/three-full-project-workflows`.

## Owner-approved objective

Create three controlled demonstrations that run from intake through completion and closeout:

1. 8 × 12 pressure-treated deck
2. Four-zone residential irrigation system
3. Mid-range kitchen remodel

Each demonstration must include:

- Before and after visuals using the exact same point of view
- Site facts and measurements
- Assumptions, exclusions, and verification needs
- Itemized base quote and optional upgrades
- Owner and customer approval records
- Quote-to-job conversion
- Ordered job instructions
- Trackable tasks and dependencies
- Trigger records and approval gates
- Material and purchase-preparation records
- Schedule and milestone records
- Before, during, concealed-work, and after proof
- Exception and stop-work paths
- Invoice, payment, and closeout records
- Linked controlled demo data in every applicable Business Office table

## Visual rules

### Deck

The before and after images must preserve the same house, rear door, camera location, lens, height, season, light direction, and field of view. The after image may add only the approved 8 × 12 deck, stairs, railing, selected upgrades, and minor ground restoration.

### Irrigation

Provide two matched presentations:

- Same elevated property view before and after, with the after version overlaying mainline, zones, valves, heads, drip routes, controller, backflow, and coverage arcs.
- Same ground-level yard point of view before and after, showing the unchanged property and operating irrigation coverage.

### Kitchen

The before and after images must preserve camera location, lens, room dimensions, walls, windows, doors, and ceiling geometry. The after image changes only approved cabinets, counters, backsplash, flooring, sink, faucet, appliances, lighting, paint, trim, and hardware.

## Workflow stages

1. Request received
2. Customer record created
3. Photos and notes captured
4. Measurements verified
5. Scope prepared
6. Quote prepared
7. Options selected
8. Owner approval recorded
9. Customer approval recorded
10. Job created
11. Instructions generated
12. Tasks generated
13. Schedule prepared
14. Purchase approvals prepared
15. Work executed
16. Proof recorded
17. Invoice prepared
18. Payment recorded
19. Job closed

## Trigger policy

Triggers may create or update internal controlled records. They must not automatically:

- Contact customers
- Assign workers
- Schedule real work
- Order materials
- Book inspections
- Accept payments
- Approve changes
- File permits or taxes
- Perform any external action

External actions remain disabled or owner-confirmed.

## Business Office population

The demonstration data model is stored in:

`assets/js/h38-full-workthrough-demo-data.js`

Every project will populate linked controlled demo records across applicable Business Office areas. Where a table is not applicable, the future demo seeder should create an explicit `Not Required — Demo` record so the full data model can be demonstrated without implying a real transaction.

All demo contacts use `.invalid` email addresses and fictional contact information.

## Deferred page

A separate Business Office demonstration page is intentionally deferred until the current Business Office polish is accepted.

The data and relationships are being prepared now so the later Office showcase can display:

- Project overview
- Customer record
- Quote and options
- Approvals
- Job instructions
- Tasks and dependencies
- Schedule
- Purchases and expenses
- Documents and proof
- Invoice and payment
- Trigger history
- Closeout and audit history

Do not build a competing Business Office UI before the polish workstream is complete.
