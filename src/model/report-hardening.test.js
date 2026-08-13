import test from 'node:test'; import assert from 'node:assert/strict'; import {validateReport} from './report.js';
test('report validator rejects missing provenance',()=>assert.equal(validateReport({schema_version:'1.0',rank_distribution:[],summary:{expected_rank:5,playoff_probability:.5}}).status,'FAIL'));
