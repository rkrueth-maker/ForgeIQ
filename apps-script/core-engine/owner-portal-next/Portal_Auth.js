/** Firebase session verification and the only browser-to-portal RPC gateway. */
var H38_PORTAL_REQUEST_AUTH = null;

var H38_PORTAL_RPC_POLICY = Object.freeze({
  h38PortalBootstrap:'read', h38PortalClientSchema:'read', h38PortalExperienceControlCenter:'read',
  h38PortalSavedViews:'read', h38PortalHelpCenter:'read', h38PortalTasks:'read', h38PortalReports:'read',
  h38PortalList:'read', h38PortalWorkspace:'read', h38PortalJobWorkspace:'read', h38PortalCustomerWorkspace:'read',
  h38PortalRecordWorkspace:'read', h38PortalGlobalSearch:'read',
  h38PortalSaveView:'write', h38PortalDeleteSavedView:'write', h38PortalSaveBusinessRecord:'write',
  h38PortalQuickCreate:'write', h38PortalCreateQuoteFromCatalog:'write', h38PortalConvertAcceptedQuote:'write',
  h38PortalCreateInvoiceFromQuote:'write', h38PortalRecordPayment:'write', h38PortalRecordExpense:'write',
  h38PortalCreateCommunicationDraft:'write',
  h38PortalProofLog:'sensitiveRead', h38PortalErrorLog:'sensitiveRead', h38PortalAccountingCsv:'sensitiveRead',
  h38PortalEnvironmentStatus:'sensitiveRead',
  h38PortalTaskAction:'owner', h38PortalSelfTest:'owner', h38PortalProductionReadiness:'owner',
  h38PortalUserAccessList:'owner', h38PortalInviteUser:'owner', h38PortalUpdateUserAccess:'owner',
  h38PortalRemoveUserAccess:'owner'
});

var H38_PORTAL_ROLE_PERMISSIONS = Object.freeze({
  Owner:['read','write','sensitiveRead','owner'],
  Administrator:['read','write','sensitiveRead'],
  Staff:['read','write'],
  Viewer:['read']
});

function h38PortalFirebasePublicConfig_() {
  var required = {
    apiKey:H38_PORTAL_NEXT.FIREBASE_API_KEY,
    authDomain:H38_PORTAL_NEXT.FIREBASE_AUTH_DOMAIN,
    projectId:H38_PORTAL_NEXT.FIREBASE_PROJECT_ID
  };
  required.configured = !!(required.apiKey && required.authDomain && required.projectId);
  return JSON.stringify(required).replace(/</g, '\\u003c');
}

function h38PortalConfigureFirebaseAuthentication(input) {
  h38PortalAssertOwnerRole_();
  input = input || {};
  if (String(input.confirmation || '') !== 'CONFIGURE FIREBASE OWNER PORTAL AUTHENTICATION') throw new Error('CONFIGURATION HOLD — exact Firebase confirmation required.');
  var projectId = String(input.projectId || '').trim();
  var apiKey = String(input.apiKey || '').trim();
  var authDomain = String(input.authDomain || '').trim().toLowerCase();
  var sessionUrl = String(input.sessionUrl || '').trim();
  var userAdminUrl = String(input.userAdminUrl || '').trim();
  if (!/^[a-z][a-z0-9-]{4,29}$/.test(projectId)) throw new Error('CONFIGURATION HOLD — valid Firebase project ID required.');
  if (!/^AIza[A-Za-z0-9_-]{30,}$/.test(apiKey)) throw new Error('CONFIGURATION HOLD — valid Firebase Web API key required.');
  if (authDomain !== projectId + '.firebaseapp.com') throw new Error('CONFIGURATION HOLD — authDomain must match the Firebase project.');
  [sessionUrl,userAdminUrl].forEach(function(url){ if (!/^https:\/\/[a-z0-9-]+-[a-z0-9]+\.cloudfunctions\.net\/[A-Za-z0-9_-]+$/.test(url)) throw new Error('CONFIGURATION HOLD — valid deployed Cloud Function URL required.'); });
  PropertiesService.getScriptProperties().setProperties({
    H38_FIREBASE_PROJECT_ID:projectId,
    H38_FIREBASE_API_KEY:apiKey,
    H38_FIREBASE_AUTH_DOMAIN:authDomain,
    H38_FIREBASE_SESSION_URL:sessionUrl,
    H38_FIREBASE_USER_ADMIN_URL:userAdminUrl
  }, false);
  return {status:'PASS',projectId:projectId,authDomain:authDomain,sessionConfigured:true,userAdminConfigured:true,passwordStored:false,nextAction:'Create a new immutable Apps Script version and update the existing deployment.'};
}

function h38PortalRpc(idToken, method, args) {
  var token = String(idToken || '').trim();
  var name = String(method || '').trim();
  var policy = H38_PORTAL_RPC_POLICY[name];
  if (!policy) throw new Error('ACCESS HOLD — portal method is not allowlisted.');
  if (!Array.isArray(args)) args = [];
  if (args.length > 8) throw new Error('REQUEST HOLD — too many arguments.');
  H38_PORTAL_REQUEST_AUTH = h38PortalVerifyFirebaseSession_(token);
  h38PortalRequirePermission_(H38_PORTAL_REQUEST_AUTH, policy);
  var fn = globalThis[name];
  if (typeof fn !== 'function') throw new Error('CONFIGURATION HOLD — portal method unavailable.');
  try {
    return fn.apply(null, args);
  } finally {
    H38_PORTAL_REQUEST_AUTH = null;
  }
}

function h38PortalVerifyFirebaseSession_(idToken) {
  if (!idToken || idToken.length < 100 || idToken.length > 5000) throw new Error('AUTHENTICATION REQUIRED — sign in again.');
  if (!H38_PORTAL_NEXT.FIREBASE_SESSION_URL) throw new Error('CONFIGURATION HOLD — Firebase session verifier URL is missing.');
  var response = UrlFetchApp.fetch(H38_PORTAL_NEXT.FIREBASE_SESSION_URL, {
    method:'post', contentType:'application/json', muteHttpExceptions:true,
    headers:{Authorization:'Bearer ' + idToken}, payload:JSON.stringify({audience:'owner-portal'})
  });
  if (response.getResponseCode() !== 200) throw new Error('AUTHENTICATION HOLD — session is invalid, expired, revoked, disabled, or not invited.');
  var body;
  try { body = JSON.parse(response.getContentText()); } catch (error) { throw new Error('AUTHENTICATION HOLD — invalid verifier response.'); }
  var role = String(body.role || '');
  var status = String(body.status || '').toLowerCase();
  if (['Owner','Administrator','Staff','Viewer'].indexOf(role) < 0 || status !== 'active') throw new Error('ACCESS HOLD — user access is not active.');
  if (!body.uid || !body.email) throw new Error('AUTHENTICATION HOLD — incomplete verified identity.');
  return {uid:String(body.uid),email:String(body.email).toLowerCase(),role:role,status:status,idToken:idToken};
}

function h38PortalRequirePermission_(auth, permission) {
  var allowed = H38_PORTAL_ROLE_PERMISSIONS[auth.role] || [];
  if (allowed.indexOf(permission) < 0) throw new Error('ACCESS HOLD — ' + auth.role + ' does not have permission for this action.');
}

function h38PortalFirebaseAdminRequest_(action, data) {
  var auth = h38PortalAssertOwnerRole_();
  if (!H38_PORTAL_NEXT.FIREBASE_USER_ADMIN_URL) throw new Error('CONFIGURATION HOLD — Firebase user administration URL is missing.');
  var response = UrlFetchApp.fetch(H38_PORTAL_NEXT.FIREBASE_USER_ADMIN_URL, {
    method:'post', contentType:'application/json', muteHttpExceptions:true,
    headers:{Authorization:'Bearer ' + auth.idToken},
    payload:JSON.stringify({action:action,data:data || {}})
  });
  var body;
  try { body = JSON.parse(response.getContentText()); } catch (error) { body = {}; }
  if (response.getResponseCode() !== 200) throw new Error(body.error || 'USER ACCESS HOLD — secure user administration request failed.');
  return body;
}

function h38PortalUserAccessList() { return h38PortalFirebaseAdminRequest_('list', {}); }
function h38PortalInviteUser(input) { return h38PortalFirebaseAdminRequest_('invite', input || {}); }
function h38PortalUpdateUserAccess(input) { return h38PortalFirebaseAdminRequest_('update', input || {}); }
function h38PortalRemoveUserAccess(input) { return h38PortalFirebaseAdminRequest_('remove', input || {}); }
