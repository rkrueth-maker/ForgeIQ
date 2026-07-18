#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'scripts','deploy-unified-owner-portal-web.sh');
const source=fs.readFileSync(file,'utf8');
const need=(marker,label)=>{if(!source.includes(marker))throw new Error(`Missing ${label}: ${marker}`);};
const reject=(marker,label)=>{if(source.includes(marker))throw new Error(`Obsolete ${label}: ${marker}`);};

need('clasp show-file-status','clasp 3 file-status command');
need('clasp update-deployment "$OWNER_DEPLOYMENT_ID" --description "$DEPLOYMENT_DESCRIPTION"','Owner Portal in-place deployment update');
need('clasp update-deployment "$BUSINESS_OFFICE_DEPLOYMENT_ID" --description "$DEPLOYMENT_DESCRIPTION"','Business Office in-place deployment update');
need('clasp list-deployments','post-update deployment verification');
need('clasp push --force','remote source push');
need('Portal_00_BusinessAuth','authentication bridge verification');
need('ReferenceError: boGetCurrentUser_ is not defined','live authentication runtime rejection');
reject('clasp status','clasp 2 status command');
reject('clasp deploy -i','clasp 2 deployment update command');

console.log('PASS — production deployment uses clasp 3 file-status and in-place deployment update commands with remote authentication verification.');
