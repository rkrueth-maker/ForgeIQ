#!/usr/bin/env node
'use strict';

const fs=require('fs');
const os=require('os');
const path=require('path');
const childProcess=require('child_process');
const ROOT=path.resolve(__dirname,'..');
const PORTAL=path.join(ROOT,'apps-script','core-engine','owner-portal-next');
const BUSINESS=path.join(ROOT,'apps-script','business-office');
const PACK_DIR=path.join(ROOT,'business-packs','highway38','apps-script');
const PACK=path.join(PACK_DIR,'BusinessOffice_Pack.gs');
const SYNC=path.join(ROOT,'apps-script','business-office-sync','BusinessOffice_Sync.gs');
const TARGET=fs.mkdtempSync(path.join(os.tmpdir(),'h38-unified-assembly-'));
const evidenceDir=path.join(ROOT,'artifacts','unified-source-assembly');
fs.mkdirSync(evidenceDir,{recursive:true});

function copyMatching(source,pattern){
  fs.readdirSync(source).filter(name=>pattern.test(name)).sort().forEach(name=>fs.copyFileSync(path.join(source,name),path.join(TARGET,name)));
}
function run(command,args){
  const result=childProcess.spawnSync(command,args,{cwd:ROOT,encoding:'utf8'});
  if(result.stdout)process.stdout.write(result.stdout);
  if(result.stderr)process.stderr.write(result.stderr);
  if(result.status!==0)throw new Error(`${command} ${args.join(' ')} exited ${result.status}`);
}

const result={status:'HOLD',target:TARGET,files:[],entryPoints:[],duplicateBases:[],error:''};
try{
  copyMatching(PORTAL,/\.(?:js|html)$/i);
  copyMatching(BUSINESS,/\.gs$/i);
  ['BusinessOffice_00_Pack.gs','BusinessOffice_Pack.gs'].forEach(name=>{const file=path.join(TARGET,name);if(fs.existsSync(file))fs.unlinkSync(file);});
  fs.copyFileSync(PACK,path.join(TARGET,'BusinessOffice_00_Pack.gs'));
  fs.readdirSync(PACK_DIR).filter(name=>name.endsWith('.gs')&&name!=='BusinessOffice_Pack.gs').sort().forEach(name=>{
    const target=path.join(TARGET,name);
    if(fs.existsSync(target))throw new Error(`business pack file collides with core source: ${name}`);
    fs.copyFileSync(path.join(PACK_DIR,name),target);
  });
  copyMatching(BUSINESS,/^BusinessOffice_.*\.html$/i);
  fs.copyFileSync(path.join(BUSINESS,'appsscript.json'),path.join(TARGET,'appsscript.json'));
  fs.copyFileSync(SYNC,path.join(TARGET,'BusinessOffice_Sync.gs'));
  run(process.execPath,[path.join(ROOT,'scripts','build-unified-apps-script-shell.js'),TARGET,ROOT]);

  const controlled=fs.readdirSync(TARGET).filter(name=>/^(Portal_|BusinessOffice_|Unified_)/.test(name)&&/\.(?:gs|js|html)$/i.test(name)).sort();
  const bases=new Map();
  controlled.forEach(name=>{
    const base=name.replace(/\.(?:gs|js|html)$/i,'');
    if(bases.has(base))result.duplicateBases.push([base,bases.get(base),name]);
    else bases.set(base,name);
  });
  if(result.duplicateBases.length)throw new Error('duplicate Apps Script base names: '+JSON.stringify(result.duplicateBases));

  const packDeclarations=controlled.filter(name=>name.endsWith('.gs')).filter(name=>/(?:var|const|let)\s+BO_EMBEDDED_BUSINESS_PACK\s*=/.test(fs.readFileSync(path.join(TARGET,name),'utf8')));
  if(packDeclarations.length!==1||packDeclarations[0]!=='BusinessOffice_00_Pack.gs')throw new Error(`expected one generated Business Office pack declaration, found ${packDeclarations.join(', ')||'none'}`);

  controlled.filter(name=>/\.(?:gs|js)$/i.test(name)).forEach(name=>{
    const source=fs.readFileSync(path.join(TARGET,name),'utf8');
    for(let i=0;i<(source.match(/\bfunction\s+doGet\s*\(/g)||[]).length;i++)result.entryPoints.push(name);
  });
  if(result.entryPoints.length!==1||result.entryPoints[0]!=='Unified_AppShell.gs')throw new Error(`expected one unified doGet, found ${result.entryPoints.join(', ')||'none'}`);

  result.status='PASS';
  result.files=controlled;
}catch(error){
  result.error=error.stack||error.message;
  result.files=fs.existsSync(TARGET)?fs.readdirSync(TARGET).sort():[];
}finally{
  fs.writeFileSync(path.join(evidenceDir,'verification.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
  fs.rmSync(TARGET,{recursive:true,force:true});
}
process.exit(result.status==='PASS'?0:1);
