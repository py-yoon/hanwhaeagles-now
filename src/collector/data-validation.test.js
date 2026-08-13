import test from 'node:test';import assert from 'node:assert/strict';import {validateGames} from './data-validation.js';
test('validates finished scores',()=>assert.equal(validateGames([{game_id:'1',status:'FINISHED',home_score:3,away_score:2}]).status,'PASS'));
test('rejects duplicate game ids',()=>assert.equal(validateGames([{game_id:'1',status:'SCHEDULED',home_score:null,away_score:null},{game_id:'1',status:'SCHEDULED',home_score:null,away_score:null}]).status,'FAIL'));
