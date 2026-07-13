#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let passed=0,failed=0;
function check(name,condition){if(condition){passed++;console.log(`PASS ${name}`);}else{failed++;console.error(`FAIL ${name}`);}}
const auth=read('apps-script/core-engine/owner-portal-next/Portal_Auth.js');
const repo=read('apps-script/core-engine/owner-portal-next/Portal_Repository.js');
const index=read('apps-script/core-engine/owner-portal-next/Portal_Index.html');
const client=read('apps-script/core-engine/owner-portal-next/Portal_Experience_Client_Core.html');
const authClient=read('apps-script/core-engine/owner-portal-next/Portal_Auth_Client.html');
const userClient=read('apps-script/core-engine/owner-portal-next/Portal_User_Access_Client.html');
const fn=read('firebase/functions/index.js');
const policy=read('firebase/functions/policy.js');
const rules=read('firebase/firestore.rules');
const manifest=JSON.parse(read('apps-script/core-engine/owner-portal-next/appsscript.json'));
for(const [name,source] of [['Portal_Auth.js',auth],['Portal_Repository.js',repo],['Portal_Auth_Client.html',authClient],['Portal_User_Access_Client.html',userClient]]){
  try{new vm.Script(source);check(`${name} parses`,true);}catch(error){console.error(error.message);check(`${name} parses`,false);}
}
check('browser calls one authenticated RPC gateway',/\.h38PortalRpc\(token,name,args\)/.test(client));
check('raw direct browser method calls removed',!new RegExp('google\\.script\\.run[^\\n]+\\[name\\]').test(client));
check('ID token verified by external trusted function',/H38_FIREBASE_SESSION_URL/.test(auth)&&/Authorization:'Bearer ' \+ idToken/.test(auth));
check('RPC methods explicitly allowlisted',/H38_PORTAL_RPC_POLICY/.test(auth)&&/portal method is not allowlisted/.test(auth));
for(const role of ['Owner','Administrator','Staff','Viewer']) check(`${role} role declared`,auth.includes(`${role}:`)||auth.includes(`'${role}'`));
check('Owner permission distinct',/h38PortalTaskAction:'owner'/.test(auth));
check('User administration Owner-only',/h38PortalUserAccessList:'owner'/.test(auth));
check('Viewer read-only',/Viewer:\['read'\]/.test(auth));
check('Staff lacks Owner approval permission',/Staff:\['read','write'\]/.test(auth));
check('direct execution does not trust effective deployer',!repo.includes('getEffectiveUser'));
check('login page has no registration control',!/createUserWithEmailAndPassword|signUp|Create account/i.test(index+authClient));
check('password reset enabled',/sendPasswordResetEmail/.test(authClient));
check('session persistence avoids localStorage',/Auth\.Persistence\.SESSION/.test(authClient)&&!/(^|[^A-Za-z])localStorage/.test(index+client+authClient+userClient));
check('logout enabled',/signOut\(\)/.test(authClient)&&/portalLogout/.test(index));
check('private app hidden before authentication',/id="portalApp" hidden/.test(index));
check('Firebase Auth SDK loaded',/firebase-auth-compat\.js/.test(index));
check('anonymous web shell is server-gated',manifest.webapp.access==='ANYONE_ANONYMOUS'&&/h38PortalVerifyFirebaseSession_/.test(auth));
check('Functions verify revoked ID tokens',/verifyIdToken\(bearer\(req\), true\)/.test(fn));
check('session checks secure user-role database',/db\.doc\(`users\/\$\{decoded\.uid\}`\)/.test(fn));
check('disabled users blocked',/user\.disabled/.test(fn)&&/profile\.status !== 'active'/.test(fn));
check('invitation blocking trigger exists',/beforeUserCreated/.test(fn)&&/Owner invitation required/.test(fn));
check('invite creates Auth account server-side',/auth\.createUser/.test(fn));
check('invite sends password setup message',/PASSWORD_RESET/.test(fn));
check('roles stored as custom claims',/setCustomUserClaims/.test(fn)&&/h38Role/.test(fn));
check('role changes revoke sessions',/revokeRefreshTokens/.test(fn));
check('last Owner cannot be demoted',/last active Owner/.test(policy)&&/operation === 'demote'/.test(policy));
check('Owner cannot disable self',/your own Owner account/.test(policy)&&/operation === 'disable'/.test(policy));
check('Owner cannot remove self',/your own Owner account/.test(policy)&&/operation === 'remove'/.test(policy));
check('access changes audited',/userAccessAudit/.test(fn));
check('Firestore client writes denied',/allow create, update, delete: if false/.test(rules));
check('Firestore default deny',/match \/\{document=\*\*\} \{ allow read, write: if false; \}/.test(rules));
check('invitation records inaccessible to clients',/portalInvitations/.test(rules)&&/allow read, write: if false/.test(rules));
check('no hard-coded password',!/(password\s*[:=]\s*['"][^'"]{4,})/i.test(index+client+authClient+userClient+auth+fn+policy));
check('no Firebase private key in source',!/BEGIN PRIVATE KEY/.test(auth+fn+rules));
check('approval gates remain locked',read('apps-script/core-engine/owner-portal-next/Portal_Config.js').includes('LIVE_EXTERNAL_ACTIONS_ENABLED: false'));
console.log(`\nOwner portal multi-user verification: ${passed} passed, ${failed} failed.`);
if(failed)process.exit(1);
