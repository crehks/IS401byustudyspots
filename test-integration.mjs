// Offline QA only: real PostgreSQL plus a PostgREST-shaped HTTP fixture.
// Never provisions Supabase, reads the real .env, or certifies rendered browser UI.
import {PGlite} from '@electric-sql/pglite';
import {parseHTML} from 'linkedom';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import http from 'node:http';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createAppServer} from '../server.mjs';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const nativeFetch=globalThis.fetch;
const directory=await mkdtemp(path.join(tmpdir(),'study-byu-integration-'));
const pg=await PGlite.create();
let gateway,app,rejectInserts=false;
const publicKey='sb_publishable_local_integration_fixture';
try {
  await pg.exec('create role anon nologin; create role authenticated nologin;');
  const migration=await readFile(path.join(root,'supabase/migrations/20261008_001_report_slice.sql'),'utf8');
  const seed=await readFile(path.join(root,'supabase/seed.sql'),'utf8');
  const combined=await readFile(path.join(root,'supabase/SETUP_REPORT_SLICE.sql'),'utf8');
  assert.ok(combined.includes(migration.trim()) && combined.includes(seed.trim()),'Combined setup must match the canonical migration and seed');
  await pg.exec(combined);await pg.exec(seed);
  for(const [table,count] of Object.entries({buildings:3,floors:11,spot_types:3,study_spots:25,users:3,user_reports:3})){
    assert.equal((await pg.query(`select count(*)::int as n from public.${table}`)).rows[0].n,count,table);
  }
  assert.equal((await pg.query("select count(*)::int as n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity")).rows[0].n,6);
  await assert.rejects(pg.exec(migration));await pg.exec('rollback');
  await assert.rejects(pg.query("insert into public.study_spots values ('wrong-floor','solo','WSC','HBLL-L3','Bad floor',false,1,'Sample',false,'chair')"));
  for(const role of ['anon','authenticated']){
    await pg.exec(`set role ${role}`);
    try {
      assert.equal((await pg.query('select count(*)::int as n from public.study_spots')).rows[0].n,25);
      const row=(await pg.query("insert into public.user_reports (spot_id,noise_level,crowd_levels,notes) values ('wsc-tables','low','high','Permission fixture') returning *")).rows[0];
      assert.equal(row.user_id,'00000000-0000-4000-8000-000000000001');
      for(const statement of [
        'select * from public.users',
        'delete from public.user_reports',
        "update public.user_reports set noise_level='high'",
        "insert into public.user_reports (user_id,spot_id,noise_level,crowd_levels) values ('00000000-0000-4000-8000-000000000002','wsc-tables','low','low')",
        "insert into public.user_reports (report_id,spot_id,noise_level,crowd_levels) values (gen_random_uuid(),'wsc-tables','low','low')",
        "insert into public.user_reports (time_reported,spot_id,noise_level,crowd_levels) values (now(),'wsc-tables','low','low')",
        "insert into public.user_reports (spot_id,noise_level,crowd_levels) values ('hbll-group','low','low')",
        "insert into public.user_reports (spot_id,noise_level,crowd_levels) values ('missing-spot','low','low')",
        "insert into public.user_reports (spot_id,noise_level,crowd_levels) values ('wsc-tables','invalid','low')",
        "insert into public.user_reports (spot_id,noise_level,crowd_levels,notes) values ('wsc-tables','low','low',repeat('x',241))"
      ])await assert.rejects(pg.query(statement),statement);
    } finally {await pg.exec('reset role');}
  }
  await pg.exec("insert into public.user_reports (spot_id,noise_level,crowd_levels,notes,time_reported) select 'wsc-tables','low','low','Older bulk sample','2026-01-02T12:00:00Z' from generate_series(1,1100)");
  await pg.exec('set role anon');
  const latest=await pg.query('select * from public.latest_spot_reports');
  assert.equal(latest.rows.length,3);assert.ok(latest.rows.some(row=>row.spot_id==='jkb-tables'));
  await pg.exec('reset role');
  console.log('PASS SQL: six seeded tables, repeatable seed, foreign keys, RLS/grants for both public roles, protected IDs/user/time, one latest row per spot after 1,100 extra reports.');

  gateway=http.createServer(async(request,response)=>{
    response.setHeader('Content-Type','application/json');
    try {
      const route=new URL(request.url,'http://fixture').pathname;
      if(!['/rest/v1/user_reports','/rest/v1/latest_spot_reports'].includes(route)){response.writeHead(404);return response.end(JSON.stringify({code:'PGRST205'}));}
      if(request.headers.apikey!==publicKey){response.writeHead(401);return response.end('{}');}
      let rows;
      await pg.exec('set role anon');
      try {
        if(request.method==='POST'){
          if(rejectInserts){response.writeHead(403);return response.end(JSON.stringify({code:'42501'}));}
          let body='';for await(const chunk of request)body+=chunk;
          const input=JSON.parse(body);
          assert.equal(request.headers.prefer,'return=representation');
          assert.equal(request.headers.authorization,undefined);
          assert.deepEqual(Object.keys(input).sort(),['crowd_levels','noise_level','notes','spot_id']);
          rows=(await pg.query('insert into public.user_reports (spot_id,noise_level,crowd_levels,notes) values ($1,$2,$3,$4) returning *',[input.spot_id,input.noise_level,input.crowd_levels,input.notes])).rows;
          response.writeHead(201);
        } else rows=(await pg.query('select * from public.latest_spot_reports order by time_reported desc, report_id desc')).rows;
      } finally {await pg.exec('reset role');}
      response.end(JSON.stringify(rows));
    } catch(error){response.writeHead(400);response.end(JSON.stringify({code:error.code||'fixture-error'}));}
  });
  await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));
  const gatewayUrl=`http://127.0.0.1:${gateway.address().port}`;
  app=createAppServer({configFile:path.join(directory,'.env')});
  await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${app.address().port}`;
  const html=await readFile(path.join(root,'index.html'),'utf8');
  const names=['wsc-plans.js','database.js','app.js'];
  const scripts=await Promise.all(names.map(name=>readFile(path.join(root,name),'utf8')));
  async function until(predicate){for(let i=0;i<300;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,20));}throw new Error('Frontend fixture did not reach expected state.');}
  function frontend(storage=new Map()){
    const {window}=parseHTML(html);
    Object.assign(window,{location:{protocol:'http:',origin:base},fetch:(url,options)=>nativeFetch(new URL(url,base),{...options,headers:{...options?.headers,...(options?.method==='POST'&&String(url).startsWith('/api/')?{Origin:base}:{})}}),AbortController,URLSearchParams,ResizeObserver:class{observe(){}disconnect(){}},scrollTo(){},setTimeout,clearTimeout,Date,console,localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)}});
    const properties={
      clientWidth:{get:()=>800},clientHeight:{get:()=>520},offsetWidth:{get(){return Number.parseFloat(this.style.width)||500}},offsetHeight:{get(){return Number.parseFloat(this.style.height)||400}},offsetLeft:{get:()=>24},offsetTop:{get:()=>24},
      scrollLeft:{get(){return this._testLeft||0},set(value){this._testLeft=value}},scrollTop:{get(){return this._testTop||0},set(value){this._testTop=value}},
      elements:{get(){if(this.localName!=='form')return undefined;return Object.fromEntries([...this.querySelectorAll('input,select,textarea')].map(element=>[element.getAttribute('name'),element]));}}
    };
    for(const descriptor of Object.values(properties))descriptor.configurable=true;
    Object.defineProperties(window.HTMLElement.prototype,properties);
    // LinkeDOM omits a browser select's implicit first-option selection.
    Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){const option=this.querySelector('option[selected]')||this.querySelector('option');return option?.getAttribute('value')??option?.textContent??''},set(value){for(const option of this.querySelectorAll('option')){if(option.getAttribute('value')===String(value))option.setAttribute('selected','');else option.removeAttribute('selected')}}});
    window.HTMLElement.prototype.scrollIntoView=function(){};
    window.HTMLElement.prototype.setPointerCapture=function(){};
    const context=vm.createContext(window);
    for(let i=0;i<scripts.length;i++)vm.runInContext(scripts[i],context,{filename:names[i]});
    const query=selector=>{const element=window.document.querySelector(selector);assert.ok(element,selector);return element;};
    const click=selector=>query(selector).dispatchEvent(new window.Event('click',{bubbles:true}));
    function submit(selector,values){const form=query(selector);Object.defineProperty(form,'elements',{value:Object.fromEntries(Object.entries(values).map(([name,value])=>[name,typeof value==='boolean'?{checked:value,value:''}:{value}])),configurable:true});form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));}
    return {window,context,query,click,submit,storage,evaluate:expression=>vm.runInContext(expression,context)};
  }

  const first=frontend();await until(()=>first.evaluate('database.configLoaded&&!database.loading'));
  assert.equal(first.query('#databaseWarning').hidden,false);assert.equal(first.window.document.querySelector('#connectDatabase'),null);
  first.click('[data-study="group"]');assert.equal(first.evaluate('state.study'),'group');
  first.query('#groupSize').value='6';first.query('#groupSize').dispatchEvent(new first.window.Event('input',{bubbles:true}));assert.equal(first.evaluate('state.groupSize'),6);
  first.click('[data-noise="low"]');first.query('#outletFilter').checked=true;first.query('#outletFilter').dispatchEvent(new first.window.Event('change',{bubbles:true}));
  first.query('#privateFilter').checked=true;first.query('#privateFilter').dispatchEvent(new first.window.Event('change',{bubbles:true}));assert.equal(first.evaluate('state.private'),true);
  first.query('#buildingFilters input[value="JKB"]').checked=false;first.query('#buildingFilters input[value="JKB"]').removeAttribute('checked');first.query('#buildingFilters input[value="JKB"]').dispatchEvent(new first.window.Event('change',{bubbles:true}));assert.equal(first.evaluate('state.buildings.has("JKB")'),false);
  first.click('#saveFilters');assert.ok(first.storage.get('study-byu-prototype-v1').includes('savedFilters'));
  first.click('#clearFilters');assert.equal(first.evaluate('state.noise'),'any');
  first.click('#showMatches');assert.equal(first.evaluate('state.view'),'building');
  first.click('[data-open-building="WSC"]');
  for(let level=1;level<=6;level++){
    first.click(`[data-wsc-level="${level}"]`);assert.ok(first.query('#floorPlan .digital-floor-svg'));
    if(level<=3){first.click('[data-wsc-side="West"]');assert.equal(first.evaluate('state.floor'),`${level}W`);first.click('[data-wsc-side="East"]');}
  }
  first.click('[data-wsc-level="1"]');first.click('#zoomIn');assert.equal(first.evaluate('state.zoom'),1.25);first.click('#zoomFit');assert.equal(first.evaluate('state.zoom'),1);
  const viewport=first.query('.plan-scroll');
  for(const [type,x,y] of [['pointerdown',150,150],['pointermove',50,50],['pointerup',50,50]]){const event=new first.window.Event(type,{bubbles:true});Object.assign(event,{button:0,clientX:x,clientY:y,pointerId:1});viewport.dispatchEvent(event);}
  assert.equal(viewport.scrollLeft,100);assert.equal(viewport.scrollTop,100);
  // A browser emits its pointer-up click in this tick; let drag-click suppression expire.
  await new Promise(resolve=>setTimeout(resolve,5));
  first.click('#toggleRoomLabels');assert.equal(first.query('#toggleRoomLabels').getAttribute('aria-pressed'),'false');first.click('#toggleRoomLabels');
  first.query('#roomSearch').value=first.evaluate('window.WSC_PLANS["1E"].rooms[0].number');first.query('#roomSearch').dispatchEvent(new first.window.Event('input',{bubbles:true}));first.click('#roomSearchResults button');assert.ok(first.evaluate('state.selectedRoom'));
  first.click('[data-spot="wsc-tables"]');first.click('[data-save-spot="wsc-tables"]');first.query('[data-save-list="favorites"]').checked=true;first.click('[data-save-confirm="wsc-tables"]');
  first.click('#navSaved');assert.ok(first.query('#savedItems').textContent.includes('East hall tables'));first.click('#createList');first.submit('#newListForm',{name:'Class project'});assert.equal(first.evaluate('data.lists.length'),2);
  first.click('#navReport');first.submit('#newSpotForm',{name:'x',type:'group',capacity:'4',building:'WSC',floor:'1E',noise:'low',private:false,outlets:true,detail:''});assert.equal(first.query('#newSpotError').hidden,false);
  first.submit('#newSpotForm',{name:'Local test tables',type:'group',capacity:'4',building:'WSC',floor:'1E',noise:'low',private:false,outlets:true,detail:'Fictional suggestion'});
  assert.equal(first.evaluate('data.customSpots.length'),1);
  console.log('PASS local UI handlers: type/noise/private/outlet/building filters, save/clear, matching navigation, all nine WSC views, zoom/fit/pan, label toggle, room search, favorites, custom list, and validated new-spot suggestion.');

  await writeFile(path.join(directory,'.env'),'SUPABASE_URL='+gatewayUrl+'\nSUPABASE_PUBLISHABLE_KEY='+publicKey+'\nSUPABASE_REPORTS_TABLE=user_reports\n');await first.evaluate('database.initialize()');first.evaluate('renderDatabaseStatus();render()');
  assert.equal(first.query('#databaseWarning').hidden,true);
  first.click('[data-open-building="WSC"]');first.click('[data-spot="wsc-tables"]');first.click('[data-confirm-spot="wsc-tables"]');
  const note='Refresh proof 42 <script>not executed</script>';
  const values={noise:'high',busy:'high',note};
  first.submit('#arrivalForm',values);first.submit('#arrivalForm',values);first.click('#arrivalForm [data-modal-close]');assert.equal(first.query('#modalBackdrop').hidden,false);
  await until(()=>!first.query('#databaseReceipt').hidden);
  const row=(await pg.query('select * from public.user_reports where notes=$1',[note])).rows[0];
  assert.ok(row);assert.equal((await pg.query('select count(*)::int as n from public.user_reports where notes=$1',[note])).rows[0].n,1);
  assert.ok(first.query('#databaseReceipt').textContent.includes(row.report_id));
  assert.ok(!first.storage.get('study-byu-prototype-v1').includes(row.report_id));
  first.click('[data-open-reported="wsc-tables"]');assert.ok(first.query('#latestReport').textContent.includes(note));assert.ok(first.query('#latestReport').textContent.includes(row.report_id));assert.equal(first.query('#latestReport').querySelector('script'),null);
  first.click('[data-confirm-spot="wsc-tables"]');rejectInserts=true;first.submit('#arrivalForm',{noise:'low',busy:'low',note:'Rejected fixture'});
  await until(()=>!first.query('#arrivalError').hidden);assert.equal(first.query('#databaseWarning').hidden,false);assert.match(first.query('#arrivalError').textContent,/row-level security/);assert.equal(first.query('#databaseReceipt').hidden,true);
  assert.equal((await pg.query("select count(*)::int as n from public.user_reports where notes='Rejected fixture'")).rows[0].n,0);
  first.click('#arrivalForm [data-modal-close]');rejectInserts=false;
  const customId=first.evaluate('data.customSpots[0].id');first.click(`[data-spot="${customId}"]`);first.click(`[data-confirm-spot="${customId}"]`);
  assert.ok(first.query('#modal').textContent.includes('not the database vertical slice'));first.submit('#arrivalForm',{noise:'low',busy:'low',note:'Local suggestion report'});
  first.click(`[data-spot="${customId}"]`);assert.match(first.query('#latestReport').textContent,/Saved locally/);first.click('[data-modal-close]');
  console.log('PASS report UI: read-only .env configuration -> one PostgreSQL INSERT despite duplicate submission -> returned row/Latest report -> escaped text; denied save stays visible; local suggestions are explicitly local.');

  const second=frontend(new Map());await until(()=>second.evaluate('database.ready&&!database.loading'));assert.equal(second.query('#databaseWarning').hidden,true);
  second.click('[data-open-building="WSC"]');second.click('[data-spot="wsc-tables"]');
  assert.match(second.query('#latestReport').textContent,/Read from Supabase/);assert.ok(second.query('#latestReport').textContent.includes(row.report_id));assert.ok(second.query('#latestReport').textContent.includes(note));
  second.click('[data-modal-close]');second.click('[data-open-building="HBLL"]');second.click('[data-spot="hbll-group"]');assert.equal(second.query('#modal a.primary-button').getAttribute('href'),'https://lib.byu.edu/services/group-study-rooms/');
  assert.equal(second.window.document.querySelector('[data-confirm-spot="hbll-group"]'),null);
  const third=frontend(first.storage);await until(()=>third.evaluate('database.ready&&!database.loading'));assert.equal(third.query('#databaseWarning').hidden,true);
  assert.equal(third.evaluate('data.lists.length'),2);assert.equal(third.evaluate('data.customSpots.length'),1);assert.ok(third.evaluate('data.lists[0].spots.includes("wsc-tables")'));
  console.log('PASS reload: fresh frontend with empty storage reads the exact report ID/note from PostgreSQL; local favorites/list/suggestion persist separately; reservation action remains external.');
  console.log('Offline SQL/DOM fixture verification complete. Hosted Supabase and visual browser/video checks still require your project and browser.');
} finally {
  if(app?.listening)await new Promise(resolve=>app.close(resolve));
  if(gateway?.listening)await new Promise(resolve=>gateway.close(resolve));
  await pg.close();
  if(!directory.startsWith(path.resolve(tmpdir())+path.sep)||!path.basename(directory).startsWith('study-byu-integration-'))throw new Error('Unexpected test directory.');
  await rm(directory,{recursive:true,force:true});
}
