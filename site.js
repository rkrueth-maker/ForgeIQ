const FORM = "https://docs.google.com/forms/d/e/1FAIpQLSfVpB7zVAh-F59413ImSK4cECntqSNJjv58ipVZcdejp9ur-g/viewform";

const categories = [
  ["Cleanup", "starter", "Cleanup Products", "Small finished outputs that turn scattered details into a clear next move."],
  ["Business", "business", "Business Setup Products", "Clearer offers, pages, profiles, follow-ups, and launch pieces for local businesses."],
  ["Systems", "systems", "Tracker + Tool Products", "Forms, trackers, quote sheets, AI prompts, and internal dashboards for repeat work."],
  ["Planning", "planning", "Planning Products", "Garage, shop, irrigation, camera, and process plans built from rough details."],
  ["Operating System", "service-os", "Connected Business System", "A complete owner operating view when the same workflow repeats."]
];

const products = [
  {
    cat: "Cleanup",
    tag: "Starter cleanup",
    title: "Project Action Snapshot",
    id: "project-cleanup-snapshot",
    price: "$79 intro / $99 normal",
    summary: "A one-page action plan for a messy project.",
    best: "Home projects, garage ideas, website ideas, repair plans, rough notes, and half-started work.",
    problem: "The customer has photos, notes, screenshots, links, half-decisions, and no clear first move.",
    sends: "Photos, rough notes, screenshots, links, measurements if available, and the end goal.",
    builds: ["Plain-English problem summary", "Missing-info checklist", "Watch-out notes", "Quick wins", "Next 3-7 actions"],
    steps: [["Diagnose", "Group the messy details by project area."], ["Sort", "Separate known facts from missing information."], ["Decide", "Pick the first move and next sequence."], ["Deliver", "Send a clean action snapshot."]],
    out: [["Area", "Problem", "Missing", "Next"], ["Garage", "Storage is scattered", "Wall length", "Measure open wall"], ["Website", "No clear offer", "Top services", "Pick starter offer"], ["Quote", "No pricing rule", "Labor/material rate", "Build estimate sheet"]],
    done: "The customer knows what to do first, what is missing, and what should wait.",
    scale: "Tracker, quote sheet, material list, or full planning packet."
  },
  {
    cat: "Cleanup",
    tag: "Business clarity",
    title: "Business Offer Snapshot",
    id: "business-cleanup-snapshot",
    price: "$99-$199",
    summary: "A cleaned-up first offer for a scattered business idea.",
    best: "Side businesses, local services, garage businesses, small shops, and people with too many offer ideas.",
    problem: "The customer has too many ideas and no simple way to explain what they sell.",
    sends: "Service ideas, prices, notes, screenshots, goals, customer examples, and existing wording.",
    builds: ["Offer buckets", "Best starter offer", "Price-position notes", "Confusion list", "Launch actions"],
    steps: [["Collect", "Pull every idea, service, price, and note into one view."], ["Group", "Sort offers into clear buckets."], ["Trim", "Remove noise and confusing offers."], ["Launch", "Name the first offer and next sales step."]],
    out: [["Bucket", "Keep", "Bundle", "Later"], ["Core", "Action Snapshot", "Page + Form", "App upgrade"], ["Pricing", "Intro offer", "Starter kit", "Monthly system"], ["Remove", "Unclear offers", "Loose ideas", "Duplicated services"]],
    done: "The business has one clear starter offer and a short path to sell it.",
    scale: "Service menu, landing page, or starter kit."
  },
  {
    cat: "Cleanup",
    tag: "Offer menu",
    title: "Service Menu Builder",
    id: "service-menu-cleanup",
    price: "$99-$250",
    summary: "A simple service menu customers can understand and buy from.",
    best: "Owners who do useful work but explain it differently every time.",
    problem: "The customer offers useful services, but they feel scattered, overloaded, or hard to choose from.",
    sends: "Service list, prices if known, limits, service area, examples, and work they do not want to take.",
    builds: ["Starter/core/full grouping", "Plain-language descriptions", "Scope notes", "Request wording", "Upsell path"],
    steps: [["List", "Capture every service and variation."], ["Group", "Build starter, core, and full-service choices."], ["Name", "Use labels customers understand."], ["Sell", "Create request wording and next steps."]],
    out: [["Tier", "What it means", "Customer fit", "Next step"], ["Starter", "Small review", "Needs clarity", "Send details"], ["Core", "Finished product", "Ready to buy", "Start request"], ["Full", "Connected setup", "Growing business", "Plan system"]],
    done: "A customer can understand the choices and request the right service without a phone explanation.",
    scale: "Landing page, request form, or Local Service Business OS."
  },
  {
    cat: "Cleanup",
    tag: "Files + receipts",
    title: "Job File & Receipt Organizer",
    id: "photo-file-receipt-cleanup",
    price: "$150-$400",
    summary: "A clean index for job photos, files, receipts, and proof.",
    best: "Receipts, project photos, customer proof, job records, insurance notes, tax prep, or legal/job documentation.",
    problem: "The customer has important photos, receipts, screenshots, and notes spread across too many places.",
    sends: "Photos, receipts, screenshots, links, file dumps, job names, dates, and what the files need to prove.",
    builds: ["Folder structure", "File naming rules", "Job/photo index", "Receipt grouping", "Missing file checklist"],
    steps: [["Collect", "Gather the file pile without overthinking it."], ["Sort", "Group files by job, customer, project, or purpose."], ["Name", "Apply simple naming and folder rules."], ["Index", "Deliver a usable file map with missing items flagged."]],
    out: [["Folder", "Contains", "Status", "Next"], ["Job A", "Photos + quote", "Ready", "Attach to tracker"], ["Job B", "Receipts", "Missing info", "Request date"], ["Archive", "Old jobs", "Closed", "Store"]],
    done: "Files can be found, explained, and used for quotes, proof, taxes, or follow-up.",
    scale: "Job tracker, customer/job cleanup, or owner operating system."
  },
  {
    cat: "Cleanup",
    tag: "Build plan",
    title: "Project Plan & Material List",
    id: "project-plan-material-list",
    price: "$150-$300",
    summary: "A build order and material list for a rough project.",
    best: "Sheds, garage upgrades, shelving, work areas, small builds, repairs, and shop improvements.",
    problem: "The customer knows what they want built or cleaned up, but not the order, materials, or missing measurements.",
    sends: "Photos, dimensions, rough sketch, product links, goal, budget range, and constraints.",
    builds: ["Phase-by-phase build order", "Grouped material list", "Missing measurements", "Tool notes", "Owner checklist"],
    steps: [["Scope", "Name the project and define the finish line."], ["Break down", "Split the work into phases."], ["List", "Group materials, tools, and decisions."], ["Deliver", "Send a checklist the customer can buy from and follow."]],
    out: [["Phase", "Task", "Materials", "Decision"], ["1", "Measure", "Tape, marker, photos", "Final size"], ["2", "Buy", "Lumber, fasteners, brackets", "Budget"], ["3", "Build", "Tools, hardware, layout notes", "Location"]],
    done: "The customer can buy materials and start in the right order without guessing.",
    scale: "Layout review, quote sheet, or shop process review."
  },
  {
    cat: "Business",
    tag: "Website",
    title: "One-Page Service Website",
    id: "website-landing-page",
    price: "$250-$750",
    summary: "A clear one-page website with services, proof, process, and a request path.",
    best: "Local services, small shops, contractors, side businesses, and simple online service pages.",
    problem: "The customer needs a public page that makes the business look real, clear, and easy to contact.",
    sends: "Services, photos, location/service area, contact method, existing wording, examples, and request link.",
    builds: ["Hero headline", "Service cards", "How-it-works section", "What-to-send section", "Request buttons"],
    steps: [["Clarify", "Pick the offer and customer problem."], ["Structure", "Build page sections in buying order."], ["Build", "Write and layout the page."], ["Launch", "Connect the request path and old links."]],
    out: [["Section", "Purpose", "Content", "Action"], ["Hero", "Explain offer", "Main promise", "Start request"], ["Services", "Show choices", "Cards", "Pick product"], ["Process", "Reduce confusion", "Steps", "Send details"]],
    done: "A customer understands what is offered and can start a request from the page.",
    scale: "Request Form & Tracker, launch kit, or Local Service Business OS."
  },
  {
    cat: "Business",
    tag: "Launch kit",
    title: "Local Business Launch Kit",
    id: "local-business-starter-kit",
    price: "$499+",
    summary: "The basic page, form, tracker, menu, and replies to start taking requests.",
    best: "A new or cleaned-up local business that needs the first working system, not a giant build.",
    problem: "The customer is starting or cleaning up a local service business and needs the basic pieces connected.",
    sends: "Services, service area, price ideas, photos, current notes, common questions, and preferred contact method.",
    builds: ["Landing page outline or starter page", "Google request form", "Lead tracker", "Service menu", "Starter replies"],
    steps: [["Offer", "Turn the service list into a clean menu."], ["Intake", "Build the form questions."], ["Track", "Set up lead and job statuses."], ["Reply", "Deliver copy/paste replies."]],
    out: [["Piece", "Finished output", "Use", "Next"], ["Website", "Offer + services", "Public page", "Share link"], ["Form", "Request fields", "Capture info", "Connect tracker"], ["Tracker", "Lead statuses", "Daily view", "Follow up"]],
    done: "The owner can take first requests and knows where each request goes.",
    scale: "Local Service Business OS or a simple internal dashboard."
  },
  {
    cat: "Business",
    tag: "Google profile",
    title: "Google Business Profile Setup Pack",
    id: "google-business-profile-prep",
    price: "$99-$250",
    summary: "A prep packet for improving a Google Business Profile.",
    best: "Local businesses that need better profile wording, photos, service descriptions, and review replies.",
    problem: "The customer profile is incomplete, vague, or missing strong service wording and photo direction.",
    sends: "Services, hours, service area, photos, current profile text, review examples, and business details.",
    builds: ["Service descriptions", "Photo checklist", "Service area wording", "Post ideas", "Review reply templates"],
    steps: [["Audit", "Find missing or weak profile items."], ["Write", "Draft profile copy and service descriptions."], ["Collect", "List the photos and examples to add."], ["Use", "Prepare post and review reply wording."]],
    out: [["Item", "Need", "Status", "Next"], ["Photos", "Work examples", "Missing", "Take 6 photos"], ["Services", "Short copy", "Drafted", "Review wording"], ["Reviews", "Reply templates", "Ready", "Copy/paste"]],
    done: "The owner knows exactly what to update, add, and reuse on the profile.",
    scale: "Landing page, follow-up tracker, or launch kit."
  },
  {
    cat: "Business",
    tag: "Follow-up",
    title: "Customer Follow-Up Tracker",
    id: "customer-follow-up-system",
    price: "$150-$300",
    summary: "A follow-up board and message templates so leads do not get forgotten.",
    best: "Contractors and service businesses that lose leads after quotes, delays, or missing-info requests.",
    problem: "The customer forgets to follow up, loses leads, or rewrites the same messages over and over.",
    sends: "Common situations, current replies, preferred tone, timing rules, quote examples, and review link.",
    builds: ["Follow-up statuses", "Message templates", "Timing rules", "Review request", "Reminder tracker"],
    steps: [["Map", "Name each follow-up situation."], ["Write", "Draft reusable templates."], ["Time", "Set simple follow-up timing rules."], ["Track", "Build a board or sheet view."]],
    out: [["Status", "Message", "Timing", "Next"], ["Need Info", "Ask for photos", "Same day", "Wait"], ["Quote Sent", "Check-in", "2 days", "Follow up"], ["Review", "Thanks + link", "After job", "Request review"]],
    done: "The owner knows what to send, when to send it, and which customers need attention.",
    scale: "Contractor Job Tracker or Local Service Business OS."
  },
  {
    cat: "Business",
    tag: "Reply pack",
    title: "Quote & Follow-Up Message Pack",
    id: "quote-follow-up-reply-pack",
    price: "$75-$200",
    summary: "Copy/paste messages for quotes, missing info, scheduling, and follow-ups.",
    best: "Owners who mostly need better customer wording before building a full tracker.",
    problem: "The customer needs better wording for repeat messages without sounding robotic or too formal.",
    sends: "Current replies, common situations, tone preference, service details, and customer message examples.",
    builds: ["Missing-info request", "Quote sent message", "Scheduling reply", "Delay/update reply", "Invoice/review reply"],
    steps: [["Collect", "List the repeat message situations."], ["Draft", "Write clean reusable replies."], ["Sort", "Organize replies by use case."], ["Deliver", "Send the pack ready to copy and edit."]],
    out: [["Use", "Message", "Tone", "When"], ["Missing Info", "Ask for photos/details", "Clear", "Before quote"], ["Quote Sent", "Check-in message", "Friendly", "2 days later"], ["Review", "Thanks + review request", "Short", "After job"]],
    done: "The owner can copy, edit, and send better replies quickly.",
    scale: "Follow-up tracker or AI setup kit."
  },
  {
    cat: "Systems",
    tag: "Form + tracker",
    title: "Request Form & Tracker",
    id: "google-form-tracker",
    price: "$150-$400",
    summary: "A customer request form connected to a simple tracking sheet.",
    best: "Businesses receiving incomplete requests through texts, calls, Facebook, email, or screenshots.",
    problem: "The customer receives incomplete requests through texts, calls, Facebook, email, or screenshots.",
    sends: "Services, questions to ask, current intake process, desired statuses, and any existing sheet.",
    builds: ["Request form questions", "Photo/link prompts", "Budget/timing fields", "Tracker columns", "Status/next action fields"],
    steps: [["Ask", "Turn missing info into better questions."], ["Capture", "Build the form fields."], ["Track", "Create tracker columns and statuses."], ["Act", "Add next-action fields so work moves forward."]],
    out: [["Form field", "Why it matters", "Tracker column", "Next"], ["Photos", "See the job", "Photo link", "Review"], ["Budget", "Scope fit", "Budget range", "Quote"], ["Timing", "Priority", "Due date", "Schedule"]],
    done: "New requests land in one place with enough information to review.",
    scale: "Quote sheet, job tracker, or Local Service Business OS."
  },
  {
    cat: "Systems",
    tag: "Job dashboard",
    title: "Contractor Job Tracker",
    id: "contractor-job-tracker",
    price: "$150-$300",
    summary: "A dashboard for leads, jobs, quotes, files, invoices, and follow-ups.",
    best: "Contractors, repair services, garage services, mobile work, small shops, and local service owners.",
    problem: "The customer has work spread across texts, notebooks, screenshots, and memory.",
    sends: "Customer list, job types, statuses, quote examples, invoice/follow-up needs, and file links.",
    builds: ["Customer/job columns", "Status dropdown plan", "Quote/invoice tracking", "Follow-up dates", "Photo/file links"],
    steps: [["Leads", "Capture new requests."], ["Quotes", "Track estimate status and value."], ["Jobs", "Track scheduled and active work."], ["Follow-up", "Show the next action for each customer."]],
    out: [["Customer", "Status", "Quote", "Next"], ["Demo A", "Needs Quote", "$450", "Request photos"], ["Demo B", "Scheduled", "$120/mo", "Confirm"], ["Demo C", "Follow-up due", "$980", "Send check-in"]],
    done: "The owner can see every open job, quote, and next action in one view.",
    scale: "Customer/job cleanup, quote automation, or Local Service Business OS."
  },
  {
    cat: "Systems",
    tag: "Cleanup",
    title: "Customer & Job Tracker Cleanup",
    id: "customer-job-system-cleanup",
    price: "$150-$500",
    summary: "A cleanup of an existing customer list, job sheet, or work tracker.",
    best: "People who already have a sheet, notebook, file pile, or old customer list that is too messy to operate from.",
    problem: "The customer already has information, but it is too inconsistent to operate from.",
    sends: "Sheets, notebooks, screenshots, customer/job statuses, old lists, and current pain points.",
    builds: ["Clean categories", "Status system", "Priority/next actions", "Archive/active split", "Weekly review view"],
    steps: [["Audit", "Review the current mess."], ["Clean", "Standardize statuses and fields."], ["Prioritize", "Flag next actions and stuck items."], ["Operate", "Create a simple review view."]],
    out: [["View", "Contains", "Purpose", "Next"], ["Active", "Current jobs", "Daily work", "Move forward"], ["Waiting", "Need info", "Follow-up", "Ask customer"], ["Archive", "Closed work", "History", "Store"]],
    done: "The old mess becomes usable again without rebuilding everything from scratch.",
    scale: "Local Service Business OS or a simple internal dashboard."
  },
  {
    cat: "Systems",
    tag: "Estimate tool",
    title: "Quote & Estimate Sheet",
    id: "quote-estimate-sheet",
    price: "$150-$300",
    summary: "A reusable estimate sheet for consistent pricing.",
    best: "Repeat work where materials, labor, markup, trip fees, or setup fees need to be priced consistently.",
    problem: "The customer guesses prices or rebuilds each estimate from scratch.",
    sends: "Rates, material costs, markup rules, job types, trip/setup fees, and sample quotes.",
    builds: ["Material cost section", "Labor rate section", "Markup fields", "Trip/setup fees", "Customer total"],
    steps: [["Rules", "Define pricing logic."], ["Inputs", "Set material, labor, and fee fields."], ["Math", "Build totals and markup structure."], ["Quote", "Create the customer-ready output area."]],
    out: [["Line Item", "Qty", "Rate", "Price"], ["Materials", "1", "20% markup", "$216"], ["Labor", "5 hrs", "$55/hr", "$275"], ["Trip/setup", "1", "Flat", "$45"], ["Total", "", "", "$536"]],
    done: "The owner can price similar work the same way every time.",
    scale: "Tracker, launch kit, or Local Service Business OS."
  },
  {
    cat: "Systems",
    tag: "AI workflow",
    title: "Small Business AI Setup Kit",
    id: "ai-setup-small-business",
    price: "$150-$500",
    summary: "Prompt templates and review rules for repeated business tasks.",
    best: "Owners who want AI help with leads, quotes, replies, summaries, checklists, or repeated admin work.",
    problem: "The customer wants AI help but needs safe, repeatable prompts that fit their real work.",
    sends: "Common messages, repeated tasks, service details, current templates, examples, and owner review rules.",
    builds: ["Prompt pack by task", "Quote questions", "Reply templates", "Owner review rule", "Workflow checklist"],
    steps: [["Collect", "Identify repeat tasks."], ["Prompt", "Write reusable instructions."], ["Template", "Build reply and quote templates."], ["Review", "Add owner approval before anything is sent."]],
    out: [["Task", "Prompt output", "Owner rule", "Next"], ["Lead", "Ask missing info", "Review first", "Send"], ["Quote", "Draft estimate", "Verify math", "Edit"], ["Delay", "Update reply", "Approve tone", "Send"]],
    done: "The owner has reusable AI prompts and knows when to review before sending.",
    scale: "Follow-up tracker, job tracker, or internal dashboard."
  },
  {
    cat: "Systems",
    tag: "Internal tool",
    title: "Internal Dashboard / Simple App",
    id: "simple-app-internal-tool",
    price: "$500-$1,500+",
    summary: "A simple app-style dashboard for a repeating internal workflow.",
    best: "Workflows that have outgrown a basic sheet but do not need expensive custom software yet.",
    problem: "The customer repeats the same workflow often enough that a simple app-style tool would save time.",
    sends: "Workflow steps, data fields, current tracker, screenshots, examples, and must-have views.",
    builds: ["Dashboard view", "Customer/job screens", "Quote helper", "Follow-up view", "Workflow map"],
    steps: [["Map", "Define screens and workflow."], ["Build", "Create the interface and views."], ["Connect", "Tie fields and statuses together."], ["Use", "Deliver an owner checklist for daily operation."]],
    out: [["View", "Purpose", "Status", "Next"], ["Intake", "New requests", "Open", "Review"], ["Quote", "Build price", "Ready", "Send"], ["Follow-Up", "Customer messages", "Due", "Reply"]],
    done: "The workflow is simple enough to use daily and structured enough to improve later.",
    scale: "Portal, automation, or ongoing improvement system."
  },
  {
    cat: "Planning",
    tag: "Garage/shop",
    title: "Garage & Shop Layout Review",
    id: "garage-shop-layout-review",
    price: "$75-$150",
    summary: "A layout review for work zones, storage, tools, vehicles, and clear paths.",
    best: "Garages, home shops, small work areas, storage walls, tool zones, and vehicle/project bays.",
    problem: "The customer has a garage or shop that needs a better layout before moving tools or buying storage.",
    sends: "Photos, dimensions, doors, tools, vehicles, storage needs, and goals.",
    builds: ["Zone concept", "Clearance notes", "Missing measurement list", "Phase plan", "Starter material notes"],
    steps: [["Measure", "Mark known and missing dimensions."], ["Zone", "Separate work, storage, vehicle, and walking areas."], ["Plan", "Put changes into a practical phase order."], ["Deliver", "Send a layout packet with notes and next measurements."]],
    out: [["Zone", "Purpose", "Concern", "Next"], ["Work bay", "Vehicle/project space", "Clearance", "Measure"], ["Bench", "Tools + assembly", "Power", "Locate outlets"], ["Storage", "Shelving wall", "Access", "Pick wall"]],
    done: "The customer can see zones, problems, and next measurements before spending money.",
    scale: "Material list, project plan, or shop process review."
  },
  {
    cat: "Planning",
    tag: "Irrigation",
    title: "Irrigation Layout Planning Pack",
    id: "sprinkler-irrigation-layout-planning",
    price: "$99-$199",
    summary: "A rough sprinkler/irrigation zone plan before buying parts or getting quotes.",
    best: "Yards, gardens, lawns, driveways, beds, trench paths, and early sprinkler planning.",
    problem: "The customer wants irrigation planning but does not yet know zones, head placement concerns, or what to verify.",
    sends: "Satellite image, yard photos, water source location, problem areas, beds/driveways, and rough dimensions.",
    builds: ["Watering zone concept", "Head placement notes", "Trench path concerns", "Pressure/flow questions", "Utility checklist"],
    steps: [["Map", "Identify yard areas and obstacles."], ["Zone", "Group areas into watering zones."], ["Verify", "List pressure, flow, rules, and utility questions."], ["Deliver", "Send a planning packet for buying or quote prep."]],
    out: [["Zone", "Area", "Verify", "Next"], ["Zone 1", "Front lawn", "Pressure/flow", "Check source"], ["Zone 2", "Back lawn", "Coverage", "Mark heads"], ["Beds", "Garden areas", "Drip option", "Plan route"]],
    done: "The customer knows what to verify before buying parts or asking for a quote.",
    scale: "Material list, contractor quote prep packet, or project plan."
  },
  {
    cat: "Planning",
    tag: "Smart garage",
    title: "Smart Garage & Camera Plan",
    id: "smart-garage-camera-setup-plan",
    price: "$75-$300",
    summary: "A camera/device placement and setup plan for a garage, driveway, or shop.",
    best: "Garage cameras, driveway cameras, shop monitoring, smart sensors, Wi-Fi concerns, and alert setup.",
    problem: "The customer wants cameras or smart devices but does not know locations, coverage, power, or setup sequence.",
    sends: "Photos, device list, Wi-Fi/router notes, problem areas, power locations, and current app/device issues.",
    builds: ["Camera locations", "Wi-Fi/power concerns", "Alert checklist", "App setup order", "Buying questions"],
    steps: [["Survey", "Review photos, device list, and trouble spots."], ["Place", "Pick coverage zones and camera locations."], ["Check", "Flag power, Wi-Fi, and mounting concerns."], ["Setup", "List app setup and alert order."]],
    out: [["Device", "Coverage", "Concern", "Next"], ["Camera 1", "Driveway", "Wi-Fi", "Signal check"], ["Camera 2", "Door area", "Power", "Mount height"], ["Sensor", "Garage entry", "Alerts", "App setup"]],
    done: "The customer knows where each device goes and what must be checked before buying more.",
    scale: "Garage layout, buying checklist, or smart-home setup packet."
  },
  {
    cat: "Planning",
    tag: "Process review",
    title: "Shop Process Improvement Review",
    id: "shop-process-improvement-review",
    price: "$250-$750+",
    summary: "A bottleneck review for quoting, files, materials, workflow, and follow-up.",
    best: "Small shops, garage businesses, CNC/workflow planning, quoting flow, file chaos, and repeated handoff problems.",
    problem: "The customer has a shop process that wastes time through repeated work, missing info, messy flow, or unclear quoting.",
    sends: "Workflow steps, problem areas, photos, examples, current forms/sheets, and what slows the shop down.",
    builds: ["Simple process map", "Bottleneck list", "Fix ideas", "Expected return notes", "Improvement plan"],
    steps: [["Observe", "Map the actual workflow."], ["Find", "Identify bottlenecks and repeated waste."], ["Prioritize", "Pick the highest-return fixes first."], ["Deliver", "Send an improvement plan with next actions."]],
    out: [["Area", "Bottleneck", "Fix", "Return"], ["Quoting", "Repeated entry", "Quote sheet", "Faster quotes"], ["Files", "Photos scattered", "File index", "Less searching"], ["Follow-up", "Leads forgotten", "Tracker", "More closes"]],
    done: "The owner knows the highest-return fixes and what to improve first.",
    scale: "Tracker, quote sheet, internal dashboard, or Local Service Business OS."
  },
  {
    cat: "Operating System",
    tag: "Full system",
    title: "Local Service Business OS",
    id: "local-service-os",
    price: "$750-$1,500+",
    summary: "A connected owner dashboard for page, form, tracker, quote sheet, files, and follow-up.",
    best: "Growing local service businesses where leads, quotes, jobs, files, and follow-up need one operating view.",
    problem: "The customer has enough service work that scattered tools are costing leads, time, and follow-up.",
    sends: "Services, prices, customer messages, workflow, current files/sheets, quote examples, follow-up needs, and goals.",
    builds: ["Landing page or service page", "Request form", "Lead/job tracker", "Quote sheet", "Follow-up templates", "Weekly review checklist"],
    steps: [["Page", "Clarify the public offer and request path."], ["Intake", "Connect form questions to a tracker."], ["Quote", "Add pricing and estimate tools."], ["Operate", "Create weekly review and follow-up rhythm."]],
    out: [["Stage", "Example", "Status", "Next"], ["New", "Garage cleanup", "Open", "Review photos"], ["Need Info", "Yard packet", "Waiting", "Ask dimensions"], ["Follow-Up", "Quote sent", "Due", "Send check-in"]],
    done: "The owner has one operating view for requests, quotes, jobs, files, and follow-ups.",
    scale: "Simple app, customer portal, or ongoing improvement system."
  }
];

const escapeHtml = value => String(value).replace(/[&<>"']/g, match => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;"
}[match]));

function renderTable(rows) {
  return `
    <div class="mock-table">
      ${rows.map((row, index) => `
        <div class="mock-row ${index ? "" : "head"}">
          ${row.map(cell => `<div>${escapeHtml(cell)}</div>`).join("")}
        </div>
      `).join("")}
    </div>
  `;
}

function renderProduct(product, index) {
  return `
    <article class="product" id="${escapeHtml(product.id)}">
      <div class="product-head">
        <div>
          <span class="product-number">Product ${String(index + 1).padStart(2, "0")} · full example walkthrough</span>
          <h3>${escapeHtml(product.title)}</h3>
          <p>${escapeHtml(product.summary)}</p>
        </div>
        <span class="price">${escapeHtml(product.price)}</span>
      </div>

      <div class="product-grid">
        <div class="product-info">
          <div class="detail important-detail">
            <h4>Best for</h4>
            <p>${escapeHtml(product.best)}</p>
          </div>
          <div class="detail">
            <h4>Customer problem</h4>
            <p>${escapeHtml(product.problem)}</p>
          </div>
          <div class="detail">
            <h4>What customer sends</h4>
            <p>${escapeHtml(product.sends)}</p>
          </div>
          <div class="detail">
            <h4>What Northwoods builds</h4>
            <ul>${product.builds.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </div>
          <div class="process">
            <h4>4-step process</h4>
            <div class="steps">
              ${product.steps.map((step, stepIndex) => `
                <div class="step">
                  <b>${stepIndex + 1}. ${escapeHtml(step[0])}</b>
                  <p>${escapeHtml(step[1])}</p>
                </div>
              `).join("")}
            </div>
          </div>
        </div>

        <div class="preview">
          <div class="preview-title">
            <strong>Finished-output example</strong>
            <span>Walkthrough preview</span>
          </div>
          ${renderTable(product.out)}
          <div class="done-grid">
            <div><strong>Definition of done</strong><span>${escapeHtml(product.done)}</span></div>
            <div><strong>Scale path</strong><span>${escapeHtml(product.scale)}</span></div>
          </div>
          <a class="request-link" href="${FORM}" target="_blank" rel="noopener">Start this product request</a>
        </div>
      </div>
    </article>
  `;
}

function renderCatalog() {
  const catalog = document.getElementById("catalogGrid");
  const sections = document.getElementById("sections");

  if (!catalog || !sections) return;

  catalog.innerHTML = products.map(product => `
    <a class="product-card" href="#${escapeHtml(product.id)}">
      <div class="card-top">
        <small>${escapeHtml(product.tag)}</small>
        <span class="card-price">${escapeHtml(product.price)}</span>
      </div>
      <strong>${escapeHtml(product.title)}</strong>
      <span>${escapeHtml(product.summary)}</span>
      <em>View full example walkthrough</em>
    </a>
  `).join("");

  sections.innerHTML = categories.map(([category, id, title, description], sectionIndex) => `
    <section class="section ${sectionIndex % 2 ? "section-alt" : ""}" id="${id}">
      <div class="container">
        <div class="section-title">
          <span class="badge">${escapeHtml(category)}</span>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(description)}</p>
        </div>
        ${products.filter(product => product.cat === category).map(product => renderProduct(product, products.indexOf(product))).join("")}
      </div>
    </section>
  `).join("");

  if (location.hash) {
    setTimeout(() => {
      const target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }
}

renderCatalog();
