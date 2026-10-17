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
  const window={__greenRoomEffects:{},__greenRoomClientAdapter:{url:'fixture',discoveryVersion:2,settings:async()=>settings,quota:()=>{}}};
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
    classList:{contains:token=>token==='aspect-square'&&!!state.compact},
    getAttribute:key=>key==='aria-label'?(state.chatgpt?'选择 ChatGPT 模型':state.compact?'选择模型':null):key==='data-selected-reasoning-effort'&&state.compact?'xhigh':null,
    querySelector:selector=>{
      if(selector==='svg')return state.compact?{}:null;
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
test('model label changes remain diagnostic without the disabled tray warning',async()=>{
  const state={animation:true,group:true,override:'GPT-6 Astra'};const modelTrigger=pickerFixture(state);
  assert.equal(summarize([await inspectionFixture({modelTrigger})]).state,'active');
  state.animation=false;
  const inspected=await inspectionFixture({modelTrigger});
  assert.equal(summarize([inspected]).state,'active');
  assert.equal(inspected.modelCheck,'checked');
  assert.equal(inspected.checks.some(c=>c.id==='model-state'),false);
});

test('native compact icon layout does not report a changed model structure',async()=>{
  const state={compact:true};const modelTrigger=pickerFixture(state);
  const compact=await inspectionFixture({modelTrigger});
  assert.equal(compact.modelCheck,'compact-layout');
  assert.equal(summarize([compact]).state,'active');
  assert.equal(compact.checks.some(c=>c.id==='model-state'),false);
  Object.assign(state,{compact:false,group:true,model:'GPT-6 Astra'});
  const expanded=await inspectionFixture({modelTrigger});
  assert.equal(expanded.modelCheck,'checked');
  assert.equal(expanded.checks.some(c=>c.id==='model-state'),false);
});

test('expanded picker diagnostics do not restore the disabled model warning',async()=>{
  const inspected=await inspectionFixture({modelTrigger:pickerFixture({compact:true,group:true})});
  assert.equal(summarize([inspected]).state,'active');
  assert.equal(inspected.modelCheck,'checked');
  assert.equal(inspected.checks.some(c=>c.id==='model-state'),false);
});
