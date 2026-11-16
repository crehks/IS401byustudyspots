/* Impact dashboard: the four Key Results, read live from the okr_metrics() aggregate function.
 * The page never reads raw events or sign-ins; it only gets counts and averages. */
(function(scope) {
  'use strict';
  // Baselines and targets live here only. A lower-is-better KR is just a target below its baseline.
  const OKR_CONFIG={
    pollMs:5000,
    objectives:[
      {id:'o1',label:'Objective 1',title:'Reduce friction and frustration for students by showing study spots that fit their needs',krs:[
        {id:'o1k1',tag:'O1-KR1',text:'Increase the percentage of students who report an available study spot on arrival from 0% to 50%.',baseline:0,target:50,unit:'%',baselineText:'0%',targetText:'50%',source:'Arrival reports: "Was this spot available?"'},
        {id:'o1k2',tag:'O1-KR2',text:'Reduce the average time students take to choose a study spot in the app from 3 minutes to 60 seconds.',baseline:180,target:60,unit:'s',baselineText:'3 min',targetText:'60 s',source:'Friction proxy: time from opening the app to "Choose this spot"'}]},
      {id:'o2',label:'Objective 2',title:'Provide a consistent, quality experience for long-term users',krs:[
        {id:'o2k1',tag:'O2-KR1',text:'Increase the percentage of registered users who visit the app 2+ separate times within 14 days from 0% to 50%.',baseline:0,target:50,unit:'%',baselineText:'0%',targetText:'50%',source:'Visits by registered users (sign-ins and returns), last 14 days'},
        {id:'o2k2',tag:'O2-KR2',text:'Increase the percentage of registered users who submit more than one report within 14 days from 0% to 40%.',baseline:0,target:40,unit:'%',baselineText:'0%',targetText:'40%',source:'Reports by registered users, last 14 days'}]}
    ]
  };
  const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
  // Share of the way from baseline to target, 0-100. The same formula covers the inverse KR2 (180 s down to 60 s).
  function progressPct(baseline,target,current) {
    if(current===null||baseline===target)return 0;
    return Math.round(clamp((current-baseline)/(target-baseline)*100,0,100)*10)/10;
  }
  const plural=(n,one,many)=>`${n} ${n===1?one:many}`;
  // Turn the raw aggregate for one KR into what its card shows.
  function describe(kr,metrics) {
    const m=metrics?.[kr.id]||{};
    if(kr.id==='o1k2') {
      const n=num(m.n)||0,avg=n?num(m.avg_seconds):null;
      return {current:avg,currentText:avg===null?'No data yet':`${Math.round(avg)} s`,progress:progressPct(kr.baseline,kr.target,avg),counts:n?`Average of ${plural(n,'choice','choices')}`:'No spot choices recorded yet',hasData:avg!==null};
    }
    if(kr.id==='o1k1') {
      const answered=num(m.answered)||0,available=num(m.available)||0,pct=answered?Math.round(available/answered*1000)/10:0;
      return {current:pct,currentText:answered?`${pct}%`:'No data yet',progress:progressPct(kr.baseline,kr.target,pct),counts:answered?`${available} of ${plural(answered,'arrival report','arrival reports')} said the spot was available`:'No arrival reports answered yet',hasData:answered>0};
    }
    const registered=num(m.registered)||0,users=num(m.users)||0,pct=registered?Math.round(users/registered*1000)/10:0;
    const what=kr.id==='o2k1'?'visited 2+ separate times':'submitted 2+ reports';
    return {current:pct,currentText:registered?`${pct}%`:'No data yet',progress:progressPct(kr.baseline,kr.target,pct),counts:registered?`${users} of ${plural(registered,'registered user','registered users')} ${what} in the last 14 days`:'No registered users yet',hasData:registered>0};
  }
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  scope.StudyOkr={OKR_CONFIG,progressPct,describe,esc};

  if(typeof document==='undefined'||!document.getElementById('okrApp'))return;
  const $=id=>document.getElementById(id);
  const all=OKR_CONFIG.objectives.flatMap(o=>o.krs);
  function build() {
    $('okrApp').innerHTML=OKR_CONFIG.objectives.map(o=>`<section class="objective" aria-labelledby="${o.id}-h"><p class="kicker">${esc(o.label)}</p><h2 id="${o.id}-h">${esc(o.title)}</h2><div class="kr-grid">${o.krs.map(kr=>`<article class="kr" id="${kr.id}" aria-labelledby="${kr.id}-h"><h3 id="${kr.id}-h"><span class="tag">${esc(kr.tag)}</span>${esc(kr.text)}</h3><div class="kr-values"><div><span class="lbl">Baseline</span><span class="v">${esc(kr.baselineText)}</span></div><div class="now"><span class="lbl">Current</span><span class="v val" id="${kr.id}-val">…</span></div><div><span class="lbl">Target</span><span class="v">${esc(kr.targetText)}</span></div></div><div class="bar" role="progressbar" aria-labelledby="${kr.id}-h" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="0% of the way to target" id="${kr.id}-bar"><span id="${kr.id}-fill" style="width:0%"></span></div><p class="pct" id="${kr.id}-pct">0% of the way to target</p><p class="counts" id="${kr.id}-counts">Loading…</p><p class="source">${esc(kr.source)}</p></article>`).join('')}</div></section>`).join('');
  }
  const last={};
  function flash(el) {el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1500);}
  function update(metrics) {
    for(const kr of all) {
      const d=describe(kr,metrics),val=$(`${kr.id}-val`),key=`${d.currentText}|${d.counts}`;
      val.textContent=d.currentText;$(`${kr.id}-counts`).textContent=d.counts;
      $(`${kr.id}-fill`).style.width=`${d.progress}%`;
      const bar=$(`${kr.id}-bar`);bar.setAttribute('aria-valuenow',String(Math.round(d.progress)));bar.setAttribute('aria-valuetext',`${d.progress}% of the way to target`);
      $(`${kr.id}-pct`).textContent=`${d.progress}% of the way to target`;
      if(kr.id in last&&last[kr.id]!==key){flash(val);flash($(kr.id));}
      last[kr.id]=key;
    }
  }
  const database=new scope.StudyDatabase(),auth=new scope.StudyAuth(database);
  let busy=false,built=false;
  // The database decides who may read the numbers; this only chooses what to show a refused visitor.
  function showGate() {
    $('okrApp').hidden=true;$('okrGate').hidden=false;
    const asking=auth.signedIn&&auth.isAdmin;
    $('gateTitle').textContent=asking?'Enter your admin code':auth.signedIn?'Admin account needed':'Admins only';
    $('gateText').textContent=asking?'Your admin session is locked. Enter your code to see the numbers.':auth.signedIn?'This account does not have admin access.':'Log in on the main site with an admin account, then reload this page.';
    $('gateForm').hidden=!asking;
    $('okrUpdated').textContent='Locked';$('okrUpdated').classList.remove('is-error');
    if(asking&&document.activeElement===document.body)$('gateCode').focus();
  }
  function showDashboard() {
    $('okrGate').hidden=true;$('okrApp').hidden=false;
    if(!built){build();built=true;}
  }
  async function poll() {
    if(busy||document.visibilityState==='hidden')return;
    busy=true;
    try {
      if(!database.config.configured){database.config=await database.loadConfig();await auth.restore();}
      const metrics=await database.loadOkrs();
      showDashboard();update(metrics);
      $('okrUpdated').textContent=`Last updated ${new Date().toLocaleTimeString()}`;$('okrUpdated').classList.remove('is-error');
    } catch(error) {
      if(error.denied)showGate();
      else{$('okrUpdated').textContent=`Could not refresh: ${error.message}`;$('okrUpdated').classList.add('is-error');}
    } finally {busy=false;}
  }
  $('gateForm').addEventListener('submit',async event=>{
    event.preventDefault();
    const input=$('gateCode'),button=event.target.querySelector('button'),error=$('gateError');
    if(!input.value||button.disabled)return;
    button.disabled=true;error.hidden=true;
    try {
      const response=await database.request(`${database.config.url}/rest/v1/rpc/unlock_admin`,{method:'POST',headers:database.headers({'Content-Type':'application/json'}),body:JSON.stringify({code:input.value})});
      const ok=response.ok&&await response.json()===true;
      input.value='';
      if(ok)await poll();
      else{error.textContent='That code did not work. Five wrong tries lock the account for 15 minutes.';error.hidden=false;}
    } catch(problem) {error.textContent=problem.message;error.hidden=false;}
    finally {button.disabled=false;}
  });
  $('okrUpdated').textContent='Checking access…';
  void poll();
  setInterval(poll,OKR_CONFIG.pollMs);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void poll();});
})(typeof window==='undefined'?globalThis:window);
