const {initializeApp, applicationDefault} = require('firebase-admin/app');
const {getAuth} = require('firebase-admin/auth');
const {getFirestore, FieldValue} = require('firebase-admin/firestore');
const crypto = require('node:crypto');

const email = String(process.argv[2] || '').trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: npm run bootstrap-owner -- owner@example.com'); process.exit(2);
}
initializeApp({credential:applicationDefault()});
const auth = getAuth(); const db = getFirestore();
(async()=>{
  const existingOwners = await db.collection('users').where('role','==','Owner').where('status','==','active').limit(1).get();
  if (!existingOwners.empty) throw new Error('Bootstrap blocked: an active Owner already exists. Use the Owner Portal User Access page.');
  let user;
  const inviteId = crypto.createHash('sha256').update(email).digest('hex');
  const inviteRef = db.doc(`portalInvitations/${inviteId}`);
  await inviteRef.set({email,role:'Owner',status:'pending',bootstrap:true,createdAt:FieldValue.serverTimestamp()});
  try { user = await auth.getUserByEmail(email); }
  catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    user = await auth.createUser({email,password:crypto.randomBytes(32).toString('base64url'),disabled:false});
  }
  await auth.setCustomUserClaims(user.uid,{h38Role:'Owner',h38Status:'active'});
  await db.doc(`users/${user.uid}`).set({email,role:'Owner',status:'active',bootstrap:true,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});
  await inviteRef.update({status:'accepted',uid:user.uid,completedAt:FieldValue.serverTimestamp()});
  console.log(`Owner bootstrap complete for ${email}. Send a Firebase password-reset email from Authentication > Users before first login.`);
})().catch(error=>{console.error(error.message);process.exit(1);});
