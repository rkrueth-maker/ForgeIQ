const {onRequest} = require('firebase-functions/v2/https');
const {beforeUserCreated} = require('firebase-functions/v2/identity');
const {defineString} = require('firebase-functions/params');
const {initializeApp} = require('firebase-admin/app');
const {getAuth} = require('firebase-admin/auth');
const {getFirestore, FieldValue} = require('firebase-admin/firestore');
const crypto = require('node:crypto');
const {ROLES, cleanEmail, cleanRole, cleanUid, assertOwnerAccountChange} = require('./policy');

initializeApp();
const auth = getAuth();
const db = getFirestore();
const webApiKey = defineString('FIREBASE_WEB_API_KEY');

function json(res, status, body) {
  res.status(status).set('Cache-Control','no-store').set('Content-Type','application/json').send(JSON.stringify(body));
}
function bearer(req) {
  const match = String(req.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error('Authentication required.');
  return match[1];
}
async function verifiedProfile(req, ownerOnly = false) {
  const decoded = await auth.verifyIdToken(bearer(req), true);
  const user = await auth.getUser(decoded.uid);
  if (user.disabled) throw new Error('User access is disabled.');
  const snap = await db.doc(`users/${decoded.uid}`).get();
  if (!snap.exists) throw new Error('User was not invited.');
  const profile = snap.data();
  if (profile.status !== 'active') throw new Error('User access is not active.');
  if (!ROLES.includes(profile.role)) throw new Error('User role is invalid.');
  if (ownerOnly && profile.role !== 'Owner') throw new Error('Owner role required.');
  return {decoded,user,profile};
}
async function activeOwnerCount() {
  const snap = await db.collection('users').where('role','==','Owner').where('status','==','active').get();
  return snap.size;
}
async function audit(actor, action, target, details = {}) {
  await db.collection('userAccessAudit').add({actorUid:actor.decoded.uid,actorEmail:actor.user.email || '',action,targetUid:target.uid || '',targetEmail:target.email || '',details,createdAt:FieldValue.serverTimestamp()});
}
async function sendPasswordSetup(email) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(webApiKey.value())}`, {
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({requestType:'PASSWORD_RESET',email})
  });
  if (!response.ok) throw new Error('Firebase could not send the password setup email.');
}

exports.beforePortalUserCreated = beforeUserCreated(async event => {
  const email = cleanEmail(event.data.email);
  const invite = await db.doc(`portalInvitations/${crypto.createHash('sha256').update(email).digest('hex')}`).get();
  if (!invite.exists || invite.data().status !== 'pending') throw new Error('Owner invitation required.');
});

exports.portalSession = onRequest({cors:false,invoker:'public'}, async (req,res) => {
  if (req.method !== 'POST') return json(res,405,{error:'Method not allowed.'});
  try {
    const current = await verifiedProfile(req,false);
    return json(res,200,{uid:current.decoded.uid,email:current.user.email,role:current.profile.role,status:current.profile.status});
  } catch (error) { return json(res,401,{error:'Invalid or unauthorized session.'}); }
});

exports.portalUserAdmin = onRequest({cors:false,invoker:'public'}, async (req,res) => {
  if (req.method !== 'POST') return json(res,405,{error:'Method not allowed.'});
  try {
    const actor = await verifiedProfile(req,true);
    const action = String((req.body || {}).action || '');
    const data = (req.body || {}).data || {};
    if (action === 'list') {
      const profiles = await db.collection('users').orderBy('email').get();
      const users = await Promise.all(profiles.docs.map(async doc => {
        const profile = doc.data(); let record = null;
        try { record = await auth.getUser(doc.id); } catch (_) {}
        return {uid:doc.id,email:profile.email,role:profile.role,status:profile.status,lastSignInTime:record && record.metadata.lastSignInTime || '',createdAt:profile.createdAt || ''};
      }));
      return json(res,200,{users});
    }
    if (action === 'invite') {
      const email = cleanEmail(data.email); const role = cleanRole(data.role);
      try { await auth.getUserByEmail(email); throw new Error('This email already has an account.'); } catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
      const inviteId = crypto.createHash('sha256').update(email).digest('hex');
      const inviteRef = db.doc(`portalInvitations/${inviteId}`);
      await inviteRef.set({email,role,status:'pending',invitedBy:actor.decoded.uid,createdAt:FieldValue.serverTimestamp()});
      let created;
      try {
        created = await auth.createUser({email,password:crypto.randomBytes(32).toString('base64url'),disabled:false});
        await auth.setCustomUserClaims(created.uid,{h38Role:role,h38Status:'active'});
        await db.doc(`users/${created.uid}`).set({email,role,status:'active',invitedBy:actor.decoded.uid,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
        await sendPasswordSetup(email);
        await inviteRef.update({status:'accepted',uid:created.uid,completedAt:FieldValue.serverTimestamp()});
      } catch (error) {
        if (created) await auth.deleteUser(created.uid).catch(()=>{});
        await inviteRef.update({status:'failed',failedAt:FieldValue.serverTimestamp()}).catch(()=>{});
        throw error;
      }
      await audit(actor,'invite',{uid:created.uid,email},{role});
      return json(res,200,{status:'PASS',uid:created.uid,email,role});
    }
    const uid = cleanUid(data.uid);
    const targetRef = db.doc(`users/${uid}`); const targetSnap = await targetRef.get();
    if (!targetSnap.exists) throw new Error('User access record not found.');
    const target = targetSnap.data();
    if (action === 'update') {
      const operation = String(data.action || '');
      if (operation === 'role') {
        const role = cleanRole(data.role);
        if (target.role === 'Owner' && role !== 'Owner') assertOwnerAccountChange({operation:'demote',actorUid:actor.decoded.uid,targetUid:uid,targetRole:target.role,targetStatus:target.status,activeOwnerCount:await activeOwnerCount()});
        await targetRef.update({role,updatedAt:FieldValue.serverTimestamp(),updatedBy:actor.decoded.uid});
        await auth.setCustomUserClaims(uid,{h38Role:role,h38Status:target.status}); await auth.revokeRefreshTokens(uid);
        await audit(actor,'change-role',{uid,email:target.email},{from:target.role,to:role});
      } else if (operation === 'disable') {
        assertOwnerAccountChange({operation:'disable',actorUid:actor.decoded.uid,targetUid:uid,targetRole:target.role,targetStatus:target.status,activeOwnerCount:await activeOwnerCount()});
        await auth.updateUser(uid,{disabled:true}); await auth.revokeRefreshTokens(uid);
        await targetRef.update({status:'disabled',updatedAt:FieldValue.serverTimestamp(),updatedBy:actor.decoded.uid});
        await auth.setCustomUserClaims(uid,{h38Role:target.role,h38Status:'disabled'});
        await audit(actor,'disable',{uid,email:target.email});
      } else if (operation === 'activate') {
        await auth.updateUser(uid,{disabled:false});
        await targetRef.update({status:'active',updatedAt:FieldValue.serverTimestamp(),updatedBy:actor.decoded.uid});
        await auth.setCustomUserClaims(uid,{h38Role:target.role,h38Status:'active'}); await auth.revokeRefreshTokens(uid);
        await audit(actor,'activate',{uid,email:target.email});
      } else throw new Error('Unknown access update action.');
      return json(res,200,{status:'PASS'});
    }
    if (action === 'remove') {
      assertOwnerAccountChange({operation:'remove',actorUid:actor.decoded.uid,targetUid:uid,targetRole:target.role,targetStatus:target.status,activeOwnerCount:await activeOwnerCount()});
      await audit(actor,'remove',{uid,email:target.email},{role:target.role,status:target.status});
      await auth.deleteUser(uid); await targetRef.delete();
      return json(res,200,{status:'PASS'});
    }
    throw new Error('Unknown user administration action.');
  } catch (error) { return json(res,400,{error:error.message || 'User access request failed.'}); }
});
