/* Cached glyphs and ribbon sprites keep expensive text/glow work out of frames. */
(() => {
  if (window.__greenRoomEffects) return;
  const canvas = document.createElement('canvas');
  canvas.id='green-room-flow';canvas.setAttribute('aria-hidden','true');
  document.body.prepend(canvas);
  const ctx=canvas.getContext('2d');if(!ctx){canvas.remove();return;}
  const logo=document.createElement('div');logo.id='green-room-logo';logo.setAttribute('aria-hidden','true');
  logo.innerHTML="<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"149 149 418 418\" fill=\"none\"><mask id=\"green-room-logo-mask\" fill=\"white\"><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M247.429 247.43C257.73 208.911 292.871 180.543 334.638 180.543C359.555 180.543 382.115 190.64 398.449 206.964C405.906 204.97 413.743 203.905 421.829 203.905C471.681 203.906 512.096 244.32 512.096 294.173C512.096 302.259 511.031 310.096 509.037 317.553C525.361 333.887 535.458 356.446 535.458 381.364C535.458 423.131 507.09 458.271 468.571 468.572C458.271 507.091 423.131 535.459 381.364 535.459C356.446 535.459 333.886 525.362 317.552 509.037C310.095 511.031 302.258 512.097 294.172 512.097C244.319 512.097 203.906 471.682 203.906 421.829C203.906 413.743 204.969 405.905 206.963 398.448C190.639 382.115 180.543 359.555 180.543 334.638C180.543 292.871 208.91 257.73 247.429 247.43Z\"/></mask><path d=\"M247.429 247.43L252.746 267.312L264.238 264.239L267.311 252.747L247.429 247.43ZM334.638 180.543L334.638 159.962L334.638 159.962L334.638 180.543ZM398.449 206.964L383.9 221.521L392.297 229.913L403.765 226.846L398.449 206.964ZM421.829 203.905L421.829 183.325L421.829 183.325L421.829 203.905ZM512.096 294.173L532.677 294.173L532.677 294.173L512.096 294.173ZM509.037 317.553L489.155 312.236L486.087 323.705L494.48 332.102L509.037 317.553ZM535.458 381.364L556.039 381.364L556.039 381.364L535.458 381.364ZM468.571 468.572L463.255 448.69L451.762 451.763L448.689 463.255L468.571 468.572ZM381.364 535.459L381.364 556.04L381.364 556.04L381.364 535.459ZM317.552 509.037L332.101 494.481L323.704 486.088L312.235 489.155L317.552 509.037ZM294.172 512.097L294.172 532.678L294.173 532.678L294.172 512.097ZM203.906 421.829L183.325 421.829L183.325 421.829L203.906 421.829ZM206.963 398.448L226.845 403.765L229.912 392.297L221.52 383.9L206.963 398.448ZM180.543 334.638L159.962 334.638L159.962 334.639L180.543 334.638ZM247.429 247.43L267.311 252.747C275.266 223.003 302.423 201.124 334.638 201.124L334.638 180.543L334.638 159.962C283.319 159.962 240.195 194.819 227.547 242.113L247.429 247.43ZM334.638 180.543L334.638 201.124C353.88 201.124 371.268 208.896 383.9 221.521L398.449 206.964L412.997 192.407C392.962 172.383 365.231 159.962 334.638 159.962L334.638 180.543ZM398.449 206.964L403.765 226.846C409.506 225.311 415.557 224.486 421.829 224.486L421.829 203.905L421.829 183.325C411.929 183.325 402.305 184.629 393.132 187.082L398.449 206.964ZM421.829 203.905L421.828 224.486C460.315 224.486 491.516 255.687 491.516 294.173L512.096 294.173L532.677 294.173C532.677 232.953 483.048 183.325 421.829 183.325L421.829 203.905ZM512.096 294.173L491.516 294.173C491.516 300.444 490.69 306.494 489.155 312.236L509.037 317.553L528.919 322.87C531.372 313.698 532.677 304.074 532.677 294.173L512.096 294.173ZM509.037 317.553L494.48 332.102C507.105 344.735 514.877 362.122 514.877 381.364L535.458 381.364L556.039 381.364C556.039 350.771 543.618 323.04 523.594 303.005L509.037 317.553ZM535.458 381.364L514.877 381.364C514.877 413.578 492.999 440.735 463.255 448.69L468.571 468.572L473.888 488.454C521.182 475.806 556.039 432.683 556.039 381.364L535.458 381.364ZM468.571 468.572L448.689 463.255C440.735 492.999 413.578 514.878 381.364 514.878L381.364 535.459L381.364 556.04C432.683 556.04 475.806 521.183 488.454 473.889L468.571 468.572ZM381.364 535.459L381.364 514.878C362.122 514.878 344.733 507.106 332.101 494.481L317.552 509.037L303.003 523.594C323.038 543.619 350.77 556.04 381.364 556.04L381.364 535.459ZM317.552 509.037L312.235 489.155C306.493 490.691 300.443 491.516 294.172 491.516L294.172 512.097L294.173 532.678C304.073 532.678 313.698 531.372 322.869 528.919L317.552 509.037ZM294.172 512.097L294.172 491.516C255.686 491.516 224.486 460.316 224.486 421.829L203.906 421.829L183.325 421.829C183.325 483.048 232.953 532.678 294.172 532.678L294.172 512.097ZM203.906 421.829L224.486 421.829C224.486 415.555 225.311 409.504 226.845 403.765L206.963 398.448L187.081 393.131C184.627 402.307 183.325 411.932 183.325 421.829L203.906 421.829ZM206.963 398.448L221.52 383.9C208.895 371.268 201.124 353.88 201.124 334.638L180.543 334.638L159.962 334.639C159.962 365.231 172.382 392.962 192.406 412.997L206.963 398.448ZM180.543 334.638L201.124 334.638C201.124 302.423 223.002 275.266 252.746 267.312L247.429 247.43L242.112 227.547C194.818 240.195 159.962 283.319 159.962 334.638L180.543 334.638Z\" fill=\"currentColor\" mask=\"url(#green-room-logo-mask)\"/><path d=\"M436.706 408.738H370.021\" stroke=\"currentColor\" stroke-width=\"24\" stroke-linecap=\"round\"/><path d=\"M276.533 309.154L303.468 357.831C304.433 359.575 304.412 361.698 303.414 363.423L276.533 409.854\" stroke=\"currentColor\" stroke-width=\"24\" stroke-linecap=\"round\"/></svg>";
  document.body.prepend(logo);
  const quotaBadge=document.createElement('div');quotaBadge.id='green-room-quota';quotaBadge.setAttribute('aria-hidden','true');
  quotaBadge.innerHTML='<div class="gr-quota-label"><span data-quota-label="five-hour">—</span><span class="gr-quota-separator">/</span><span data-quota-label="weekly">—</span></div><svg><path class="gr-quota-track"/><path class="gr-quota-track"/><path data-quota-period="five-hour" pathLength="100"/><path data-quota-period="weekly" pathLength="100"/></svg>';document.body.append(quotaBadge);
  const quotaCache=window.__greenRoomQuotaCache ||= {account:'',five:null,week:null};
  let quotaAccountKey=quotaCache.account,quotaFiveHour=quotaCache.five,quotaWeekly=quotaCache.week;
  let quotaDisposed=false,quotaPending=false,quotaRefreshAt=0;
  const quotaAbort=new AbortController();
  async function refreshQuotaFromClient(){
    if(quotaDisposed||quotaPending||!quotaAccountKey||Date.now()<quotaRefreshAt)return;
    quotaPending=true;const account=quotaAccountKey;
    try{
      const client=await window.__greenRoomResolveClient('quota');
      const usage=await client.quota({signal:AbortSignal.any([quotaAbort.signal,AbortSignal.timeout(15000)])});
      if(quotaDisposed||account!==quotaAccountKey)return;
      if(!usage||!Object.hasOwn(usage,'rate_limit')){const error=new Error('额度接口返回结构已变化');error.code='quota-schema-changed';throw error;}
      const windows=[usage?.rate_limit?.primary_window,usage?.rate_limit?.secondary_window].filter(Boolean);
      const remaining=seconds=>{const window=windows.find(w=>w.limit_window_seconds===seconds);return window&&Number.isFinite(window.used_percent)?Math.max(0,Math.min(100,100-window.used_percent)):null;};
      quotaFiveHour=remaining(18000);quotaWeekly=remaining(604800);
      Object.assign(quotaCache,{account:quotaAccountKey,five:quotaFiveHour,week:quotaWeekly});
      quotaBadge.dataset.source='client-api';quotaBadge.dataset.status='ready';delete quotaBadge.dataset.error;quotaRefreshAt=Date.now()+60000;positionQuota();
    }catch(error){
      if(quotaDisposed||account!==quotaAccountKey)return;
      quotaFiveHour=null;quotaWeekly=null;Object.assign(quotaCache,{five:null,week:null});positionQuota();
      quotaBadge.dataset.status='unavailable';
      quotaBadge.dataset.error=error.code==='client-api-changed'||error.code==='quota-schema-changed'?'客户端额度接口或返回结构已变化，请更新主题适配。':'额度暂时读取失败，请检查网络或登录状态；稍后会自动重试。';
      quotaRefreshAt=Date.now()+15000;
    }
    finally{quotaPending=false;}
  }
  const quotaTimer=setInterval(()=>{if(!document.hidden)refreshQuotaFromClient();},5000);
  const powerWarning=document.createElement('div');powerWarning.id='green-room-power-warning';powerWarning.setAttribute('aria-hidden','true');
  powerWarning.innerHTML='<svg viewBox="0 1 20 18" fill="none"><path d="M10 2L19 18H1L10 2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M10 7V11.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="14.5" r="1" fill="currentColor"/></svg><span></span>';document.body.append(powerWarning);
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const chars='01ABCDEF789',random=(a,b)=>a+Math.random()*(b-a);
  const atlas=document.createElement('canvas');atlas.width=chars.length*24;atlas.height=30;
  const ac=atlas.getContext('2d');ac.font='12px Consolas, monospace';ac.fillStyle='#41ff97';ac.shadowColor='#32ff8c59';ac.shadowBlur=4;
  [...chars].forEach((c,i)=>ac.fillText(c,i*24+6,19));
  const ribbon=document.createElement('canvas');ribbon.width=30;ribbon.height=1024;
  const rc=ribbon.getContext('2d'),gradient=rc.createLinearGradient(0,0,0,1024);
  gradient.addColorStop(0,'rgba(109,255,177,.55)');gradient.addColorStop(.08,'rgba(55,248,137,.34)');gradient.addColorStop(.4,'rgba(33,209,112,.13)');gradient.addColorStop(1,'rgba(33,209,112,0)');
  rc.fillStyle=gradient;rc.shadowColor='#3fff8e59';rc.shadowBlur=9;rc.fillRect(14,0,1.4,1024);
  const base=document.createElement('canvas');
  let fastMode=false;
  const edges=document.createElement('div');edges.id='green-room-edge-alert';edges.setAttribute('aria-hidden','true');
  edges.innerHTML='<div class="gr-edge-haze"></div><span class="gr-edge-left"></span><span class="gr-edge-top"></span><span class="gr-edge-right"></span><span class="gr-edge-bottom"></span>';document.body.prepend(edges);
  let width=0,height=0,columns=[],frame=0,last=0,ticks=0,launches=0,resizeTimer=0;
  let totalDrawMs=0,maxDrawMs=0;
  function resize(){
    width=innerWidth;height=innerHeight;
    const dpr=Math.min(devicePixelRatio||1,1.5);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    base.width=canvas.width;base.height=canvas.height;
    const bc=base.getContext('2d');bc.setTransform(dpr,0,0,dpr,0,0);bc.globalAlpha=.025;
    const count=Math.ceil(Math.ceil(width/52)*1.4),spacing=width/count;
    columns=Array.from({length:count},(_,i)=>{
      const tail=random(height*.45,height*.8),phase=random(0,30),x=i*spacing+random(3,spacing*.65);
      const glyphs=Array.from({length:Math.ceil(height/19)},(_,j)=>(j+Math.floor(phase))%chars.length);
      glyphs.forEach((g,j)=>bc.drawImage(atlas,g*24,0,24,30,x-6,j*19-7,24,30));
      return {x,y:height+24-random(0,(height+tail)*.9),speed:random(145,235),tail,phase,wait:0,glyphs};
    });
    positionLogo();
    positionPowerWarning();positionQuota();
  }
  function alignmentCenter(){
    const native=[...document.querySelectorAll('[data-testid="home-icon"]')].find(e=>e.getBoundingClientRect().width>0);
    const surface=[...document.querySelectorAll('[class*="MainContentSurface_"]')].find(e=>e.getBoundingClientRect().width>0);
    const r=(native||surface)?.getBoundingClientRect();
    return r?r.left+r.width/2:innerWidth/2;
  }
  function positionLogo(){
    positionPowerWarning();
    const bottom=parseFloat(powerWarning.style.top);
    const textHeight=parseFloat(powerWarning.style.fontSize)*1.4;
        const textRect=powerWarning.querySelector('span').getBoundingClientRect();
        let textCenter=textRect.width?textRect.left+textRect.width/2:alignmentCenter();
    if(textRect.width){
      const span=powerWarning.querySelector('span'),style=getComputedStyle(span);
      const content=getComputedStyle(span,'::before').content;
      const text=content.slice(1,-1);
      const measure=document.createElement('canvas').getContext('2d');
      measure.font=style.font;
      const metrics=measure.measureText(text);
      textCenter+=(metrics.actualBoundingBoxRight-metrics.actualBoundingBoxLeft-metrics.width)/2;
    }
    const svg=logo.querySelector('svg'),bounds=svg.getBBox(),view=svg.viewBox.baseVal;
    const graphicOffset=((bounds.x+bounds.width/2)-(view.x+view.width/2))*94.64/view.width;
    logo.style.left=(textCenter-graphicOffset)+'px';
    logo.style.top=(Number.isFinite(bottom)?bottom-textHeight-16-47.32:innerHeight/2-44)+'px';
  }
  function positionQuota(){
    const profile=[...document.querySelectorAll('button[aria-haspopup="menu"]')].find(e=>{
      const r=e.getBoundingClientRect();return e.querySelector('img')&&r.width>0&&r.x<100&&r.y>innerHeight-150;
    });
    if(!profile){quotaBadge.style.display='none';return;}
    const image=profile.querySelector('img');
    const accountKey=(image?.getAttribute('src')||'')+'|'+(profile.getAttribute('aria-label')||'');
    if(quotaAccountKey&&accountKey!==quotaAccountKey){quotaFiveHour=null;quotaWeekly=null;quotaRefreshAt=0;}
    quotaAccountKey=accountKey;
    refreshQuotaFromClient();
    Object.assign(quotaCache,{account:quotaAccountKey,five:quotaFiveHour,week:quotaWeekly});
    for(const [period,value] of [['five-hour',quotaFiveHour],['weekly',quotaWeekly]]){
      const ring=quotaBadge.querySelector('[data-quota-period="'+period+'"]');
      const amount=value===null?0:Math.max(0,Math.min(100,Number(value)));
      ring.style.strokeDasharray=amount+' 100';ring.style.opacity=value===null||amount<=0?'0':'1';
      ring.setAttribute('data-remaining',value===null?'unknown':String(amount));
      quotaBadge.querySelector('[data-quota-label="'+period+'"]').textContent=value===null?'—':Math.round(amount)+'%';
    }
    const r=profile.getBoundingClientRect(),nativeStyle=getComputedStyle(profile),width=r.width+8,height=r.height+8;
    const radii=['borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'].map(key=>{
      const value=nativeStyle[key];return Math.min(r.width,r.height)/2*(value.includes('%')?parseFloat(value)/50:0)+(value.includes('%')?0:parseFloat(value)||0);
    });
    const outline=offset=>{
      const x=4-offset,y=4-offset,w=r.width+offset*2,h=r.height+offset*2;
      const [tl,tr,br,bl]=radii.map(radius=>Math.max(0,Math.min(radius+offset,w/2,h/2)));
      return `M ${x+w/2} ${y} H ${x+w-tr} A ${tr} ${tr} 0 0 1 ${x+w} ${y+tr} V ${y+h-br} A ${br} ${br} 0 0 1 ${x+w-br} ${y+h} H ${x+bl} A ${bl} ${bl} 0 0 1 ${x} ${y+h-bl} V ${y+tl} A ${tl} ${tl} 0 0 1 ${x+tl} ${y} Z`;
    };
    const svg=quotaBadge.querySelector('svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    const paths=[outline(0),outline(-3)];
    svg.querySelectorAll('.gr-quota-track').forEach((path,i)=>path.setAttribute('d',paths[i]));
    svg.querySelector('[data-quota-period="five-hour"]').setAttribute('d',paths[0]);
    svg.querySelector('[data-quota-period="weekly"]').setAttribute('d',paths[1]);
    quotaBadge.style.display='block';quotaBadge.style.width=width+'px';quotaBadge.style.height=height+'px';
    quotaBadge.style.setProperty('--gr-quota-label-size',Math.max(7,Math.min(10,width*.14))+'px');
    quotaBadge.style.left=(r.left-4)+'px';quotaBadge.style.top=(r.top-4)+'px';
    quotaBadge.setAttribute('data-label','5小时 '+(quotaFiveHour??'—')+'% / 1周 '+(quotaWeekly??'—')+'%');
  }
  function syncPulseAnimations(){
    const master=logo.getAnimations().find(a=>a.animationName==='green-room-red-breathe');
    if(master?.startTime==null)return;
    const targets=[[powerWarning,'green-room-red-breathe']];
    for(const warning of document.querySelectorAll('.green-room-warning'))targets.push([warning,'green-room-red-breathe']);
    for(const bolt of document.querySelectorAll('[data-green-room-fast-enabled] svg:not(.green-room-warning-icon)'))targets.push([bolt,'green-room-bolt-glow']);
    for(const edge of edges.querySelectorAll('span')){
      const travel=edge.matches('.gr-edge-bottom')?'gr-edge-run-x-reverse':edge.matches('.gr-edge-left')?'gr-edge-run-y-reverse':edge.matches('.gr-edge-top')?'gr-edge-run-x':'gr-edge-run-y';
      targets.push([edge,travel],[edge,'gr-edge-pulse']);
    }
    targets.push([edges.querySelector('.gr-edge-haze'),'gr-edge-haze-breathe']);
    for(const [element,name] of targets){
      const animation=element?.getAnimations().find(a=>a.animationName===name);
      if(animation&&animation.startTime!==master.startTime)animation.startTime=master.startTime;
    }
  }
  function positionPowerWarning(){
    const editor=[...document.querySelectorAll('.ProseMirror[contenteditable="true"],textarea')].find(e=>e.getBoundingClientRect().width>0);
    const composer=editor?.closest('[class*="ComposerLayoutRoot_"],.composer-wrap');
    if(!composer){powerWarning.style.display='none';syncPulseAnimations();return;}
    const r=composer.getBoundingClientRect();
    const center=alignmentCenter();
    powerWarning.style.left=center+'px';powerWarning.style.top=(r.top-52)+'px';
    powerWarning.style.maxWidth=Math.max(100,2*Math.min(center,innerWidth-center)-80)+'px';
    powerWarning.style.fontSize=(parseFloat(getComputedStyle(editor).fontSize)*1.3)+'px';
    powerWarning.style.display=document.documentElement.hasAttribute('data-green-room-astra-power')?'flex':'none';
    syncPulseAnimations();
  }
  function draw(now){
    const start=performance.now(),dt=last?Math.min((now-last)/1000,.08):0;last=now;
    const activeBase=base,activeAtlas=atlas,activeRibbon=ribbon;
    ctx.clearRect(0,0,width,height);ctx.globalAlpha=1;ctx.drawImage(activeBase,0,0,activeBase.width,activeBase.height,0,0,width,height);
    for(const c of columns){
      if(!motion.matches){if(c.wait>0)c.wait-=dt;else c.y-=c.speed*dt;}
      if(c.y+c.tail < -35){c.y=height+24;c.wait=random(.15,1.2);launches++;}
      ctx.globalAlpha=1;ctx.drawImage(activeRibbon,c.x-11,c.y,30,c.tail);
      const from=Math.max(0,Math.ceil((c.y-12)/19)),to=Math.min(c.glyphs.length-1,Math.floor((c.y+c.tail-12)/19));
      for(let j=from;j<=to;j++){
        const y=j*19+12,d=(y-c.y)/c.tail;
        const beam=(1-d)*(1-d),shimmer=.85+.15*Math.sin(now*.003+c.phase+j*1.7);
        ctx.globalAlpha=beam*.43*shimmer;
        const g=(c.glyphs[j]+Math.floor(now/(430+j*31)))%chars.length;
        ctx.drawImage(activeAtlas,g*24,0,24,30,c.x-6,y-19,24,30);
        if(j%5===0){ctx.globalAlpha*=.45;ctx.fillStyle='#4aff9d';ctx.fillRect(c.x-3,y+4,13,2);}
      }
    }
    ctx.globalAlpha=1;ticks++;const elapsed=performance.now()-start;totalDrawMs+=elapsed;maxDrawMs=Math.max(maxDrawMs,elapsed);
    if(!motion.matches&&!document.hidden)frame=requestAnimationFrame(draw);
  }
  function restart(){cancelAnimationFrame(frame);last=0;if(!document.hidden)frame=requestAnimationFrame(draw);}
  function scheduleResize(){clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{resize();restart();},100);}
  const observer=new ResizeObserver(positionLogo);
  let pickerFrame=0;
  function updatePicker(){
    pickerFrame=0;
    let menuFast=null,menuPower=null;
    for(const menu of document.querySelectorAll('[class*="Menu_"]:has([data-model-picker-power-slider]),[class*="Menu_"]:has([class*="FastModeToggle_"])')){
      const label=menu.querySelector('[class*="ViewToggleEffortLabel_"]');
      const ultra=label?.textContent.trim().toLowerCase()==='ultra';
      menu.toggleAttribute('data-green-room-ultra',ultra);
      for(const bolt of menu.querySelectorAll('[class*="FastModeToggle_"]')){
        const active=bolt.matches('[data-fast-mode-enabled="true"]')||!!bolt.querySelector('[data-fast-mode-enabled="true"]');
        bolt.toggleAttribute('data-green-room-fast-enabled',active);
        if(bolt.getBoundingClientRect().width&&!bolt.closest('[data-active="false"]'))menuFast=active;
        if(!bolt.querySelector('.green-room-warning')){
          const warning=document.createElement('span');warning.className='green-room-warning';warning.setAttribute('aria-hidden','true');
          warning.innerHTML='<svg class="green-room-warning-icon" viewBox="0 1 20 18" fill="none"><path d="M10 2L19 18H1L10 2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M10 7V11.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="14.5" r="1" fill="currentColor"/></svg><span class="green-room-warning-text"></span>';
          bolt.append(warning);
        }
      }
      for(const bar of menu.querySelectorAll('[data-model-picker-power-slider]')){
        const thumb=bar.querySelector('[role="slider"][aria-valuenow]');
        const value=Number(thumb?.getAttribute('aria-valuenow'));
        const max=Number(thumb?.getAttribute('aria-valuemax'));
        const min=Number(thumb?.getAttribute('aria-valuemin'));
        bar.toggleAttribute('data-green-room-full-power',!!thumb&&max>min&&value>=max);
        if(bar.getBoundingClientRect().width&&!bar.closest('[data-active="false"]'))menuPower=!!thumb&&max>min&&value>=max;
      }
    }
    const trigger=[...document.querySelectorAll('[data-codex-intelligence-trigger]')].find(e=>e.getBoundingClientRect().width>0);
    const stable=trigger?.querySelector('[class*="ModelPickerTriggerModelGroup_"]')&&!trigger.matches('[data-daybreak-animation]')&&!trigger.querySelector('[data-daybreak-indicator]');
    const nextFast=menuFast??(stable?!!trigger.querySelector('svg[class*="ModelPickerTriggerInlineModeIcon_"]'):fastMode);
    const changed=fastMode!==nextFast;fastMode=nextFast;
    document.documentElement.toggleAttribute('data-green-room-overload',fastMode);
    const modelText=trigger?.querySelector('[class*="ModelPickerTriggerModelText_"]')?.textContent||'';
    const effort=trigger?.getAttribute('data-selected-reasoning-effort');
    const maxEffort=[...trigger?.querySelectorAll('[data-reasoning-effort][data-max-effort="true"]')||[]].some(e=>e.getAttribute('data-reasoning-effort')===effort);
    document.documentElement.toggleAttribute('data-green-room-astra-power',!!stable&&fastMode&&/^GPT[- ]6[ .-]Astra$/i.test(modelText.trim())&&(menuPower??maxEffort));
    positionPowerWarning();
    positionLogo();positionQuota();if(changed&&motion.matches)restart();
  }
  const pickerObserver=new MutationObserver(()=>{if(!pickerFrame)pickerFrame=requestAnimationFrame(updatePicker);});
  pickerObserver.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-valuenow','aria-valuemax','aria-valuemin','data-fast-mode-enabled','data-daybreak-animation','data-selected-reasoning-effort','data-max-effort','data-daybreak-indicator','data-active','aria-expanded','data-state','class']});
  const surface=document.querySelector('[data-app-shell-workspace-row]');if(surface)observer.observe(surface);
  const visibility=()=>{if(document.hidden)cancelAnimationFrame(frame);else restart();};
  resize();updatePicker();restart();addEventListener('resize',scheduleResize);motion.addEventListener('change',restart);document.addEventListener('visibilitychange',visibility);
  window.__greenRoomEffects={get ticks(){return ticks},get stats(){return {columns:columns.length,previousColumns:Math.ceil(width/52),launches,direction:'bottom-to-top',heads:columns.map(c=>c.y),meanDrawMs:ticks?totalDrawMs/ticks:0,maxDrawMs,logoSize:94.64,fastMode}},destroy(){quotaDisposed=true;quotaAbort.abort();clearInterval(quotaTimer);cancelAnimationFrame(frame);cancelAnimationFrame(pickerFrame);pickerObserver.disconnect();clearTimeout(resizeTimer);observer.disconnect();removeEventListener('resize',scheduleResize);motion.removeEventListener('change',restart);document.removeEventListener('visibilitychange',visibility);document.querySelectorAll('.green-room-warning').forEach(e=>e.remove());document.querySelectorAll('[data-green-room-fast-enabled]').forEach(e=>e.removeAttribute('data-green-room-fast-enabled'));document.documentElement.removeAttribute('data-green-room-overload');document.documentElement.removeAttribute('data-green-room-astra-power');powerWarning.remove();canvas.remove();logo.remove();quotaBadge.remove();edges.remove();delete window.__greenRoomEffects;}};
})();
