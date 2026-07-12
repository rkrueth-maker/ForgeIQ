#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const childProcess=require('child_process');

const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'launch-control','evidence');
const verifier=path.join(__dirname,'verify-business-concept-builder-v2.js');
fs.mkdirSync(OUT,{recursive:true});

const result=childProcess.spawnSync(process.execPath,[verifier],{
  cwd:ROOT,
  encoding:'utf8',
  maxBuffer:16*1024*1024
});
const exitCode=typeof result.status==='number'?result.status:1;
const diagnostic={
  status:exitCode===0?'PASS':'HOLD',
  generatedAt:new Date().toISOString(),
  exitCode,
  signal:result.signal||null,
  error:result.error?result.error.message:null,
  stdoutTail:String(result.stdout||'').slice(-12000),
  stderrTail:String(result.stderr||'').slice(-12000),
  externalActionsOccurred:false
};
fs.writeFileSync(path.join(OUT,'business-concept-builder-runner.json'),JSON.stringify(diagnostic,null,2)+'\n','utf8');

if(exitCode!==0){
  const verification=path.join(OUT,'business-concept-builder-verification.json');
  const sample=path.join(OUT,'business-concept-builder-sample-package.json');
  const tasks=path.join(OUT,'business-concept-builder-created-tasks.csv');
  if(!fs.existsSync(verification))fs.writeFileSync(verification,JSON.stringify({status:'HOLD',generatedAt:diagnostic.generatedAt,error:diagnostic.error||diagnostic.stderrTail||'Verifier exited before evidence generation.',externalActionsOccurred:false},null,2)+'\n');
  if(!fs.existsSync(sample))fs.writeFileSync(sample,JSON.stringify({status:'HOLD',generatedAt:diagnostic.generatedAt,reason:'Verifier exited before the synthetic package evidence was written.',externalActionsOccurred:false},null,2)+'\n');
  if(!fs.existsSync(tasks))fs.writeFileSync(tasks,'status,reason\nHOLD,Verifier exited before task evidence was written\n');
  process.stderr.write(JSON.stringify(diagnostic,null,2)+'\n');
  process.exit(exitCode);
}

process.stdout.write(String(result.stdout||''));
if(result.stderr)process.stderr.write(String(result.stderr));
