if (typeof products !== "undefined") {
  const productNamePolish = {
    "business-cleanup-snapshot": {
      title: "Business Mess Cleanup Snapshot",
      summary: "A cleaned-up first offer and action path for a scattered business idea.",
      scale: "Service Menu Builder, One-Page Service Website, or Local Business Launch Kit."
    },
    "photo-file-receipt-cleanup": {
      title: "Job File Cleanup",
      summary: "A clean index for job photos, receipts, files, notes, and proof."
    },
    "google-form-tracker": {
      title: "Request Form + Lead Tracker",
      summary: "A customer request form connected to a simple lead and job tracking sheet."
    },
    "customer-job-system-cleanup": {
      title: "Customer & Job Tracker",
      summary: "A cleanup of an existing customer list, job sheet, file pile, or work tracker."
    },
    "quote-estimate-sheet": {
      title: "Quote Sheet Builder",
      summary: "A reusable quote sheet for consistent pricing."
    },
    "simple-app-internal-tool": {
      title: "Simple Internal Tool",
      summary: "A simple dashboard-style tool for a repeating internal workflow."
    },
    "shop-process-improvement-review": {
      title: "Shop Bottleneck Review",
      summary: "A practical review of bottlenecks in quoting, files, materials, workflow, and follow-up."
    },
    "local-service-os": {
      title: "Local Service Operating System",
      summary: "A connected owner dashboard for page, form, tracker, quote sheet, files, reviews, and follow-up."
    }
  };

  products.forEach(product => {
    if (productNamePolish[product.id]) {
      Object.assign(product, productNamePolish[product.id]);
    }
  });
}

const deeperProducts = [
  {
    cat: "Business",
    tag: "Reviews",
    title: "Review Request & Reply System",
    id: "review-request-reply-system",
    price: "$99-$250",
    summary: "A simple system for asking happy customers for reviews and replying professionally.",
    best: "Service businesses that finish jobs but do not consistently ask for reviews or respond to them.",
    problem: "The owner finishes good work, but reviews are random, forgotten, or hard to ask for without sounding pushy.",
    sends: "Review link if available, common job types, customer timing, current review replies, tone preference, and examples of completed jobs.",
    builds: ["Review request messages", "Follow-up timing rules", "Positive review reply templates", "Negative review response templates", "Simple review tracking board"],
    steps: [["Map", "Pick when reviews should be requested."], ["Write", "Create short review request and reply templates."], ["Track", "Add review status and follow-up fields."], ["Use", "Deliver copy/paste wording and a review routine."]],
    out: [["Situation", "Message", "Timing", "Next"], ["Job complete", "Thanks + review link", "Same day", "Send"], ["No response", "Soft reminder", "3 days", "Follow up"], ["Review posted", "Reply template", "Same week", "Respond"]],
    done: "The owner knows when to ask, what to send, and how to respond without rewriting messages every time.",
    scale: "Customer Follow-Up Tracker, Google Business Profile Setup Pack, or Local Service Operating System."
  },
  {
    cat: "Business",
    tag: "Lost leads",
    title: "Missed Lead Recovery Pack",
    id: "missed-lead-recovery-pack",
    price: "$150-$350",
    summary: "A cleanup and follow-up plan for old texts, emails, messages, and quote requests.",
    best: "Owners with old leads sitting in texts, Facebook messages, emails, voicemails, screenshots, or quote notes.",
    problem: "Potential jobs were never followed up on, and the owner does not know which ones are still worth chasing.",
    sends: "Old messages, lead list, quote requests, customer names, dates, job type, status notes, and preferred follow-up tone.",
    builds: ["Lead recovery list", "Priority ranking", "Follow-up message pack", "Close/lost status rules", "Next-action tracker"],
    steps: [["Collect", "Gather old leads into one list."], ["Sort", "Mark hot, warm, cold, closed, and unknown leads."], ["Write", "Create recovery messages by situation."], ["Follow up", "Deliver a simple recovery tracker."]],
    out: [["Lead", "Age", "Status", "Next"], ["Deck repair", "12 days", "Warm", "Send check-in"], ["Garage quote", "45 days", "Cold", "One final follow-up"], ["Camera job", "3 days", "Hot", "Request photos"]],
    done: "Old leads become a clear follow-up list instead of a pile of forgotten messages.",
    scale: "Customer Follow-Up Tracker, Contractor Job Tracker, or Local Service Operating System."
  },
  {
    cat: "Business",
    tag: "Invoices + payments",
    title: "Invoice & Payment Setup Pack",
    id: "invoice-payment-setup-pack",
    price: "$99-$299",
    summary: "Invoice wording, payment instructions, reminder timing, and a simple paid/unpaid tracking flow.",
    best: "Owners who quote work but still send inconsistent invoices, payment notes, or reminders.",
    problem: "The owner can quote the job, but invoicing, payment instructions, deposits, reminders, and paid/unpaid status are not organized.",
    sends: "Current invoice examples, payment methods, deposit rules, reminder wording, payment terms, quote examples, and customer questions.",
    builds: ["Invoice template wording", "Payment instruction block", "Deposit/final payment rules", "Reminder message pack", "Paid/unpaid tracker fields"],
    steps: [["Review", "Look at the current quote-to-payment flow."], ["Write", "Create clear invoice and payment wording."], ["Track", "Add paid, unpaid, deposit, and reminder statuses."], ["Deliver", "Send the setup pack ready to copy into the chosen tool."]],
    out: [["Item", "Rule", "Message", "Next"], ["Deposit", "Before scheduling", "Deposit request", "Mark paid"], ["Final", "After job", "Invoice sent", "Set reminder"], ["Late", "After due date", "Friendly reminder", "Follow up"]],
    done: "The owner has a cleaner quote-to-invoice-to-payment routine without needing full accounting software setup.",
    scale: "Quote Sheet Builder, Contractor Job Tracker, or Local Service Operating System."
  },
  {
    cat: "Systems",
    tag: "Price book",
    title: "Price Book Starter",
    id: "price-book-starter",
    price: "$250-$600",
    summary: "A starter price book for repeat services, labor, materials, markup, trip fees, and add-ons.",
    best: "Repeat services where the owner keeps guessing prices or rebuilding estimates from scratch.",
    problem: "Pricing changes job by job because labor, material, markup, minimums, and trip/setup charges are not organized.",
    sends: "Common services, past quotes, labor rates, material costs, markup rules, minimum charges, add-ons, and service area notes.",
    builds: ["Service price list", "Labor and material rules", "Add-on menu", "Trip/setup fee rules", "Quote sheet inputs"],
    steps: [["List", "Capture repeat services and common add-ons."], ["Price", "Group labor, material, markup, and minimums."], ["Standardize", "Create repeatable price rules."], ["Deliver", "Build the starter price book and quote inputs."]],
    out: [["Service", "Base", "Add-ons", "Notes"], ["Camera install", "$___", "Extra camera", "Verify Wi-Fi"], ["Garage layout", "$___", "Material list", "Needs dimensions"], ["Trip/setup", "$___", "Distance", "Set minimum"]],
    done: "The owner has a starter pricing structure they can reuse and improve instead of guessing every time.",
    scale: "Quote Sheet Builder, Job Profit Snapshot, or Local Service Operating System."
  },
  {
    cat: "Systems",
    tag: "Profit check",
    title: "Job Profit Snapshot",
    id: "job-profit-snapshot",
    price: "$150-$400",
    summary: "A simple profit review showing which jobs made money after time, materials, travel, and callbacks.",
    best: "Small service businesses that quote work but do not know which jobs actually made money.",
    problem: "The owner knows revenue, but not whether jobs were profitable after labor time, parts, trips, delays, and rework.",
    sends: "Job list, prices charged, material costs, estimated and actual hours, travel, callbacks, notes, and invoices if available.",
    builds: ["Job profit table", "Cost buckets", "Problem-job flags", "Pricing lessons", "Next pricing changes"],
    steps: [["Collect", "Gather job price, cost, and time information."], ["Compare", "Separate revenue from actual cost."], ["Flag", "Find low-profit jobs and repeat issues."], ["Improve", "Recommend price book or quoting changes."]],
    out: [["Job", "Revenue", "Cost issue", "Lesson"], ["Garage job", "$850", "Extra trip", "Add trip rule"], ["Install", "$420", "Labor high", "Raise base"], ["Repair", "$180", "Good margin", "Keep"]],
    done: "The owner can see which work is worth repeating and what pricing needs to change.",
    scale: "Price Book Starter, Quote Sheet Builder, or Shop Bottleneck Review."
  },
  {
    cat: "Systems",
    tag: "Booking prep",
    title: "Online Booking Prep Packet",
    id: "online-booking-prep-packet",
    price: "$150-$400",
    summary: "A prep packet for service options, appointment rules, service areas, time windows, and intake questions.",
    best: "Businesses that want online booking later but need the rules cleaned up first.",
    problem: "The owner wants customers to book or request service online, but services, timing rules, locations, and intake questions are not clear enough yet.",
    sends: "Service list, hours, service area, job types, travel limits, timing rules, unavailable work, and questions customers should answer.",
    builds: ["Bookable service list", "Time-window rules", "Service-area notes", "Intake questions", "Booking do/don't rules"],
    steps: [["Define", "Choose which services can be requested or booked."], ["Limit", "Set timing, location, and job-type rules."], ["Ask", "Create intake questions before the appointment."], ["Prepare", "Deliver a booking setup packet."]],
    out: [["Service", "Bookable?", "Questions", "Rule"], ["Layout review", "Request only", "Photos/dims", "Review first"], ["Repair", "Maybe", "Issue/photo", "Confirm parts"], ["Install", "Yes", "Location", "Set window"]],
    done: "The business has booking rules ready before using a booking app, form, or website scheduler.",
    scale: "Request Form + Lead Tracker, One-Page Service Website, or Local Service Operating System."
  },
  {
    cat: "Systems",
    tag: "Customer history",
    title: "Simple CRM / Customer History Setup",
    id: "simple-crm-customer-history-setup",
    price: "$149-$399",
    summary: "A simple customer-history structure for contacts, jobs, equipment, notes, files, and follow-ups.",
    best: "Owners who remember customers by text thread, notebook, memory, or scattered old jobs.",
    problem: "Customer information exists, but past jobs, notes, files, equipment, quotes, and follow-ups are not connected in one usable view.",
    sends: "Customer list, job notes, old trackers, service history, equipment/property notes, file links, statuses, and follow-up needs.",
    builds: ["Customer record fields", "Job history layout", "Tag/status rules", "File/photo links", "Follow-up and review fields"],
    steps: [["Collect", "Gather customer and job-history details."], ["Structure", "Choose fields that matter for repeat work."], ["Link", "Connect jobs, files, notes, and follow-ups."], ["Use", "Deliver a simple weekly customer-history view."]],
    out: [["Customer", "History", "Files", "Next"], ["Demo A", "2 jobs", "Photos linked", "Review ask"], ["Demo B", "Quote open", "Estimate linked", "Follow up"], ["Demo C", "Equipment note", "Receipt linked", "Service reminder"]],
    done: "The owner can look up a customer and see the useful history without digging through messages and memory.",
    scale: "Contractor Job Tracker, Customer Portal Prep, or Local Service Operating System."
  },
  {
    cat: "Systems",
    tag: "Portal prep",
    title: "Customer Portal Prep",
    id: "customer-portal-prep",
    price: "$250-$750",
    summary: "A map of what customers should see: quotes, status, photos, invoices, files, messages, and approvals.",
    best: "Businesses that want a customer hub or portal but are not ready for complicated software yet.",
    problem: "Customer information is scattered, and the owner does not know what should be shared, hidden, approved, or updated.",
    sends: "Customer workflow, quote examples, photos/files, invoice process, status updates, message examples, approval steps, and current tools.",
    builds: ["Portal content map", "Customer status list", "File/photo sharing rules", "Approval points", "Simple portal or dashboard plan"],
    steps: [["Map", "Identify what customers need to see."], ["Separate", "Split owner-only details from customer-facing details."], ["Design", "Plan screens, statuses, and file areas."], ["Deliver", "Send a portal prep packet or lightweight build plan."]],
    out: [["Customer sees", "Owner sees", "When", "Action"], ["Quote", "Cost notes", "Before approval", "Approve"], ["Job status", "Schedule notes", "During job", "Update"], ["Photos", "All files", "After job", "Share"]],
    done: "The owner knows what a customer portal should contain before building or buying one.",
    scale: "Simple Internal Tool, Local Service Operating System, or customer portal build."
  },
  {
    cat: "Planning",
    tag: "Checklist",
    title: "SOP & Checklist Pack",
    id: "sop-checklist-pack",
    price: "$150-$500",
    summary: "Simple standard operating procedures and checklists for repeat work so steps stop getting missed.",
    best: "Repeat shop, garage, service, quoting, install, cleanup, follow-up, or inspection tasks.",
    problem: "The same work gets done differently each time, which causes missed steps, rework, delays, or forgotten follow-up.",
    sends: "Process steps, photos, current notes, common mistakes, tools/materials, quality checks, and handoff points.",
    builds: ["Step-by-step SOP", "Field checklist", "Quality check list", "Missing-info checklist", "Owner review routine"],
    steps: [["Observe", "List how the work actually gets done."], ["Standardize", "Turn repeat steps into a clear order."], ["Check", "Add quality and missing-info checks."], ["Use", "Deliver print/share-ready checklists."]],
    out: [["Step", "Check", "Who", "Done?"], ["Before job", "Photos/dims", "Owner", "□"], ["During job", "Materials verified", "Worker", "□"], ["After job", "Photos/review", "Owner", "□"]],
    done: "Repeat work has a simple checklist that can be followed, shared, printed, or improved.",
    scale: "Shop Bottleneck Review, Simple Internal Tool, or Local Service Operating System."
  },
  {
    cat: "Operating System",
    tag: "Recurring plans",
    title: "Recurring Service Plan Setup",
    id: "recurring-service-plan-setup",
    price: "$199-$499",
    summary: "A simple recurring-service offer with plan levels, renewal timing, reminders, and customer wording.",
    best: "Service businesses that want repeat work, seasonal check-ins, maintenance plans, inspection plans, or scheduled cleanups.",
    problem: "The owner wants recurring work, but the plan, price, schedule, renewal language, and reminder process are not clear enough to sell.",
    sends: "Repeat service ideas, service intervals, price ideas, customer examples, current reminders, seasonal notes, and what is included/excluded.",
    builds: ["Plan menu", "Included/excluded scope", "Recurring price logic", "Reminder and renewal schedule", "Customer-facing plan wording"],
    steps: [["Define", "Choose which work should repeat."], ["Package", "Build simple plan levels and scope boundaries."], ["Schedule", "Set reminders, renewal timing, and follow-up rhythm."], ["Deliver", "Send the plan setup and customer wording."]],
    out: [["Plan", "Includes", "Interval", "Next"], ["Basic", "Inspection", "Quarterly", "Reminder"], ["Standard", "Service + report", "Monthly", "Schedule"], ["Seasonal", "Startup/shutdown", "Spring/Fall", "Renew"]],
    done: "The owner has a sellable recurring-service setup before buying service-agreement software.",
    scale: "Monthly System Tune-Up, Invoice & Payment Setup Pack, or Local Service Operating System."
  },
  {
    cat: "Operating System",
    tag: "Monthly help",
    title: "Monthly System Tune-Up",
    id: "monthly-system-tune-up",
    price: "$99-$250/month",
    summary: "Low-contact monthly cleanup for trackers, templates, follow-ups, files, and small system improvements.",
    best: "Owners who have a working tracker or system but need help keeping it clean and usable.",
    problem: "The system starts clean, then jobs, files, follow-ups, and templates slowly get messy again.",
    sends: "Current tracker, stuck jobs, new service changes, messy files, follow-up issues, template problems, and monthly priorities.",
    builds: ["Tracker cleanup", "Template updates", "Follow-up review", "File/status cleanup", "Monthly improvement notes"],
    steps: [["Review", "Look over the current system and stuck items."], ["Clean", "Fix messy statuses, templates, and follow-ups."], ["Update", "Adjust products, prices, forms, or fields as needed."], ["Report", "Send a short monthly tune-up summary."]],
    out: [["Area", "Cleaned", "Issue", "Next"], ["Tracker", "Statuses", "3 stuck jobs", "Follow up"], ["Quotes", "Template", "Price change", "Update"], ["Files", "Job folder", "Missing photos", "Request"]],
    done: "The system stays usable without the owner having to rebuild it or buy more software right away.",
    scale: "Ongoing operating support, internal dashboard improvements, or customer portal prep."
  }
];

if (typeof products !== "undefined" && typeof renderCatalog === "function") {
  products.push(...deeperProducts);
  renderCatalog();
}