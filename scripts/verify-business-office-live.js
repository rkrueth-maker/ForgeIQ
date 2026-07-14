#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const {chromium}=require('playwright');
(async()=>{
  const url=process.env.H38_BUSINESS_OFFICE_WEB_APP_URL;
  if(!url) throw new Error('H38_BUSINESS_OFFICE_WEB_APP_URL is required.');
  const out=path.resolve('artifacts/business-office/live-browser');fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true});const results=[];
  for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
    const page=await browser.newPage({viewport:{width,height}});
    await page.goto(url+'?verification='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
    const body=await page.textContent('body');
    if(/404|file not found/i.test(body||'')) throw new Error('Deployed Business Office returned a not-found page.');
    const capture=await page.locator('input[type=file][capture]').first().getAttribute('capture').catch(()=>null);
    if(capture!=='environment') throw new Error('Mobile camera capture control is missing.');
    await page.screenshot({path:path.join(out,`${name}.png`),fullPage:true});
    results.push({name,width,height,cameraCapture:capture,status:'PASS'});await page.close();
  }
  await browser.close();
  const result={status:'PASS',url,results};fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
})().catch(error=>{console.error(error.stack||error.message);process.exit(1)});
