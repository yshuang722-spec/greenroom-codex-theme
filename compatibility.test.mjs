import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize,clientResolver,inspectionExpression} from './compatibility.mjs';
const check=(id,ok,severity='core')=>({id,ok,severity,message:id});
test('auxiliary quota failure leaves core theme ready but reports partial failure',()=>{
  const report=summarize([{checks:[check('style',true),check('quota-api',false,'warning')]}]);
  assert.equal(report.ready,true);assert.equal(report.compatible,false);assert.equal(report.state,'degraded');assert.match(report.message,/quota-api/);
});
test('changed settings API is incompatible even if CSS and effects loaded',()=>{
  const report=summarize([{checks:[check('style',true),check('effects',true),check('client-api-changed',false)]}]);
  assert.equal(report.ready,false);assert.equal(report.state,'incompatible');
});
test('login and unrelated windows are not mistaken for a ready app',()=>{
  assert.equal(summarize([{skipped:true}]).state,'waiting-for-client');
  assert.equal(summarize([{skipped:true}]).ready,false);
});
test('checks on one compatible window cannot conceal another window failure',()=>{
  assert.equal(summarize([{checks:[check('style',true)]},{checks:[check('effects',false)]}]).ready,false);
});
test('disconnect has a connection-specific recovery message',()=>{
  assert.match(summarize([],new Error('offline')).message,/无法连接 Codex/);
});
test('healthy core and tested features produce an active state',()=>{
  const r=summarize([{checks:[check('style',true),check('effects',true),check('scrollbars',true,'warning')]}]);
  assert.equal(r.state,'active');assert.equal(r.ready,true);assert.equal(r.compatible,true);
});
function resolverFixture(module){
  const cache={};
  const run=new Function('window','performance','document','fetch','fakeImport','location',`return (${clientResolver.replace('await import(url)','await fakeImport(url)')})('settings')`);
  const entry='app://-/assets/app-primary-aabbcc.js';
  const shared='app://-/assets/app-shared-bbccdd.js';
  const fakeFetch=async url=>({ok:url===entry||url===shared,text:async()=>'import{X}from "./app-shared-bbccdd.js"'});
  return run(cache,{getEntriesByType:()=>[]},{scripts:[{src:entry}]},fakeFetch,async()=>module,{href:'app://-/index.html'});
}
test('discovers a renamed chunk from the entry script without old asset availability',async()=>{
  const adapter=await resolverFixture({MMt:()=>{},CW:()=>{}});
  assert.equal(adapter.url,'app://-/assets/app-shared-bbccdd.js');
});
test('a renamed internal export fails explicitly instead of calling a guessed function',async()=>{
  await assert.rejects(resolverFixture({renamedFunction:()=>{}}),error=>error.code==='client-api-changed');
});
async function inspectionFixture({configured=true,profileVisible=false,quotaPresent=true,modelTrigger=null}={}){
  const settings={values:{appearanceTheme:'dark',appearanceDarkChromeTheme:{surface:'#020c09'}},...(configured?{configuredValues:{}}:{})};
  const element={getBoundingClientRect:()=>({width:36,height:36,x:16,y:710}),querySelector:()=>({})};
  const quota=quotaPresent?{...element,dataset:{status:'ready'}}:null;
  const document={
    scripts:[],body:{},
    documentElement:{getAttribute:key=>key==='data-codex-window-type'?'electron':'ready',hasAttribute:()=>true},
    querySelector:()=>({}),
    querySelectorAll:selector=>selector==='button[aria-haspopup="menu"]'&&profileVisible?[element]:selector==='[data-codex-intelligence-trigger]'&&modelTrigger?[modelTrigger]:[],
    getElementById:id=>id==='green-room-style'?{textContent:'theme'}:id==='green-room-quota'?quota:{}
  };
  const window={__greenRoomEffects:{},__greenRoomClientAdapter:{url:'fixture',settings:async()=>settings,quota:()=>{}}};
  const inspect=new Function('window','document','getComputedStyle','innerWidth','innerHeight','return '+inspectionExpression());
  return inspect(window,document,()=>({backgroundColor:'rgb(2, 12, 9)'}),1163,754);
}
test('missing configured settings fails the actual inspection as incompatible',async()=>{
  const inspected=await inspectionFixture({configured:false});
  assert.equal(summarize([inspected]).state,'incompatible');
});
test('missing quota overlay warns only when its account anchor is visible',async()=>{
  const visible=await inspectionFixture({profileVisible:true,quotaPresent:false});
  assert.equal(summarize([visible]).state,'degraded');
  assert.equal(visible.checks.find(c=>c.id==='quota-display').ok,false);
  const hidden=await inspectionFixture({profileVisible:false,quotaPresent:false});
  assert.equal(summarize([hidden]).state,'active');
  assert.equal(hidden.modelCheck,'not-present-on-this-page');
});
function pickerFixture(state){
  const group={querySelector:()=>state.override?{textContent:state.override}:null};
  return {
    getBoundingClientRect:()=>({width:140,height:32}),
    hasAttribute:key=>key==='data-daybreak-animation'&&!!state.animation,
    getAttribute:key=>key==='aria-label'&&state.chatgpt?'选择 ChatGPT 模型':null,
    querySelector:selector=>{
      if(selector==='[data-daybreak-indicator]')return state.indicator?{}:null;
      if(selector.includes('ModelPickerTriggerPlaceholder_'))return state.placeholder?{}:null;
      if(selector.includes('ModelPickerTriggerModelGroup_'))return state.group?group:null;
      if(selector.includes('ModelPickerTriggerModelText_'))return state.model?{textContent:state.model}:null;
      return null;
    }
  };
}
test('fast-mode animation defers checking and the settled valid picker passes',async()=>{
  const state={animation:true};const modelTrigger=pickerFixture(state);
  const animated=await inspectionFixture({modelTrigger});
  assert.equal(animated.modelCheck,'transition');assert.equal(summarize([animated]).state,'active');
  Object.assign(state,{animation:false,group:true,model:'GPT-6 Astra'});
  const settled=await inspectionFixture({modelTrigger});
  assert.equal(settled.modelCheck,'checked');assert.equal(summarize([settled]).state,'active');
});
test('native daybreak indicator and placeholder do not produce structure warnings',async()=>{
  for(const state of [{indicator:true},{placeholder:true}]){
    const inspected=await inspectionFixture({modelTrigger:pickerFixture(state)});
    assert.equal(inspected.modelCheck,'transition');assert.equal(summarize([inspected]).state,'active');
  }
});
test('ChatGPT native label override is not mistaken for a broken Codex picker',async()=>{
  const inspected=await inspectionFixture({modelTrigger:pickerFixture({chatgpt:true,group:true,override:'即时'})});
  assert.equal(inspected.modelCheck,'not-applicable-chatgpt');assert.equal(summarize([inspected]).state,'active');
});
test('a genuinely missing Codex label still warns after the transition ends',async()=>{
  const state={animation:true,group:true,override:'GPT-6 Astra'};const modelTrigger=pickerFixture(state);
  assert.equal(summarize([await inspectionFixture({modelTrigger})]).state,'active');
  state.animation=false;
  const inspected=await inspectionFixture({modelTrigger});
  assert.equal(summarize([inspected]).state,'degraded');
  assert.equal(inspected.checks.find(c=>c.id==='model-state').ok,false);
});
