// Report a Spot page: separate report.html, the floor-plan pin, and the submission path to SpotSubmission.
// Uses fake fetchers and an in-memory PGlite table. Never touches Supabase.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createAppServer} from '../server.mjs';
import '../database.js';

const root=new URL('../',import.meta.url);
const read=name=>readFile(new URL(name,root),'utf8');
const config={configured:true,url:'https://example.supabase.co',key:'sb_publishable_fixture_public_key',table:'ReportSpotStatus'};
const base={building:'WSC',floorNumber:1,floorLabel:'Floor 1 East',name:'East hall tables',type:'solo',capacity:1,noise:'low'};
// These tests are about the insert; the spam-check function (covered in spot-spam-check.test.mjs) is not deployed here.
const clientWith=fetcher=>{const c=new globalThis.StudyDatabase((url,options)=>String(url).includes('/functions/')?Promise.resolve(new Response('',{status:404})):fetcher(url,options));c.loading=false;c.config={...config};return c};

test('Report a Spot is its own page and the nav button goes there',async()=>{
  const [index,app,page,js]=await Promise.all(['index.html','app.js','report.html','report.js'].map(read));
  assert.match(app,/if\(t\.id==='navReport'\)\{[\s\S]*?window\.location\.href=`report\.html/);
  assert.match(app,/building=\$\{encodeURIComponent\(state\.building\)\}&floor=/,'opened from a building page, the report page starts on that floor');
  assert.doesNotMatch(app,/openNewSpot|newSpotForm/);
  assert.match(index,/id="navReport"/);
  // The page reuses the site's scripts and stylesheet, so the Supabase connection is the same one.
  for(const src of ['styles.css','supabase-config.js','database.js','auth.js','report.js'])assert.match(page,new RegExp(`${src.replace('.','\\.')}\\?v=`),src);
  assert.ok(page.indexOf('database.js')<page.indexOf('report.js')&&page.indexOf('supabase-config.js')<page.indexOf('database.js'));
  assert.match(page,/id="navReport"[^>]*aria-current="page"/);
  for(const id of ['reportBuilding','reportPlan','reportStage','reportName','reportType','reportCapacity','reportNoise','reportDetail','reportSubmit','reportDone'])assert.match(page,new RegExp(`id="${id}"`),id);
  // Same fields as the old dialog, and the same database call.
  assert.match(page,/Maximum group size \(2-6\)[\s\S]*?name="capacity" type="number" min="2" max="6"/);
  assert.match(js,/database\.submitSpot\(input\)/);
  assert.match(js,/planKey:state\.key,planX:state\.pin\?\.\[0\]/);
});

test('the local server serves the new page and its files',async t=>{
  const server=createAppServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const origin='http://127.0.0.1:'+server.address().port;
  for(const [file,type] of [['report.html','text/html'],['report.css','text/css'],['report.js','text/javascript']]){
    const response=await fetch(`${origin}/${file}`);
    assert.equal(response.status,200,file);assert.match(response.headers.get('content-type'),new RegExp(type));
  }
});

test('a pinned report sends the pin; an unpinned one still sends exactly what it used to',async()=>{
  const bodies=[];
  const client=clientWith(async(url,options)=>{bodies.push(JSON.parse(options.body));return new Response(null,{status:201})});
  await client.submitSpot({...base,planKey:'1E',planX:41.234,planY:60});
  assert.equal(bodies[0].plan_key,'1E');assert.equal(bodies[0].plan_x,41.23);assert.equal(bodies[0].plan_y,60);
  await client.submitSpot(base);
  assert.equal('plan_key' in bodies[1]||'plan_x' in bodies[1]||'plan_y' in bodies[1],false);
});

test('a pin outside the drawing is rejected before anything is sent',async()=>{
  let sent=0;
  const client=clientWith(async()=>{sent++;return new Response(null,{status:201})});
  for(const pin of [{planKey:'1E',planX:101,planY:5},{planKey:'1E',planX:-1,planY:5},{planKey:'1E',planX:NaN,planY:5},{planKey:'1E',planX:5},{planKey:'',planX:5,planY:5}]){
    await assert.rejects(client.submitSpot({...base,...pin}),/Drop the pin/);
  }
  assert.equal(sent,0);
});

test('before the pin columns exist, the report still goes through with the pin kept in the details',async()=>{
  const bodies=[];
  const client=clientWith(async(url,options)=>{
    const body=JSON.parse(options.body);bodies.push(body);
    return 'plan_key' in body?Response.json({code:'PGRST204',message:"Could not find the 'plan_key' column of 'SpotSubmission' in the schema cache"},{status:400}):new Response(null,{status:201});
  });
  await client.submitSpot({...base,planKey:'1E',planX:41.2,planY:60,detail:'By the windows'});
  assert.equal(bodies.length,3,'full row, then without the device token, then without the pin');
  assert.equal('client_token' in bodies[1],false);assert.equal(bodies[1].plan_key,'1E');
  assert.equal('plan_key' in bodies[2],false);
  assert.equal(bodies[2].location_details,'By the windows [Pin 1E 41.2%, 60%]');
  assert.ok(bodies[2].location_details.length<=160);
  // Other failures are still reported, never retried.
  bodies.length=0;
  const denied=clientWith(async()=>{bodies.push(1);return Response.json({code:'42501'},{status:403})});
  await assert.rejects(denied.submitSpot({...base,planKey:'1E',planX:1,planY:1}),/denied/);
  assert.equal(bodies.length,1);
});

test('with only the pin columns applied (no device-token column yet), the pin still goes in its own columns',async()=>{
  const bodies=[];
  const client=clientWith(async(url,options)=>{
    const body=JSON.parse(options.body);bodies.push(body);
    return 'client_token' in body?Response.json({code:'PGRST204',message:"Could not find the 'client_token' column of 'SpotSubmission' in the schema cache"},{status:400}):new Response(null,{status:201});
  });
  await client.submitSpot({...base,planKey:'L3',planX:40,planY:55,detail:'By the windows'});
  assert.equal(bodies.length,2);
  assert.deepEqual([bodies[1].plan_key,bodies[1].plan_x,bodies[1].plan_y,bodies[1].location_details],['L3',40,55,'By the windows']);
});

test('migration lets the public insert a valid pin and rejects half-set or out-of-range pins',async()=>{
  const pg=await PGlite.create();
  try{
    await pg.exec(`create role anon; create role authenticated;
      create table public."SpotSubmission"(submission_id bigint generated by default as identity primary key, spot_name text not null);
      alter table public."SpotSubmission" enable row level security;
      grant usage on schema public to anon, authenticated;
      grant insert (spot_name) on public."SpotSubmission" to authenticated;
      create policy submit on public."SpotSubmission" for insert to authenticated with check (true);`);
    const sql=await read('supabase/migrations/20261117_001_spot_submission_pin.sql');
    await pg.exec(sql);await pg.exec(sql); // safe to run twice
    const insert=async values=>{
      try{await pg.exec(`set role authenticated; insert into public."SpotSubmission"(${Object.keys(values).join(',')}) values (${Object.values(values).map(v=>typeof v==='string'?`'${v}'`:v).join(',')});`)}
      finally{await pg.exec('reset role')}
    };
    await insert({spot_name:'No pin'});
    await insert({spot_name:'Pinned',plan_key:'L3',plan_x:40.5,plan_y:55});
    for(const bad of [{plan_key:'L3',plan_x:40},{plan_x:40,plan_y:50},{plan_key:'L3',plan_x:101,plan_y:5},{plan_key:'L3',plan_x:5,plan_y:-1}]){
      await assert.rejects(()=>insert({spot_name:'Bad',...bad}),/check/i);
    }
    await assert.rejects(async()=>{try{await pg.exec('set role anon; select * from public."SpotSubmission";')}finally{await pg.exec('reset role')}},/permission denied/i,'guests cannot read submissions');
  }finally{await pg.close()}
});

test('recent reports: needs a login, asks only for the signed-in user, and maps status',async()=>{
  const requests=[];
  const client=clientWith(async(url,options)=>{requests.push({url,options});return Response.json([
    {submission_id:7,created_at:'2026-11-17T10:00:00Z',spot_name:'Quiet corner',building_id:1002,floor_label:'Floor 2 East',status:'approved'},
    {submission_id:6,created_at:'2026-11-16T10:00:00Z',spot_name:'Hall tables',building_id:1001,floor_label:'Floor 3',status:'weird'}])});
  await assert.rejects(client.loadMySubmissions(),/Log in/);
  assert.equal(requests.length,0,'guests send no request');
  client.accessToken='token';client.userId=5;
  const rows=await client.loadMySubmissions();
  assert.match(requests[0].url,/\/rest\/v1\/SpotSubmission\?/);
  assert.equal(requests[0].options.headers.Authorization,'Bearer token');
  assert.deepEqual(rows.map(r=>[r.name,r.building,r.status]),[['Quiet corner','WSC','approved'],['Hall tables','HBLL','pending']]);
});

test('migration: a user reads only their own submissions; guests read none',async()=>{
  const pg=await PGlite.create();
  try{
    await pg.exec(`create role anon; create role authenticated; create schema auth;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
      grant usage on schema public, auth to anon, authenticated;
      create table public."User"(user_id bigint primary key, auth_id uuid);
      grant select on public."User" to authenticated;
      insert into public."User" values (1,'00000000-0000-0000-0000-000000000001'),(2,'00000000-0000-0000-0000-000000000002');
      create table public."SpotSubmission"(submission_id bigint generated by default as identity primary key, created_at timestamptz default now(), user_id bigint not null default 1001, building_id bigint, floor_label text, spot_name text not null, status text not null default 'pending');
      alter table public."SpotSubmission" enable row level security;
      insert into public."SpotSubmission"(user_id,spot_name) values (1,'mine'),(2,'theirs'),(1001,'guest');`);
    await pg.exec(await read('supabase/migrations/20261117_002_spot_submission_read_own.sql'));
    const names=async(role,uid)=>{try{await pg.exec(`set role ${role}; set test.uid='${uid||''}'`);return (await pg.query('select spot_name from public."SpotSubmission" order by 1')).rows.map(r=>r.spot_name)}finally{await pg.exec('reset role')}};
    assert.deepEqual(await names('authenticated','00000000-0000-0000-0000-000000000001'),['mine']);
    await assert.rejects(()=>names('anon'),/permission denied/i);
    await assert.rejects(async()=>{try{await pg.exec(`set role authenticated; update public."SpotSubmission" set status='approved'`)}finally{await pg.exec('reset role')}},/permission denied/i);
  }finally{await pg.close()}
});

test('guests can report: the page has no login wall and says what logging in adds',async()=>{
  const [page,js,app]=await Promise.all(['report.html','report.js','app.js'].map(read));
  assert.doesNotMatch(page,/loginGate|Log in to report/);
  assert.doesNotMatch(page,/<form id="reportForm"[^>]*hidden/);
  assert.doesNotMatch(js,/gated|loginGate/);
  assert.doesNotMatch(app,/get\('login'\)==='report'/);
  assert.match(js,/You do not need an account to report a spot/);
  // Only the account-based part is behind a login: the Recent reports tab.
  assert.match(js,/if\(!auth\.signedIn\)\{\s*list\.innerHTML='<div class="recent-empty"><p>Log in to see/);
});

// Whole workflow against the REAL SpotSubmission migrations and policies (only the parent tables are stubbed).
test('full chain: guest and user can report, limits hold, user reports with a pin, sees only their own, cannot self-approve or impersonate',async()=>{
  const pg=await PGlite.create();
  try{
    await pg.exec(`create role anon; create role authenticated; create schema auth;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
      grant usage on schema public, auth to anon, authenticated;
      create table public."User"(user_id bigint generated by default as identity primary key, auth_id uuid unique);
      insert into public."User"(user_id,auth_id) values (1001,null);
      insert into public."User"(user_id,auth_id) values (1002,'00000000-0000-0000-0000-00000000000a'),(1003,'00000000-0000-0000-0000-00000000000b');
      grant select on public."User" to authenticated;
      create policy own_user on public."User" for select to authenticated using (auth_id = (select auth.uid()));
      alter table public."User" enable row level security;
      create table public."Buildings"(building_id bigint primary key); insert into public."Buildings" values (1001),(1002),(1003);
      create table public."SpotType"(spot_type_id bigint primary key); insert into public."SpotType" values (1001),(1002),(1003);
      create table public."StudySpot"(spot_id bigint primary key);`);
    await pg.exec(await read('supabase/migrations/20261102_001_spot_submission.sql'));
    await pg.exec(await read('supabase/migrations/20261105_001_spot_submission_capacity_six.sql'));
    const auth=await read('supabase/migrations/20261105_001_user_auth.sql');
    await pg.exec(auth.match(/drop policy if exists studybyu_submit_spot on[\s\S]*?create policy studybyu_submit_spot_user[\s\S]*?\);\r?\n/)[0]);
    await pg.exec('grant insert (user_id) on public."SpotSubmission" to authenticated;');
    for(const name of ['20261117_001_spot_submission_pin','20261117_002_spot_submission_read_own','20261117_004_spot_submission_spam_check'])await pg.exec(await read(`supabase/migrations/${name}.sql`));
    const as=async(role,uid,sql)=>{try{await pg.exec(`set role ${role}; set test.uid='${uid||''}'`);return await pg.query(sql)}finally{await pg.exec('reset role')}};
    const A='00000000-0000-0000-0000-00000000000a',B='00000000-0000-0000-0000-00000000000b';
    const row=(user,extra='')=>`insert into public."SpotSubmission"(user_id,building_id,floor_number,floor_label,spot_name,spot_type_id,capacity,noise_level,outlets,is_private,location_details${extra?',plan_key,plan_x,plan_y':''}) values (${user},1001,3,'Floor 3','Test spot',1001,1,1,false,false,null${extra})`;
    // 1. Guests CAN report (as the shared guest user), with a pin and a device token, but nothing else.
    const T1='aaaaaaaaaaaaaaaa-device-1',T2='bbbbbbbbbbbbbbbb-device-2';
    const guest=(token,extra='')=>`insert into public."SpotSubmission"(building_id,floor_label,spot_name,spot_type_id,capacity,noise_level${extra?',plan_key,plan_x,plan_y':''}${token?',client_token':''}) values (1001,'Floor 3','Guest spot',1001,1,1${extra}${token?`,'${token}'`:''})`;
    await as('anon','',guest(T1,",'L3',40,50"));
    await assert.rejects(()=>as('anon','',row(1002)),/permission denied|row-level security/i,'a guest cannot report as a real account');
    await assert.rejects(()=>as('anon','',guest('short')),/check/i,'a malformed device token is refused');
    await assert.rejects(()=>as('anon','',`select * from public."SpotSubmission"`),/permission denied/i);
    // 2. A signed-in user reports with a pin, as themselves (account A).
    await as('authenticated',A,row(1002,",'L3',52.63,61.82"));
    await as('authenticated',B,row(1003));
    // 3. They cannot report as someone else, nor pick their own status or approval.
    await assert.rejects(()=>as('authenticated',A,row(1003)),/row-level security/i);
    await assert.rejects(()=>as('authenticated',A,row(1002).replace("is_private,","is_private,status,").replace("false,null)","false,'approved',null)")),/permission denied|row-level security/i);
    // 4. A bad pin is refused by the database.
    await assert.rejects(()=>as('authenticated',A,row(1002,",'L3',140,5")),/check/i);
    // 5. Each user reads only their own reports; guests read nothing; nobody can edit or delete.
    assert.deepEqual((await as('authenticated',A,'select user_id, status from public."SpotSubmission"')).rows,[{user_id:1002,status:'pending'}]);
    assert.deepEqual((await as('authenticated',B,'select user_id from public."SpotSubmission"')).rows,[{user_id:1003}]);
    await assert.rejects(()=>as('anon','','select * from public."SpotSubmission"'),/permission denied/i);
    await assert.rejects(()=>as('authenticated',A,`update public."SpotSubmission" set status='approved'`),/permission denied/i);
    await assert.rejects(()=>as('authenticated',A,'delete from public."SpotSubmission"'),/permission denied/i);
    // 3b. Spam protection columns and rules (migration 004). Signed-in users cannot post as the shared guest id either.
    await assert.rejects(()=>as('authenticated',A,row(1001)),/row-level security/i);
    for(const col of ['ai_checked_at','ai_reason','attempts'])await assert.rejects(()=>as('authenticated',A,`insert into public."SpotSubmission"(user_id,building_id,floor_label,spot_name,spot_type_id,capacity,noise_level,${col}) values (1002,1001,'F','Test spot',1001,1,1,${col==='attempts'?'0':col==='ai_reason'?"'x'":'now()'})`),/permission denied/i,col);
    // Rate limit: 5 reports per account per hour (A already has 1), the 6th is stopped with a readable message.
    for(let i=0;i<4;i++)await as('authenticated',A,row(1002));
    await assert.rejects(()=>as('authenticated',A,row(1002)),/several reports recently/i);
    await as('authenticated',B,row(1003)); // another account is not affected
    // The AI check (service role / owner) marks spam; the student can read the reason but never write it.
    await pg.exec(`update public."SpotSubmission" set status='rejected', ai_reason='Advertisement.', ai_checked_at=now(), attempts=1 where submission_id=(select min(submission_id) from public."SpotSubmission" where user_id=1002)`);
    const mine=(await as('authenticated',A,'select status, ai_reason from public."SpotSubmission" order by submission_id limit 1')).rows;
    assert.deepEqual(mine,[{status:'rejected',ai_reason:'Advertisement.'}]);
    await assert.rejects(()=>as('authenticated',A,'select ai_checked_at from public."SpotSubmission"'),/permission denied/i,'internal check columns stay private');
    await as('authenticated',A,`select 1`);
    // Guest limits: 5 per device per hour (one used above), other devices unaffected, 60/hour across all guests.
    for(let i=0;i<4;i++)await as('anon','',guest(T1));
    await assert.rejects(()=>as('anon','',guest(T1)),/several reports recently/i);
    await as('anon','',guest(T2));
    await pg.exec('alter table public."SpotSubmission" disable trigger spot_submission_rate_limit_trg');
    await pg.exec(`insert into public."SpotSubmission"(user_id,building_id,floor_label,spot_name,spot_type_id,capacity,noise_level) select 1001,1001,'F','Bulk '||g,1001,1,1 from generate_series(1,55) g`);
    await pg.exec('alter table public."SpotSubmission" enable trigger spot_submission_rate_limit_trg');
    await assert.rejects(()=>as('anon','',guest(null)),/lot of reports/i);
    // 6. The team (table owner) approves it; the user then sees it as Added (approved).
    await pg.exec(`update public."SpotSubmission" set status='approved' where user_id=1002 and status='pending'`);
    assert.equal((await as('authenticated',A,`select status from public."SpotSubmission" where status='approved'`)).rows.length,4);
  }finally{await pg.close()}
});
