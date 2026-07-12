(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.H38_TOOL_FORMULAS=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const finite=n=>Number.isFinite(Number(n));
  function machining({sfm,diameter,teeth=0,chip=0}){sfm=Number(sfm);diameter=Number(diameter);teeth=Number(teeth);chip=Number(chip);if(!(sfm>0&&diameter>0))throw new Error('Surface speed and diameter must be positive.');const rpm=sfm*3.82/diameter;return{rpm,feed:rpm*Math.max(teeth,0)*Math.max(chip,0)};}
  function payback({cost,hoursPerWeek,loadedRate,weeksPerYear,otherAnnual=0}){cost=Number(cost);const annual=Number(hoursPerWeek)*Number(loadedRate)*Number(weeksPerYear)+Number(otherAnnual);if(!(cost>0&&annual>0))throw new Error('Investment and annual benefit must be positive.');return{annualBenefit:annual,paybackMonths:cost/annual*12,firstYearRoiPercent:(annual-cost)/cost*100};}
  function bottleneck({minutesPerDay,workingDays,loadedRate,people=1}){const hours=Number(minutesPerDay)/60*Number(workingDays)*Math.max(Number(people),1);if(!(hours>0&&Number(loadedRate)>0))throw new Error('Time and loaded rate must be positive.');return{annualHours:hours,annualCost:hours*Number(loadedRate)};}
  function barfeed({barLength,partLength,remnant=0,cutoff=0,cycleSeconds,runHours=0,efficiencyPercent=100}){const pitch=Number(partLength)+Number(cutoff),usable=Number(barLength)-Number(remnant);if(!(usable>0&&pitch>0&&Number(cycleSeconds)>0))throw new Error('Usable bar, pitch, and cycle must be positive.');const efficiency=Math.min(Math.max(Number(efficiencyPercent)/100,0),1),partsPerHour=3600/Number(cycleSeconds)*efficiency;return{partsPerBar:Math.floor(usable/pitch),partsPerHour,runParts:partsPerHour*Number(runHours)};}
  function pressfeed({strokesPerMinute,feedPitchInches,scheduledHours,efficiencyPercent=100,usableCoilFeet=0}){const efficiency=Math.min(Math.max(Number(efficiencyPercent)/100,0),1);if(!(Number(strokesPerMinute)>0&&Number(feedPitchInches)>0&&Number(scheduledHours)>0))throw new Error('Rate, pitch, and time must be positive.');const parts=Number(strokesPerMinute)*60*Number(scheduledHours)*efficiency,stripFeet=parts*Number(feedPitchInches)/12;return{goodStrokes:parts,stripFeet,coilEquivalents:Number(usableCoilFeet)>0?stripFeet/Number(usableCoilFeet):0};}
  function score(values,maxEach=5){if(!Array.isArray(values)||!values.length||!finite(maxEach)||Number(maxEach)<=0)throw new Error('A non-empty score list and positive maximum are required.');const total=values.reduce((sum,value)=>sum+Number(value||0),0),maximum=values.length*Number(maxEach);return{total,maximum,percent:Math.round(total/maximum*100)};}
  return Object.freeze({machining,payback,bottleneck,barfeed,pressfeed,score});
});
