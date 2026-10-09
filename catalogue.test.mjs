import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import vm from 'node:vm';
import {parseEnv} from '../server.mjs';

const root=new URL('../',import.meta.url);
test('shared template is blank and web setup controls are absent',async()=>{
  const settings=parseEnv(await readFile(new URL('.env.example',root),'utf8'));
  assert.equal(settings.SUPABASE_URL,'');assert.equal(settings.SUPABASE_PUBLISHABLE_KEY,'');
  const html=await readFile(new URL('index.html',root),'utf8');
  assert.ok(html.includes('Supabase is not connected.'));
  assert.ok(!html.includes('id="connectDatabase"'));assert.ok(!html.includes('id="refreshDatabase"'));
  const app=await readFile(new URL('app.js',root),'utf8');
  assert.ok(!app.includes('databaseSettingsForm'));assert.ok(!app.includes('openDatabaseSettings'));
});
test('all built-in spots have ERD seed rows and physical floors',async()=>{
  const app=await readFile(new URL('app.js',root),'utf8');
  const prefix=app.slice(0,app.indexOf('const STORAGE_KEY'));
  const catalogue=vm.runInNewContext(prefix+'; ({BUILDINGS,DEMO_SPOTS})');
  const seed=await readFile(new URL('supabase/seed.sql',root),'utf8');
  assert.equal(catalogue.DEMO_SPOTS.length,25);
  for(const spot of catalogue.DEMO_SPOTS){
    assert.ok(seed.includes(`('${spot.id}',`),`Missing seed: ${spot.id}`);
    const physical=spot.building==='WSC'?`WSC-${spot.floor[0]}`:`${spot.building}-${spot.floor}`;
    assert.ok(seed.includes(`'${physical}'`),`Missing physical floor: ${physical}`);
  }
});
test('original ERD, all nine native maps and source PDFs remain bundled',async()=>{
  const erd=await readFile(new URL('docs/erd.png',root));
  assert.equal(erd.subarray(1,4).toString(),'PNG');
  const svgFiles=(await readdir(new URL('assets/wsc/digital/',root))).filter(name=>name.endsWith('.svg'));
  const pdfFiles=(await readdir(new URL('assets/wsc/',root))).filter(name=>name.endsWith('.pdf'));
  assert.equal(svgFiles.length,9);assert.equal(pdfFiles.length,9);
  const readme=await readFile(new URL('README.md',root),'utf8');
  assert.match(readme,/!\[[^\]]+\]\(docs\/erd\.png\)/);
});
