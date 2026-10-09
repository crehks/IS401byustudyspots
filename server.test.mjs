import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createAppServer,validateSettings,parseEnv} from '../server.mjs';

const settings={url:'https://example.supabase.co',key:'sb_publishable_fixture_public_key',table:'user_reports'};
test('settings accept only public keys and base URLs',()=>{
  assert.deepEqual(validateSettings({...settings,url:settings.url+'/'}),settings);
  for(const key of ['sb_secret_do_not_share','eyJservice_role','database-password',''])assert.throws(()=>validateSettings({...settings,key}));
  for(const url of ['http://remote.example','https://example.supabase.co/rest/v1','https://username:password@example.supabase.co','https://example.supabase.co/?key=value'])assert.throws(()=>validateSettings({...settings,url}));
  assert.throws(()=>validateSettings({...settings,table:'reports;drop table users'}));
  assert.equal(parseEnv('SUPABASE_REPORTS_TABLE=user_reports # comment\nPRIVATE_PASSWORD=secret').SUPABASE_REPORTS_TABLE,'user_reports');
  assert.equal(parseEnv('PRIVATE_PASSWORD=secret').PRIVATE_PASSWORD,undefined);
});

test('configuration is read-only and .env is never served',async t=>{
  const directory=await mkdtemp(path.join(tmpdir(),'study-byu-test-'));
  const configFile=path.join(directory,'.env');
  await writeFile(configFile,'UNRELATED_SETTING=preserved\n');
  const server=createAppServer({configFile});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));if(!directory.startsWith(path.resolve(tmpdir())+path.sep)||!path.basename(directory).startsWith('study-byu-test-'))throw new Error('Unexpected temporary test directory.');await rm(directory,{recursive:true,force:true});});
  const base='http://127.0.0.1:'+server.address().port;
  const initial=await (await fetch(base+'/api/config')).json();
  assert.equal(initial.configured,false);assert.equal(initial.setupToken,undefined);assert.equal(initial.setupEnabled,undefined);
  for(const origin of [base,'https://attacker.example']){
    const post=await fetch(base+'/api/config',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(settings)});
    assert.equal(post.status,405);
  }
  assert.equal(await readFile(configFile,'utf8'),'UNRELATED_SETTING=preserved\n');
  await writeFile(configFile,'SUPABASE_URL='+settings.url+'\nSUPABASE_PUBLISHABLE_KEY='+settings.key+'\nSUPABASE_REPORTS_TABLE=user_reports\n');
  const reread=await (await fetch(base+'/api/config')).json();
  assert.equal(reread.configured,true);assert.equal(reread.key,settings.key);
  for(const route of ['/.env','/%2eenv','/.env.example','/server.mjs','/package.json','/assets/../.env'])assert.equal((await fetch(base+route)).status,404,route);
  assert.equal((await fetch(base+'/index.html')).status,200);
  const hostileStatus=await new Promise((resolve,reject)=>{const request=http.get(base+'/api/config',{headers:{Host:'attacker.example'}},response=>{response.resume();resolve(response.statusCode)});request.on('error',reject)});
  assert.equal(hostileStatus,403);
});

test('malformed .env is reported without leaking its contents',async t=>{
  const directory=await mkdtemp(path.join(tmpdir(),'study-byu-test-'));
  const configFile=path.join(directory,'.env');
  await writeFile(configFile,'SUPABASE_URL=https://example.supabase.co\nSUPABASE_PUBLISHABLE_KEY=sb_secret_rejected\n');
  const server=createAppServer({configFile});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));if(!directory.startsWith(path.resolve(tmpdir())+path.sep)||!path.basename(directory).startsWith('study-byu-test-'))throw new Error('Unexpected temporary test directory.');await rm(directory,{recursive:true,force:true});});
  const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/config');
  assert.equal(response.status,500);assert.ok(!(await response.text()).includes('sb_secret_rejected'));
});
