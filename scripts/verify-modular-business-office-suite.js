#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
const failures=[];
const check=(name,condition,detail='')=>{if(!condition)failures.push({name,detail});else console.log(`PASS: ${name}`);};
const required=[
 'apps-script/business-office/BusinessOffice_ModuleRegistry.gs',
 'apps/business-office/BusinessOffice_ModuleRegistry.gs',
 'packages/shared-ui/BusinessOffice_Modular_Suite.html',
 'apps-script/business-office/BusinessOffice_Web.gs',
 'apps-script/business-office/BusinessOffice_ClientManifest.gs',
 'apps/business-office/BusinessOffice_Web.gs',
 'apps-script/business-office/BusinessOffice_ModuleContract.gs',
 'apps-script/core-engine/owner-portal-next/Portal_Module_Registry.js',
 'apps-script/core-engine/owner-portal-next/Portal_Product_Client.html'
];
required.forEach(file=>check(`required ${file}`,exists(file)));
const productionRegistry=read(required[0]);
const reusableRegistry=read(required[1]);
const reusableClient=read(required[2]);
const productionWeb=read(required[3]);
const productionManifest=read(required[4]);
const reusableWeb=read(required[5]);
const contract=read(required[6]);
const portalRegistry=read(required[7]);
const productClient=read(required[8]);
const retiredProductionClient='apps-script/business-office/BusinessOffice_Modular_Suite.html';
const keys=text=>[...text.matchAll(/key:'([^']+)'/g)].map(match=>match[1]);
const expected=['quote-builder','customer-manager','work-manager','field-operations','equipment-asset-manager','document-center','invoice-payment-tracker','expense-receipt-manager','field-proof','social-control','customer-portal','request-intake-manager','price-book-template-manager','approval-center','vendor-purchase-manager','maintenance-manager','shop-flow-manager','business-system'];
const productPackKeys=['h38-core','sales-customer','operations','finance-office','growth','equipment-maintenance','shop-flow-manufacturing','customer-portal-advanced','advanced-purchasing','advanced-financial-controls'];
const productionAllKeys=keys(productionRegistry),reusableAllKeys=keys(reusableRegistry);
const appKeys=productionAllKeys.filter(key=>expected.includes(key)),reusableKeys=reusableAllKeys.filter(key=>expected.includes(key));
check('all eighteen compatibility app aliases remain registered',expected.every(key=>appKeys.includes(key))&&appKeys.length===18,JSON.stringify(appKeys));
check('production and reusable registries expose identical compatibility aliases',JSON.stringify(appKeys)===JSON.stringify(reusableKeys));
check('product-pack catalog remains metadata only',productPackKeys.every(key=>productionAllKeys.includes(key))&&productionRegistry.includes('function boGetProductPackCatalog_()')&&productionRegistry.includes('function boGetLegacyProductPackAliasMap_()'));
check('reusable registry remains white-label',!/Highway\s*38|H38_|rkrueth|highway-38-solutions/i.test(reusableRegistry));
check('production duplicate modular launcher is retired',!exists(retiredProductionClient)&&!productionManifest.includes('BusinessOffice_Modular_Suite'));
check('production Business Office renders through controlled client manifest',productionWeb.includes('boRenderClientIncludes_()'));
check('canonical module contract owns seven current workspace groups',['Today','Customers','Work','Money','Documents','Growth','Office'].every(label=>contract.includes(`label:'${label}'`))&&!contract.includes("label:'Control'"));
check('visible navigation derives from canonical module contract',portalRegistry.includes('boGetUnifiedModuleContract_()')&&productClient.includes('H38_UNIFIED=payload.unified')&&productClient.includes('renderNav();'));
check('Today remains the default workspace',contract.includes("'native','today'")&&productClient.includes("CURRENT||'today'"));
check('reusable standalone modular UI remains available',reusableClient.includes('Your Business Apps')&&reusableClient.includes('openBusinessApp')&&reusableWeb.includes("boInclude_('BusinessOffice_Modular_Suite')"));
check('reusable standalone configuration remains data-neutral',reusableRegistry.includes('BO_ENABLED_APPS')&&reusableClient.includes("standalone')==='1"));
check('compatibility app metadata is read-only',productionWeb.includes('appCatalog:function(){return boGetBusinessAppCatalog_();}')&&!productionRegistry.includes('sendEmail')&&!productionRegistry.includes('UrlFetchApp'));
check('external actions remain owner-controlled',productionRegistry.includes('externalActionsAutomatic:false'));
check('Field Operations Equipment and Social aliases remain reusable',reusableKeys.includes('field-operations')&&reusableKeys.includes('equipment-asset-manager')&&reusableKeys.includes('social-control'));
if(failures.length){console.error(JSON.stringify({status:'FAIL',failures},null,2));process.exit(1);}
console.log(JSON.stringify({status:'PASS',compatibilityApps:appKeys.length,productPacks:productPackKeys.length,workspaceGroups:7,architecture:'contract-derived-unified-business-office',whiteLabelReusableSource:true,externalActionsAutomatic:false,controlledClientManifest:true},null,2));
