import test from 'node:test';import assert from 'node:assert/strict';import {analyzeRules,validatePayload} from '../src/reasoner.js';
const base={condition:'Fictional Condition X',expert1:{name:'A',conditions:['Fever','Cough'],conclusion:'Condition X supported',decision:'support'},expert2:{name:'B',conditions:['fever','Cough'],conclusion:'Condition X not supported',decision:'oppose'}};
test('opposite decisions flag potential conflict',()=>{const r=analyzeRules(base);assert.equal(r.classification,'potential-conflict');assert.deepEqual(r.shared,['fever','cough']);assert.equal(r.resolutionStatus,'expert-review-required');});
test('matching conclusions compatible',()=>{const r=analyzeRules({...base,expert2:{...base.expert2,conclusion:base.expert1.conclusion}});assert.equal(r.classification,'compatible');});
test('different text alone is not proven contradiction',()=>{const r=analyzeRules({...base,expert2:{...base.expert2,decision:'uncertain'}});assert.equal(r.classification,'requires-interpretation');});
test('case facts gate applicability',()=>{const r=analyzeRules({...base,caseFacts:['Fever']});assert.equal(r.resolutionStatus,'applicability-not-established');assert.deepEqual(r.applicability.missingA,['cough']);});
test('rejects empty condition',()=>assert.ok(validatePayload({...base,condition:''})));
test('accepts valid payload',()=>assert.equal(validatePayload(base),null));

test('explicitly refuted second rule resolves simultaneous applicability, not diagnosis',()=>{const r=analyzeRules({...base,expert2:{...base.expert2,conditions:['Fever','Test B']},caseFacts:['Fever','Cough','NOT: Test B']});assert.equal(r.resolutionStatus,'resolved-by-applicability');assert.equal(r.applicability.expert2,'conditions-refuted');});
test('missing fact is unknown, not false',()=>{const r=analyzeRules({...base,expert2:{...base.expert2,conditions:['Fever','Test B']},caseFacts:['Fever','Cough']});assert.equal(r.resolutionStatus,'applicability-not-established');assert.equal(r.applicability.expert2,'not-established');});
test('both opposing rules met still requires review',()=>{const r=analyzeRules({...base,caseFacts:['Fever','Cough']});assert.equal(r.resolutionStatus,'expert-review-required');});
test('inconsistent positive and negative facts are rejected as reasoning inputs',()=>{const r=analyzeRules({...base,caseFacts:['Fever','NOT: Fever','Cough']});assert.equal(r.resolutionStatus,'inconsistent-case-facts');});
test('both rules refuted do not imply a diagnosis',()=>{const r=analyzeRules({...base,caseFacts:['NOT: Fever']});assert.equal(r.resolutionStatus,'neither-rule-applicable');});
