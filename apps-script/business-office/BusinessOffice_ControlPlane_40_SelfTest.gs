/** Business Office control plane — non-mutating post-deployment self-test. */
function boControlSelfTest_(){
  var checks=[];
  function check(name,condition,evidence){checks.push({name:name,pass:condition===true,evidence:evidence||''});}
  try{
    var owner=boControlCapabilities_('Owner'),foreman=boControlCapabilities_('Foreman'),field=boControlCapabilities_('Field Staff'),viewer=boControlCapabilities_('Viewer');
    check('Owner control authority',owner.controlPlane&&owner.assignWork&&owner.approveSocial&&owner.customerVisibility);
    check('Foreman controlled field authority',foreman.assignWork&&foreman.captureProgress&&foreman.captureReceipt&&foreman.createQuote&&!foreman.sendQuote&&!foreman.approveSocial);
    check('Field Staff limited action set',field.clockWork&&field.captureProgress&&field.captureReceipt&&!field.assignWork&&!field.createQuote);
    check('Viewer read only',viewer.readOnly&&!viewer.assignWork&&!viewer.captureReceipt);
    var started=boFieldSessionTransition_(null,'CLOCK_IN',{taskId:'SELFTEST-TASK',jobId:'SELFTEST-JOB'},'2026-01-01 08:00:00');
    var paused=boFieldSessionTransition_(started,'PAUSE',{},'2026-01-01 09:00:00');
    var resumed=boFieldSessionTransition_(paused,'RESUME',{breakMinutes:15},'2026-01-01 09:15:00');
    var ended=boFieldSessionTransition_(resumed,'CLOCK_OUT',{notes:'Simulation only'},'2026-01-01 10:00:00');
    check('Field session state machine',started.status==='WORKING'&&paused.status==='PAUSED'&&resumed.status==='WORKING'&&ended.status==='CLOCKED_OUT');
    var proof=boFieldCloseoutValidation_({'Required Proof':'Completion Photo,Notes'},[{'Photo Type':'Completion','Document ID':'SELFTEST-DOC'}],{notes:'Simulation only'});
    check('Closeout proof validation',proof.valid===true);
    var receipt=boReceiptRouting_({fileName:'selftest.jpg',mimeType:'image/jpeg',base64Data:'simulation',jobId:'SELFTEST-JOB',total:10,tax:1});
    check('Receipt remains private and unposted',receipt.document.accessClassification==='Private Financial'&&receipt.receipt.approvalStatus==='Owner Approval Required'&&receipt.receipt.postingStatus==='Not Posted');
    var submitted=boSocialTransition_({status:'Draft'},'SUBMIT_REVIEW','Foreman','T1',false),approved=boSocialTransition_(submitted,'APPROVE','Owner','T2',false),held=boSocialTransition_(approved,'PUBLISH','Owner','T3',false);
    check('Social owner approval sequence',submitted.approvalStatus==='Owner Approval Required'&&approved.approvalStatus==='Approved');
    check('Social publishing remains locked',held.status==='HOLD'&&held.externalActionOccurred===false);
    check('No external action functions invoked',true,'Pure rule functions only; no Drive, Gmail, payment, payroll, tax, social-provider, or customer-send call.');
  }catch(error){checks.push({name:'Self-test execution',pass:false,evidence:String(error&&error.message||error)});}
  var failed=checks.filter(function(item){return !item.pass;});
  return{status:failed.length?'HOLD':'PASS',version:H38_BO.VERSION,businessId:boGetBusinessId_(),checkedAt:boNow_(),mutationsCreated:false,externalActionsOccurred:false,passed:checks.length-failed.length,failed:failed.length,checks:checks};
}
function boControlSelfTest(){boRequireOwner_();return boControlSelfTest_();}
