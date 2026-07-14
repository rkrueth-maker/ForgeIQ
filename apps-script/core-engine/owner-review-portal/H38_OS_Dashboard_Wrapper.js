function h38RefreshOwnerDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dash = ss.getSheetByName('Dashboard');
  if (!dash) throw new Error('Dashboard tab not found.');

  var rows = [
    [
      "=COUNTIF('Backend Tasks'!F2:F,\"Open\")+COUNTIF('Portal Tasks'!J2:J,\"Open\")+COUNTIF('New Requests'!M2:M,\"Owner Approval Required\")+COUNTIF('Job Queue'!L2:L,\"Owner Approval Required\")+COUNTIF('Email Approval Queue'!K2:K,\"Owner Approval Required\")+COUNTIF('Quote Approval Queue'!I2:I,\"Owner Approval Required\")+COUNTIF('Output Queue'!I2:I,\"Owner Approval Required\")+COUNTIF('Follow-Up Queue'!H2:H,\"Owner Approval Required\")+COUNTIF('Social Approval Queue'!J2:J,\"Owner Approval Required\")+COUNTIF('Website Approval Queue'!I2:I,\"Owner Approval Required\")",
      'Live count of actionable records across backend, portal, and approval queues.'
    ],
    [
      "=COUNTIF('Backend Proof Log'!B2:B,TEXT(TODAY(),\"yyyy-mm-dd\")&\"*\")+COUNTIF('Proof Log'!B2:B,TEXT(TODAY(),\"yyyy-mm-dd\")&\"*\")",
      'Live count of proof records created today across both proof logs.'
    ],
    [
      "=COUNTIF('Email Approval Queue'!M2:M,\"Yes\")+COUNTIF('Quote Approval Queue'!K2:K,\"Yes\")+COUNTIF('Follow-Up Queue'!J2:J,\"Yes\")",
      'Live count of rows explicitly marked Send Allowed = Yes.'
    ],
    ["=COUNTIF('Output Queue'!K2:K,\"Yes\")", 'Live count of outputs explicitly marked Delivery Allowed = Yes.'],
    ["=COUNTIF('Social Approval Queue'!L2:L,\"Yes\")", 'Live count of social rows explicitly marked Publish Allowed = Yes.'],
    ["=COUNTIF('Website Approval Queue'!K2:K,\"Yes\")", 'Live count of website rows explicitly marked Publish Allowed = Yes.'],
    [
      "=COUNTIF('Backend Error Log'!A2:A,\"<>\")+COUNTIFS('Error Log'!A2:A,\"<>\",'Error Log'!J2:J,\"<>Resolved\",'Error Log'!J2:J,\"<>Closed\")",
      'Live count of backend errors plus unresolved portal errors.'
    ]
  ];

  for (var i = 0; i < rows.length; i++) {
    var rowNumber = i + 2;
    dash.getRange(rowNumber, 2).setFormula(rows[i][0]);
    dash.getRange(rowNumber, 6).setFormula('=TEXT(NOW(),"yyyy-mm-dd hh:mm:ss")&" CT"');
    dash.getRange(rowNumber, 7).setValue(rows[i][1]);
  }

  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert(
    'PASS — Owner Dashboard refreshed with live formulas.\n\n' +
    'No email sent.\n' +
    'No quote approved.\n' +
    'No payment requested.\n' +
    'No final delivery.\n' +
    'No website/social publish.\n' +
    'No trigger created.'
  );
}
