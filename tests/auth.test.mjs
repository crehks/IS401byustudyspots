// Auth adapter checks with fake HTTP responses; no real Supabase project is contacted.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../database.js';
import '../auth.js';

const config={configured:true,url:'https://fixture.supabase.co',key:'sb_publishable_public_fixture',table:'ReportSpotStatus'};
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
function setup(handler){
  const calls=[];
  const fetcher=async(url,options={})=>{calls.push({url,options});if(url==='api/config')return Response.json(config);return handler(url,options,calls)};
  const db=new globalThis.StudyDatabase(fetcher);db.config=config;db.loading=false;
  return {db,calls,auth:new globalThis.StudyAuth(db,memory())};
}
const session={access_token:'tok',refresh_token:'ref',expires_in:3600};

test('sign in authenticates, loads the linked User row, and sends the bearer token',async()=>{
  const {auth,db,calls}=setup(async url=>{
    if(url.includes('/auth/v1/token?grant_type=password'))return Response.json(session);
    if(url.includes('/rest/v1/User?'))return Response.json([{user_id:1007,first_name:'Ada',last_name:'L'}]);
    throw new Error('unexpected '+url);
  });
  await auth.signIn({email:'a@b.co',password:'password1'});
  assert.equal(auth.signedIn,true);assert.equal(auth.userId,1007);assert.equal(auth.displayName,'Ada');
  assert.equal(calls.at(-1).options.headers.Authorization,'Bearer tok');
  assert.equal(db.userId,1007);
});

test('wrong password yields a friendly error and no session',async()=>{
  const {auth}=setup(async()=>Response.json({error_code:'invalid_credentials',msg:'Invalid login credentials'},{status:400}));
  await assert.rejects(auth.signIn({email:'a@b.co',password:'badbadbad'}),/do not match/);
  assert.equal(auth.signedIn,false);
});

test('sign up with email confirmation on reports needsConfirmation and sends names as metadata',async()=>{
  let body;
  const {auth}=setup(async(url,o)=>{body=JSON.parse(o.body);return Response.json({id:'u1',email:'a@b.co'})});
  const r=await auth.signUp({email:'a@b.co',password:'password1',firstName:'Ada',lastName:'L'});
  assert.equal(r.needsConfirmation,true);assert.deepEqual(body.data,{first_name:'Ada',last_name:'L'});assert.equal(auth.signedIn,false);
});

test('signed-in reports are attributed to the user; sign out clears the token',async()=>{
  const {auth,db,calls}=setup(async(url,o)=>{
    if(url.includes('/auth/v1/token'))return Response.json(session);
    if(url.includes('/rest/v1/User?'))return Response.json([{user_id:1007,first_name:'Ada',last_name:''}]);
    if(url.includes('/auth/v1/logout'))return new Response(null,{status:204});
    if(o.method==='POST'){const b=JSON.parse(o.body);return Response.json([{...b,report_id:9,created_at:new Date().toISOString()}],{status:201})}
    return Response.json([]);
  });
  await auth.signIn({email:'a@b.co',password:'password1'});
  await db.submitReport('wsc-tables',{noise:'low',busy:'low',note:'mine'});
  assert.equal(JSON.parse(calls.at(-1).options.body).user_id,1007);
  await auth.signOut();assert.equal(db.accessToken,'');assert.equal(db.userId,null);
});

test('restore refreshes an expired saved session',async()=>{
  const store=memory();store.setItem('studybyu.auth.v1',JSON.stringify({access_token:'old',refresh_token:'ref',expires_at:1}));
  const {db}=setup(async()=>Response.json({}));
  const a=new globalThis.StudyAuth(Object.assign(db,{fetcher:async url=>{
    if(url.includes('grant_type=refresh_token'))return Response.json(session);
    if(url.includes('/rest/v1/User?'))return Response.json([{user_id:5,first_name:'Bo',last_name:''}]);
    throw new Error(url)}}),store);
  assert.equal(await a.restore(),true);assert.equal(a.userId,5);
});

test('refresh swaps in new tokens and a failed refresh signs the user out',async()=>{
  let fail=false;
  const {auth,db}=setup(async url=>{
    if(url.includes('/auth/v1/token?grant_type=password'))return Response.json(session);
    if(url.includes('grant_type=refresh_token'))return fail?Response.json({error_code:'refresh_token_not_found'},{status:400}):Response.json({...session,access_token:'tok2'});
    return Response.json([{user_id:3,first_name:'Cy',last_name:''}]);
  });
  await auth.signIn({email:'a@b.co',password:'password1'});
  await auth.refresh();assert.equal(db.accessToken,'tok2');assert.equal(auth.signedIn,true);
  fail=true;await auth.refresh();assert.equal(auth.signedIn,false);assert.equal(db.accessToken,'');
  clearTimeout(auth.timer);
});

test('server errors are reported as server problems, not as bad details',async()=>{
  const {auth}=setup(async()=>Response.json({code:500,error_code:'unexpected_failure',msg:'Database error saving new user'},{status:500}));
  await assert.rejects(auth.signUp({email:'a@b.co',password:'password1',firstName:'Ada',lastName:''}),/server had a problem/);
});

test('email rate limit and confirmation errors are explained and carry a code',async()=>{
  const limit=setup(async()=>Response.json({error_code:'over_email_send_rate_limit',msg:'email rate limit exceeded'},{status:429}));
  await assert.rejects(limit.auth.signUp({email:'a@b.co',password:'password1',firstName:'A',lastName:''}),e=>/inbox and spam/.test(e.message)&&e.code==='over_email_send_rate_limit');
  const unconfirmed=setup(async()=>Response.json({error_code:'email_not_confirmed',msg:'Email not confirmed'},{status:400}));
  await assert.rejects(unconfirmed.auth.signIn({email:'a@b.co',password:'password1'}),e=>e.code==='email_not_confirmed');
});

test('resendConfirmation posts a signup resend for the email',async()=>{
  let seen;
  const {auth}=setup(async(url,o)=>{seen={url,body:JSON.parse(o.body)};return Response.json({})});
  await auth.resendConfirmation('a@b.co');
  assert.ok(seen.url.includes('/auth/v1/resend'));assert.deepEqual(seen.body,{type:'signup',email:'a@b.co'});
});

test('confirmation link: tokens in the URL hash sign the user in and the hash is cleared',async()=>{
  const {auth,db}=setup(async url=>url.includes('/rest/v1/User?')?Response.json([{user_id:9,first_name:'Eve',last_name:''}]):Response.json({}));
  let replaced;
  globalThis.location={protocol:'https:',origin:'https://site.test',pathname:'/app/',search:'',hash:'#access_token=abc&refresh_token=def&expires_in=3600&type=signup'};
  globalThis.history={replaceState:(a,b,u)=>{replaced=u}};
  try{
    assert.equal(await auth.restore(),true);
    assert.equal(auth.userId,9);assert.equal(db.accessToken,'abc');assert.match(auth.notice,/confirmed/i);assert.equal(replaced,'/app/');
  }finally{clearTimeout(auth.timer);delete globalThis.location;delete globalThis.history}
});

test('expired confirmation link reports a helpful notice and does not sign in',async()=>{
  const {auth}=setup(async()=>Response.json({}));
  globalThis.location={protocol:'https:',origin:'https://site.test',pathname:'/',search:'',hash:'#error=access_denied&error_code=otp_expired&error_description=expired'};
  globalThis.history={replaceState(){}};
  try{
    await auth.restore();assert.equal(auth.signedIn,false);assert.match(auth.notice,/expired/);
  }finally{delete globalThis.location;delete globalThis.history}
});

test('sign-up asks Supabase to return to this site after confirmation',async()=>{
  let url;
  const {auth}=setup(async u=>{url=u;return Response.json({id:'x'})});
  globalThis.location={protocol:'https:',origin:'https://site.test',pathname:'/app/',search:'?x=1',hash:''};
  try{await auth.signUp({email:'a@b.co',password:'password1',firstName:'A',lastName:''})}finally{delete globalThis.location}
  assert.ok(url.includes('redirect_to='+encodeURIComponent('https://site.test/app/')),url);
});
