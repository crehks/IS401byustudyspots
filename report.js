/* Report a Spot page. Same questions as the old dialog, plus a draggable pin on the floor plan.
 * The pin works like the dev page: it is stored as a percent of the drawing, so it stays put at any zoom.
 * Submissions go to SpotSubmission as 'pending' through StudyDatabase.submitSpot. Nothing here edits the
 * public catalogue; the team reviews each report before it can appear on the map.
 */
(()=>{
'use strict';
const $=selector=>document.querySelector(selector);
const esc=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Buildings with digitized floor plans. Keys match database.js (HBLL/WSC/JKB).
const BUILDINGS={
  HBLL:{name:'Harold B. Lee Library',global:'HBLL_PLANS',file:'hbll-plans.js?v=20261009',start:'L3'},
  WSC:{name:'Wilkinson Student Center',global:'WSC_PLANS',file:'wsc-plans.js?v=20261007',start:'2E'},
  JKB:{name:'Jesse Knight Building',global:'JKB_PLANS',file:'jkb-plans.js?v=20261009',start:'G'}
};
const MIN_ZOOM=1,MAX_ZOOM=3,ZOOM_STEP=0.5;
const state={building:'HBLL',key:null,zoom:1,pin:null,roomName:'',nameEdited:false,sent:false,pending:false,loadId:0};

// report.html?building=HBLL&floor=L3 (sent from a building page) starts on that building and floor.
{const q=new URLSearchParams(window.location.search),b=q.get('building');if(b&&BUILDINGS[b]){state.building=b;state.wantedFloor=(q.get('floor')||'').slice(0,8)}}
const database=new window.StudyDatabase();
const auth=new window.StudyAuth(database);

// Floor-plan bundles are several MB each, so load only the building being reported.
const planLoads={};
function loadPlans(code){
  const set=BUILDINGS[code];
  if(window[set.global])return Promise.resolve();
  return planLoads[code]??=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=set.file;script.onload=resolve;
    script.onerror=()=>{delete planLoads[code];script.remove();reject(new Error('The floor plans could not load. Check your connection and try again.'))};
    document.head.appendChild(script);
  });
}
const plansFor=code=>window[BUILDINGS[code].global]||{};
const currentPlan=()=>plansFor(state.building)[state.key]||null;
// Floor number saved with the report: Basement 0, G is Floor 1, otherwise the digits in the sheet key (L2N -> 2).
const floorNumber=key=>/^B/i.test(key)?0:/^G/i.test(key)?1:Number((key.match(/\d+/)||[1])[0]);
const clampPct=value=>Math.min(100,Math.max(0,value));
const round2=value=>Number(clampPct(value).toFixed(2));

// Closest room label to the pin (within 70 drawing units), so the name can be suggested.
function nearestRoom(plan,xPct,yPct){
  const x=xPct/100*plan.width,y=yPct/100*plan.height;
  let best=null,distance=Infinity;
  for(const room of plan.rooms||[]){const d=Math.hypot(room.x-x,room.y-y);if(d<distance){distance=d;best=room}}
  return distance<=70?best:null;
}

// ---- Floor plan and pin -------------------------------------------------------------------
function setHint(text){$('#pinHint').textContent=text}
function applyZoom(){
  $('#reportStage').style.width=`${state.zoom*100}%`;
  $('#reportZoomValue').textContent=`${Math.round(state.zoom*100)}%`;
  $('#reportZoomOut').disabled=state.zoom<=MIN_ZOOM;
  $('#reportZoomIn').disabled=state.zoom>=MAX_ZOOM;
}
function updatePinReadout(){
  const clear=$('#pinClear'),readout=$('#pinReadout');
  if(!state.pin){readout.textContent='No pin yet';clear.hidden=true;return}
  readout.textContent=state.roomName?`Pin placed near room ${state.roomName}`:'Pin placed';
  clear.hidden=state.sent;
}
// Move the pin element and remember where it is; suggest a name from the closest room while the name is untouched.
function setPin(x,y,{suggest=true}={}){
  state.pin=[round2(x),round2(y)];
  const pin=$('#reportPin');
  if(pin){pin.style.left=`${state.pin[0]}%`;pin.style.top=`${state.pin[1]}%`;pin.title=`${state.pin[0]}% across, ${state.pin[1]}% down`}
  const plan=currentPlan(),room=plan?nearestRoom(plan,...state.pin):null;
  state.roomName=room?String(room.number):'';
  if(suggest&&!state.nameEdited){$('#reportName').value=room?`Room ${room.number}`:''}
  updatePinReadout();
}
function pointInStage(event){
  const rect=$('#reportStage').getBoundingClientRect();
  return [(event.clientX-rect.left)/rect.width*100,(event.clientY-rect.top)/rect.height*100];
}
function createPin(){
  const pin=document.createElement('button');
  pin.type='button';pin.id='reportPin';pin.className='report-pin';
  pin.setAttribute('aria-label','Spot location pin. Drag it, or use the arrow keys to move it.');
  pin.innerHTML='<span aria-hidden="true">+</span>';
  let dragging=false;
  pin.addEventListener('pointerdown',event=>{
    if(event.button!==0||state.sent)return;
    event.preventDefault();event.stopPropagation();
    dragging=true;pin.setPointerCapture(event.pointerId);pin.classList.add('is-dragging');
  });
  pin.addEventListener('pointermove',event=>{if(dragging)setPin(...pointInStage(event))});
  const stop=event=>{
    if(!dragging)return;
    dragging=false;pin.classList.remove('is-dragging');
    setPin(...pointInStage(event));
    setHint('Pin moved. Drag it again to fine-tune, then fill in the details.');
  };
  pin.addEventListener('pointerup',stop);
  pin.addEventListener('pointercancel',stop);
  // Keyboard users nudge the pin; Shift moves it further.
  pin.addEventListener('keydown',event=>{
    if(state.sent)return;
    const step=event.shiftKey?2:0.5,moves={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[event.key];
    if(!moves)return;
    event.preventDefault();setPin(state.pin[0]+moves[0],state.pin[1]+moves[1]);
  });
  return pin;
}
function placePin(x,y){
  let pin=$('#reportPin');
  if(!pin){pin=createPin();$('#reportStage').append(pin)}
  setPin(x,y);
  setHint(state.roomName?`Pin dropped next to room ${state.roomName}. Drag it to adjust.`:'Pin dropped. Drag it to adjust, then fill in the details.');
}
function clearPin(){
  $('#reportPin')?.remove();
  state.pin=null;state.roomName='';
  if(!state.nameEdited)$('#reportName').value='';
  updatePinReadout();
  setHint('Click or tap the floor plan to drop a pin, then drag it into place.');
}
function renderPlan(){
  const plan=currentPlan(),stage=$('#reportStage');
  if(!plan){stage.innerHTML='';return}
  stage.innerHTML=plan.svg;
  applyZoom();
}
function fillPlanSelect(){
  const plans=plansFor(state.building),keys=Object.keys(plans);
  // Opened from a building page: start on the floor the student was looking at (Wilkinson 1-3 are split into East/West sheets).
  if(state.wantedFloor){const f=state.wantedFloor;state.wantedFloor='';const match=[f,`${f}E`,`${f}N`].find(k=>plans[k]);if(match)state.key=match}
  if(!plans[state.key])state.key=plans[BUILDINGS[state.building].start]?BUILDINGS[state.building].start:keys[0]||null;
  $('#reportPlan').innerHTML=keys.map(k=>`<option value="${esc(k)}" ${k===state.key?'selected':''}>${esc(plans[k].label)}</option>`).join('');
}
// Switch building or sheet. A pin belongs to one sheet, so it is cleared when the sheet changes.
async function showPlan({keepPin=false}={}){
  const id=++state.loadId,stage=$('#reportStage');
  if(!keepPin)clearPin();
  $('#reportPlan').disabled=true;
  stage.innerHTML='<p class="report-plan-status">Loading floor plans…</p>';
  try{await loadPlans(state.building)}
  catch(problem){
    if(id!==state.loadId)return;
    stage.innerHTML=`<div class="report-plan-status"><p>${esc(problem.message)}</p><button type="button" class="secondary-button" id="planRetry">Try again</button></div>`;
    $('#reportPlan').innerHTML='';
    return;
  }
  if(id!==state.loadId)return;
  fillPlanSelect();renderPlan();
  $('#reportPlan').disabled=false;
}

// ---- Form -----------------------------------------------------------------------------------
function showError(message){const error=$('#reportError');error.textContent=message;error.hidden=!message;if(message)error.scrollIntoView({block:'nearest',behavior:'smooth'})}
function renderConnection(){
  $('#databaseWarning').hidden=database.loading||(!database.error&&database.config.configured&&database.ready);
  $('#reportWho').textContent=auth.signedIn?`Reporting as ${auth.displayName||'your account'}.`:'Reporting as a guest. You do not need an account to report a spot. Log in if you want to track the status of your reports.';
  const login=$('#navAuth');
  if(auth.signedIn){login.textContent='Profile';login.href='index.html?view=profile';login.classList.remove('nav-login')}
  else{login.textContent='Log in';login.href='index.html';login.classList.add('nav-login')}
  if(!$('#panelRecent').hidden&&!database.loading)void loadRecent();
}
function updateTypeFields(){
  const group=$('#reportType').value==='group';
  $('#reportCapacityWrap').hidden=!group;$('#reportCapacity').disabled=!group;
}
function readForm(){
  const f=$('#reportForm').elements,plan=currentPlan(),group=f.type.value==='group';
  return {
    building:state.building,floorNumber:plan?floorNumber(state.key):undefined,floorLabel:plan?.label||'',
    name:f.name.value.trim(),type:f.type.value,capacity:group?Number(f.capacity.value):1,noise:f.noise.value,
    private:f.private.checked,outlets:f.outlets.checked,detail:f.detail.value.trim(),
    planKey:state.key,planX:state.pin?.[0],planY:state.pin?.[1]
  };
}
function validate(input){
  if(!currentPlan())return 'Choose a floor plan first.';
  if(!state.pin)return 'Drop a pin on the floor plan to show where the spot is.';
  if(input.name.length<3)return 'Enter a spot name of at least 3 characters.';
  if(input.type==='group'&&!(input.capacity>=2&&input.capacity<=6))return 'Enter a group size from 2 to 6.';
  return '';
}
function showDone(input,result={status:'pending',reason:''}){
  const plan=currentPlan(),form=$('#reportForm'),done=$('#reportDone');
  const denied=result.status==='rejected';
  state.sent=true;form.classList.add('is-sent');
  const pin=$('#reportPin');pin?.classList.add('is-locked');pin?.setAttribute('tabindex','-1');
  $('#pinClear').hidden=true;$('#mapTitleText').textContent='Your pin';setHint(denied?'This report was not accepted.':'Your pin is saved with this report.');
  done.classList.toggle('is-denied',denied);
  done.innerHTML=`<h2 id="doneTitle">${denied?'We could not accept this report.':'Thanks! Your spot was reported.'}</h2>
    <p class="done-lead">${denied?`Our automatic check flagged it as spam. ${esc(result.reason||'')} If that is a mistake, edit it and try again.`:'We received it and our team will review it. It is not on the map yet. Once someone checks it, it may show up for everyone.'}</p>
    <dl class="done-list">
      <div><dt>Spot</dt><dd>${esc(input.name)}</dd></div>
      <div><dt>Location</dt><dd>${esc(BUILDINGS[input.building].name)} · ${esc(plan?.label||input.floorLabel)}</dd></div>
      <div><dt>Space</dt><dd>${input.type==='group'?`Group up to ${input.capacity}`:'Individual study'} · ${input.noise==='low'?'Quiet':'Social'}${input.private?' · Private':''}${input.outlets?' · Outlets nearby':''}</dd></div>
      ${input.detail?`<div><dt>Details</dt><dd>${esc(input.detail)}</dd></div>`:''}
      <div><dt>Status</dt><dd><span class="done-status${denied?' is-denied':''}">${denied?'Denied':'Pending review'}</span></dd></div>
    </dl>
    ${auth.signedIn?'':'<p class="done-note">Want to see whether it was reviewed? <a href="index.html">Log in</a> next time and your reports will be listed under Recent reports.</p>'}
    <div class="report-actions">${denied?'<button type="button" class="secondary-button" id="reportEdit">Edit and try again</button>':'<button type="button" class="secondary-button" id="reportAnother">Report another spot</button>'}<a class="primary-button" href="index.html">Back to explore</a></div>`;
  done.hidden=false;
  done.scrollIntoView({block:'start',behavior:'smooth'});done.focus({preventScroll:true});
}
// After a denial: bring the form back with everything the student typed, and unlock the pin.
function reopenForm(){
  state.sent=false;
  $('#reportForm').classList.remove('is-sent');
  $('#reportDone').hidden=true;$('#reportDone').innerHTML='';$('#mapTitleText').textContent='Drop a pin';
  const pin=$('#reportPin');pin?.classList.remove('is-locked');pin?.removeAttribute('tabindex');
  updatePinReadout();setHint('Drag the pin to adjust it, then fill in the details.');
  selectTab('plan');$('#reportName').focus();
}
function resetForm(){
  state.sent=false;state.nameEdited=false;
  const form=$('#reportForm');form.classList.remove('is-sent');form.reset();
  $('#reportDone').hidden=true;$('#reportDone').innerHTML='';$('#mapTitleText').textContent='Drop a pin';
  $('#reportBuilding').value=state.building;
  updateTypeFields();showError('');
  clearPin();fillPlanSelect();
  setHint('Click or tap the floor plan to drop a pin, then drag it into place.');
  selectTab('plan');
  $('#reportName').focus();
}
async function submit(event){
  event.preventDefault();
  if(state.pending||state.sent)return;
  const input=readForm(),problem=validate(input);
  if(problem){showError(problem);return}
  const button=$('#reportSubmit');
  state.pending=true;button.disabled=true;button.textContent='Sending…';showError('');
  try{
    await ready;
    const result=await database.submitSpot(input);
    showDone(input,result);
    if(auth.signedIn)selectTab('recent');
  }catch(failure){showError(failure.message)}
  finally{state.pending=false;button.disabled=false;button.textContent='Report spot'}
}

// ---- Recent reports tab (signed-in users see their own reports and review status) ------------------
const STATUS={pending:'Pending',approved:'Added',rejected:'Denied'};
const FILTERS=[['all','All'],['pending','Pending'],['approved','Added'],['rejected','Denied']];
let recentRows=[],recentFilter='all';
const dateText=time=>time?new Date(time).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'';
function selectTab(name){
  const recent=name==='recent';
  $('#tabPlan').classList.toggle('is-selected',!recent);$('#tabRecent').classList.toggle('is-selected',recent);
  $('#tabPlan').setAttribute('aria-selected',String(!recent));$('#tabRecent').setAttribute('aria-selected',String(recent));
  $('#tabPlan').tabIndex=recent?-1:0;$('#tabRecent').tabIndex=recent?0:-1;
  $('#panelPlan').hidden=recent;$('#panelRecent').hidden=!recent;
  if(recent)void loadRecent();
}
async function loadRecent(){
  const list=$('#recentList');
  if(!auth.signedIn){
    list.innerHTML='<div class="recent-empty"><p>Log in to see the reports you have sent and whether our team has reviewed them.</p><a class="primary-button" href="index.html">Log in</a></div>';
    return;
  }
  list.innerHTML='<p class="recent-empty">Loading your reports…</p>';
  try{
    recentRows=await database.loadMySubmissions();
    drawRecent();
  }catch(problem){
    const denied=/denied/i.test(problem.message);
    list.innerHTML=`<p class="recent-empty">${denied?'Report tracking is not switched on for this database yet. Your reports are still being sent and reviewed.':`Your reports could not be loaded right now. ${esc(problem.message)}`}</p>`;
  }
}
// Every past report with its outcome, filterable by status.
function drawRecent(){
  const list=$('#recentList');
  if(!recentRows.length){list.innerHTML='<p class="recent-empty">You have not reported a spot yet. Reports you send will show up here.</p>';return}
  const count=key=>key==='all'?recentRows.length:recentRows.filter(r=>r.status===key).length;
  const shown=recentFilter==='all'?recentRows:recentRows.filter(r=>r.status===recentFilter);
  list.innerHTML=`<div class="recent-filters" role="group" aria-label="Filter reports by status">${FILTERS.map(([key,label])=>`<button type="button" class="recent-filter${key===recentFilter?' is-selected':''}" data-filter="${key}" aria-pressed="${key===recentFilter}">${label} <span>${count(key)}</span></button>`).join('')}</div>`
    +(shown.length?`<ul class="recent-items">${shown.map(r=>`<li class="recent-item"><div><strong>${esc(r.name)}</strong><span>${esc(BUILDINGS[r.building]?.name||'Campus')}${r.floor?` · ${esc(r.floor)}`:''}</span><small>Reported ${esc(dateText(r.time))}</small>${r.reason?`<small class="recent-reason">${esc(r.reason)}</small>`:''}</div><span class="status-badge is-${r.status}">${STATUS[r.status]}</span></li>`).join('')}</ul>`:`<p class="recent-empty">No ${STATUS[recentFilter].toLowerCase()} reports.</p>`);
}

// ---- Events and startup ----------------------------------------------------------------------
$('#reportBuilding').innerHTML=Object.entries(BUILDINGS).map(([id,b])=>`<option value="${id}">${esc(b.name)}</option>`).join('');
$('#reportBuilding').value=state.building;
$('#reportBuilding').addEventListener('change',event=>{state.building=event.target.value;state.key=null;state.zoom=1;void showPlan()});
$('#reportPlan').addEventListener('change',event=>{state.key=event.target.value;state.zoom=1;clearPin();renderPlan()});
$('#reportType').addEventListener('change',updateTypeFields);
$('#reportName').addEventListener('input',()=>{state.nameEdited=$('#reportName').value.trim()!==''});
$('#reportZoomIn').addEventListener('click',()=>{state.zoom=Math.min(MAX_ZOOM,state.zoom+ZOOM_STEP);applyZoom()});
$('#reportZoomOut').addEventListener('click',()=>{state.zoom=Math.max(MIN_ZOOM,state.zoom-ZOOM_STEP);applyZoom()});
$('#reportZoomFit').addEventListener('click',()=>{state.zoom=1;applyZoom();$('#reportScroll').scrollTo({left:0,top:0})});
$('#pinClear').addEventListener('click',()=>{clearPin();$('#reportScroll').focus()});
$('#reportStage').addEventListener('click',event=>{
  if(event.target.closest('#planRetry')){void showPlan();return}
  if(state.sent||event.target.closest('.report-pin')||!currentPlan())return;
  placePin(...pointInStage(event));
  $('#reportPin').focus({preventScroll:true});
});
$('#tabPlan').addEventListener('click',()=>selectTab('plan'));
$('#tabRecent').addEventListener('click',()=>selectTab('recent'));
$('#recentRefresh').addEventListener('click',()=>void loadRecent());
$('#recentList').addEventListener('click',event=>{const b=event.target.closest('[data-filter]');if(b){recentFilter=b.dataset.filter;drawRecent()}});
// Keyboard users: Enter or Space on the focused plan drops the first pin in the middle; arrow keys then move it.
$('#reportScroll').addEventListener('keydown',event=>{
  if(event.target!==$('#reportScroll')||state.sent||state.pin||!currentPlan()||(event.key!=='Enter'&&event.key!==' '))return;
  event.preventDefault();placePin(50,50);$('#reportPin').focus({preventScroll:true});
});
$('#reportForm').addEventListener('submit',submit);
$('#reportForm').addEventListener('click',event=>{if(event.target.id==='reportAnother')resetForm();if(event.target.id==='reportEdit')reopenForm()});

updateTypeFields();
renderConnection();
void showPlan();
const ready=database.initialize().then(()=>auth.restore()).catch(()=>{database.error='The database connection could not initialize. Check .env and refresh to retry.'}).finally(renderConnection);
auth.onChange(renderConnection);
})();
