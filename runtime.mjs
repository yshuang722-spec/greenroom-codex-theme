import fs from 'node:fs';
import net from 'node:net';
import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {clientResolver,inspectionExpression,summarize} from './compatibility.mjs';
const dir = path.dirname(fileURLToPath(import.meta.url));
const port = 19335;
const action = process.argv[2] || 'watch';
const state = path.join(dir, 'state');
fs.mkdirSync(state, {recursive:true});
const stop = path.join(state, 'stop');
const sleep = ms => new Promise(r=>setTimeout(r,ms));
function injection() {
  const css=fs.readFileSync(path.join(dir,'theme.css'),'utf8');
  const effects=fs.readFileSync(path.join(dir,'effects.js'),'utf8');
  const revision=createHash('sha256').update(effects+clientResolver).digest('hex');
  const adapter=`window.__greenRoomResolveClient=(${clientResolver});`;
  return `(()=>{if(location.protocol!=='app:'||document.documentElement.getAttribute('data-codex-window-type')!=='electron')return {skipped:true};if(!document.querySelector('[data-app-shell-frame]')){${restore};return {skipped:true,reason:'waiting-for-app-shell'}}${adapter}let s=document.getElementById('green-room-style');if(!s){s=document.createElement('style');s.id='green-room-style';document.head.appendChild(s)}if(s.textContent!==${JSON.stringify(css)})s.textContent=${JSON.stringify(css)};document.documentElement.setAttribute('data-green-room','v5');if(window.__greenRoomRevision!==${JSON.stringify(revision)}||!window.__greenRoomEffects){window.__greenRoomEffects?.destroy();${effects};window.__greenRoomRevision=${JSON.stringify(revision)}}return {applied:true,hotReload:true,revision:${JSON.stringify(revision)},animation:!!window.__greenRoomEffects}})()`;
}
const restore = `(()=>{window.__greenRoomEffects?.destroy();delete window.__greenRoomRevision;delete window.__greenRoomResolveClient;delete window.__greenRoomClientAdapter;document.getElementById('green-room-style')?.remove();document.documentElement.removeAttribute('data-green-room');return {restored:true}})()`;
function writeHealth(report){
  const temporary=path.join(state,'compatibility-status.'+process.pid+'.tmp');
  fs.writeFileSync(temporary,JSON.stringify({...report,checkedAt:new Date().toISOString()}));
  fs.renameSync(temporary,path.join(state,'compatibility-status.json'));
}
async function inspect(pages){
  const results=[];
  for(const target of pages){
    try{
      results.push(await evaluate(target,inspectionExpression()));
    }
    catch{if(target.url==='app://-/index.html')results.push({skipped:false,checks:[{id:'inspection-failed',ok:false,severity:'core',message:'无法完成客户端功能检测，请检查连接后重试。'}]});}
  }
  const report=summarize(results);writeHealth(report);return report;
}
async function targets() {
  const response=await fetch(`http://127.0.0.1:${port}/json/list`,{signal:AbortSignal.timeout(2000)});
  if(!response.ok)throw Error('CDP unavailable');
  const list=await response.json();
  return list.filter(t=>t.type==='page'&&typeof t.url==='string'&&t.url.startsWith('app://')&&t.webSocketDebuggerUrl);
}
async function evaluate(target, expression) {
  const url=new URL(target.webSocketDebuggerUrl);
  if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||Number(url.port)!==port)throw Error('Non-loopback target rejected');
  return new Promise((resolve,reject)=>{
    const ws=new WebSocket(url);
    const timer=setTimeout(()=>{ws.close();reject(Error('CDP timeout'))},8000);
    ws.onopen=()=>ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true}}));
    ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id!==1)return;clearTimeout(timer);ws.close();if(m.error||m.result?.exceptionDetails)reject(Error('Style evaluation failed'));else resolve(m.result?.result?.value)};
    ws.onerror=()=>{clearTimeout(timer);ws.close();reject(Error('CDP connection failed'))};
  });
}
try {
if(action==='appearance-enable'||action==='appearance-restore') {
  const backupFile=path.join(state,'live-appearance-backup.json');
  let applied=false;
  const pages=await targets().catch(error=>{if(action==='appearance-restore')return [];throw error});
  for(const target of pages){
    const native=await evaluate(target,`(async()=>{if(!document.querySelector('[data-app-shell-frame]'))return null;${clientResolver}const client=await resolveGreenRoomClient('settings');const settings=await client.settings('get-settings');if(!settings?.configuredValues||!settings?.values)throw Error('客户端外观接口返回结构已变化');const c=settings.configuredValues,v=settings.values;return {theme:c.appearanceTheme??'system',dark:c.appearanceDarkChromeTheme??null,fonts:(v.appearanceTheme==='light'?v.appearanceLightChromeTheme:v.appearanceDarkChromeTheme)?.fonts??v.appearanceLightChromeTheme?.fonts}})()`);
    if(!native)continue;
    let desired;
    if(action==='appearance-enable'){
      if(!fs.existsSync(backupFile)){
        const original=path.join(state,'appearance-backup.json');
        if(native.dark?.surface==='#020c09'&&fs.existsSync(original)){
          const backup=JSON.parse(fs.readFileSync(original,'utf8'));
          if(!backup.darkBlocks?.length){native.dark=null;native.theme=backup.themeLine?.match(/"(dark|light|system)"/)?.[1]??'system';}
        }
        fs.writeFileSync(backupFile,JSON.stringify(native,null,2));
      }
      desired={theme:'dark',dark:{accent:'#40e795',accentSource:'custom',contrast:60,ink:'#c8e4d8',opaqueWindows:true,surface:'#020c09',semanticColors:{diffAdded:'#39db8c',diffRemoved:'#ec7e83',skill:'#65ff94'},...(native.fonts?{fonts:native.fonts}:{})}};
    }else{
      if(!fs.existsSync(backupFile)){applied=true;break}
      desired=JSON.parse(fs.readFileSync(backupFile,'utf8'));
    }
    await evaluate(target,`(async()=>{${clientResolver}const client=await resolveGreenRoomClient('settings');const settings=${JSON.stringify(desired)};if(settings.dark)await client.settings('set-setting',{params:{key:'appearanceDarkChromeTheme',value:settings.dark}});await client.settings('set-setting',{params:{key:'appearanceTheme',value:settings.theme}});document.documentElement.setAttribute('data-green-room-appearance',${JSON.stringify(action==='appearance-enable'?'ready':'restored')});return {applied:true}})()`);
    applied=true;break;
  }
  if(!applied&&action!=='appearance-restore')throw Error('Native appearance is unavailable until the signed-in app shell is ready.');
  if(applied&&action==='appearance-enable'){
    for(const target of pages)await evaluate(target,`(()=>{document.documentElement.setAttribute('data-green-room-appearance','ready');return true})()`).catch(()=>{});
  }
  if(action==='appearance-restore')fs.rmSync(backupFile,{force:true});
  console.log('Native appearance '+action+' complete.');
} else if(action==='restore') {
  fs.writeFileSync(stop,'stop');
  await sleep(3500);
  try {for(const t of await targets())console.log(JSON.stringify(await evaluate(t,restore)))}catch{console.log('Client is offline; no live style to remove.')}
  fs.writeFileSync(path.join(state,'last-status.json'),JSON.stringify({enabled:false,state:'disabled'}));
  writeHealth({ready:false,compatible:false,state:'disabled',message:'主题已关闭。',checks:[]});
} else if(action==='watch') {
  const pidFile=path.join(state,'watcher.pid');
  // The OS releases this lock on exit/reboot. A stale PID file cannot suppress startup.
  const lock=net.createServer(socket=>socket.destroy());
  const lockName=String.raw`\\.\pipe\GreenRoomThemeWatcher-`+createHash('sha256').update(dir.toLowerCase()).digest('hex').slice(0,16);
  await new Promise((resolve,reject)=>{lock.once('error',error=>{if(error.code==='EADDRINUSE'){console.log('Theme watcher already running.');process.exit(0)}reject(error)});lock.listen(lockName,resolve)});
  fs.rmSync(stop,{force:true});
  fs.writeFileSync(path.join(state,'watcher.pid'),String(process.pid));
  console.log('Waiting for the local Codex theme connection on 127.0.0.1:'+port);
  let last='',offline=0,wasOnline=false,previousInjection='';
  const appearanceReady=new Set();
  const appearanceRetry=new Map();let nextInspection=0;
  while(!fs.existsSync(stop)) {
    try {
      const ts=await targets();offline=0;wasOnline=true;
      const results=[];
      const payload=injection(),changed=payload!==previousInjection;
      for(const t of ts){
        if(changed)results.push(await evaluate(t,payload));
        else {
          const ready=await evaluate(t,`(()=>({skipped:document.documentElement.getAttribute('data-codex-window-type')!=='electron',ready:!!document.querySelector('[data-app-shell-frame]')&&!!document.getElementById('green-room-style')&&!!window.__greenRoomEffects,appearanceReady:document.documentElement.getAttribute('data-green-room-appearance')==='ready'}))()`);
          results.push(ready?.skipped||ready?.ready?ready:await evaluate(t,payload));
        }
      }
      for(let i=0;i<ts.length;i++){
        if((results[i]?.ready||results[i]?.applied)&&(!appearanceReady.has(ts[i].id)||results[i]?.appearanceReady===false)&&Date.now()>=(appearanceRetry.get(ts[i].id)||0)){
          try{
            await new Promise((resolve,reject)=>execFile(process.execPath,[fileURLToPath(import.meta.url),'appearance-enable'],{windowsHide:true,timeout:15000},error=>error?reject(error):resolve()));
            appearanceReady.add(ts[i].id);
          }catch(error){appearanceRetry.set(ts[i].id,Date.now()+30000);console.log('Native appearance pending: '+error.message)}
        }
      }
      previousInjection=payload;
      const summary=JSON.stringify(results);
      if(summary!==last){fs.writeFileSync(path.join(state,'last-status.json'),JSON.stringify({enabled:results.some(r=>r?.ready||r?.applied),results}));console.log(summary);last=summary}
      if(changed||Date.now()>=nextInspection){const health=await inspect(ts);nextInspection=Date.now()+(health.pages?.some(p=>p.modelCheck==='transition')?1000:30000);}
    } catch(error){
      offline++;
      if(offline===1){last='';previousInjection='';appearanceReady.clear();appearanceRetry.clear();fs.writeFileSync(path.join(state,'last-status.json'),JSON.stringify({enabled:false,state:'waiting-for-client'}));}
      // Keep the heartbeat fresh while Codex is closed, so the tray can distinguish
      // a healthy waiting watcher from a stopped watcher.
      if(offline===1||Date.now()>=nextInspection){writeHealth(summarize([],error.message));nextInspection=Date.now()+30000;}
    }
    await sleep(1000);
  }
  lock.close();
  if(fs.existsSync(path.join(state,'watcher.pid'))&&fs.readFileSync(path.join(state,'watcher.pid'),'utf8')===String(process.pid))fs.rmSync(path.join(state,'watcher.pid'),{force:true});
} else if(action==='verify') {
  let report;
  try{report=await inspect(await targets());}catch(error){report=summarize([],error.message);writeHealth(report);}
  console.log(JSON.stringify(report));process.exitCode=report.ready?0:report.state==='incompatible'?3:2;
} else if(action==='reload') {
  const pages=await targets();
  for(const target of pages)console.log(JSON.stringify(await evaluate(target,injection())));
  console.log(JSON.stringify(await inspect(pages)));
} else if(action==='probe') {
  for(const t of await targets())console.log(JSON.stringify(await evaluate(t,`(()=>({kind:document.documentElement.getAttribute('data-codex-window-type'),style:!!document.getElementById('green-room-style'),background:getComputedStyle(document.body).backgroundColor,editors:[...document.querySelectorAll('.composer-wrap .ProseMirror,[class*="ComposerLayoutRoot_"] .ProseMirror')].map(e=>({color:getComputedStyle(e).color,font:getComputedStyle(e).fontFamily}))}))()`)));
} else {throw Error('Unknown action')}
} catch(error) {
  let report;
  try{report=await inspect(await targets());}catch{report=summarize([],error.message);}
  if(report.ready)report={...report,ready:false,compatible:false,state:'loading-failed',message:action==='appearance-restore'?'无法恢复客户端原生外观。恢复备份已保留，请检查当前版本的主题适配。':'主题操作未完成，请检查客户端连接后从托盘重新开启主题。'};
  writeHealth(report);console.error(report.message);process.exitCode=report.state==='incompatible'?3:1;
}
