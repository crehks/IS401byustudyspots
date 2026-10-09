const BUILDINGS = {
  HBLL: { name: 'Harold B. Lee Library', short: 'Lee Library', description: 'Quiet corners, open tables, and reservable study rooms.', floors: [{id:'L3',label:'Entry (L3)'},{id:'L2',label:'Level 2'},{id:'L4',label:'Level 4'}], map:'https://map.byu.edu/', floorsUrl:'https://lib.byu.edu/floormaps/' },
  WSC: { name: 'Wilkinson Student Center', short: 'The Wilk', description: 'Explore the Wilk, room by room. Find a room or browse study ideas on each floor.', floors: [
    {id:'1E',label:'Floor 1 East',file:'wsc-1s',level:1,side:'East',defaultX:25,defaultY:43},
    {id:'1W',label:'Floor 1 West',file:'wsc-1ws',level:1,side:'West',defaultX:31,defaultY:48},
    {id:'2E',label:'Floor 2 East',file:'wsc-2s',level:2,side:'East',defaultX:21,defaultY:43},
    {id:'2W',label:'Floor 2 West',file:'wsc-2ws',level:2,side:'West',defaultX:39,defaultY:40},
    {id:'3E',label:'Floor 3 East',file:'wsc-3s',level:3,side:'East',defaultX:26,defaultY:30},
    {id:'3W',label:'Floor 3 West',file:'wsc-3ws',level:3,side:'West',defaultX:35,defaultY:45},
    {id:'4E',label:'Floor 4',file:'wsc-4s',level:4,side:'East',defaultX:69,defaultY:32},
    {id:'5E',label:'Floor 5',file:'wsc-5s',level:5,side:'East',defaultX:33,defaultY:43},
    {id:'6E',label:'Floor 6',file:'wsc-6s',level:6,side:'East',defaultX:34,defaultY:53}
  ], map:'https://map.byu.edu/', floorsUrl:'https://wscmaps.byu.edu/map' },
  JKB: { name: 'Jesse Knight Building', short: 'JKB', description: 'A quieter academic building with individual and group options.', floors: [{id:'G',label:'Ground'},{id:'L2',label:'Level 2'}], map:'https://map.byu.edu/', floorsUrl:'https://pf.byu.edu/space/floor-plans/master' }
};

// These are prototype spots and illustrative placements, not verified room inventory or live availability.
const DEMO_SPOTS = [
  {id:'hbll-commons',building:'HBLL',floor:'L3',name:'Entry level open tables',type:'solo',capacity:1,private:false,outlets:true,noise:'medium',busy:'medium',reserved:false,x:28,y:27,typical:[1,2,2,1,2]},
  {id:'hbll-west',building:'HBLL',floor:'L3',name:'West study corner',type:'solo',capacity:1,private:false,outlets:true,noise:'low',busy:'low',reserved:false,x:73,y:25,typical:[1,1,2,2,1]},
  {id:'hbll-group',building:'HBLL',floor:'L3',name:'Group study room',type:'group',capacity:6,private:true,outlets:true,noise:'medium',busy:null,reserved:true,x:73,y:72,typical:[]},
  {id:'hbll-think',building:'HBLL',floor:'L2',name:'Think Tank area',type:'group',capacity:6,private:false,outlets:true,noise:'medium',busy:'low',reserved:false,x:28,y:27,typical:[2,2,1,1,2]},
  {id:'hbll-reading',building:'HBLL',floor:'L2',name:'Reading Room area',type:'solo',capacity:1,private:false,outlets:false,noise:'low',busy:'medium',reserved:false,x:73,y:25,typical:[1,2,2,2,1]},
  {id:'hbll-single',building:'HBLL',floor:'L2',name:'Single-user study room',type:'solo',capacity:1,private:true,outlets:true,noise:'low',busy:null,reserved:true,x:73,y:72,typical:[]},
  {id:'hbll-upper',building:'HBLL',floor:'L4',name:'Upper level tables',type:'solo',capacity:1,private:false,outlets:true,noise:'low',busy:'low',reserved:false,x:28,y:27,typical:[1,2,1,1,2]},
  {id:'wsc-tables',building:'WSC',floor:'1E',name:'East hall tables (sample)',type:'group',capacity:4,private:false,outlets:true,noise:'medium',busy:'medium',reserved:false,x:23,y:42,typical:[2,2,3,2,2]},
  {id:'wsc-lounge',building:'WSC',floor:'1E',name:'East open seating (sample)',type:'solo',capacity:1,private:false,outlets:false,noise:'medium',busy:'low',reserved:false,x:62,y:29,typical:[1,2,3,2,1]},
  {id:'wsc-1w-atrium',building:'WSC',floor:'1W',name:'West atrium seating (sample)',type:'group',capacity:6,private:false,outlets:false,noise:'medium',busy:'low',reserved:false,x:26,y:52,typical:[1,2,2,1,2]},
  {id:'wsc-1w-nook',building:'WSC',floor:'1W',name:'West side nook (sample)',type:'solo',capacity:1,private:false,outlets:true,noise:'low',busy:'medium',reserved:false,x:50,y:44,typical:[1,1,2,2,1]},
  {id:'wsc-upper',building:'WSC',floor:'2E',name:'Second-floor tables (sample)',type:'group',capacity:6,private:false,outlets:true,noise:'medium',busy:'low',reserved:false,x:20,y:43,typical:[1,2,2,1,1]},
  {id:'wsc-2e-seating',building:'WSC',floor:'2E',name:'East seating area (sample)',type:'solo',capacity:1,private:false,outlets:false,noise:'medium',busy:'medium',reserved:false,x:20,y:67,typical:[2,2,3,2,1]},
  {id:'wsc-2w-open',building:'WSC',floor:'2W',name:'West open area (sample)',type:'group',capacity:6,private:false,outlets:true,noise:'medium',busy:'low',reserved:false,x:39,y:34,typical:[1,2,2,1,2]},
  {id:'wsc-2w-corner',building:'WSC',floor:'2W',name:'Southwest corner (sample)',type:'solo',capacity:1,private:false,outlets:false,noise:'low',busy:'medium',reserved:false,x:28,y:76,typical:[1,2,2,1,1]},
  {id:'wsc-3e-hall',building:'WSC',floor:'3E',name:'Third-floor hall (sample)',type:'group',capacity:4,private:false,outlets:true,noise:'medium',busy:'medium',reserved:false,x:23,y:31,typical:[1,2,3,2,1]},
  {id:'wsc-3e-corner',building:'WSC',floor:'3E',name:'East quiet corner (sample)',type:'solo',capacity:1,private:false,outlets:false,noise:'low',busy:'low',reserved:false,x:51,y:65,typical:[1,1,2,1,1]},
  {id:'wsc-3w-open',building:'WSC',floor:'3W',name:'West open area (sample)',type:'group',capacity:8,private:false,outlets:true,noise:'medium',busy:'low',reserved:false,x:35,y:43,typical:[1,2,2,1,1]},
  {id:'wsc-3w-south',building:'WSC',floor:'3W',name:'West corridor nook (sample)',type:'solo',capacity:1,private:false,outlets:false,noise:'low',busy:'low',reserved:false,x:48,y:73,typical:[1,1,2,1,1]},
  {id:'wsc-4f',building:'WSC',floor:'4E',name:'Fourth-floor alcove (sample)',type:'solo',capacity:1,private:false,outlets:false,noise:'low',busy:'low',reserved:false,x:68,y:33,typical:[1,2,1,1,1]},
  {id:'wsc-5f',building:'WSC',floor:'5E',name:'Fifth-floor seating (sample)',type:'solo',capacity:1,private:false,outlets:true,noise:'low',busy:'medium',reserved:false,x:34,y:43,typical:[1,2,2,1,1]},
  {id:'wsc-6f',building:'WSC',floor:'6E',name:'Sixth-floor open area (sample)',type:'group',capacity:4,private:false,outlets:false,noise:'medium',busy:'low',reserved:false,x:34,y:54,typical:[1,2,2,1,2]},
  {id:'jkb-tables',building:'JKB',floor:'G',name:'Ground level tables',type:'solo',capacity:1,private:false,outlets:true,noise:'low',busy:'low',reserved:false,x:28,y:27,typical:[1,1,2,1,2]},
  {id:'jkb-nook',building:'JKB',floor:'G',name:'Quiet study nook',type:'solo',capacity:1,private:true,outlets:false,noise:'low',busy:'medium',reserved:false,x:73,y:73,typical:[1,2,2,1,1]},
  {id:'jkb-group',building:'JKB',floor:'L2',name:'Group table area',type:'group',capacity:8,private:false,outlets:true,noise:'medium',busy:'low',reserved:false,x:28,y:28,typical:[2,2,1,2,1]}
];

const STORAGE_KEY = 'study-byu-prototype-v1';
const defaultData = () => ({reports:{}, customSpots:[], lists:[{id:'favorites',name:'Favorites',spots:[]}], savedFilters:null});
function loadData(){try{const data=JSON.parse(localStorage.getItem(STORAGE_KEY));return data&&Array.isArray(data.lists)?{...defaultData(),...data}:defaultData()}catch{return defaultData()}}
let data=loadData();
const database=new window.StudyDatabase();
let reportSubmissionPending=false;
const state={view:'explore',building:'HBLL',floor:'L3',zoom:1,selectedSpot:null,selectedRoom:null,roomLabels:true,selectedList:'favorites',study:'any',noise:'any',private:false,outlets:false,groupSize:4,buildings:new Set(['HBLL','WSC','JKB'])};
const WILK_STUDY_POINTS={
  'wsc-tables':[255,253],'wsc-lounge':[698,350],
  'wsc-1w-atrium':[289,421],'wsc-1w-nook':[411,529],
  'wsc-upper':[260,300],'wsc-2e-seating':[573,395],
  'wsc-2w-open':[650,220],'wsc-2w-corner':[393,677],
  'wsc-3e-hall':[409,306],'wsc-3e-corner':[468,391],
  'wsc-3w-open':[451,403],'wsc-3w-south':[409,609],
  'wsc-4f':[790,253],'wsc-5f':[382,283],'wsc-6f':[350,338]
};
const viewHistory=[];
if(data.savedFilters){const f=data.savedFilters;state.study=f.study||'any';state.noise=f.noise||'any';state.private=!!f.private;state.outlets=!!f.outlets;state.groupSize=Math.min(8,Math.max(2,Number(f.groupSize)||4));state.buildings=new Set((f.buildings||[]).filter(id=>BUILDINGS[id]));}
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
function esc(text){return String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}
// Keep spots added in the earlier schematic Wilk view on the corresponding East plan.
let migrated=false;
for(const spot of data.customSpots){if(spot.building==='WSC'&&spot.floor==='G'){spot.floor='1E';migrated=true}else if(spot.building==='WSC'&&spot.floor==='L2'){spot.floor='2E';migrated=true}}
if(migrated)save();
function allSpots(){return [...DEMO_SPOTS,...data.customSpots]}
function spotById(id){return allSpots().find(s=>s.id===id)}
function floorLabel(spot){return BUILDINGS[spot.building].floors.find(f=>f.id===spot.floor)?.label||spot.floor}
function usesDatabase(spot){return database.config.configured&&!spot.id.startsWith('custom-')}
function currentReport(spot){return usesDatabase(spot)?(database.reports[spot.id]||[])[0]||null:(data.reports[spot.id]||[])[0]||null}
function currentBusy(spot){return currentReport(spot)?.busy||spot.busy}
function currentNoise(spot){return currentReport(spot)?.noise||spot.noise}
function matches(spot){if(!state.buildings.has(spot.building))return false;if(state.study==='solo'&&spot.type!=='solo')return false;if(state.study==='group'&&(spot.type!=='group'||spot.capacity<state.groupSize))return false;if(state.private&&!spot.private)return false;if(state.outlets&&!spot.outlets)return false;if(state.noise==='low'&&currentNoise(spot)!=='low')return false;if(state.noise==='medium'&&currentNoise(spot)==='high')return false;return true}
function rank(spot){return (spot.reserved?8:0)+(currentBusy(spot)==='low'?0:currentBusy(spot)==='medium'?2:currentBusy(spot)==='high'?5:3)+(currentNoise(spot)==='low'?0:1)}
function labelBusy(spot){if(spot.reserved)return 'Reserve ahead';const busy=currentBusy(spot);return busy==='low'?'Less busy':busy==='medium'?'Moderate':busy==='high'?'Busy':'No report yet'}
function badgeClass(spot){return spot.reserved?'reserved':currentBusy(spot)==='medium'?'medium':''}
function showToast(message){const toast=$('#toast');toast.textContent=message;toast.hidden=false;clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.hidden=true,3500)}
function renderDatabaseStatus(){
  $('#databaseWarning').hidden=database.loading||(!database.error&&database.config.configured&&database.ready);
  $('#recommendHeading').nextElementSibling.textContent=database.config.configured?'Suggestions use database reports where available; other statuses remain sample data.':'Suggestions use sample crowding data until campus reports are connected.';
}
function renderDatabaseReceipt(report){
  const spot=spotById(report.spotId);
  $('#databaseReceipt').innerHTML=`<h2>Saved in Supabase</h2><p>${esc(spot?.name||report.spotId)} · Noise: ${esc(report.noise)} · Crowding: ${esc(report.busy)}</p>${report.note?`<p>${esc(report.note)}</p>`:''}<p>Database row: <code>${esc(report.id)}</code> · ${esc(new Date(report.time).toLocaleString())}</p><p>This is the row returned by the database, not a local-only save.</p><button type="button" class="subtle-button" data-open-reported="${esc(report.spotId)}">View this spot ↗</button>`;
  $('#databaseReceipt').hidden=false;
}
async function submitArrival(form){
  if(reportSubmissionPending)return;
  const id=form.dataset.id;
  const input={noise:form.elements.noise.value,busy:form.elements.busy.value,note:form.elements.note.value.trim()};
  if(!input.noise||!input.busy)return;
  const button=form.querySelector('[type="submit"]'),error=form.querySelector('#arrivalError');
  if(database.loading||!database.configLoaded){error.textContent=database.loading?'Wait for the connection check to finish.':'Connection settings could not be checked. Start with npm start and fix setup before reporting.';error.hidden=false;return;}
  const remote=usesDatabase(spotById(id));
  $('#databaseReceipt').hidden=true;
  reportSubmissionPending=true;button.disabled=true;button.textContent=remote?'Saving to Supabase…':'Saving locally…';error.hidden=true;
  try{
    if(remote){const report=await database.submitReport(id,input);closeModal(true);render();renderDatabaseStatus();renderDatabaseReceipt(report);showToast('Saved in Supabase. Click this spot to see its latest report.');}
    else{const report={...input,time:Date.now(),source:'local'};(data.reports[id]??=[]).unshift(report);data.reports[id]=data.reports[id].slice(0,10);save();closeModal(true);render();showToast('Local preview: report saved only on this device.');}
  }catch(problem){error.textContent=problem.message;error.hidden=false;database.error=problem.message;renderDatabaseStatus();}
  finally{reportSubmissionPending=false;button.disabled=false;button.textContent='Confirm report';}
}
function renderFilters(){
  $('#buildingFilters').innerHTML=Object.entries(BUILDINGS).map(([id,b])=>`<label class="building-check"><input type="checkbox" value="${id}" ${state.buildings.has(id)?'checked':''}><span>${id}</span><small>${esc(b.short)}</small></label>`).join('');
  $$('[data-study]').forEach(b=>b.classList.toggle('is-selected',b.dataset.study===state.study));
  $$('[data-noise]').forEach(b=>b.classList.toggle('is-selected',b.dataset.noise===state.noise));
  $('#groupSizeWrap').hidden=state.study!=='group';$('#groupSize').value=state.groupSize;$('#groupSizeValue').textContent=`${state.groupSize} people`;
  $('#privateFilter').checked=state.private;$('#outletFilter').checked=state.outlets;
  $('#matchCount').textContent=allSpots().filter(matches).length;
}
function renderRecommendations(){
  const spots=allSpots().filter(matches).sort((a,b)=>rank(a)-rank(b)).slice(0,3);
  $('#recommendationsList').innerHTML=spots.length?spots.map(s=>`<button type="button" class="recommendation-card" data-spot="${esc(s.id)}"><div class="rec-top"><span class="rec-building">${s.building} / ${esc(floorLabel(s))}</span><span class="availability ${badgeClass(s)}">${labelBusy(s)}</span></div><h3>${esc(s.name)}</h3><span class="rec-meta">${s.type==='group'?`Group up to ${s.capacity}`:'Individual'} · ${s.outlets?'Outlets':'No outlet listed'} ${s.reserved?'· Reservation required':''}</span></button>`).join(''):`<div class="empty-state"><h3>No spaces match these filters</h3><p>Try another building, a different noise level, or fewer requirements.</p><button class="secondary-button" type="button" data-action="clear">Clear filters</button></div>`;
}
function renderBuilding(){
  const building=BUILDINGS[state.building];if(!building)return;
  $('#buildingTitle').textContent=building.name;$('#buildingSummary').textContent=building.description;
  $('#buildingSelect').innerHTML=Object.entries(BUILDINGS).map(([id,b])=>`<option value="${id}" ${id===state.building?'selected':''}>${id}</option>`).join('');
  $('#officialFloorLink').href=building.floorsUrl;$('#buildingMapLink').href=building.map;
  const floor=building.floors.find(f=>f.id===state.floor)||building.floors[0];state.floor=floor.id;
  const isWsc=state.building==='WSC';
  $('#floorTitle').textContent=floor.label;
  $('#floorSubtitle').textContent=isWsc?'Choose a room on the map, or search for its number.':`${building.short} · schematic study area guide`;
  $('#floorTabs').innerHTML=isWsc?[1,2,3,4,5,6].map(level=>`<button class="floor-tab ${floor.level===level?'is-selected':''}" data-wsc-level="${level}" type="button">${level}</button>`).join(''):building.floors.map(f=>`<button class="floor-tab ${f.id===state.floor?'is-selected':''}" data-floor="${f.id}" type="button">${esc(f.label)}</button>`).join('');
  $('#floorSideTabs').hidden=!isWsc||floor.level>3;
  $('#floorSideTabs').innerHTML=isWsc&&floor.level<=3?['East','West'].map(side=>`<button class="floor-tab ${floor.side===side?'is-selected':''}" data-wsc-side="${side}" type="button">${side}</button>`).join(''):'';
  $('#planAssetBar').hidden=!isWsc;
  $('#roomTools').hidden=!isWsc;$('#mapInstructions').hidden=!isWsc;
  if(!isWsc)$('#selectedRoomPanel').hidden=true;
  if(isWsc){$('#sourcePdfLink').href=`assets/wsc/${floor.file}.pdf`;$('#zoomValue').textContent=`${Math.round(state.zoom*100)}%`;$('#zoomOut').disabled=state.zoom<=1;$('#zoomIn').disabled=state.zoom>=8;$('#toggleRoomLabels').setAttribute('aria-pressed',state.roomLabels)}
  const spots=allSpots().filter(s=>s.building===state.building&&s.floor===state.floor);
  const plan=$('#floorPlan');
  if(isWsc){
    const digital=window.WSC_PLANS[state.floor];
    plan.className=`floor-plan wsc-plan ${state.roomLabels?'':'hide-room-labels'}`;plan.setAttribute('aria-label',`Interactive Wilk ${floor.label} map`);
    plan.innerHTML=`<div class="plan-scroll"><div class="plan-canvas"><div id="planStage" class="plan-stage">${digital.svg}${spots.map((s,i)=>{const point=WILK_STUDY_POINTS[s.id]||[s.x/100*1224,s.y/100*792];const x=(point[0]-digital.crop[0])/digital.width*100;const y=(point[1]-digital.crop[1])/digital.height*100;return `<button type="button" class="plan-pin ${matches(s)?'':'is-dimmed'} ${state.selectedSpot===s.id?'is-selected':''}" style="left:${x}%;top:${y}%" data-spot="${esc(s.id)}" title="${esc(s.name)}" aria-label="Sample spot ${i+1}: ${esc(s.name)}">S${i+1}</button>`}).join('')}</div></div></div>`;
    $('#floorLegend').innerHTML='<span><i class="map-key-swatch room"></i>Rooms</span><span><i class="map-key-swatch open"></i>Open areas</span><span><i class="map-key-swatch service"></i>Service cores</span><span><i class="legend-dot open"></i>Sample study spots</span>';
    $('#floorDisclaimer').textContent='Walls and room numbers follow the supplied BYU drawings. Study spots are provisional ideas.';
    $('#mapNorth').innerHTML=`N <span style="display:inline-block;transform:rotate(${digital.north}deg)">↑</span>`;
    mapResizeObserver.disconnect();mapResizeObserver.observe(plan);
    resizeDigitalMap();installMapPan();updateRoomHighlight();
  }else{
    const amenities=[{name:'Restroom',symbol:'WC',x:48,y:18},{name:'Vending',symbol:'V',x:20,y:53},{name:'Printer',symbol:'P',x:78,y:53}];
    plan.className='floor-plan';plan.setAttribute('aria-label','Illustrative floor view of study spots');
    plan.innerHTML=`<div class="floor-wing wing-a">Study zone</div><div class="floor-wing wing-b">Study zone</div><div class="floor-wing wing-c">Rooms & seating</div><div class="floor-wing wing-d">Rooms & seating</div><div class="floor-center" aria-label="Central corridor">+</div>${spots.map(s=>`<button type="button" class="floor-spot ${s.reserved?'reserved':''} ${matches(s)?'':'is-dimmed'} ${state.selectedSpot===s.id?'is-selected':''}" style="left:${s.x}%;top:${s.y}%;transform:translate(-50%,-50%)" data-spot="${esc(s.id)}" aria-label="${esc(s.name)}, ${s.reserved?'reservation required':labelBusy(s)}"><i aria-hidden="true"></i><span>${esc(s.name)}</span></button>`).join('')}${amenities.map(a=>`<span class="amenity-marker" style="left:${a.x}%;top:${a.y}%" aria-label="Illustrative ${a.name.toLowerCase()} position"><b>${a.symbol}</b>${a.name}</span>`).join('')}`;
    $('#floorLegend').innerHTML='<span><i class="legend-dot open"></i>Open study area</span><span><i class="legend-dot reserved"></i>Reservation required</span><span><i class="legend-dot amenity"></i>Amenity</span>';
    $('#floorDisclaimer').innerHTML='This is a schematic guide, not an architectural floor plan. Check the <a href="https://pf.byu.edu/space/floor-plans/master" target="_blank" rel="noopener noreferrer">BYU master floor plans</a> for exact room locations (BYU sign-in may be required).';
  }
  const matched=spots.filter(matches).sort((a,b)=>rank(a)-rank(b));
  $('#resultsSummary').textContent=`${matched.length} matching ${matched.length===1?'spot':'spots'} on this floor`;
  const chips=[];if(state.study==='group')chips.push(`Group ${state.groupSize}+`);else if(state.study==='solo')chips.push('Solo');if(state.noise==='low')chips.push('Quiet');else if(state.noise==='medium')chips.push('Conversational');if(state.private)chips.push('Private');if(state.outlets)chips.push('Outlets');
  $('#activeFilterBar').innerHTML=chips.map(c=>`<span>${esc(c)}</span>`).join('')||'<span>All study types</span>';
  $('#spotList').innerHTML=matched.length?matched.map(s=>`<button type="button" class="spot-row ${state.selectedSpot===s.id?'is-selected':''}" data-spot="${esc(s.id)}"><div class="spot-row-top"><h3>${isWsc?`${spots.indexOf(s)+1}. `:''}${esc(s.name)}</h3><span class="availability ${badgeClass(s)}">${labelBusy(s)}</span></div><p>${s.type==='group'?`Group up to ${s.capacity}`:'Individual'} · ${s.private?'Private':'Open'} · ${s.outlets?'Outlets':'Outlets not listed'}</p></button>`).join(''):`<div class="empty-state"><h3>No matching spots on this floor</h3><p>Try another floor or update your filters.</p><button type="button" class="secondary-button" data-action="edit">Edit filters</button></div>`;
}
function renderSaved(){
  $('#savedCount').textContent=new Set(data.lists.flatMap(l=>l.spots)).size;
  $('#createList').disabled=data.lists.length>=3;$('#createList').title=data.lists.length>=3?'Two custom lists maximum':'';
  if(!data.lists.some(l=>l.id===state.selectedList))state.selectedList='favorites';
  $('#savedTabs').innerHTML=data.lists.map(l=>`<button type="button" class="saved-tab ${l.id===state.selectedList?'is-selected':''}" data-list="${esc(l.id)}">${esc(l.name)} <span>${l.spots.length}</span></button>`).join('');
  const list=data.lists.find(l=>l.id===state.selectedList);const spots=list.spots.map(spotById).filter(Boolean);
  $('#savedItems').innerHTML=spots.length?spots.map(s=>`<div class="saved-card"><div><span class="rec-building">${s.building} / ${esc(floorLabel(s))}</span><h3>${esc(s.name)}</h3><p>${s.type==='group'?`Group up to ${s.capacity}`:'Individual'} · ${s.reserved?'Reservation required':labelBusy(s)}</p></div><button type="button" data-open-saved="${esc(s.id)}">View ↗</button></div>`).join(''):`<div class="empty-state"><h3>Nothing saved here yet</h3><p>Open a study spot and save it to this list.</p><button type="button" class="secondary-button" data-action="explore">Explore spaces</button></div>`;
}
function render(){renderFilters();renderRecommendations();renderBuilding();renderSaved();$$('.view').forEach(v=>v.hidden=v.id!==`${state.view}View`);$('#navExplore').classList.toggle('is-active',state.view!=='saved');$('#navSaved').classList.toggle('is-active',state.view==='saved');$('#backToExplore').textContent=viewHistory.at(-1)==='saved'?'← Back to saved':'← Back to campus'}
function setView(view){if(state.view!==view)viewHistory.push(state.view);state.view=view;render();window.scrollTo({top:0,behavior:'smooth'})}
function goBack(){state.view=viewHistory.pop()||'explore';render();window.scrollTo({top:0,behavior:'smooth'})}
function openBuilding(id,floor){if(!BUILDINGS[id])return;state.building=id;state.floor=floor||BUILDINGS[id].floors[0].id;state.zoom=1;state.selectedSpot=null;state.selectedRoom=null;$('#roomSearch').value='';$('#roomSearchResults').hidden=true;setView('building')}
function resizeDigitalMap(){
  if(state.building!=='WSC'||!$('#planStage'))return;
  const plan=window.WSC_PLANS[state.floor],viewport=$('.plan-scroll'),stage=$('#planStage'),canvas=$('.plan-canvas');
  const fit=Math.min(Math.max(240,viewport.clientWidth-48),Math.max(200,viewport.clientHeight-48)*plan.width/plan.height);
  const width=fit*state.zoom,height=width*plan.height/plan.width;
  stage.style.width=`${width}px`;stage.style.height=`${height}px`;
  canvas.style.width=`max(100%, ${width+48}px)`;canvas.style.height=`max(100%, ${height+48}px)`;
}
const mapResizeObserver=new ResizeObserver(()=>resizeDigitalMap());
function changeZoom(delta){
  const viewport=$('.plan-scroll');if(!viewport)return;
  const oldZoom=state.zoom,centerX=(viewport.scrollLeft+viewport.clientWidth/2),centerY=(viewport.scrollTop+viewport.clientHeight/2);
  state.zoom=Math.max(1,Math.min(8,Math.round((state.zoom+delta)*100)/100));resizeDigitalMap();
  viewport.scrollLeft=centerX*state.zoom/oldZoom-viewport.clientWidth/2;viewport.scrollTop=centerY*state.zoom/oldZoom-viewport.clientHeight/2;
  $('#zoomValue').textContent=`${Math.round(state.zoom*100)}%`;$('#zoomOut').disabled=state.zoom<=1;$('#zoomIn').disabled=state.zoom>=8;
}
function installMapPan(){
  const viewport=$('.plan-scroll');let start=null,dragging=false,ignoreClick=false;
  viewport.addEventListener('pointerdown',event=>{if(event.button!==0||event.target.closest('button'))return;start={x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};dragging=false});
  viewport.addEventListener('pointermove',event=>{if(!start)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;if(!dragging&&Math.hypot(dx,dy)>6){dragging=true;viewport.setPointerCapture(event.pointerId);viewport.classList.add('is-panning')}if(dragging){viewport.scrollLeft=start.left-dx;viewport.scrollTop=start.top-dy}});
  const finish=()=>{if(dragging){ignoreClick=true;setTimeout(()=>ignoreClick=false,0)}start=null;dragging=false;viewport.classList.remove('is-panning')};
  viewport.addEventListener('pointerup',finish);viewport.addEventListener('pointercancel',finish);
  viewport.addEventListener('click',event=>{if(ignoreClick){event.preventDefault();event.stopPropagation()}},true);
}
function renderRoomSearch(){
  const query=$('#roomSearch').value.trim().toUpperCase(),results=$('#roomSearchResults');
  if(!query){results.hidden=true;results.innerHTML='';return}
  const matches=Object.entries(window.WSC_PLANS).flatMap(([floor,plan])=>plan.rooms.filter(r=>r.number.includes(query)).map(room=>({floor,plan,room}))).sort((a,b)=>(a.room.number===query?-1:0)-(b.room.number===query?-1:0)||a.room.number.localeCompare(b.room.number)).slice(0,8);
  results.innerHTML=matches.length?matches.map(({floor,plan,room})=>`<button type="button" data-find-room="${room.number}" data-room-floor="${floor}"><strong>Room ${room.number}</strong><span>${esc(plan.label)}</span></button>`).join(''):'<p>No matching room number in the supplied plans.</p>';
  results.hidden=false;
}
function selectRoom(number,floor=state.floor,locate=false){
  const plan=window.WSC_PLANS[floor],room=plan?.rooms.find(r=>r.number===number);if(!room)return;
  if(state.floor!==floor||state.building!=='WSC'){state.building='WSC';state.floor=floor;state.zoom=1;state.selectedSpot=null;renderBuilding()}
  state.selectedRoom={number,floor};state.roomLabels=true;$('#floorPlan').classList.remove('hide-room-labels');$('#toggleRoomLabels').setAttribute('aria-pressed','true');
  $('#roomSearchResults').hidden=true;$('#roomSearch').value='';updateRoomHighlight();
  if(locate){const viewport=$('.plan-scroll'),stage=$('#planStage');const fitWidth=stage.offsetWidth/state.zoom;const locateZoom=Math.min(8,Math.max(2.5,Math.ceil(plan.width*2/fitWidth*4)/4));if(state.zoom<locateZoom)changeZoom(locateZoom-state.zoom);viewport.scrollLeft=stage.offsetLeft+room.x/plan.width*stage.offsetWidth-viewport.clientWidth/2;viewport.scrollTop=stage.offsetTop+room.y/plan.height*stage.offsetHeight-viewport.clientHeight/2}
}
function updateRoomHighlight(){
  const current=state.selectedRoom?.floor===state.floor?state.selectedRoom:null;
  if(state.building==='WSC')$('#planAssetBar > span').textContent=current?`Room ${current.number} selected`:`${window.WSC_PLANS[state.floor].rooms.length} room numbers on this floor`;
  $$('#floorPlan [data-room]').forEach(el=>el.classList.toggle('is-selected',el.dataset.room===current?.number));
  const panel=$('#selectedRoomPanel');panel.hidden=!current;
  if(current){const plan=window.WSC_PLANS[state.floor];panel.innerHTML=`<div><span class="room-selection-label">On the map</span><h3>Room ${esc(current.number)}</h3><p>${esc(plan.label)} · The Wilk</p></div><button type="button" data-clear-room aria-label="Clear selected room">×</button>`}
}
function closeModal(force=false){if(!force&&reportSubmissionPending&&$('#arrivalForm'))return;const backdrop=$('#modalBackdrop');backdrop.hidden=true;$('#modal').innerHTML='';document.body.style.overflow='';if(closeModal.focus)closeModal.focus.focus()}
function openModal(html){if(reportSubmissionPending)return;closeModal.focus=document.activeElement;$('#modal').innerHTML=html;$('#modalBackdrop').hidden=false;document.body.style.overflow='hidden';$('#modal').querySelector('button, input, select')?.focus()}
function modalHeader(title){return `<div class="modal-top"><h2 id="modalTitle">${esc(title)}</h2><button class="modal-close" type="button" data-modal-close aria-label="Close">×</button></div>`}
function openSpot(id){
  const s=spotById(id);if(!s)return;state.selectedSpot=s.id;
  if(state.view==='building'){if(state.building==='WSC')$$('.plan-pin,.spot-row').forEach(el=>el.classList.toggle('is-selected',el.dataset.spot===s.id));else renderBuilding()}
  const report=currentReport(s),isSaved=data.lists.some(l=>l.spots.includes(s.id));
  const trend=s.typical?.length?`<div class="trend" aria-label="Illustrative typical crowding across five periods">${s.typical.map(n=>`<span class="${n===2?'medium':n===3?'high':''}"></span>`).join('')}</div><div class="trend-labels"><span>Earlier</span><span>Later</span></div>`:'<p>Typical crowding is not available for this spot.</p>';
  const reportDetails=s.reserved?'<p>Availability is managed by BYU. This prototype does not show room availability.</p>':report?`<p>Noise: ${esc(report.noise)} · Crowding: ${esc(report.busy)}</p><small>${report.source==='supabase'?'Read from Supabase':'Saved locally on this device'} · ${esc(new Date(report.time).toLocaleString())}</small>${report.source==='supabase'?`<p>Database row: <code>${esc(report.id)}</code></p>`:''}${report.note?`<p>${esc(report.note)}</p>`:''}`:usesDatabase(s)&&database.error?`<p class="form-error">Database reports could not be loaded: ${esc(database.error)}</p>`:`<p>Sample status: ${esc(s.noise||'unknown')} noise · ${esc(s.busy||'unknown')} crowding. ${usesDatabase(s)?'No database report loaded for this spot.':'No local report yet.'}</p>`;
  openModal(`${modalHeader(s.name)}<p class="modal-description">${s.building} · ${esc(floorLabel(s))} · ${s.type==='group'?`Group up to ${s.capacity}`:'Individual study'}</p><div class="detail-tags"><span>${s.private?'Private':'Open space'}</span><span>${s.outlets?'Outlets nearby':'Outlets not listed'}</span><span>${s.reserved?'Reservation required':`Noise: ${esc(currentNoise(s)||'unknown')}`}</span></div><div id="latestReport" class="report-box"><h3>${s.reserved?'Reservation required':'Latest report'}</h3>${reportDetails}</div><div class="report-box"><h3>Typical crowding</h3><small>Illustrative historical pattern for the prototype</small>${trend}</div><div class="modal-actions"><button class="secondary-button" type="button" data-modal-close>Keep searching</button><button class="secondary-button" type="button" data-save-spot="${esc(s.id)}">${isSaved?'Saved / lists':'Save to a list'}</button>${s.reserved?`<a class="primary-button" href="https://lib.byu.edu/services/group-study-rooms/" target="_blank" rel="noopener noreferrer">Reserve with BYU ↗</a>`:`<button class="primary-button" type="button" data-confirm-spot="${esc(s.id)}" ${database.loading||!database.configLoaded?'disabled':''}>Choose this spot</button>`}</div>`);
}
function openArrival(id){
  const s=spotById(id);if(!s)return;
  openModal(`${modalHeader('Once you arrive…')}<p class="modal-description">How is ${esc(s.name)} right now? ${usesDatabase(s)?'Confirm report saves to Supabase as the fictional Demo Student. Do not include names or private information.':database.config.configured?'This is a local new-spot suggestion, not a seeded database spot. Its reports remain on this device and are not the database vertical slice.':'Local preview only: this report will stay on this device. Configure .env to test database persistence.'}</p><form id="arrivalForm" data-id="${esc(s.id)}"><p class="choice-label">Noise level</p><div class="choice-row">${['low','medium','high'].map((v,i)=>`<label><input type="radio" name="noise" value="${v}" ${i===0?'required':''}>${v[0].toUpperCase()+v.slice(1)}</label>`).join('')}</div><p class="choice-label">How busy is it?</p><div class="choice-row">${['low','medium','high'].map((v,i)=>`<label><input type="radio" name="busy" value="${v}" ${i===0?'required':''}>${v[0].toUpperCase()+v.slice(1)}</label>`).join('')}</div><div class="form-field"><label for="reportNote">Other details (optional)</label><textarea id="reportNote" name="note" maxlength="240" placeholder="Anything useful for the next student?"></textarea></div><p id="arrivalError" class="form-error" role="alert" hidden></p><div class="modal-actions"><button type="button" class="secondary-button" data-modal-close>Not there yet</button><button type="submit" class="primary-button">Confirm report</button></div></form>`);
}
function openSave(id){const s=spotById(id);if(!s)return;openModal(`${modalHeader('Save this spot')}<p class="modal-description">Add ${esc(s.name)} to any of your lists.</p><div class="building-checks">${data.lists.map(l=>`<label class="building-check"><input type="checkbox" data-save-list="${esc(l.id)}" ${l.spots.includes(id)?'checked':''}><span>${esc(l.name)}</span></label>`).join('')}</div><div class="modal-actions"><button class="secondary-button" type="button" data-modal-close>Cancel</button><button class="primary-button" type="button" data-save-confirm="${esc(id)}">Save changes</button></div>`)}
function openNewSpot(){openModal(`${modalHeader('Report a new spot')}<p class="modal-description">Suggest a study area missing from this prototype. It will appear on this device for now.</p><form id="newSpotForm"><div class="form-field"><label for="newName">Spot name</label><input id="newName" name="name" required maxlength="60" placeholder="Example: east wing tables"></div><div class="form-field"><label for="newBuilding">Building</label><select id="newBuilding" name="building">${Object.entries(BUILDINGS).map(([id,b])=>`<option value="${id}">${esc(b.name)}</option>`).join('')}</select></div><div class="form-field"><label for="newFloor">Floor</label><select id="newFloor" name="floor"></select></div><div class="form-field"><label for="newType">Space type</label><select id="newType" name="type"><option value="solo">Individual</option><option value="group">Group</option></select></div><div class="form-field" id="newCapacityWrap" hidden><label for="newCapacity">Maximum group size (2-8)</label><input id="newCapacity" name="capacity" type="number" min="2" max="8" value="4"></div><div class="form-field"><label for="newNoise">Usual noise</label><select id="newNoise" name="noise"><option value="low">Quiet</option><option value="medium">Conversational</option><option value="high">Lively</option></select></div><div class="building-checks"><label class="building-check"><input type="checkbox" name="private"><span>Private or separated</span></label><label class="building-check"><input type="checkbox" name="outlets"><span>Outlets nearby</span></label></div><div class="form-field"><label for="newDetail">Location details (optional)</label><textarea id="newDetail" name="detail" maxlength="160" placeholder="Nearby landmark or entrance"></textarea></div><p class="form-error" id="newSpotError" hidden></p><div class="modal-actions"><button type="button" class="secondary-button" data-modal-close>Cancel</button><button type="submit" class="primary-button">Add spot</button></div></form>`);updateNewSpotFloors()}
function updateNewSpotFloors(){const form=$('#newSpotForm');if(!form)return;const b=form.elements.building.value;form.elements.floor.innerHTML=BUILDINGS[b].floors.map(f=>`<option value="${f.id}">${esc(f.label)}</option>`).join('');$('#newCapacityWrap').hidden=form.elements.type.value!=='group'}
function openCreateList(){if(data.lists.length>=3){showToast('You can have Favorites and two custom lists.');return}openModal(`${modalHeader('New saved list')}<p class="modal-description">Create a list for a class, group, or favorite study routine.</p><form id="newListForm"><div class="form-field"><label for="newListName">List name</label><input id="newListName" name="name" required maxlength="28" placeholder="Example: Group project"></div><div class="modal-actions"><button type="button" class="secondary-button" data-modal-close>Cancel</button><button type="submit" class="primary-button">Create list</button></div></form>`)}
function resetFilters(){state.buildings=new Set(['HBLL','WSC','JKB']);state.study='any';state.groupSize=4;state.noise='any';state.private=false;state.outlets=false;data.savedFilters=null;save();render()}
function updateFilter(){renderFilters();renderRecommendations();if(state.view==='building')renderBuilding()}
function showMatches(){const match=allSpots().filter(matches).sort((a,b)=>rank(a)-rank(b));if(!state.buildings.size){showToast('Choose at least one building.');return}if(!match.length){openBuilding([...state.buildings][0]);showToast('No spaces match. Try changing a filter.');return}openBuilding(match[0].building,match[0].floor)}

document.addEventListener('click',event=>{
  const t=event.target.closest('button,a,[data-room]');if(!t)return;
  if(t.dataset.findRoom){selectRoom(t.dataset.findRoom,t.dataset.roomFloor,true);return}
  if(t.dataset.room){selectRoom(t.dataset.room);return}
  if(t.hasAttribute('data-clear-room')){state.selectedRoom=null;updateRoomHighlight();return}
  if(t.id==='toggleRoomLabels'){state.roomLabels=!state.roomLabels;$('#floorPlan').classList.toggle('hide-room-labels',!state.roomLabels);t.setAttribute('aria-pressed',state.roomLabels);return}
  if(t.id==='zoomFit'){changeZoom(1-state.zoom);$('.plan-scroll').scrollLeft=0;$('.plan-scroll').scrollTop=0;return}
  if(t.matches('[data-modal-close]')){closeModal();return}
  if(t.id==='homeButton'||t.id==='navExplore'){setView('explore');return}
  if(t.id==='backToExplore'||t.id==='savedBack'){goBack();return}
  if(t.id==='navSaved'){setView('saved');return}
  if(t.id==='navReport'){openNewSpot();return}
  if(t.dataset.openReported){const s=spotById(t.dataset.openReported);if(s){openBuilding(s.building,s.floor);openSpot(s.id)}return}
  if(t.id==='clearFilters'||t.dataset.action==='clear'){resetFilters();return}
  if(t.id==='saveFilters'){data.savedFilters={study:state.study,noise:state.noise,private:state.private,outlets:state.outlets,groupSize:state.groupSize,buildings:[...state.buildings]};save();showToast('Filters saved on this device.');return}
  if(t.id==='showMatches'){showMatches();return}
  if(t.dataset.openBuilding){openBuilding(t.dataset.openBuilding);return}
  if(t.dataset.study){state.study=t.dataset.study;updateFilter();return}
  if(t.dataset.noise){state.noise=t.dataset.noise;updateFilter();return}
  if(t.dataset.floor){state.floor=t.dataset.floor;state.zoom=1;state.selectedSpot=null;state.selectedRoom=null;renderBuilding();return}
  if(t.dataset.wscLevel){const level=Number(t.dataset.wscLevel);state.floor=level<=3?`${level}${state.floor.endsWith('W')?'W':'E'}`:`${level}E`;state.zoom=1;state.selectedSpot=null;state.selectedRoom=null;renderBuilding();return}
  if(t.dataset.wscSide){state.floor=`${state.floor[0]}${t.dataset.wscSide==='West'?'W':'E'}`;state.zoom=1;state.selectedSpot=null;state.selectedRoom=null;renderBuilding();return}
  if(t.id==='zoomOut'||t.id==='zoomIn'){changeZoom(t.id==='zoomIn'?.25:-.25);return}
  if(t.dataset.spot){const s=spotById(t.dataset.spot);if(state.view==='explore'){openBuilding(s.building,s.floor)}openSpot(s.id);return}
  if(t.dataset.openSaved){const s=spotById(t.dataset.openSaved);openBuilding(s.building,s.floor);openSpot(s.id);return}
  if(t.dataset.confirmSpot){openArrival(t.dataset.confirmSpot);return}
  if(t.dataset.saveSpot){openSave(t.dataset.saveSpot);return}
  if(t.dataset.saveConfirm){const id=t.dataset.saveConfirm;data.lists.forEach(l=>{const checked=!!$(`[data-save-list="${l.id}"]`)?.checked;l.spots=l.spots.filter(x=>x!==id);if(checked)l.spots.push(id)});save();renderSaved();closeModal();showToast('Saved lists updated.');return}
  if(t.id==='editFilters'||t.dataset.action==='edit'){setView('explore');$('#filterHeading').scrollIntoView({behavior:'smooth'});return}
  if(t.dataset.action==='explore'){setView('explore');return}
  if(t.id==='createList'){openCreateList();return}
  if(t.dataset.list){state.selectedList=t.dataset.list;renderSaved();return}
});
document.addEventListener('change',event=>{
  const t=event.target;
  if(t.closest('#buildingFilters')){state.buildings=new Set($$('#buildingFilters input:checked').map(x=>x.value));updateFilter()}
  if(t.id==='privateFilter'){state.private=t.checked;updateFilter()}
  if(t.id==='outletFilter'){state.outlets=t.checked;updateFilter()}
  if(t.id==='buildingSelect'){openBuilding(t.value)}
  if(t.id==='newBuilding'||t.id==='newType')updateNewSpotFloors();
});
$('#groupSize').addEventListener('input',e=>{state.groupSize=Number(e.target.value);updateFilter()});
$('#roomSearch').addEventListener('input',renderRoomSearch);
$('#roomSearch').addEventListener('keydown',event=>{if(event.key==='Enter'){const first=$('#roomSearchResults button');if(first){event.preventDefault();selectRoom(first.dataset.findRoom,first.dataset.roomFloor,true)}}else if(event.key==='Escape')$('#roomSearchResults').hidden=true});
document.addEventListener('keydown',event=>{const room=event.target.closest('#floorPlan .map-room');if(room&&(event.key==='Enter'||event.key===' ')){event.preventDefault();selectRoom(room.dataset.room)}});
document.addEventListener('pointerdown',event=>{if(!event.target.closest('.room-search-wrap'))$('#roomSearchResults').hidden=true});
$('#modalBackdrop').addEventListener('click',e=>{if(e.target.id==='modalBackdrop')closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#modalBackdrop').hidden)closeModal()});
document.addEventListener('submit',e=>{
  if(e.target.id==='arrivalForm'){e.preventDefault();void submitArrival(e.target);return}
  if(e.target.id==='newSpotForm'){e.preventDefault();const f=e.target.elements;const name=f.name.value.trim();const type=f.type.value;const capacity=type==='group'?Number(f.capacity.value):1;if(name.length<3||(type==='group'&&(capacity<2||capacity>8))){$('#newSpotError').textContent='Enter a spot name and a group size from 2 to 8.';$('#newSpotError').hidden=false;return}const chosenFloor=BUILDINGS[f.building.value].floors.find(fl=>fl.id===f.floor.value);const spot={id:`custom-${Date.now()}`,building:f.building.value,floor:f.floor.value,name,type,capacity,private:f.private.checked,outlets:f.outlets.checked,noise:f.noise.value,busy:null,reserved:false,x:chosenFloor?.defaultX??29,y:chosenFloor?.defaultY??72,typical:[],detail:f.detail.value.trim()};data.customSpots.push(spot);save();closeModal();openBuilding(spot.building,spot.floor);render();showToast('New spot added on this device.');return}
  if(e.target.id==='newListForm'){e.preventDefault();const name=e.target.elements.name.value.trim();if(!name)return;const id=`list-${Date.now()}`;data.lists.push({id,name,spots:[]});state.selectedList=id;save();closeModal();setView('saved');showToast('List created.');return}
});
render();
renderDatabaseStatus();
void database.initialize().then(()=>{renderDatabaseStatus();render()}).catch(()=>{database.error='The database connection could not initialize. Check .env and refresh to retry.';renderDatabaseStatus()});
