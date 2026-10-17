// Client adapters are version-sensitive. Discover the chunk, check known exports,
// and fail explicitly rather than guessing a renamed internal function.
async function resolveGreenRoomClient(required='settings') {
  const cached=window.__greenRoomClientAdapter;
  if(cached?.discoveryVersion===2&&typeof cached[required]==='function')return cached;
  if(window.__greenRoomClientDiscovery)return window.__greenRoomClientDiscovery;
  const discover=async()=>{
    const scripts=[...document.scripts].map(e=>e.src).filter(s=>s.startsWith('app://'));
    const names=new Set();
    const sources=new Map();
    const load=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(4000)});if(!r.ok)return null;return r.text();};
    const collect=code=>{for(const name of code?.match(/app-(?:shared|initial|main)-[\da-f]+\.js/g)||[])names.add(name);};
    for(const entry of scripts.slice(0,3)){try{collect(await load(entry));}catch{}}
    for(const resource of performance.getEntriesByType('resource'))collect(resource.name);
    for(const name of names){
      if(sources.size>=12)break;
      try{const code=await load(new URL('/assets/'+name,location.href).href);if(code){sources.set(name,code);collect(code);}}catch{}
    }
    const adapter={discoveryVersion:2};
    const exported=(code,local)=>{
      const exports=code.slice(code.lastIndexOf('export{'));
      const escaped=local.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      return exports.match(new RegExp('(?:[,{])\\s*'+escaped+'\\s+as\\s+([\\w$]+)'))?.[1];
    };
    for(const [name,code] of sources){
      // Match the request's semantic call site, then resolve its actual export.
      const settingsLocal=code.match(/\?\?([\w$]+)\([`"']get-settings[`"']/)?.[1];
      const quotaLocal=code.match(/async function ([\w$]+)\(\{[^{}]{0,250}\}\)\{try\{return[^{}]{0,200}\.safeGet\([`"']\/wham\/usage[`"']/)?.[1];
      const settingsExport=settingsLocal&&exported(code,settingsLocal);
      const quotaExport=quotaLocal&&exported(code,quotaLocal);
      if(!settingsExport&&!quotaExport)continue;
      const url=new URL('/assets/'+name,location.href).href;
      const module=await import(url);
      if(settingsExport&&typeof module[settingsExport]==='function'){adapter.settings=module[settingsExport];adapter.url=url;}
      if(quotaExport&&typeof module[quotaExport]==='function'){adapter.quota=module[quotaExport];adapter.quotaURL=url;}
    }
    if(typeof adapter.settings!=='function'||typeof adapter.quota!=='function'){
      const error=new Error('无法确认客户端额度或设置请求接口，需要更新主题适配。');
      error.code=sources.size?'client-api-changed':'client-module-missing';throw error;
    }
    window.__greenRoomClientAdapter=adapter;
    return adapter;
  };
  const pending=discover();window.__greenRoomClientDiscovery=pending;
  try{return await pending;}finally{if(window.__greenRoomClientDiscovery===pending)delete window.__greenRoomClientDiscovery;}
}

export const clientResolver = resolveGreenRoomClient.toString();

// The native picker temporarily replaces its normal label during the fast-mode
// animation. ChatGPT also uses an intentional label override (e.g. Instant).
export function inspectModelTrigger(trigger) {
  if(!trigger)return {status:'not-present-on-this-page',ok:null};
  if(trigger.hasAttribute('data-daybreak-animation')||trigger.querySelector('[data-daybreak-indicator]')||trigger.querySelector('[class*="ModelPickerTriggerPlaceholder_"]'))return {status:'transition',ok:null};
  const group=trigger.querySelector('[class*="ModelPickerTriggerModelGroup_"]');
  const model=trigger.querySelector('[class*="ModelPickerTriggerModelText_"]');
  if(group&&model?.textContent?.trim())return {status:'checked',ok:true};
  // The native responsive composer intentionally replaces the label with a
  // square icon button. Its hidden expanded counterpart can belong to another
  // composer, so do not borrow that counterpart's model or flag this as broken.
  if(!group&&!model&&trigger.classList?.contains('aspect-square')&&trigger.querySelector('svg')&&trigger.getAttribute('aria-label')&&trigger.getAttribute('data-selected-reasoning-effort'))return {status:'compact-layout',ok:null};
  const override=group?.querySelector(':scope > .min-w-0.truncate');
  if(/ChatGPT/i.test(trigger.getAttribute('aria-label')||'')&&override?.textContent?.trim())return {status:'not-applicable-chatgpt',ok:null};
  return {status:'checked',ok:false};
}

export function inspectionExpression() {
  return `(async()=>{
    ${clientResolver}
    ${inspectModelTrigger.toString()}
    const shell=document.querySelector('[data-app-shell-frame]');
    if(document.documentElement.getAttribute('data-codex-window-type')!=='electron'||!shell)return {skipped:true};
    const visible=e=>!!e&&e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0;
    const checks=[];
    const add=(id,ok,severity,message)=>checks.push({id,ok,severity,message});
    const style=document.getElementById('green-room-style');
    add('style',!!style?.textContent&&document.documentElement.hasAttribute('data-green-room'),'core','主题样式没有加载，请在托盘中重新开启主题。');
    add('palette',getComputedStyle(document.body).backgroundColor==='rgb(2, 12, 9)','core','主题背景配色没有实际生效，可能是客户端结构或主题变量发生变化。');
    add('effects',!!window.__greenRoomEffects&&!!document.getElementById('green-room-flow')&&!!document.getElementById('green-room-logo'),'core','主题动效未初始化，可能是客户端页面结构发生变化。');
    add('appearance',document.documentElement.getAttribute('data-green-room-appearance')==='ready','core','客户端原生外观尚未应用，请检查客户端连接或重新开启主题。');
    const scrollers=[...document.querySelectorAll('*')].filter(e=>visible(e)&&e.clientHeight>80&&e.scrollHeight>e.clientHeight+2&&/auto|scroll/.test(getComputedStyle(e).overflowY)&&getComputedStyle(e).scrollbarWidth!=='none');
    add('scrollbars',scrollers.every(e=>{const color=getComputedStyle(e).scrollbarColor;return color.startsWith('rgb(38, 106, 71)')||(color==='auto'&&getComputedStyle(e,'::-webkit-scrollbar-thumb').backgroundColor==='rgb(38, 106, 71)')}),'warning','部分页面的滚动条未使用深绿色，页面选择器可能发生变化。');
    const headers=[...document.querySelectorAll('[data-app-shell-main-titlebar],[class*="ApplicationMenuTopBar_"]')];
    add('titlebars',headers.every(e=>{const c=getComputedStyle(e);return c.boxShadow==='none'&&(parseFloat(c.borderBottomWidth)===0||c.borderBottomColor==='rgba(0, 0, 0, 0)')}),'warning','标题区域出现了额外分界线或阴影，请检查当前版本的页面覆盖规则。');
    let moduleURL=null;
    try{
      const client=await resolveGreenRoomClient('settings');moduleURL=client.url;
      const settings=await client.settings('get-settings');
      add('settings-api',!!settings?.values&&!!settings?.configuredValues,'core','客户端外观接口返回结构已变化，需要更新主题适配。');
      if(settings?.values)add('native-colors',settings.values.appearanceTheme==='dark'&&settings.values.appearanceDarkChromeTheme?.surface?.toLowerCase()==='#020c09','core','客户端原生外观配色未生效，请从托盘重新开启主题。');
      add('quota-api',typeof client.quota==='function','warning','客户端额度接口已变化，额度显示暂不可用，请更新主题适配。');
    }catch(e){add(e.code||'settings-read',false,'core',e.code?e.message:'无法读取客户端外观设置，请检查客户端连接后重试。');}
    const quota=document.getElementById('green-room-quota');
    if(quota?.dataset.status==='unavailable')add('quota-read',false,'warning',quota.dataset.error||'额度读取失败，可能是网络、登录状态或接口变化；稍后会自动重试。');
    const profile=[...document.querySelectorAll('button[aria-haspopup="menu"]')].find(e=>{const r=e.getBoundingClientRect();return visible(e)&&e.querySelector('img')&&r.x<100&&r.y>innerHeight-150;});
    if(profile)add('quota-display',visible(quota)&&!!quota.querySelector('[data-quota-period="five-hour"]')&&!!quota.querySelector('[data-quota-period="weekly"]'),'warning','头像额度显示未加载，可能是客户端账户区域结构发生变化。');
    const trigger=[...document.querySelectorAll('[data-codex-intelligence-trigger]')].find(visible);
    const modelState=inspectModelTrigger(trigger);
    for(const slider of [...document.querySelectorAll('[data-model-picker-power-slider]')].filter(visible)){
      const thumb=slider.querySelector('[role="slider"][aria-valuenow]');
      add('model-power',!!thumb&&Number(thumb.getAttribute('aria-valuemax'))>Number(thumb.getAttribute('aria-valuemin')),'warning','思考强度控件结构已变化，满强度警告可能无法正确触发。');
    }
    for(const bolt of [...document.querySelectorAll('[class*="FastModeToggle_"]')].filter(visible))add('model-warning',!!bolt.querySelector('.green-room-warning'),'warning','模型菜单中的闪电警告未加载，请检查当前版本的模型菜单适配。');
    return {skipped:false,checks,moduleURL,viewport:{width:innerWidth,height:innerHeight},quotaStatus:quota?.dataset.status||'waiting',modelCheck:modelState.status};
  })()`;
}

export function summarize(results, connectionError=null) {
  const pages=results.filter(r=>r&&!r.skipped);
  if(!pages.length)return {ready:false,compatible:false,state:'waiting-for-client',message:connectionError?'无法连接 Codex。请确认客户端已启动，并通过主题启动入口打开。':'正在等待 Codex 应用页面；若显示登录页，请先完成登录。',checks:[]};
  const checks=pages.flatMap(r=>r.checks||[]);
  const failures=checks.filter(c=>!c.ok);
  const core=failures.filter(c=>c.severity==='core');
  const incompatible=core.some(c=>/client-api-changed|client-module-missing|settings-api/.test(c.id));
  const ready=core.length===0;
  return {ready,compatible:failures.length===0,state:incompatible?'incompatible':!ready?'loading-failed':failures.length?'degraded':'active',message:failures.length?[...new Set(failures.map(c=>c.message))].join(' '):'主题样式、动效和当前页面的关键功能检查通过。',checks,pages:pages.map(p=>({moduleURL:p.moduleURL,viewport:p.viewport,quotaStatus:p.quotaStatus,modelCheck:p.modelCheck}))};
}
