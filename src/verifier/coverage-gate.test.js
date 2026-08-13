import test from 'node:test'; import assert from 'node:assert/strict'; import {assertCoverage} from './coverage-gate.js';
test('coverage gate passes complete team count',()=>assert.equal(assertCoverage({teams:Array.from({length:10},(_,i)=>i),finalGames:100}).status,'PASS'));
test('coverage gate blocks incomplete teams',()=>assert.throws(()=>assertCoverage({teams:[1],finalGames:100}),/coverage blocked/));
