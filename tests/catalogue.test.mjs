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
test('campus map starts focused on supported buildings and keeps zoom controls usable',async()=>{
  const app=await readFile(new URL('app.js',root),'utf8');
  const html=await readFile(new URL('index.html',root),'utf8');
  const prefix=app.slice(0,app.indexOf('const STORAGE_KEY'));
  const zoom=app.slice(app.indexOf('// Preserve the map center on zoom; Reset centers the supported buildings.'),app.indexOf('// Open supported maps or explain why another building is not yet available.'));
  for(const [clientWidth,clientHeight,expectedZoom] of [[800,500,1.75],[320,400,null]]){
    const viewport={clientWidth,clientHeight,scrollLeft:0,scrollTop:0},drawing={style:{width:''}};
    const elements={'#campusMapViewport':viewport,'#campusMapDrawing':drawing,'#campusZoomOut':{disabled:false},'#campusZoomIn':{disabled:false}};
    const context={document:{querySelector:selector=>elements[selector]}};
    const map=vm.runInNewContext(`${prefix}let campusZoom=1;const $=selector=>document.querySelector(selector);${zoom}; ({BUILDINGS,CAMPUS_BUILDINGS,changeCampusZoom,getZoom:()=>campusZoom})`,context);
    map.changeCampusZoom(0,true);
    const initialZoom=map.getZoom();
    assert.ok(initialZoom>=1&&initialZoom<=1.75);
    if(expectedZoom)assert.equal(initialZoom,expectedZoom);
    const baseWidth=Math.max(clientWidth,760),width=baseWidth*initialZoom,height=width*845/1238;
    const supported=map.CAMPUS_BUILDINGS.filter(building=>map.BUILDINGS[building.id]);
    const points=supported.flatMap(building=>building.points.split(' ').map(point=>point.split(',').map(Number)));
    const xs=points.map(point=>point[0]),ys=points.map(point=>point[1]);
    assert.ok(Math.min(...xs)/1238*width>=viewport.scrollLeft);
    assert.ok(Math.max(...xs)/1238*width<=viewport.scrollLeft+clientWidth);
    assert.ok((Math.min(...ys)+18)/845*height>=viewport.scrollTop);
    assert.ok((Math.max(...ys)+18)/845*height<=viewport.scrollTop+clientHeight);
    const initialWidth=parseFloat(drawing.style.width),initialScrollLeft=viewport.scrollLeft,initialScrollTop=viewport.scrollTop;
    map.changeCampusZoom(.25);
    assert.ok(Math.abs(map.getZoom()-(initialZoom+.25))<1e-10);
    map.changeCampusZoom(0,true);
    assert.equal(map.getZoom(),initialZoom);
    assert.equal(parseFloat(drawing.style.width),initialWidth);
    assert.equal(viewport.scrollLeft,initialScrollLeft);
    assert.equal(viewport.scrollTop,initialScrollTop);
  }
  assert.match(html,/<div class="campus-map-controls" aria-label="Campus map zoom"><button id="campusZoomIn"[^>]*>\+<\/button><button id="campusZoomOut"[^>]*>−<\/button><button id="campusZoomFit" type="button">Reset<\/button>/);
  assert.doesNotMatch(html,/Find your building|Three buildings ready to explore|campusZoomValue|Reset map/);
});
test('homepage presents a welcome screen and snaps to the full-height filter and map screen',async()=>{
  const html=await readFile(new URL('index.html',root),'utf8');
  const app=await readFile(new URL('app.js',root),'utf8');
  const css=await readFile(new URL('styles.css',root),'utf8');
  assert.doesNotMatch(app,/Conversational/);
  const buildingCatalogue=vm.runInNewContext(app.slice(0,app.indexOf('const STORAGE_KEY'))+'; ({BUILDINGS})').BUILDINGS;
  assert.equal(buildingCatalogue.HBLL.short,'Library');
  assert.equal(buildingCatalogue.JKB.description,'');
  assert.doesNotMatch(html,/campus-map-key|campus-quick-links|map-footer|View the official map/);
  assert.doesNotMatch(html,/Choose any combination|id="saveFilters"|Save filters/);
  assert.match(html,/<div id="filterFields" class="filter-fields">[\s\S]*?<div class="filter-actions"><button id="clearFilters" class="secondary-button" type="button">Clear filters<\/button><button id="showMatches" class="primary-button" type="button">View matches<\/button><\/div>\s*<\/aside>/);
  assert.match(html,/<details class="filter-group building-filter-group">\s*<summary>Buildings<\/summary>\s*<div class="building-filter-actions" role="group" aria-label="Select buildings">\s*<button type="button" data-building-action="all">All<\/button>\s*<button type="button" data-building-action="none">None<\/button>\s*<\/div>\s*<div id="buildingFilters" class="building-checks">[\s\S]*?<\/details>\s*<div class="switch-stack">/);
  assert.match(html,/<h2 id="filterHeading">Find your Nook<\/h2>/);
  assert.match(html,/<h2 id="filterHeading">Find your Nook<\/h2>\s*<p class="kicker">filter by\.\.\.<\/p>/);
  assert.match(html,/<legend>Group size<\/legend>[\s\S]*?role="group" aria-label="Group size"/);
  assert.match(html,/<strong>Tucked Away<\/strong><\/span><input id="privateFilter"/);
  assert.match(html,/<strong>Outlets nearby<\/strong><\/span><input id="outletFilter"/);
  assert.doesNotMatch(html,/<strong>Tucked Away<\/strong><small>|<strong>Outlets nearby<\/strong><small>/);
  assert.match(html,/<button class="chip" data-noise="medium" type="button">Social<\/button>/);
  assert.match(html,/<input id="groupSize" type="range" min="2" max="6" value="4">/);
  assert.match(html,/<div class="range-ends"><span>2<\/span><span>6 max<\/span><\/div>/);
  assert.match(app,/Maximum group size \(2-6\)[\s\S]*?name="capacity" type="number" min="2" max="6"/);
  assert.doesNotMatch(html,/mobile-filter-bar|toggleFilters|mobileShowMatches|activeFilterCount/);
  assert.doesNotMatch(html,/matchCount|mobileMatchCount|View Matches/);
  assert.match(html,/<footer class="site-footer"><span class="footer-copy"><span>© 2026 Nook\.<\/span><span>Less wandering, more studying\.<\/span><span>Sincerely, Nook\.<\/span><\/span><span class="footer-links"><a class="footer-button" href="https:\/\/map\.byu\.edu\/"[^>]*>BYU Campus Map<\/a><button class="footer-button" type="button">Rate Us<\/button><\/span><\/footer>/);
  assert.doesNotMatch(html,/Floor plans/);
  assert.match(css,/\.explore-map-section \.campus-map-viewport\{height:auto;min-height:0;flex:1;aspect-ratio:auto\}/);
  assert.match(css,/\.explore-map-section \.filter-panel\{height:100%;display:flex;flex-direction:column;overflow:auto;scrollbar-width:none;padding-bottom:0\}/);
  assert.match(css,/\.explore-map-section\{box-sizing:border-box;height:calc\(100dvh - var\(--header-height\)\);min-height:0;/);
  assert.match(css,/\.explore-map-section #filterFields\{flex:1\}/);
  assert.match(css,/\.explore-map-section \.filter-actions\{position:sticky;bottom:0;z-index:2;margin-top:auto;padding:24px 0 22px;background:inherit\}/);
  assert.match(css,/\.explore-map-section \.filter-panel::-webkit-scrollbar\{display:none\}/);
  assert.match(css,/\.site-footer\{display:flex;align-items:center;justify-content:space-between;/);
  assert.match(css,/\.site-footer>span:first-child\{font-size:inherit\}/);
  assert.match(css,/\.site-footer \.footer-copy\{display:flex;flex-wrap:wrap;gap:0 12px\}/);
  assert.match(css,/\.site-footer \.footer-button\{display:inline-flex;align-items:center;justify-content:center;min-height:44px;margin:0;padding:10px 18px;border:2px solid var\(--espresso\);border-radius:10px;background:transparent;color:var\(--espresso\);font:inherit;font-weight:700;text-decoration:none;cursor:pointer\}/);
  assert.match(css,/#showMatches\{background:var\(--terracotta\);border-color:var\(--terracotta\);color:var\(--cream\)\}/);
  assert.match(css,/#showMatches:hover\{background:var\(--sage\);border-color:var\(--sage\);color:var\(--accent-ink\)\}/);
  assert.match(css,/#clearFilters\{background:transparent;border:2px solid var\(--terracotta\);color:var\(--terracotta\)\}/);
  assert.match(css,/\.segmented,\.chip-row\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\);gap:7px;padding:0;background:transparent;border-radius:0\}/);
  assert.match(css,/\.segment,\.chip\{display:inline-flex;align-items:center;justify-content:center;min-width:0;min-height:38px;padding:8px 6px;border:2px solid var\(--espresso\);border-radius:8px;background:transparent;color:var\(--espresso\);font-size:12px;font-weight:700;line-height:1\.2;white-space:normal\}/);
  assert.match(css,/\.segment\.is-selected,\.chip\.is-selected\{border-color:var\(--sage\);background:var\(--sage\);color:var\(--accent-ink\);box-shadow:none\}/);
  assert.match(html,/<div class="site-header">[\s\S]*id="databaseWarning"[\s\S]*id="databaseReceipt"/);
  assert.match(html,/<section class="explore-hero" aria-labelledby="exploreTitle">/);
  assert.ok(html.indexOf('<section class="recommendations"')<html.indexOf('<section id="exploreMapSection"'),'"Good places to start" should appear above the map');
  assert.match(html,/<button id="navReport" class="nav-link nav-report" type="button" aria-label="Report a Spot"><span>Report<br class="mobile-nav-break"> a Spot<\/span><\/button>/);
  assert.match(html,/<button id="navLogin" class="nav-link nav-login" type="button">Login<\/button>/);
  assert.doesNotMatch(html,/<section id="exploreView"[\s\S]*?id="databaseWarning"/);
  assert.match(html,/<h1 id="exploreTitle">Find a <span class="hero-accent">Nook<\/span> that works for you\.<\/h1>/);
  assert.match(css,/\.explore-hero h1 \.hero-accent\{color:var\(--terracotta\)\}/);
  assert.match(css,/#filterFields\{display:flex;flex-direction:column;gap:16px\}/);
  assert.match(css,/#filterFields>\.filter-group\{border-top:0;margin:0;padding:14px 0 0\}/);
  assert.match(css,/\.panel-topline\{padding-bottom:0\}/);
  assert.match(css,/\.panel-topline \.kicker\{margin:0;color:var\(--blue\);text-transform:uppercase;letter-spacing:\.13em;font-size:11px;font-weight:800;line-height:normal\}/);
  assert.match(css,/#filterHeading\{margin-bottom:12px\}/);
  assert.match(css,/#filterFields>\.panel-topline \+ \.filter-group,[\s\S]*?#filterFields>\.filter-group \+ \.filter-group,[\s\S]*?#filterFields>\.filter-group \+ \.building-filter-group,[\s\S]*?#filterFields>\.building-filter-group \+ \.switch-stack\{position:relative;padding-top:14px\}/);
  assert.match(css,/#filterFields>\.panel-topline \+ \.filter-group::before,[\s\S]*?#filterFields>\.filter-group \+ \.building-filter-group::before,[\s\S]*?#filterFields>\.building-filter-group \+ \.switch-stack::before\{content:"";position:absolute;top:0;left:0;right:0;height:2px;border-radius:999px;background:var\(--cream\)\}/);
  assert.match(html,/<details class="filter-group building-filter-group">\s*<summary>Buildings<\/summary>/);
  assert.doesNotMatch(html,/<details class="filter-group building-filter-group" open>/);
  assert.match(css,/\.building-filter-group:not\(\[open\]\)>:not\(summary\)\{display:none\}/);
  assert.match(app,/if\(t\.dataset\.buildingAction\)\{state\.buildings=t\.dataset\.buildingAction==='all'\?new Set\(Object\.keys\(BUILDINGS\)\):new Set\(\);updateFilter\(\);return\}/);
  assert.match(css,/\.building-filter-actions\{display:flex;gap:8px;margin:12px 0\}/);
  assert.match(css,/\.building-filter-actions button\{min-height:32px;padding:5px 12px;border:2px solid var\(--espresso\);border-radius:8px;background:transparent;color:var\(--espresso\);font-size:12px;font-weight:700;cursor:pointer\}/);
  assert.match(css,/\.building-filter-group summary\{display:flex;align-items:center;justify-content:space-between;cursor:pointer;list-style:none;font-size:13px;font-weight:800;line-height:normal;color:var\(--espresso\)\}/);
  assert.match(css,/\.building-filter-group summary::after\{content:"";width:8px;height:8px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate\(45deg\);transition:transform \.15s\}/);
  assert.match(css,/#filterFields>\.switch-stack\{border-top:0;margin:0;padding:14px 0 0\}/);
  assert.match(css,/\.switch-ui\{background:var\(--cream\)\}[\s\S]*?\.switch-ui::after\{background:var\(--sage\)\}[\s\S]*?\.switch-row input:checked\+\.switch-ui::after\{background:var\(--cream\)\}/);
  assert.match(css,/\.explore-map-section\{height:auto;min-height:0;padding:14px\}/);
  assert.match(css,/\.explore-map-section \.explore-layout\{display:flex;flex:0 0 auto;flex-direction:column;gap:14px\}/);
  assert.match(css,/\.explore-map-section \.campus-map-viewport\{height:clamp\(320px,55svh,520px\);min-height:320px;flex:none\}/);
  assert.match(css,/\.explore-map-section \.filter-actions\{padding-bottom:14px\}/);
  assert.match(css,/\.topnav\{width:100%;margin:0;gap:6px\}/);
  assert.match(css,/\.topbar\{height:auto;min-height:68px;flex-wrap:wrap;justify-content:center;gap:8px;padding:12px 15px\}/);
  assert.match(css,/\.panel-topline h2\{padding-left:3px\}/);
  assert.match(css,/\.filter-actions\{width:100%;justify-content:flex-start;gap:10px\}[\s\S]*?\.filter-actions>button\{flex:1;min-width:0\}/);
  assert.match(css,/\.topnav \.nav-link\.is-active\{background:var\(--terracotta\);border-color:var\(--terracotta\);color:#F7F4EB\}/);
  assert.match(css,/\.topnav #navSaved\{padding-right:16px;padding-left:16px\}/);
  assert.match(css,/\.topnav \.nav-report\{padding-right:28px;padding-left:28px\}/);
  assert.match(css,/@media\(max-width:560px\)\{[\s\S]*?\.topnav \.nav-report\{padding-right:14px;padding-left:14px;white-space:normal\}[\s\S]*?\.mobile-nav-break\{display:block\}/);
  assert.match(css,/\.topnav \.nav-login\{background:transparent;border:2px solid #fff;color:#fff\}/);
  assert.match(html,/<p class="intro">Filter campus study spots by noise, group size, and outlets before you walk in the building\.<\/p>/);
  assert.match(html,/<button id="exploreMapButton" class="primary-button hero-map-cta" type="button">/);
  assert.match(html,/<section id="exploreMapSection" class="explore-map-section"/);
  assert.match(html,/<aside class="filter-panel"/);
  assert.match(css,/html\.explore-snap\{scroll-snap-type:y mandatory/);
  assert.match(app,/classList\.toggle\('explore-snap',state\.view==='explore'\)/);
  assert.match(app,/t\.id==='exploreMapButton'.*scrollIntoView\(\{behavior:reducedMotion\?'auto':'smooth'\}\)/);
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
  assert.ok(!html.includes('hbll-plans.js'),'plan bundles load lazily');
  assert.ok((await readFile(new URL('app.js',root),'utf8')).includes('hbll-plans.js'));
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
  assert.ok(!html.includes('jkb-plans.js'),'plan bundles load lazily');
  assert.ok((await readFile(new URL('app.js',root),'utf8')).includes('jkb-plans.js'));
});
