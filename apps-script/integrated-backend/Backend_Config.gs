/** Highway 38 integrated backend. No credentials or customer data belong in source. */
var H38_BACKEND = Object.freeze({
  RELEASE: '2026-07-13-integrated-backend-v1',
  TIMEZONE: 'America/Chicago',
  SPREADSHEET_PROPERTY: 'H38_BACKEND_SPREADSHEET_ID',
  OWNER_EMAILS_PROPERTY: 'H38_BACKEND_OWNER_EMAILS',
  PUBLIC_INTAKE_ENABLED_PROPERTY: 'H38_PUBLIC_INTAKE_ENABLED',
  MAX_TEXT: 5000,
  MAX_ROWS: 1000,
  LIVE_EXTERNAL_ACTIONS_ENABLED: false,
  PRODUCT_IDS: ['H38-P001','H38-P002','H38-P003','H38-P004','H38-P005','H38-P006','H38-P007','H38-P008','H38-P009','H38-P010','H38-P011','H38-P012','H38-P013','H38-P014','H38-P015'],
  BUNDLE_IDS: ['H38-B001','H38-B002','H38-B003','H38-B004','H38-B005','H38-B006','H38-B007','H38-B008','H38-B009']
});

var H38_BACKEND_TABLES = Object.freeze({
  requests: {sheet:'Backend Requests', id:'Request ID', headers:['Request ID','Received Time','Idempotency Key','Status','Approval Status','Owner Decision','Name','Email','Phone','Preferred Contact','Desired Outcome','Product / Bundle ID','Problem','Finished Result','Files or Links','Project Details','Budget','Timing','Source','Privacy Classification','Lead ID','Customer ID','Job ID','Next Action','Created Time','Updated Time']},
  fulfillment: {sheet:'Backend Fulfillment', id:'Fulfillment ID', headers:['Fulfillment ID','Request ID','Customer ID','Job ID','Product / Bundle ID','Status','Inputs Complete','Scope Approved','Quote Status','Payment Status','Start Authorization','Deliverables','QA Status','Revisions Used','Revision Allowance','Final Delivery Status','Owner Decision','Drive Folder Link','Next Action','Created Time','Updated Time']},
  tasks: {sheet:'Backend Tasks', id:'Task ID', headers:['Task ID','Task Title','Task Type','Related ID','Priority','Status','Approval Requirement','Approval Status','Owner Decision','Assigned Action','Blocking Issue','Next Recommended Action','Created Time','Updated Time']},
  proof: {sheet:'Backend Proof Log', id:'Proof ID', headers:['Proof ID','Time','Actor','Source','Related ID','Action','Decision','Result','Evidence','Notes']},
  errors: {sheet:'Backend Error Log', id:'Error ID', headers:['Error ID','Time','Source','Related ID','Message','Stack','Payload Fingerprint']}
});

