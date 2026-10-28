// Catalogue checks: map labels, stable IDs, all floor bundles, and bundled source files.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import vm from 'node:vm';
import {parseEnv} from '../server.mjs';

const root=new URL('../',import.meta.url);
test('campus labels fit their roof shapes and the three supported labels stay horizontal',async()=>{
  const app=await readFile(new URL('app.js',root),'utf8');
  const source=app.slice(0,app.indexOf('const STORAGE_KEY'))+app.slice(app.indexOf('function campusPointInside'),app.indexOf('function renderCampusMap'));
  const c=vm.runInNewContext(source+'; ({BUILDINGS,CAMPUS_BUILDINGS,campusLabelLayout,campusLabelBoxFits})');
  for(const b of c.CAMPUS_BUILDINGS){
    const supported=!!c.BUILDINGS[b.id],label=c.campusLabelLayout(b,supported),points=b.points.split(' ').map(p=>p.split(',').map(Number));
    const widths={I:.3,J:.6,M:.9,W:1,T:.7,F:.65,L:.65};
    const textWidth=[...b.id].reduce((sum,char)=>sum+(widths[char]||.8),0)*label.size;
    const padding=label.size<8?1.2:3,width=(label.angle?label.size*1.55:textWidth)+padding,height=(label.angle?textWidth:label.size*1.55)+padding;
    assert.ok(c.campusLabelBoxFits(points,label.x-width/2,label.y-height/2,label.x+width/2,label.y+height/2),b.id);
    if(supported){assert.equal(label.angle,0,b.id);assert.ok(label.size<=20);}
  }
});
test('campus map has 45 traced buildings but only the three supported building routes',async()=>{
  const app=await readFile(new URL('app.js',root),'utf8');
  const catalogue=vm.runInNewContext(app.slice(0,app.indexOf('const STORAGE_KEY'))+'; ({BUILDINGS,CAMPUS_BUILDINGS})');
  assert.equal(catalogue.CAMPUS_BUILDINGS.length,45);
  assert.equal(new Set(catalogue.CAMPUS_BUILDINGS.map(b=>b.id)).size,45);
  assert.deepEqual(Array.from(catalogue.CAMPUS_BUILDINGS.filter(b=>catalogue.BUILDINGS[b.id]),b=>b.id).sort(),['HBLL','JKB','WSC']);
  for(const building of catalogue.CAMPUS_BUILDINGS){
    const vertices=building.points.split(' ').map(point=>point.split(',').map(Number));assert.ok(vertices.length>=4,building.id);
    assert.ok(vertices.every(([x,y])=>Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=1238&&y>=0&&y<=807),building.id);
  }
  const html=await readFile(new URL('index.html',root),'utf8');
  assert.match(html,/id="campusMapDrawing"/);assert.match(html,/id="campusComingSoon"/);
  assert.doesNotMatch(html,/Feedback|Schematic BYU campus map/);
});
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

test('all ten HBLL drawings are native, searchable maps with correct floor sides',async()=>{
  const context={window:{}};
  vm.runInNewContext(await readFile(new URL('hbll-plans.js',root),'utf8'),context);
  const plans=context.window.HBLL_PLANS;
  const expected=['B','L1N','L1','L2N','L2','L3N','L3','L4','L5','L6'];
  assert.deepEqual(Object.keys(plans).sort(),expected.sort());
  const app=await readFile(new URL('app.js',root),'utf8');
  const catalogue=vm.runInNewContext(app.slice(0,app.indexOf('const STORAGE_KEY'))+'; ({BUILDINGS,DEMO_SPOTS})');
  assert.equal(catalogue.BUILDINGS.HBLL.floors.length,10);
  let count=0;
  for(const floor of catalogue.BUILDINGS.HBLL.floors){
    const plan=plans[floor.id];assert.ok(plan,`Missing HBLL ${floor.id}`);
    assert.equal(plan.file,floor.file);assert.equal(plan.north,-90);
    assert.match(plan.svg,/Harold B\. Lee Library/);
    assert.match(plan.svg,/<path class="map-structure"/);
    assert.ok(!/<image\b|<iframe\b|<foreignObject\b|data:image/i.test(plan.svg),'The map must use native vectors, not an embedded scan');
    assert.equal(plan.rooms.length,new Set(plan.rooms.map(room=>room.number)).size);
    for(const room of plan.rooms){
      assert.ok(room.x>=0&&room.x<=plan.width&&room.y>=0&&room.y<=plan.height,`${floor.id} room ${room.number} is outside the crop`);
      assert.ok(plan.svg.includes(`data-room="${room.number}"`));
    }
    const svg=await readFile(new URL(`assets/hbll/digital/${floor.file}.svg`,root),'utf8');
    assert.equal(svg,plan.svg);
    const pdf=await readFile(new URL(`assets/hbll/${floor.file}.pdf`,root));
    assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
    count+=plan.rooms.length;
  }
  assert.equal(count,909);
  assert.ok(plans.B.rooms.some(room=>room.number==='79A'));
  assert.ok(plans.L4.rooms.some(room=>room.number==='4732'));
  assert.equal(catalogue.DEMO_SPOTS.filter(spot=>spot.building==='HBLL').length,7,'Keep the original database catalogue');
  const html=await readFile(new URL('index.html',root),'utf8');
  assert.ok(html.indexOf('hbll-plans.js')<html.indexOf('src="app.js'));
  const css=await readFile(new URL('styles.css',root),'utf8');
  assert.match(css,/\.floor-plan\.native-plan/);
});

test('all four JKB drawings are native searchable maps with legacy spot IDs preserved',async()=>{
  const context={window:{}};
  vm.runInNewContext(await readFile(new URL('jkb-plans.js',root),'utf8'),context);
  const plans=context.window.JKB_PLANS;
  assert.deepEqual(Object.keys(plans).sort(),['G','L2','L3','L4']);
  const app=await readFile(new URL('app.js',root),'utf8');
  const catalogue=vm.runInNewContext(app.slice(0,app.indexOf('const STORAGE_KEY'))+'; ({BUILDINGS,DEMO_SPOTS})');
  assert.equal(catalogue.BUILDINGS.JKB.floors.length,4);
  let count=0;
  for(const floor of catalogue.BUILDINGS.JKB.floors){
    const plan=plans[floor.id];assert.ok(plan,`Missing JKB ${floor.id}`);
    assert.equal(plan.file,`jkb-${floor.level}s`);assert.equal(plan.file,floor.file);assert.equal(plan.north,-25);
    assert.match(plan.svg,/Jesse Knight Building/);assert.match(plan.svg,/<path class="map-structure"/);
    assert.ok(!/<image\b|<iframe\b|<foreignObject\b|data:image/i.test(plan.svg));
    assert.equal(plan.rooms.length,new Set(plan.rooms.map(room=>room.number)).size);
    for(const room of plan.rooms){
      assert.ok(room.x>=0&&room.x<=plan.width&&room.y>=0&&room.y<=plan.height,`${floor.id} room ${room.number} is outside the crop`);
      assert.ok(plan.svg.includes(`data-room="${room.number}"`));
    }
    assert.equal(await readFile(new URL(`assets/jkb/digital/${floor.file}.svg`,root),'utf8'),plan.svg);
    const pdf=await readFile(new URL(`assets/jkb/${floor.file}.pdf`,root));assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
    count+=plan.rooms.length;
  }
  assert.equal(count,405);assert.ok(plans.L4.rooms.some(room=>room.number==='4057'));
  assert.ok(plans.L3.rooms.some(room=>room.number==='3009H'));
  assert.ok(plans.L4.rooms.some(room=>room.number==='4026M'));
  const spots=catalogue.DEMO_SPOTS.filter(spot=>spot.building==='JKB');
  assert.equal(spots.length,3);
  assert.deepEqual(Array.from(spots,spot=>`${spot.id}:${spot.floor}`),['jkb-tables:G','jkb-nook:G','jkb-group:L2']);
  const html=await readFile(new URL('index.html',root),'utf8');
  assert.ok(html.indexOf('jkb-plans.js')<html.indexOf('src="app.js'));
});
