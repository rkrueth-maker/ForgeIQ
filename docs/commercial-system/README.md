# Highway 38 Commercial System — Controlled Technical Record

Status: **LIVE COMMERCIAL CATALOG / OPERATIONS SYNCHRONIZED**

Operational synchronization date: July 11, 2026  
Commercial source branch: `main`

## Controlled source hierarchy

### Public commercial catalog

`catalog-data.js` on `main` is the authoritative public-safe source for:

- 15 product IDs, names, families, prices, summaries, scopes, formats, turnaround, revisions, and payment wording
- 9 bundle IDs, names, prices, component products, outcomes, payment wording, and request routes
- public sample content and website routing

Internal labor targets, gross-margin assumptions, private links, queue IDs, customer records, credentials, proof IDs, and private operational notes do not belong in the public catalog.

### Operational commercial catalog

The Google Sheets **Highway 38 Solutions — Product Fulfillment Backend CURRENT** is authoritative for:

- intake routing and qualification
- detailed scope, exclusions, and professional boundaries
- product and bundle build sheets
- payment and revision status controls
- product and bundle SOP records
- QA Matrix and Acceptance Tests
- controlled customer communication templates
- proof and error requirements

### Operator documentation

The controlled Drive documents are authoritative for operator behavior:

- Highway 38 Operating System — Operations Manual — LOCKED
- Highway 38 Operating System — SOP Index
- Highway 38 Commercial System — Operational Package — CURRENT

When IDs, names, prices, payment rules, revision allowances, intake routes, or scopes disagree, work stops under **Catalog Mismatch Hold** until the sources are reconciled and owner-approved.

## Catalog coverage

- Products: `H38-P001` through `H38-P015`
- Bundles: `H38-B001` through `H38-B009`
- Product SOPs: `H38-PROD-SOP-001` through `H38-PROD-SOP-015`
- Bundle SOPs: `H38-BUNDLE-SOP-001` through `H38-BUNDLE-SOP-009`
- Customer templates: `H38-CT-001` through `H38-CT-022`

Every product and bundle build sheet records the catalog price, payment requirement, payment status, revision allowance, revision status, and intake-complete status.

## Public page map

- `index.html` — outcome-first homepage
- `solutions.html` — customer solution paths
- `products.html` — full catalog, product details, pricing, and bundles
- `pricing.html` — controlled pricing view
- `sample-library-now.html` — samples hub and approved Owner Portal link location
- `how-it-works.html` — customer process and operating-control explanation
- `faq.html` — catalog-aligned questions
- `start-request.html` — conditional outcome-based request guide
- `ai-workflow.html` — digital workflow solution page
- `shop-automation.html` — manufacturing and automation planning page

Legacy package, examples, workbook, automation-example, and backend pages redirect to controlled destinations.

## Intake implementation

The website guide performs outcome selection, product and bundle preselection, conditional family questions, and structured request-summary generation.

The existing approved Google Form remains the live submission endpoint until the outcome-first form builder and response mapping are executed through an approved Forms/Apps Script control path. Current submissions must be normalized through the backend **Intake Routing** tab before quoting or fulfillment.

`apps-script/commercial-intake/FormBuilder.gs` creates a separate outcome-first form after approved execution and configuration. It does not replace or publish the current form automatically.

## Operational safety boundary

No repository change authorizes:

- customer email sending
- quote approval or sending
- payment requests
- final delivery
- website or social publishing
- triggers or monitoring loops

Those actions remain controlled by **Rick Review Required / Owner Approval Required**, selected-row execution, duplicate-action protection, Proof Log, and Error Log requirements.

## Commercial project closeout

The website and commercial catalog are live on `main`. The operational system has been synchronized to the same 15 products and 9 bundles without redesigning the website.

Command Center may close the commercial website project after accepting the Drive operational synchronization package. The next initiative is the **Owner Portal Complete Overhaul**, which must preserve all catalog IDs, prices, payment classes, revision controls, intake status, SOP/template references, owner gates, and proof/error controls.