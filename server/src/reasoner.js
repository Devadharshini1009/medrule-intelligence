// Educational deterministic rule engine. Does not diagnose disease or score clinical validity.
export const normalize = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g,' ');
const unique = arr => [...new Set(arr.map(normalize).filter(Boolean))];
export function validatePayload(payload) {
  if (!payload || typeof payload.condition !== 'string' || !payload.condition.trim() || payload.condition.length > 140) return 'Enter a condition/domain (maximum 140 characters).';
  for (const key of ['expert1','expert2']) {
    const r=payload[key];
    if (!r || typeof r.name !== 'string' || !r.name.trim() || r.name.length>100) return `${key}: enter an expert name.`;
    if (!Array.isArray(r.conditions) || r.conditions.length<1 || r.conditions.length>15 || r.conditions.some(c=>typeof c!=='string'||!c.trim()||c.length>140)) return `${key}: provide 1–15 nonempty IF conditions.`;
    if (typeof r.conclusion!=='string'||!r.conclusion.trim()||r.conclusion.length>240) return `${key}: provide a THEN conclusion.`;
    if (r.decision!==undefined && !['support','oppose','uncertain'].includes(r.decision)) return `${key}: invalid decision category.`;
    if (r.evidence!==undefined && (typeof r.evidence!=='string'||r.evidence.length>500)) return `${key}: evidence must be text up to 500 characters.`;
  }
  if (payload.caseFacts!==undefined && (!Array.isArray(payload.caseFacts)||payload.caseFacts.length>30||payload.caseFacts.some(x=>typeof x!=='string'||x.length>140))) return 'Case facts must be a list of up to 30 short entries.';
  return null;
}
export function analyzeRules({condition,expert1:a,expert2:b,caseFacts=[]}) {
  const ac=unique(a.conditions),bc=unique(b.conditions),facts=unique(caseFacts);
  const shared=ac.filter(x=>bc.includes(x)),onlyA=ac.filter(x=>!bc.includes(x)),onlyB=bc.filter(x=>!ac.includes(x));
  // Explicit negative facts are entered as NOT: symptom. Unknown is never treated as false.
  const present=facts.filter(x=>!x.startsWith('not: '));
  const absent=facts.filter(x=>x.startsWith('not: ')).map(x=>x.slice(5).trim()).filter(Boolean);
  const contradictions=present.filter(x=>absent.includes(x));
  const missingA=ac.filter(x=>!present.includes(x)&&!absent.includes(x)),missingB=bc.filter(x=>!present.includes(x)&&!absent.includes(x));
  const refutedA=ac.filter(x=>absent.includes(x)),refutedB=bc.filter(x=>absent.includes(x));
  const status=(conditions,missing,refuted)=>facts.length===0?'not-assessed':refuted.length?'conditions-refuted':missing.length?'not-established':'conditions-met';
  const applicability={expert1:status(ac,missingA,refutedA),expert2:status(bc,missingB,refutedB),missingA,missingB,refutedA,refutedB,contradictions};
  const same=normalize(a.conclusion)===normalize(b.conclusion);
  const decisionA=a.decision||'uncertain',decisionB=b.decision||'uncertain';
  const opposite=(decisionA==='support'&&decisionB==='oppose')||(decisionA==='oppose'&&decisionB==='support');
  let classification,reason;
  if (same) {classification='compatible';reason='The written conclusions match. Different IF conditions may still affect when each rule applies.';}
  else if(opposite){classification='potential-conflict';reason='The experts assign opposing decision categories. Whether this is a real conflict depends on applicability, scope and validated evidence.';}
  else {classification='requires-interpretation';reason='The conclusions differ in wording or decision category. A text difference alone does not prove logical contradiction.';}
  const bothApplicable=applicability.expert1==='conditions-met'&&applicability.expert2==='conditions-met';
  const evidencePresent=Boolean(normalize(a.evidence)&&normalize(b.evidence));
  const oneMetOneRefuted=(applicability.expert1==='conditions-met'&&applicability.expert2==='conditions-refuted')||(applicability.expert2==='conditions-met'&&applicability.expert1==='conditions-refuted');
  const bothRefuted=applicability.expert1==='conditions-refuted'&&applicability.expert2==='conditions-refuted';
  const reasoningTrace=[];
  reasoningTrace.push(`Rule comparison: ${shared.length} shared condition(s), ${onlyA.length} unique to Expert 1, ${onlyB.length} unique to Expert 2.`);
  reasoningTrace.push(same?'Conclusions have identical normalized wording.':opposite?'Conclusion categories explicitly oppose each other.':'Conclusion wording differs without established logical opposition.');
  reasoningTrace.push(facts.length?`Applicability: Expert 1 = ${applicability.expert1}; Expert 2 = ${applicability.expert2}.`:'No case facts supplied; rule applicability is unknown.');
  if(refutedA.length)reasoningTrace.push(`Expert 1 IF condition(s) explicitly contradicted: ${refutedA.join(', ')}.`);
  if(refutedB.length)reasoningTrace.push(`Expert 2 IF condition(s) explicitly contradicted: ${refutedB.join(', ')}.`);
  let resolutionStatus,summary;
  if(contradictions.length){resolutionStatus='inconsistent-case-facts';summary='The case facts assert both presence and absence of the same finding. Correct contradictory inputs before assessing the rules.';}
  else if(opposite&&oneMetOneRefuted){resolutionStatus='resolved-by-applicability';summary='The opposing rules do not both apply to this hypothetical case: one rule has all IF conditions met and the other has an explicitly refuted IF condition. This resolves the applicability conflict for this case, NOT the medical truth of either conclusion.';}
  else if(opposite&&bothRefuted){resolutionStatus='neither-rule-applicable';summary='Both rules have explicitly refuted IF conditions. Neither rule can be applied to this hypothetical case; no diagnosis can be inferred.';}
  else if(facts.length && !bothApplicable){resolutionStatus='applicability-not-established';summary='Simultaneous applicability is not established. Missing facts remain unknown, while explicitly refuted conditions make a rule inapplicable. Check the detailed trace.';}
  else if(classification==='compatible'){resolutionStatus='no-conclusion-conflict';summary='No conclusion conflict was detected. Preserve both rules and verify their supporting evidence before use.';}
  else if(classification==='requires-interpretation'){resolutionStatus='clarification-required';summary='Clarify the meaning, polarity, and scope of the different conclusions before deciding whether they contradict.';}
  else {resolutionStatus='expert-review-required';summary=bothApplicable?'Both opposing rules meet the supplied hypothetical case facts. Independent expert review of validated evidence is required.':'Opposing conclusions are present, but simultaneous applicability has not been established. Independent expert review is required.';}
  const nextSteps=[];
  if(!facts.length) nextSteps.push('Enter hypothetical case facts to check whether each IF rule is applicable.');
  if(contradictions.length)nextSteps.push(`Correct inconsistent case facts: ${contradictions.join(', ')}.`);
  if(missingA.length&&facts.length)nextSteps.push(`Expert 1 missing conditions: ${missingA.join(', ')}.`);
  if(missingB.length&&facts.length)nextSteps.push(`Expert 2 missing conditions: ${missingB.join(', ')}.`);
  if(refutedA.length)nextSteps.push(`Expert 1 has explicitly refuted IF conditions: ${refutedA.join(', ')}.`);
  if(refutedB.length)nextSteps.push(`Expert 2 has explicitly refuted IF conditions: ${refutedB.join(', ')}.`);
  if(!evidencePresent)nextSteps.push('Document a source or supporting evidence for each expert rule; the system cannot verify clinical reliability.');
  if(classification==='requires-interpretation')nextSteps.push('Ask the experts to clarify whether their THEN conclusions are truly mutually exclusive.');
  if(resolutionStatus==='resolved-by-applicability')nextSteps.push('Document the explicit negative case fact that excludes the other rule; do not infer a clinical diagnosis from this logical result.');
  if(classification==='potential-conflict'&&resolutionStatus!=='resolved-by-applicability')nextSteps.push('Compare scope, assumptions, validated guidelines and evidence with a qualified reviewer; do not automatically select a diagnosis.');
  nextSteps.push('Record the review outcome and rationale; unresolved clinical disagreements require qualified clinician review.');
  reasoningTrace.push(`Resolution: ${resolutionStatus}. Evidence notes are user-entered and have not been independently validated.`);
  return {condition,classification,reason,resolutionStatus,summary,reasoningTrace,shared,onlyA,onlyB,applicability,sameConclusion:same,oppositeDecisionCategories:opposite,evidenceProvided:{expert1:!!normalize(a.evidence),expert2:!!normalize(b.evidence)},nextSteps,method:'Deterministic IF–THEN comparison and case-fact matching; no clinical validation, Bayesian probability or autonomous diagnosis.'};
}
