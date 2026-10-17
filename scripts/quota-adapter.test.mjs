import test from 'node:test';
import assert from 'node:assert/strict';
import {clientResolver} from '../compatibility.mjs';
const fixtures={
 'index-abc.js':'"app-shared-aabb.js","app-initial-ccdd.js"',
 'app-shared-aabb.js':'queryFn:()=>x?.settings?.readAll()??request(`get-settings`,{});export{request as renamedSettings}',
 'app-initial-ccdd.js':'async function usage({signal:t}){try{return normalize(await api.safeGet(`/wham/usage`,{signal:t}))}catch(e){throw e}}export{usage as renamedQuota}'
};
async function resolve(files=fixtures){const settings=()=>{},quota=()=>{};const run=new Function('window','performance','document','fetch','fakeImport','location',`return (${clientResolver.replaceAll('await import(', 'await fakeImport(')})('quota')`);return {adapter:await run({}, {getEntriesByType:()=>[]},{scripts:[{src:'app://-/assets/index-abc.js'}]},async url=>({ok:!!files[url.split('/').pop()],text:async()=>files[url.split('/').pop()]}),async url=>url.includes('shared')?{renamedSettings:settings}:{renamedQuota:quota},{href:'app://-/index.html'}),settings,quota};}
test('discovers changed asset names and exports by usage endpoint and settings call',async()=>{const {adapter,settings,quota}=await resolve();assert.equal(adapter.settings,settings);assert.equal(adapter.quota,quota)});
test('rejects absent usage signature rather than guessing CW',async()=>{await assert.rejects(resolve({...fixtures,'app-initial-ccdd.js':'export{icon as CW}'}),e=>e.code==='client-api-changed')});


