// Client-side OKR logic with fake HTTP; no real Supabase project is contacted.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../database.js';
import '../okr.js';

const {StudyDatabase,ChoiceTimer,StudyOkr}=globalThis;
const config={configured:true,url:'https://fixture.supabase.co',key:'sb_publishable_public_fixture',table:'ReportSpotStatus'};
const ready=fetcher=>{const db=new StudyDatabase(fetcher);db.config=config;db.loading=false;db.configLoaded=true;return db;};

test('choice timer ignores gaps under 1 s or over 30 min and restarts after every choice',()=>{
  const t=new ChoiceTimer(0);
  assert.equal(t.lap(400),null,'under 1 s is ignored');
  assert.equal(t.startedAt,400,'timer still restarts');
  assert.equal(t.lap(400+45_000),45);
  assert.equal(t.lap(400+45_000+1_800_000),1800,'exactly 30 min is kept');
  assert.equal(t.lap(400+45_000+1_800_000+1_801_000),null,'over 30 min is ignored');
  assert.equal(t.lap(400+45_000+1_800_000+1_801_000+12_400),12,'next choice measures from the previous one');
});

test('logChoice posts only whole seconds in range and never throws',async()=>{
  const calls=[];
  const db=ready(async(url,options)=>{calls.push({url,options});return new Response(null,{status:201});});
  assert.equal(await db.logChoice(42),true);
  assert.ok(calls[0].url.endsWith('/rest/v1/spot_choice_events'));
  assert.equal(calls[0].options.headers.Prefer,'return=minimal');
  assert.deepEqual(JSON.parse(calls[0].options.body),{seconds:42});
  for(const bad of [0,1801,2.5,NaN,'12'])assert.equal(await db.logChoice(bad),false);
  assert.equal(calls.length,1,'out-of-range values never reach the network');
  assert.equal(await ready(async()=>{throw new Error('offline')}).logChoice(10),false);
  assert.equal(await ready(async()=>new Response('{}',{status:403})).logChoice(10),false);
});

test('recordVisit sends only the sign-in flag, needs a session, and never throws',async()=>{
  const calls=[];
  const db=ready(async(url,options)=>{calls.push({url,body:JSON.parse(options.body),auth:options.headers.Authorization});return new Response(null,{status:204});});
  assert.equal(await db.recordVisit(true),false,'no session, no request');
  assert.equal(calls.length,0);
  db.accessToken='token';
  assert.equal(await db.recordVisit(true),true);
  assert.equal(await db.recordVisit(false),true);
  assert.ok(calls[0].url.endsWith('/rest/v1/rpc/record_visit'));
  assert.deepEqual(calls.map(c=>c.body),[{p_sign_in:true},{p_sign_in:false}]);
  assert.equal(calls[0].auth,'Bearer token');
  const offline=ready(async()=>{throw new Error('offline')});offline.accessToken='token';
  assert.equal(await offline.recordVisit(true),false);
});

test('arrival answer travels with guest and signed-in reports',async()=>{
  let posted;
  const guest=ready(async(url,options)=>{posted=JSON.parse(options.body);return Response.json([{...posted,report_id:7,user_id:1001,created_at:new Date().toISOString()}],{status:201});});
  await guest.submitReport('hbll-commons',{noise:'low',busy:'low',note:'',available:true});
  assert.equal(posted.was_available,true);
  await guest.submitReport('hbll-commons',{noise:'low',busy:'low',note:'',available:false});
  assert.equal(posted.was_available,false);
  await guest.submitReport('hbll-commons',{noise:'low',busy:'low',note:''});
  assert.equal('was_available' in posted,false,'omitted when the caller gives no answer');

  const bodies=[];
  const member=ready(async(url,options)=>{
    if(url.includes('/functions/v1/tag-report'))return Response.json({status:'approved'});
    if(url.includes('space_conditions'))return Response.json([]);
    bodies.push(JSON.parse(options.body));return Response.json([{id:5}],{status:201});
  });
  member.accessToken='token';
  await member.submitAiReport('hbll-commons',{noise:'low',busy:'high',note:'',available:false});
  assert.equal(bodies[0].was_available,false);
  assert.deepEqual(Object.keys(bodies[0]).sort(),['body','self_crowd','self_noise','space_id','was_available']);
});

test('loadOkrs posts to the aggregate function without caching and validates the shape',async()=>{
  let seen;
  const sample={o1k1:{available:1,answered:2,pct:50},o1k2:{avg_seconds:90,n:2,progress_pct:75},o2k1:{users:1,registered:2,pct:50},o2k2:{users:0,registered:2,pct:0},generated_at:'2026-11-14T10:00:00Z'};
  const db=ready(async(url,options)=>{seen={url,options};return Response.json(sample);});
  assert.deepEqual(await db.loadOkrs(),sample);
  assert.ok(seen.url.endsWith('/rest/v1/rpc/okr_metrics'));
  assert.equal(seen.options.method,'POST');
  assert.equal(seen.options.cache,'no-store');
  assert.equal(seen.options.headers.apikey,config.key);
  assert.equal('Authorization' in seen.options.headers,false,'works for logged-out visitors');
  await assert.rejects(ready(async()=>Response.json({o1k1:{}})).loadOkrs(),/unexpected OKR response/);
  await assert.rejects(ready(async()=>new Response('{}',{status:500})).loadOkrs(),/HTTP 500/);
  // A refusal marks the error as "denied" so the page shows its admin gate; other failures do not.
  for(const status of [401,403])await assert.rejects(ready(async()=>new Response(JSON.stringify({code:'42501',message:'Admin access required.'}),{status})).loadOkrs(),error=>error.denied===true);
  await assert.rejects(ready(async()=>new Response('{}',{status:500})).loadOkrs(),error=>error.denied===false);
});

test('progress math: forward KRs, the inverse time KR, clamping, and no data',()=>{
  const {progressPct,OKR_CONFIG}=StudyOkr;
  assert.equal(progressPct(0,50,25),50);
  assert.equal(progressPct(0,50,80),100,'clamped above target');
  assert.equal(progressPct(0,40,0),0);
  assert.equal(progressPct(180,60,120),50,'inverse: halfway from 180 s to 60 s');
  assert.equal(progressPct(180,60,60),100);
  assert.equal(progressPct(180,60,30),100,'faster than target is clamped');
  assert.equal(progressPct(180,60,400),0,'slower than baseline is clamped');
  assert.equal(progressPct(180,60,null),0,'no data');
  const kr=id=>OKR_CONFIG.objectives.flatMap(o=>o.krs).find(k=>k.id===id);
  assert.deepEqual([kr('o1k1').target,kr('o1k2').baseline,kr('o1k2').target,kr('o2k1').target,kr('o2k2').target],[50,180,60,50,40]);
});

test('cards show the raw counts behind each percentage and guard empty data',()=>{
  const {describe,OKR_CONFIG}=StudyOkr;
  const kr=id=>OKR_CONFIG.objectives.flatMap(o=>o.krs).find(k=>k.id===id);
  const metrics={o1k1:{available:3,answered:6,pct:50},o1k2:{avg_seconds:90.4,n:3,progress_pct:75},o2k1:{users:3,registered:6,pct:50},o2k2:{users:1,registered:5,pct:20}};
  assert.deepEqual(describe(kr('o1k1'),metrics),{current:50,currentText:'50%',progress:100,counts:'3 of 6 arrival reports said the spot was available',hasData:true});
  const time=describe(kr('o1k2'),metrics);
  assert.equal(time.currentText,'90 s');assert.equal(time.progress,74.7);assert.equal(time.counts,'Average of 3 choices');
  assert.match(describe(kr('o2k1'),metrics).counts,/^3 of 6 registered users visited 2\+ separate times in the last 14 days$/);
  const second=describe(kr('o2k2'),metrics);
  assert.equal(second.progress,50);assert.match(second.counts,/^1 of 5 registered users submitted 2\+ reports/);
  const empty={o1k1:{available:0,answered:0},o1k2:{avg_seconds:null,n:0},o2k1:{users:0,registered:0},o2k2:{users:0,registered:0}};
  for(const id of ['o1k1','o1k2','o2k1','o2k2']){const d=describe(kr(id),empty);assert.equal(d.progress,0);assert.equal(d.currentText,'No data yet');assert.equal(d.hasData,false);}
});

test('dashboard uses the exact OKR wording',()=>{
  const texts=StudyOkr.OKR_CONFIG.objectives.flatMap(o=>[o.title,...o.krs.map(k=>k.text)]);
  assert.deepEqual(texts,[
    'Reduce friction and frustration for students by showing study spots that fit their needs',
    'Increase the percentage of students who report an available study spot on arrival from 0% to 50%.',
    'Reduce the average time students take to choose a study spot in the app from 3 minutes to 60 seconds.',
    'Provide a consistent, quality experience for long-term users',
    'Increase the percentage of registered users who visit the app 2+ separate times within 14 days from 0% to 50%.',
    'Increase the percentage of registered users who submit more than one report within 14 days from 0% to 40%.'
  ]);
});
