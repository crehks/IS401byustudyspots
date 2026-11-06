// Saved-list adapter checks with fake HTTP responses; no real Supabase project is contacted.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../database.js';

const config={configured:true,url:'https://fixture.supabase.co',key:'sb_publishable_public_fixture',table:'ReportSpotStatus'};
function client(handler,signedIn=true){
  const calls=[];
  const db=new globalThis.StudyDatabase(async(url,options={})=>{calls.push({url:decodeURIComponent(url),options});return handler(decodeURIComponent(url),options,calls)});
  db.config=config;db.loading=false;
  if(signedIn){db.accessToken='tok';db.userId=1101}
  return {db,calls};
}

test('loadFavorites maps list rows and saved spot ids, oldest list first',async()=>{
  const {db,calls}=client(async()=>Response.json([
    {list_ID:7,list_name:'Favorites',Favorites:[{spot_ID:1008},{spot_ID:1008},{spot_ID:1001}]},
    {list_ID:9,list_name:'Finals',Favorites:[]}]));
  const lists=await db.loadFavorites();
  assert.deepEqual(lists,[{dbId:7,name:'Favorites',spots:['wsc-tables','hbll-commons']},{dbId:9,name:'Finals',spots:[]}]);
  assert.equal(calls[0].options.headers.Authorization,'Bearer tok');
});

test('loadFavorites creates the Favorites list when an account has none',async()=>{
  let posted;
  const {db}=client(async(url,o)=>{
    if(o.method==='POST'){posted=JSON.parse(o.body);return Response.json([{list_ID:3,list_name:'Favorites'}],{status:201})}
    return Response.json([]);
  });
  const lists=await db.loadFavorites();
  assert.deepEqual(posted,{user_id:1101,list_name:'Favorites'});
  assert.deepEqual(lists,[{dbId:3,name:'Favorites',spots:[]}]);
});

test('setSpotLists sends only the additions and removals',async()=>{
  const {db,calls}=client(async()=>new Response(null,{status:204}));
  await db.setSpotLists('wsc-tables',[{dbId:1,has:false,want:true},{dbId:2,has:true,want:false},{dbId:3,has:true,want:true},{dbId:4,has:false,want:false}]);
  assert.equal(calls.length,2);
  assert.deepEqual(JSON.parse(calls[0].options.body),[{list_ID:1,spot_ID:1008}]);
  assert.ok(calls[0].url.includes('on_conflict=list_ID,spot_ID'));
  assert.equal(calls[1].options.method,'DELETE');
  assert.ok(calls[1].url.includes('spot_ID=eq.1008')&&calls[1].url.includes('list_ID=in.(2)'));
});

test('setSpotLists makes no request when nothing changed',async()=>{
  const {db,calls}=client(async()=>new Response(null,{status:204}));
  await db.setSpotLists('wsc-tables',[{dbId:1,has:true,want:true}]);
  assert.equal(calls.length,0);
});

test('list errors are explained in plain language',async()=>{
  const dup=client(async()=>Response.json({code:'23505'},{status:409}));
  await assert.rejects(dup.db.createList('Finals'),/already have a list/);
  const cap=client(async()=>Response.json({code:'23514',message:'You can have Favorites and two custom lists.'},{status:400}));
  await assert.rejects(cap.db.createList('Fourth'),/two custom lists/);
  await assert.rejects(dup.db.createList('   '),/1 to 28/);
});

test('lists require a signed-in user and a known spot',async()=>{
  const out=client(async()=>Response.json([]),false);
  await assert.rejects(out.db.loadFavorites(),/Log in/);
  const inn=client(async()=>Response.json([]));
  await assert.rejects(inn.db.setSpotLists('custom-123',[{dbId:1,has:false,want:true}]),/not in the database/);
});
