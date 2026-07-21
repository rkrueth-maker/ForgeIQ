#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'apps-script/business-office/BusinessOffice_AI_Actions.gs'),'utf8');
const failures=[];
const passes=[];
function test(name,fn){try{fn();passes.push(name);console.log('PASS:',name);}catch(error){failures.push({name,error:error.message});console.error('FAIL:',name,'—',error.message);}}
function expectThrow(fn,pattern){let error=null;try{fn();}catch(value){error=value;}if(!error)throw new Error('Expected an error.');if(pattern&&!pattern.test(String(error.message||error)))throw new Error(`Unexpected error: ${error.message||error}`);}

let now=Date.parse('2026-07-21T08:00:00Z');
class FakeDate extends Date{constructor(value){super(value===undefined?now:value);}static now(){return now;}}
const cacheData=new Map();
const sent=[];
const approvals=[];
const proofs=[];
const events=[];
let activeEmail='owner@example.com';
let activeRole='Owner';
let uuidCounter=0;
let lockHeld=false;
const inbox=[{ordinal:1,threadId:'thread-1',messageId:'message-1',internetMessageId:'<message-1@example.com>',subject:'Schedule update',from:'Customer One <customer@example.com>',date:'2026-07-21T07:00:00Z',body:'Can we move the work to Thursday?',snippet:'Can we move the work to Thursday?'}];
const cache={
 get:key=>cacheData.has(key)?cacheData.get(key):null,
 put:(key,value,ttl)=>{if(!Number.isFinite(Number(ttl))||Number(ttl)<1)throw new Error('Cache TTL is required.');cacheData.set(key,String(value));},
 remove:key=>cacheData.delete(key)
};
const sandbox={
 console,Object,Array,String,Number,Boolean,Math,Error,RegExp,JSON,Set,Map,Date:FakeDate,
 CacheService:{getUserCache:()=>cache},
 LockService:{getUserLock:()=>({waitLock:()=>{if(lockHeld)throw new Error('Lock already held.');lockHeld=true;},releaseLock:()=>{lockHeld=false;}})},
 Session:{getActiveUser:()=>({getEmail:()=>activeEmail})},
 Utilities:{
  DigestAlgorithm:{SHA_256:'SHA_256'},Charset:{UTF_8:'UTF_8'},
  getUuid:()=>`token-${++uuidCounter}`,
  computeDigest:(algorithm,value)=>crypto.createHash('sha256').update(String(value)).digest(),
  base64EncodeWebSafe:value=>Buffer.from(value).toString('base64url')
 },
 boAssert_:(condition,message)=>{if(!condition)throw new Error(message);},
 boAiSafeContext_:value=>value||{},
 boAiJson_:(value,fallback)=>{try{return value?JSON.parse(value):fallback;}catch(error){return fallback;}},
 boAiRecordEvent_:event=>events.push(event),
 boProof_:(...args)=>proofs.push(args),
 boApproveSelectedRecord:(...args)=>approvals.push(args),
 boRequireOwner_:()=>{if(activeRole!=='Owner')throw new Error('Owner access is required.');return{Email:activeEmail};},
 boAiOpenAi_:()=>({text:'Thursday works. Please confirm the revised start time.'}),
 boAiCachedEmailByThreadId_:threadId=>inbox.find(item=>item.threadId===threadId)||null,
 boAiCachedEmailByOrdinal_:ordinal=>inbox.find(item=>item.ordinal===Number(ordinal))||null,
 boAiSendViaGmailApi_:payload=>sent.push(JSON.parse(JSON.stringify(payload))),
 boQuoteBuilderApprove_:(...args)=>({approved:true,args}),
 boQuoteBuilderToJob_:quoteId=>({job:{'Job ID':'JOB-1'},workOrder:{'Work Order ID':'WO-1'},quoteId}),
 boCreateInvoiceFromJob:jobId=>({'Invoice ID':'INV-1','Invoice Number':'1001',jobId}),
 boPostJournalEntry:entryId=>({entryId,posted:true}),
 boExportPayrollProviderCsv:periodId=>({periodId,fileId:'FILE-1',fileUrl:'https://example.invalid/file'}),
 boFinalizeTaxPreparationReport:periodId=>({periodId,finalized:true})
};
vm.createContext(sandbox);
new vm.Script(source,{filename:'BusinessOffice_AI_Actions.gs'}).runInContext(sandbox);

function reset(){cacheData.clear();sent.length=0;approvals.length=0;proofs.length=0;events.length=0;activeEmail='owner@example.com';activeRole='Owner';now=Date.parse('2026-07-21T08:00:00Z');lockHeld=false;}

test('catalog exposes only approval-gated actions',()=>{
 reset();const catalog=sandbox.boAiActionCatalogForClient_();
 const expected=['email.send','email.reply','record.approve','record.reject','quote.convert','job.invoice','journal.post','payroll.export','tax.finalize'];
 if(JSON.stringify(catalog.map(item=>item.actionId))!==JSON.stringify(expected))throw new Error('Unexpected action catalog.');
 if(catalog.some(item=>item.ownerApprovalRequired!==true))throw new Error('Ungated action found.');
});

test('prepare creates preview without executing',()=>{
 reset();const action=sandbox.boAiPrepareAction_({actionId:'email.send',arguments:{to:'customer@example.com',subject:'Test',body:'Hello'}});
 if(action.executed!==false||action.confirmation!=='SEND')throw new Error('Preparation contract failed.');
 if(sent.length||approvals.length||proofs.length)throw new Error('Preparation caused a side effect.');
});

test('wrong or conversational confirmation is blocked',()=>{
 reset();const action=sandbox.boAiPrepareAction_({actionId:'email.send',arguments:{to:'customer@example.com',subject:'Test',body:'Hello'}});
 expectThrow(()=>sandbox.boAiConfirmAction_({actionToken:action.actionToken,confirmation:'SEND IT'}),/Say or enter SEND/);
 if(sent.length)throw new Error('Email sent after invalid phrase.');
});

test('non-owner cannot execute prepared action',()=>{
 reset();const action=sandbox.boAiPrepareAction_({actionId:'email.send',arguments:{to:'customer@example.com',subject:'Test',body:'Hello'}});
 activeRole='Staff';expectThrow(()=>sandbox.boAiConfirmAction_({actionToken:action.actionToken,confirmation:'SEND'}),/Owner access/);
 if(sent.length)throw new Error('Non-owner executed action.');
});

test('owner confirmation executes exactly once and records proof',()=>{
 reset();const action=sandbox.boAiPrepareAction_({actionId:'email.send',arguments:{to:'customer@example.com',subject:'Test',body:'Hello'}});
 const first=sandbox.boAiConfirmAction_({actionToken:action.actionToken,confirmation:'send'});
 const second=sandbox.boAiConfirmAction_({actionToken:action.actionToken,confirmation:'SEND'});
 if(!first.completed||first.duplicatePrevented)throw new Error('First execution result is invalid.');
 if(!second.duplicatePrevented)throw new Error('Duplicate retry was not prevented.');
 if(sent.length!==1||approvals.length!==1)throw new Error('Action did not execute exactly once.');
 if(!proofs.some(args=>args.includes('PASS')))throw new Error('PASS proof missing.');
});

test('expired prepared action is blocked',()=>{
 reset();const action=sandbox.boAiPrepareAction_({actionId:'email.send',arguments:{to:'customer@example.com',subject:'Test',body:'Hello'}});
 now+=901000;expectThrow(()=>sandbox.boAiConfirmAction_({actionToken:action.actionToken,confirmation:'SEND'}),/expired/);
 if(sent.length)throw new Error('Expired action executed.');
});

test('tampered payload fails integrity verification',()=>{
 reset();const action=sandbox.boAiPrepareAction_({actionId:'email.send',arguments:{to:'customer@example.com',subject:'Test',body:'Hello'}});
 const key='H38_AI_ACTION_'+action.actionToken,stored=JSON.parse(cacheData.get(key));stored.payload.to='attacker@example.com';cacheData.set(key,JSON.stringify(stored));
 expectThrow(()=>sandbox.boAiConfirmAction_({actionToken:action.actionToken,confirmation:'SEND'}),/integrity/);
 if(sent.length)throw new Error('Tampered action executed.');
});

test('forbidden system-change request cannot be prepared',()=>{
 reset();expectThrow(()=>sandbox.boAiPrepareAction_({actionId:'email.send',arguments:{to:'customer@example.com',request:'Deploy source code and change permissions'}}),/protected system changes/);
});

test('threaded reply is limited to current inbox session',()=>{
 reset();expectThrow(()=>sandbox.boAiPrepareAction_({actionId:'email.reply',arguments:{threadId:'unknown',body:'Hello'}}),/current private inbox session/);
 const action=sandbox.boAiPrepareAction_({actionId:'email.reply',arguments:{threadId:'thread-1',body:'Thursday works.'}});
 sandbox.boAiConfirmAction_({actionToken:action.actionToken,confirmation:'SEND'});
 if(sent.length!==1||sent[0].threadId!=='thread-1'||sent[0].to!=='customer@example.com')throw new Error('Threaded reply payload is invalid.');
 if(sent[0].inReplyTo!=='<message-1@example.com>')throw new Error('Reply headers are missing.');
});

test('record and financial preparation actions preserve deterministic services',()=>{
 reset();
 const action=sandbox.boAiPrepareAction_({actionId:'quote.convert',arguments:{quoteId:'QUOTE-1'}});
 const result=sandbox.boAiConfirmAction_({actionToken:action.actionToken,confirmation:'CONVERT'});
 if(result.result.jobId!=='JOB-1'||result.result.workOrderId!=='WO-1')throw new Error('Quote conversion result is invalid.');
});

const report={status:failures.length?'FAIL':'PASS',passed:passes.length,failed:failures.length,passes,failures,externalActionsOccurred:false};
const out=path.join(root,'artifacts','ai-approval');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'engine-tests.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
process.exit(failures.length?1:0);
