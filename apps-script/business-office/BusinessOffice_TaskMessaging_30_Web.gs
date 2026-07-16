/** Business Office — task and messaging module definitions and unified-app endpoints. */

function h38TmDefinitions_() {
  return {
    assignedTasks: {
      title: "My Tasks",
      primaryKey: "Task ID",
      fields: [
        "Task Title",
        "Task Type",
        "Assigned User ID",
        "Assigned Role",
        "Priority",
        "Due Date",
        "Due Time",
        "Status",
        "Display Status",
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
      ],
    },
    messaging: {
      title: "Text Messaging",
      primaryKey: "Message ID",
      fields: [
        "Direction",
        "Phone Number",
        "Message Body",
        "Customer ID",
        "Template ID",
        "Status",
        "Approval Status",
        "Send Allowed",
        "Provider Status",
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
        "Notes",
      ],
    },
    smsConsent: {
      title: "SMS Consent",
      primaryKey: "Consent ID",
      fields: [
        "Customer ID",
        "Phone Number",
        "Consent Status",
        "Consent Scope",
        "Consent Source",
        "Consent Date",
        "Consent Evidence",
        "Opt Out Date",
        "Opt Out Source",
        "Notes",
      ],
    },
    messageTemplates: {
      title: "Message Templates",
      primaryKey: "Template ID",
      fields: [
        "Template Name",
        "Category",
        "Message Body",
        "Required Fields",
        "Status",
        "Notes",
      ],
    },
  };
}
function h38TmModule_(moduleKey, options) {
  var user = boGetCurrentUser_(),
    defs = h38TmDefinitions_(),
    def = defs[moduleKey];
  boAssert_(def, "Unsupported task or messaging module.");
  boAssertModuleEnabled_(moduleKey);
  var rows;
  if (moduleKey === "assignedTasks") rows = h38TmListTasks_(options);
  else if (moduleKey === "messaging") {
    h38TmRequireModule_("messaging", "View");
    rows = h38TmListModule_("MESSAGES", options, h38TmMessageVisible_);
  } else if (moduleKey === "smsConsent") {
    h38TmRequireModule_("smsConsent", "View");
    rows = h38TmListModule_(
      "CONSENT",
      options,
      h38TmManageAll_(user)
        ? null
        : function (row) {
            return !!row;
          },
    );
  } else {
    h38TmRequireModule_("messageTemplates", "View");
    rows = h38TmListModule_("TEMPLATES", options, null);
  }
  return {
    status: "PASS",
    module: moduleKey,
    definition: def,
    rows: rows,
    count: rows.length,
    boundary: boApprovalNotice_(),
    externalActionsEnabled: false,
    ownerApprovalRequired: true,
    providerStatus: h38TmProviderStatus_(),
    user: {
      id: user["User ID"],
      role: h38TmUserRole_(user),
      manageAll: h38TmManageAll_(user),
    },
  };
}
function h38TmWorkspace_(moduleKey, recordId) {
  var user = boGetCurrentUser_(),
    defs = h38TmDefinitions_(),
    def = defs[moduleKey];
  boAssert_(def, "Unsupported task or messaging module.");
  h38TmRequireModule_(moduleKey, "View");
  var primary,
    related = {},
    timeline = [];
  if (moduleKey === "assignedTasks") {
    primary = h38TmFind_("TASKS", recordId);
    h38TmRequireTaskAccess_(primary, user, false);
    timeline = h38TmRead_("TASK_HISTORY", { includeVoided: true }).filter(
      function (row) {
        return row["Task ID"] === recordId;
      },
    );
    related.messages = h38TmRead_("MESSAGES", {}).filter(function (row) {
      return row["Task ID"] === recordId && h38TmMessageVisible_(row, user);
    });
  } else if (moduleKey === "messaging") {
    primary = h38TmFind_("MESSAGES", recordId);
    h38TmRequireMessageAccess_(primary, user, false);
    timeline = h38TmRead_("MESSAGE_EVENTS", { includeVoided: true }).filter(
      function (row) {
        return row["Message ID"] === recordId;
      },
    );
    if (primary["Task ID"])
      related.assignedTasks = h38TmRead_("TASKS", {}).filter(function (row) {
        return (
          row["Task ID"] === primary["Task ID"] && h38TmTaskVisible_(row, user)
        );
      });
  } else if (moduleKey === "smsConsent")
    primary = h38TmFind_("CONSENT", recordId);
  else primary = h38TmFind_("TEMPLATES", recordId);
  return {
    status: "PASS",
    module: moduleKey,
    primary: primary,
    related: related,
    timeline: timeline,
    boundary: boApprovalNotice_(),
    externalActionsEnabled: false,
    ownerApprovalRequired: true,
    providerStatus: h38TmProviderStatus_(),
  };
}
function h38TmSave_(moduleKey, recordId, values) {
  if (moduleKey === "assignedTasks") return h38TmSaveTask_(recordId, values);
  if (moduleKey === "messaging") return h38TmSaveMessage_(recordId, values);
  if (moduleKey === "smsConsent") return h38TmSaveConsent_(recordId, values);
  if (moduleKey === "messageTemplates")
    return h38TmSaveTemplate_(recordId, values);
  throw new Error("Unsupported task or messaging module.");
}

function h38PortalTaskMessagingDefinitions() {
  return h38TmDefinitions_();
}
function h38PortalTaskMessagingModule(moduleKey, options) {
  return h38TmModule_(moduleKey, options || {});
}
function h38PortalTaskMessagingWorkspace(moduleKey, recordId) {
  return h38TmWorkspace_(moduleKey, recordId);
}
function h38PortalTaskMessagingSave(moduleKey, recordId, values) {
  return h38TmSave_(moduleKey, recordId || "", values || {});
}
function h38PortalTaskTransition(taskId, status, notes) {
  return h38TmTransitionTask_(taskId, status, notes || "");
}
function h38PortalMessagingDecision(messageId, decision, notes) {
  return h38TmApproveMessage_(messageId, decision, notes || "");
}
function h38PortalMessagingSend(messageId) {
  return h38TmSendMessage_(messageId);
}
function h38PortalMessagingSyncInbound() {
  return h38TmSyncInbound_();
}
function h38PortalMessagingSyncStatus(messageId) {
  return h38TmSyncMessageStatus_(messageId);
}
function h38PortalMessagingConvertReplyToTask(messageId, values) {
  return h38TmConvertReplyToTask_(messageId, values || {});
}
function h38PortalMessagingProviderStatus() {
  boGetCurrentUser_();
  return h38TmProviderStatus_();
}
function h38PortalMessagingSubmitReview(messageId, notes) {
  return h38TmSubmitMessageForReview_(messageId, notes || "");
}
function h38PortalMessagingUsage() {
  var user = boGetCurrentUser_();
  boAssert_(
    h38TmManageAll_(user),
    "Owner or Administrator access is required.",
  );
  return h38TmUsageSummary_();
}
function h38PortalTaskMessagingAssignees() {
  var user = boGetCurrentUser_(),
    manage = h38TmManageAll_(user),
    role = h38TmUserRole_(user),
    users = boReadTable_(H38_BO_SHEETS.USERS, { includeVoided: true })
      .filter(function (row) {
        return (
          row.Status === "Active" &&
          row["Business ID"] === boGetBusinessId_() &&
          (manage || row["User ID"] === user["User ID"])
        );
      })
      .map(function (row) {
        return {
          id: row["User ID"],
          name: row["Display Name"] || row.Email,
          roleId: row["Role ID"],
        };
      }),
    roles = boReadTable_(H38_BO_SHEETS.ROLES, { includeVoided: true })
      .filter(function (row) {
        return row.Active === "Yes" && (manage || row["Role Name"] === role);
      })
      .map(function (row) {
        return { id: row["Role ID"], name: row["Role Name"] };
      });
  return {
    status: "PASS",
    users: users,
    roles: roles,
    currentUserId: user["User ID"],
    currentRole: role,
    manageAll: manage,
  };
}
