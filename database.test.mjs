import test from 'node:test';
import assert from 'node:assert/strict';
import '../database.js';

test('existing numeric schema posts 1/2/3 and reloads the returned identity report',async()=>{
  const rows=[];let posted;
  const fetcher=async(url,options={})=>{
    if(url==='/api/config')return Response.json({...config,table:'ReportSpotStatus'});
    if(options.method==='POST'){
      assert.ok(url.endsWith('/ReportSpotStatus'));
      posted=JSON.parse(options.body);
      rows.unshift({...posted,report_id:4,user_id:1001,created_at:new Date().toISOString()});return Response.json([rows[0]],{status:201});
    }
    assert.ok(url.includes('/latest_report_spot_status?'));return Response.json(rows);
  };
  const first=new globalThis.StudyDatabase(fetcher);await first.initialize();
  const saved=await first.submitReport('wsc-tables',{noise:'high',busy:'medium',note:'Numeric refresh proof'});
  assert.deepEqual(posted,{spot_id:1008,noise_level:3,crowd_level:2,notes:'Numeric refresh proof'});
  assert.equal(saved.id,'4');assert.equal(saved.noise,'high');
  const fresh=new globalThis.StudyDatabase(fetcher);await fresh.initialize();
  assert.equal(fresh.reports['wsc-tables'][0].id,saved.id);
  assert.equal(fresh.reports['wsc-tables'][0].note,'Numeric refresh proof');
});

const config={configured:true,url:'https://fixture.supabase.co',key:'sb_publishable_public_fixture',table:'user_reports'};
const savedRow=body=>({...body,report_id:'10000000-0000-4000-8000-000000000123',user_id:'00000000-0000-4000-8000-000000000001',time_reported:new Date().toISOString()});
test('report insert uses returned row and a fresh client reloads it from the backend',async()=>{
  const rows=[],requests=[];
  const fetcher=async(url,options={})=>{
    requests.push({url,options});
    if(url==='/api/config')return Response.json(config);
    if(options.method==='POST'){
      const body=JSON.parse(options.body);
      const row=savedRow(body);
      rows.unshift(row);return Response.json([row],{status:201});
    }
    return Response.json(rows);
  };
  const first=new globalThis.StudyDatabase(fetcher);await first.initialize();
  const report=await first.submitReport('wsc-tables',{noise:'low',busy:'high',note:'Persistence fixture'});
  assert.equal(report.source,'supabase');assert.equal(report.id,rows[0].report_id);
  const post=requests.find(r=>r.options.method==='POST');
  assert.equal(post.options.headers.apikey,config.key);assert.equal(post.options.headers.Authorization,undefined);
  assert.equal(post.options.headers.Prefer,'return=representation');
  assert.equal(post.url,config.url+'/rest/v1/user_reports');
  assert.deepEqual(JSON.parse(post.options.body),{spot_id:'wsc-tables',noise_level:'low',crowd_levels:'high',notes:'Persistence fixture'});
  assert.ok(requests.some(r=>r.url.includes('/rest/v1/latest_spot_reports?')));
  const second=new globalThis.StudyDatabase(fetcher);await second.initialize();
  assert.equal(second.reports['wsc-tables'][0].id,report.id);
  assert.equal(second.reports['wsc-tables'][0].busy,'high');
});
test('anonymous 401 permission errors are not mislabeled as invalid keys',async()=>{
  const client=new globalThis.StudyDatabase();
  const error=await client.apiError(Response.json({code:'42501',message:'new row violates row-level security policy'},{status:401}));
  assert.match(error.message,/row-level security/);assert.doesNotMatch(error.message,/rejected.*key/);
});
test('denied insert reports an error and never creates a successful local fallback',async()=>{
  const client=new globalThis.StudyDatabase(async(url,options)=>url==='/api/config'?Response.json(config):options?.method==='POST'?Response.json({code:'42501'},{status:403}):Response.json([]));
  await client.initialize();
  await assert.rejects(client.submitReport('wsc-tables',{noise:'low',busy:'low',note:''}),/row-level security/);
  assert.deepEqual(client.reports,{});
});
test('missing or mismatched tables and unexpected insert responses are explicit errors',async()=>{
  const client=new globalThis.StudyDatabase(async url=>url==='/api/config'?Response.json(config):Response.json({code:'PGRST205'},{status:404}));
  await client.initialize();assert.equal(client.ready,false);assert.match(client.error,/missing/);
  client.fetcher=async()=>Response.json([],{status:201});
  await assert.rejects(client.submitReport('wsc-tables',{noise:'low',busy:'low',note:''}),/did not return/);
  await assert.rejects(client.submitReport('wsc-tables',{noise:'invalid',busy:'low'}),/Choose a noise/);
  await assert.rejects(client.submitReport('wsc-tables',{noise:'low',busy:'low',note:'x'.repeat(241)}),/240/);
  client.fetcher=async()=>Response.json([savedRow({spot_id:'different-spot',noise_level:'low',crowd_levels:'low',notes:''})],{status:201});
  await assert.rejects(client.submitReport('wsc-tables',{noise:'low',busy:'low',note:''}),/did not match/);
  client.fetcher=async()=>Response.json([null],{status:201});
  await assert.rejects(client.submitReport('wsc-tables',{noise:'low',busy:'low',note:''}),/unexpected report shape/);
});

test('failed setup and the legacy table cannot masquerade as a working ERD connection',async()=>{
  const client=new globalThis.StudyDatabase(async()=>Response.json({},{status:500}));
  await client.initialize();assert.equal(client.configLoaded,false);assert.equal(client.loading,false);assert.equal(client.ready,false);
  client.fetcher=async()=>Response.json({...config,table:'study_reports_demo'});
  await client.initialize();assert.equal(client.ready,false);assert.match(client.error,/old demo table/);
});
