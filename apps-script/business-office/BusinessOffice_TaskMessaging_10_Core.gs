/** Business Office — secure task assignment and provider-neutral customer messaging. */

var H38_TM_SHEETS = Object.freeze({
  TASKS: "BO Assigned Tasks",
  TASK_HISTORY: "BO Task History",
  MESSAGES: "BO Messages",
  MESSAGE_EVENTS: "BO Message Events",
  CONSENT: "BO SMS Consent",
  TEMPLATES: "BO Message Templates",
  USAGE: "BO Messaging Usage",
});

var H38_TM_HEADERS = Object.freeze({
  TASKS: [
    "Task ID",
    "Business ID",
    "Task Title",
    "Task Type",
    "Assigned User ID",
    "Assigned Role",
    "Assigned By User ID",
    "Priority",
    "Due Date",
    "Due Time",
    "Status",
    "Accepted Time",
    "Started Time",
    "Completed Time",
    "Cancelled Time",
    "Waiting Reason",
    "Blocking Issue",
    "Instructions",
    "Notes",
    "Reminder Date",
    "Reminder Time",
    "Reminder Status",
    "Linked Record Type",
    "Linked Record ID",
    "Customer ID",
    "Request ID",
    "Quote ID",
    "Work Order ID",
    "Job ID",
    "Invoice ID",
    "Payment ID",
    "Document ID",
    "Duplicate Key",
    "Created Time",
    "Updated Time",
    "Is Voided",
  ],
  TASK_HISTORY: [
    "Task History ID",
    "Business ID",
    "Task ID",
    "Event Type",
    "Previous Status",
    "New Status",
    "Previous Assigned User ID",
    "New Assigned User ID",
    "Previous Assigned Role",
    "New Assigned Role",
    "Notes",
    "Actor User ID",
    "Actor Email",
    "Event Time",
  ],
  MESSAGES: [
    "Message ID",
    "Business ID",
    "Direction",
    "Channel",
    "Provider",
    "Provider Message ID",
    "Conversation Key",
    "Customer ID",
    "Phone Number",
    "Normalized Phone",
    "Message Body",
    "Template ID",
    "Status",
    "Approval Status",
    "Send Allowed",
    "Approved By User ID",
    "Approved By Email",
    "Approved Time",
    "Sent Time",
    "Delivered Time",
    "Failed Time",
    "Received Time",
    "Opted Out Time",
    "Linked Record Type",
    "Linked Record ID",
    "Task ID",
    "Request ID",
    "Quote ID",
    "Work Order ID",
    "Job ID",
    "Invoice ID",
    "Payment ID",
    "Document ID",
    "Consent ID",
    "Duplicate Key",
    "Retry Locked",
    "Provider Status",
    "Provider Error Code",
    "Provider Error Message",
    "Provider Price",
    "Provider Price Unit",
    "Created By User ID",
    "Created Time",
    "Updated Time",
    "Notes",
    "Is Voided",
  ],
  MESSAGE_EVENTS: [
    "Message Event ID",
    "Business ID",
    "Message ID",
    "Event Type",
    "Provider Status",
    "Provider Message ID",
    "Result",
    "Evidence",
    "Actor User ID",
    "Actor Email",
    "Event Time",
  ],
  CONSENT: [
    "Consent ID",
    "Business ID",
    "Customer ID",
    "Phone Number",
    "Normalized Phone",
    "Consent Status",
    "Consent Scope",
    "Consent Source",
    "Consent Date",
    "Consent Evidence",
    "Opt Out Date",
    "Opt Out Source",
    "Recorded By User ID",
    "Created Time",
    "Updated Time",
    "Notes",
    "Is Voided",
  ],
  TEMPLATES: [
    "Template ID",
    "Business ID",
    "Template Name",
    "Category",
    "Message Body",
    "Required Fields",
    "Status",
    "Created By User ID",
    "Created Time",
    "Updated Time",
    "Notes",
    "Is Voided",
  ],
  USAGE: [
    "Usage ID",
    "Business ID",
    "Message ID",
    "Provider",
    "Direction",
    "Segments",
    "Provider Price",
    "Provider Price Unit",
    "Carrier Fee Estimate",
    "Recorded Time",
    "Notes",
  ],
});

function h38TmNow_() {
  return Utilities.formatDate(
    new Date(),
    boPackValue_("business.timeZone", "America/Chicago"),
    "yyyy-MM-dd HH:mm:ss",
  );
}
function h38TmId_(prefix) {
  return (
    String(prefix || "TM") +
    "-" +
    Utilities.formatDate(
      new Date(),
      boPackValue_("business.timeZone", "America/Chicago"),
      "yyyyMMdd-HHmmss",
    ) +
    "-" +
    Utilities.getUuid().slice(0, 8).toUpperCase()
  );
}
function h38TmHash_(value) {
  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value || ""),
    Utilities.Charset.UTF_8,
  )
    .map(function (byte) {
      return ("0" + (byte < 0 ? byte + 256 : byte).toString(16)).slice(-2);
    })
    .join("");
}
function h38TmNormalizePhone_(value) {
  var digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) digits = "1" + digits;
  boAssert_(
    digits.length >= 11 && digits.length <= 15,
    "A valid customer mobile number is required.",
  );
  return "+" + digits;
}
function h38TmSheetHeaders_(key) {
  return H38_TM_HEADERS[key].slice();
}
function h38TmSheet_(key) {
  var name = H38_TM_SHEETS[key],
    sheet = boGetSpreadsheet_().getSheetByName(name);
  boAssert_(sheet, "Task and messaging storage is not initialized: " + name);
  return sheet;
}
function h38TmUserRole_(user) {
  var role = boGetRole_(user["Role ID"]);
  return role ? role["Role Name"] : "";
}
function h38TmManageAll_(user) {
  return ["Owner", "Administrator"].indexOf(h38TmUserRole_(user)) >= 0;
}
function h38TmCanWrite_(user) {
  return h38TmUserRole_(user) !== "Viewer";
}
function h38TmRequireModule_(moduleKey, action) {
  var user = boGetCurrentUser_(),
    role = h38TmUserRole_(user),
    write = String(action || "View") !== "View",
    allowed = false;
  if (moduleKey === "assignedTasks") allowed = true;
  else if (moduleKey === "messaging")
    allowed = ["Owner", "Administrator", "Staff"].indexOf(role) >= 0;
  else if (moduleKey === "smsConsent")
    allowed = ["Owner", "Administrator", "Staff"].indexOf(role) >= 0;
  else if (moduleKey === "messageTemplates")
    allowed = write ? ["Owner", "Administrator"].indexOf(role) >= 0 : true;
  boAssert_(
    allowed,
    "Your role does not allow " + action + " access to " + moduleKey + ".",
  );
  if (write) boAssert_(h38TmCanWrite_(user), "Viewer access is read-only.");
  return user;
}
function h38TmEnsureSchema_() {
  var user = boGetCurrentUser_(),
    ss = boGetSpreadsheet_(),
    created = [];
  Object.keys(H38_TM_SHEETS).forEach(function (key) {
    var sheet = ss.getSheetByName(H38_TM_SHEETS[key]),
      headers = h38TmSheetHeaders_(key);
    if (!sheet) {
      boAssert_(
        h38TmManageAll_(user),
        "An Owner or Administrator must initialize task and messaging storage first.",
      );
      sheet = ss.insertSheet(H38_TM_SHEETS[key]);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      created.push(H38_TM_SHEETS[key]);
    } else {
      var existing = sheet.getLastColumn()
        ? sheet
            .getRange(1, 1, 1, sheet.getLastColumn())
            .getDisplayValues()[0]
            .map(boNormalizeText_)
        : [];
      var missing = headers.filter(function (header) {
        return existing.indexOf(header) < 0;
      });
      if (missing.length) {
        boAssert_(
          h38TmManageAll_(user),
          "Task and messaging schema update requires Owner or Administrator access.",
        );
        sheet
          .getRange(1, existing.length + 1, 1, missing.length)
          .setValues([missing]);
      }
    }
  });
  if (created.length)
    boProof_(
      "INITIALIZE_TASK_MESSAGING",
      "System",
      boGetBusinessId_(),
      "PASS",
      "Created private sheets: " + created.join(", "),
      user.Email,
    );
  return { status: "PASS", created: created };
}
function h38TmRead_(key, options) {
  h38TmEnsureSchema_();
  var opts = options || {},
    sheet = h38TmSheet_(key),
    values = sheet.getDataRange().getDisplayValues();
  if (!values.length) return [];
  var headers = values[0].map(boNormalizeText_);
  return values
    .slice(1)
    .filter(function (row) {
      return row.some(function (value) {
        return value !== "";
      });
    })
    .map(function (row, index) {
      var record = { __rowNumber: index + 2 };
      headers.forEach(function (header, column) {
        if (header) record[header] = row[column];
      });
      return record;
    })
    .filter(function (row) {
      return !row["Business ID"] || row["Business ID"] === boGetBusinessId_();
    })
    .filter(function (row) {
      return (
        opts.includeVoided ||
        !(row["Is Voided"] === "Yes" || row.Status === "Voided")
      );
    });
}
function h38TmFind_(key, id) {
  var headers = h38TmSheetHeaders_(key),
    primary = headers[0],
    row = h38TmRead_(key, { includeVoided: true }).find(function (item) {
      return item[primary] === id;
    });
  boAssert_(
    row,
    "The selected record was not found or is outside this business.",
  );
  return row;
}
function h38TmWriteRow_(key, record, rowNumber) {
  var sheet = h38TmSheet_(key),
    headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getDisplayValues()[0]
      .map(boNormalizeText_),
    row = headers.map(function (header) {
      return Object.prototype.hasOwnProperty.call(record, header)
        ? record[header]
        : "";
    });
  if (rowNumber)
    sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
  else sheet.appendRow(row);
  return record;
}
function h38TmAppend_(key, values) {
  var headers = h38TmSheetHeaders_(key),
    primary = headers[0],
    record = Object.assign({}, values || {});
  record["Business ID"] = boGetBusinessId_();
  if (!record[primary])
    record[primary] = h38TmId_(
      primary.replace(/ ID$/, "").replace(/\s+/g, "-").toUpperCase(),
    );
  if (headers.indexOf("Created Time") >= 0 && !record["Created Time"])
    record["Created Time"] = h38TmNow_();
  if (headers.indexOf("Updated Time") >= 0)
    record["Updated Time"] = h38TmNow_();
  h38TmWriteRow_(key, record, 0);
  boAudit_(
    "CREATE",
    H38_TM_SHEETS[key],
    record[primary],
    {},
    record,
    "Task and messaging",
  );
  return record;
}
function h38TmUpdate_(key, id, patch) {
  var before = h38TmFind_(key, id),
    record = Object.assign({}, before, patch || {});
  delete record.__rowNumber;
  record["Business ID"] = boGetBusinessId_();
  if (Object.prototype.hasOwnProperty.call(record, "Updated Time"))
    record["Updated Time"] = h38TmNow_();
  h38TmWriteRow_(key, record, before.__rowNumber);
  boAudit_(
    "UPDATE",
    H38_TM_SHEETS[key],
    id,
    before,
    record,
    "Task and messaging",
  );
  return record;
}
function h38TmTaskVisible_(row, user) {
  if (h38TmManageAll_(user)) return true;
  var role = h38TmUserRole_(user);
  return (
    row["Assigned User ID"] === user["User ID"] ||
    row["Assigned Role"] === role ||
    row["Assigned By User ID"] === user["User ID"]
  );
}
function h38TmMessageVisible_(row, user) {
  if (h38TmManageAll_(user)) return true;
  return (
    row["Created By User ID"] === user["User ID"] ||
    row["Approved By User ID"] === user["User ID"]
  );
}
function h38TmRequireTaskAccess_(row, user, write) {
  boAssert_(
    h38TmTaskVisible_(row, user),
    "Your role cannot access this assigned task.",
  );
  if (write) boAssert_(h38TmCanWrite_(user), "Viewer access is read-only.");
  return true;
}
function h38TmRequireMessageAccess_(row, user, write) {
  boAssert_(
    h38TmMessageVisible_(row, user),
    "Your role cannot access this message.",
  );
  if (write) boAssert_(h38TmCanWrite_(user), "Viewer access is read-only.");
  return true;
}
function h38TmUserById_(userId) {
  return (
    boReadTable_(H38_BO_SHEETS.USERS, { includeVoided: true }).find(
      function (row) {
        return (
          row["User ID"] === userId &&
          row.Status === "Active" &&
          row["Business ID"] === boGetBusinessId_()
        );
      },
    ) || null
  );
}
function h38TmRoleExists_(roleName) {
  return boReadTable_(H38_BO_SHEETS.ROLES, { includeVoided: true }).some(
    function (row) {
      return row["Role Name"] === roleName && row.Active === "Yes";
    },
  );
}
function h38TmValidateLinkedRecord_(type, id) {
  type = boNormalizeText_(type);
  id = boNormalizeText_(id);
  if (!type && !id) return null;
  boAssert_(type && id, "Linked record type and ID must be supplied together.");
  var map = {
    Customer: "customers",
    Request: "requests",
    Quote: "quotes",
    "Work Order": "workOrders",
    Job: "jobs",
    Invoice: "invoices",
    Payment: "payments",
    Document: "documents",
    Task: "assignedTasks",
  };
  var module = map[type];
  boAssert_(module, "Unsupported linked record type: " + type);
  if (module === "assignedTasks") return h38TmFind_("TASKS", id);
  boAssertModuleEnabled_(module);
  var sheet = H38_BO_MODULES[module];
  boRequirePermission_(sheet, "View");
  return boFindRecord_(sheet, id, { includeVoided: true }).record;
}
function h38TmTaskHistory_(task, before, eventType, notes, user) {
  return h38TmAppend_("TASK_HISTORY", {
    "Task ID": task["Task ID"],
    "Event Type": eventType,
    "Previous Status": before ? before.Status : "",
    "New Status": task.Status || "",
    "Previous Assigned User ID": before ? before["Assigned User ID"] : "",
    "New Assigned User ID": task["Assigned User ID"] || "",
    "Previous Assigned Role": before ? before["Assigned Role"] : "",
    "New Assigned Role": task["Assigned Role"] || "",
    Notes: notes || "",
    "Actor User ID": user["User ID"],
    "Actor Email": user.Email,
    "Event Time": h38TmNow_(),
  });
}
function h38TmTaskStatus_(status) {
  var allowed = [
    "Open",
    "Accepted",
    "Started",
    "Waiting",
    "Blocked",
    "Completed",
    "Cancelled",
  ];
  status = boNormalizeText_(status) || "Open";
  boAssert_(allowed.indexOf(status) >= 0, "Unsupported task status: " + status);
  return status;
}
function h38TmTaskDerivedStatus_(row) {
  if (["Completed", "Cancelled"].indexOf(row.Status) >= 0) return row.Status;
  var now = h38TmNow_(),
    today = now.slice(0, 10),
    dueDate = boNormalizeText_(row["Due Date"]),
    dueTime = boNormalizeText_(row["Due Time"]);
  if (
    dueDate &&
    ((dueTime && dueDate + " " + dueTime < now) ||
      (!dueTime && dueDate < today))
  )
    return "Overdue";
  return row.Status;
}
function h38TmReminderStatus_(row) {
  if (["Completed", "Cancelled"].indexOf(row.Status) >= 0) return "Closed";
  if (h38TmTaskDerivedStatus_(row) === "Overdue") return "Overdue";
  var date = boNormalizeText_(row["Reminder Date"]),
    time = boNormalizeText_(row["Reminder Time"]);
  if (!date) return "Not Scheduled";
  return date + (time ? " " + time : "") <= h38TmNow_() ? "Due" : "Scheduled";
}
function h38TmListTasks_(options) {
  var user = boGetCurrentUser_();
  boAssertModuleEnabled_("assignedTasks");
  h38TmRequireModule_("assignedTasks", "View");
  var opts = options || {},
    rows = h38TmRead_("TASKS", {}).filter(function (row) {
      return h38TmTaskVisible_(row, user);
    });
  rows = rows.map(function (row) {
    var out = Object.assign({}, row);
    out["Display Status"] = h38TmTaskDerivedStatus_(row);
    out["Reminder Status"] = h38TmReminderStatus_(row);
    return out;
  });
  var filters = opts.filters || {};
  Object.keys(filters).forEach(function (field) {
    var expected = boNormalizeText_(filters[field]);
    if (expected)
      rows = rows.filter(function (row) {
        return boNormalizeText_(row[field]) === expected;
      });
  });
  var query = boNormalizeText_(opts.query).toLowerCase();
  if (query)
    rows = rows.filter(function (row) {
      return Object.keys(row).some(function (key) {
        return (
          key !== "__rowNumber" &&
          String(row[key] || "")
            .toLowerCase()
            .indexOf(query) >= 0
        );
      });
    });
  rows.sort(function (a, b) {
    var terminalA = /^(Completed|Cancelled)$/.test(a.Status) ? 1 : 0,
      terminalB = /^(Completed|Cancelled)$/.test(b.Status) ? 1 : 0;
    if (terminalA !== terminalB) return terminalA - terminalB;
    var priority = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
    var ap = Object.prototype.hasOwnProperty.call(priority, a.Priority)
        ? priority[a.Priority]
        : 2,
      bp = Object.prototype.hasOwnProperty.call(priority, b.Priority)
        ? priority[b.Priority]
        : 2;
    return (
      ap - bp ||
      String(a["Due Date"] || "9999").localeCompare(
        String(b["Due Date"] || "9999"),
      )
    );
  });
  return rows.slice(0, Math.min(Number(opts.limit || 250), 1000));
}
function h38TmSaveTask_(recordId, values) {
  var user = boGetCurrentUser_();
  boAssertModuleEnabled_("assignedTasks");
  h38TmRequireModule_("assignedTasks", recordId ? "Edit" : "Create");
  boAssert_(h38TmCanWrite_(user), "Viewer access is read-only.");
  var input = Object.assign({}, values || {}),
    before = recordId ? h38TmFind_("TASKS", recordId) : null;
  if (before) h38TmRequireTaskAccess_(before, user, true);
  var assignedUser = boNormalizeText_(
      input["Assigned User ID"] || (before && before["Assigned User ID"]),
    ),
    assignedRole = boNormalizeText_(
      input["Assigned Role"] || (before && before["Assigned Role"]),
    );
  boAssert_(assignedUser || assignedRole, "Assign the task to a user or role.");
  if (assignedUser)
    boAssert_(
      h38TmUserById_(assignedUser),
      "The assigned user is not active in this business.",
    );
  if (assignedRole)
    boAssert_(
      h38TmRoleExists_(assignedRole),
      "The assigned role is not active.",
    );
  if (!h38TmManageAll_(user)) {
    boAssert_(
      !before || before["Assigned User ID"] === assignedUser,
      "Only an Owner or Administrator may reassign another user.",
    );
    boAssert_(
      assignedUser === user["User ID"] || assignedRole === h38TmUserRole_(user),
      "You may only assign work to yourself or your current role.",
    );
  }
  var linkedType = boNormalizeText_(
      input["Linked Record Type"] || (before && before["Linked Record Type"]),
    ),
    linkedId = boNormalizeText_(
      input["Linked Record ID"] || (before && before["Linked Record ID"]),
    );
  h38TmValidateLinkedRecord_(linkedType, linkedId);
  var payload = Object.assign({}, before || {}, input);
  delete payload.__rowNumber;
  payload["Task Title"] = boNormalizeText_(payload["Task Title"]);
  boAssert_(payload["Task Title"], "Task title is required.");
  payload.Priority =
    ["Urgent", "High", "Normal", "Low"].indexOf(payload.Priority) >= 0
      ? payload.Priority
      : "Normal";
  payload.Status = h38TmTaskStatus_(payload.Status);
  payload["Assigned User ID"] = assignedUser;
  payload["Assigned Role"] = assignedRole;
  payload["Assigned By User ID"] = before
    ? before["Assigned By User ID"]
    : user["User ID"];
  payload["Duplicate Key"] = h38TmHash_(
    [
      payload["Task Title"],
      assignedUser,
      assignedRole,
      linkedType,
      linkedId,
      payload["Due Date"],
    ].join("|"),
  );
  var duplicates = h38TmRead_("TASKS", { includeVoided: true }).filter(
    function (row) {
      return (
        row["Duplicate Key"] === payload["Duplicate Key"] &&
        row["Task ID"] !== recordId &&
        !/^(Completed|Cancelled|Voided)$/.test(row.Status)
      );
    },
  );
  boAssert_(
    !duplicates.length,
    "Duplicate protection blocked this task. Existing task: " +
      (duplicates.length ? duplicates[0]["Task ID"] : ""),
  );
  if (payload.Status === "Accepted" && !payload["Accepted Time"])
    payload["Accepted Time"] = h38TmNow_();
  if (payload.Status === "Started" && !payload["Started Time"])
    payload["Started Time"] = h38TmNow_();
  if (payload.Status === "Completed" && !payload["Completed Time"])
    payload["Completed Time"] = h38TmNow_();
  if (payload.Status === "Cancelled" && !payload["Cancelled Time"])
    payload["Cancelled Time"] = h38TmNow_();
  var saved = recordId
    ? h38TmUpdate_("TASKS", recordId, payload)
    : h38TmAppend_("TASKS", payload);
  h38TmTaskHistory_(
    saved,
    before,
    before ? "UPDATED" : "CREATED",
    payload.Notes || "",
    user,
  );
  boProof_(
    "TASK_" + (before ? "UPDATE" : "CREATE"),
    "Task",
    saved["Task ID"],
    "PASS",
    "Internal assignment only; no customer action.",
    user.Email,
  );
  return saved;
}
function h38TmTransitionTask_(taskId, status, notes) {
  var user = boGetCurrentUser_(),
    before = h38TmFind_("TASKS", taskId);
  h38TmRequireTaskAccess_(before, user, true);
  status = h38TmTaskStatus_(status);
  var patch = {
    Status: status,
    Notes: [before.Notes, boNormalizeText_(notes)].filter(Boolean).join(" | "),
  };
  if (status === "Accepted") patch["Accepted Time"] = h38TmNow_();
  if (status === "Started") patch["Started Time"] = h38TmNow_();
  if (status === "Completed") patch["Completed Time"] = h38TmNow_();
  if (status === "Cancelled") patch["Cancelled Time"] = h38TmNow_();
  var saved = h38TmUpdate_("TASKS", taskId, patch);
  h38TmTaskHistory_(saved, before, "STATUS_CHANGE", notes || "", user);
  boProof_(
    "TASK_STATUS",
    "Task",
    taskId,
    "PASS",
    before.Status + " → " + status,
    user.Email,
  );
  return saved;
}
function h38TmConsentForPhone_(phone) {
  var normalized = h38TmNormalizePhone_(phone),
    rows = h38TmRead_("CONSENT", { includeVoided: true })
      .filter(function (row) {
        return (
          row["Normalized Phone"] === normalized && row["Is Voided"] !== "Yes"
        );
      })
      .sort(function (a, b) {
        return String(b["Updated Time"]).localeCompare(
          String(a["Updated Time"]),
        );
      });
  return rows[0] || null;
}
function h38TmSaveConsent_(recordId, values) {
  var user = boGetCurrentUser_();
  boAssertModuleEnabled_("smsConsent");
  h38TmRequireModule_("smsConsent", recordId ? "Edit" : "Create");
  boAssert_(h38TmCanWrite_(user), "Viewer access is read-only.");
  var before = recordId ? h38TmFind_("CONSENT", recordId) : null,
    input = Object.assign({}, before || {}, values || {});
  delete input.__rowNumber;
  input["Normalized Phone"] = h38TmNormalizePhone_(input["Phone Number"]);
  input["Consent Status"] =
    boNormalizeText_(input["Consent Status"]) || "Pending";
  boAssert_(
    ["Pending", "Consented", "Opted Out", "Revoked"].indexOf(
      input["Consent Status"],
    ) >= 0,
    "Unsupported consent status.",
  );
  if (input["Consent Status"] === "Consented" && !input["Consent Date"])
    input["Consent Date"] = h38TmNow_();
  if (
    ["Opted Out", "Revoked"].indexOf(input["Consent Status"]) >= 0 &&
    !input["Opt Out Date"]
  )
    input["Opt Out Date"] = h38TmNow_();
  input["Recorded By User ID"] = before
    ? before["Recorded By User ID"]
    : user["User ID"];
  var saved = recordId
    ? h38TmUpdate_("CONSENT", recordId, input)
    : h38TmAppend_("CONSENT", input);
  boProof_(
    "SMS_CONSENT",
    "Consent",
    saved["Consent ID"],
    "PASS",
    saved["Consent Status"] + " / " + saved["Consent Source"],
    user.Email,
  );
  return saved;
}
function h38TmOptOut_(phone, source, messageId) {
  var normalized = h38TmNormalizePhone_(phone),
    existing = h38TmConsentForPhone_(normalized),
    user = boGetCurrentUser_(),
    payload = {
      "Customer ID": existing ? existing["Customer ID"] : "",
      "Phone Number": phone,
      "Normalized Phone": normalized,
      "Consent Status": "Opted Out",
      "Consent Scope": existing ? existing["Consent Scope"] : "SMS",
      "Consent Source": existing ? existing["Consent Source"] : "",
      "Consent Date": existing ? existing["Consent Date"] : "",
      "Consent Evidence": existing ? existing["Consent Evidence"] : "",
      "Opt Out Date": h38TmNow_(),
      "Opt Out Source": source || "Customer reply",
      "Recorded By User ID": user["User ID"],
      Notes:
        "Opt-out enforced" + (messageId ? " from message " + messageId : ""),
    };
  return existing
    ? h38TmUpdate_("CONSENT", existing["Consent ID"], payload)
    : h38TmAppend_("CONSENT", payload);
}
function h38TmListModule_(key, options, visibility) {
  var user = boGetCurrentUser_(),
    rows = h38TmRead_(key, {});
  if (visibility)
    rows = rows.filter(function (row) {
      return visibility(row, user);
    });
  var opts = options || {},
    query = boNormalizeText_(opts.query).toLowerCase();
  if (query)
    rows = rows.filter(function (row) {
      return Object.keys(row).some(function (field) {
        return (
          field !== "__rowNumber" &&
          String(row[field] || "")
            .toLowerCase()
            .indexOf(query) >= 0
        );
      });
    });
  var filters = opts.filters || {};
  Object.keys(filters).forEach(function (field) {
    if (filters[field])
      rows = rows.filter(function (row) {
        return String(row[field] || "") === String(filters[field]);
      });
  });
  return rows.slice(0, Math.min(Number(opts.limit || 250), 1000));
}
