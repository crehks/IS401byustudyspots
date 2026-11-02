// Exercise the actual pointer handlers without a browser or live database.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
const helpers=source.slice(source.indexOf('const COMPACT_LAYOUT_QUERY'),source.indexOf('function renderFilters'));
const maps=source.slice(source.indexOf('function resizeDigitalMap'),source.indexOf('// Search every drawing'));

function fixture(){
  const classes=()=>{
    const values=new Set();
    return {contains:value=>values.has(value),add:value=>values.add(value),remove:value=>values.delete(value),toggle(value,on){if(on)values.add(value);else values.delete(value)}};
  };
  const element=()=>({style:{},dataset:{},classList:classes(),attributes:{},setAttribute(key,value){this.attributes[key]=String(value)}});
  const viewport=Object.assign(new EventTarget(),element(),{
    clientWidth:320,clientHeight:360,scrollLeft:0,scrollTop:0,captures:[],
    closest:()=>null,setPointerCapture(id){this.captures.push(id)},getBoundingClientRect:()=>({left:0,top:0})
  });
  const stage=Object.assign(element(),{offsetLeft:24,offsetTop:24});
  Object.defineProperties(stage,{
    offsetWidth:{get:()=>parseFloat(stage.style.width)||0},offsetHeight:{get:()=>parseFloat(stage.style.height)||0}
  });
  stage.getBoundingClientRect=()=>({left:24-viewport.scrollLeft,top:24-viewport.scrollTop,width:stage.offsetWidth,height:stage.offsetHeight});
  const elements=Object.fromEntries(['#floorPlan','#interactMap','#mapTouchHint','.plan-canvas','#zoomValue','#zoomOut','#zoomIn','.filter-panel','#toggleFilters','.building-layout'].map(selector=>[selector,element()]));
  Object.assign(elements,{'.plan-scroll':viewport,'#planStage':stage});
  const buttons=['map','spots'].map(panel=>Object.assign(element(),{dataset:{buildingPanel:panel}}));
  const state={zoom:1,floor:'test'};
  const context=vm.createContext({
    window:{matchMedia:()=>({matches:true})},state,
    $:selector=>elements[selector],$$:()=>buttons,
    buildingPlans:()=>({test:{width:1000,height:1000}}),
    ResizeObserver:class{observe(){}},setTimeout,Math,Map
  });
  vm.runInContext(helpers+maps+';resizeDigitalMap();installMapPan()',context);
  const run=expression=>vm.runInContext(expression,context);
  const pointer=(type,id,x,y)=>{
    const event=new Event(type,{cancelable:true});
    Object.assign(event,{pointerId:id,pointerType:'touch',button:0,clientX:x,clientY:y});
    viewport.dispatchEvent(event);
  };
  const click=()=>viewport.dispatchEvent(new Event('click',{cancelable:true}));
  return {viewport,stage,state,elements,buttons,run,pointer,click};
}

test('inactive maps leave swipes to the page and an active tap keeps its original target',()=>{
  const f=fixture();
  f.pointer('pointerdown',1,200,200);f.pointer('pointermove',1,100,100);f.pointer('pointerup',1,100,100);
  assert.equal(f.viewport.scrollTop,0);assert.deepEqual(f.viewport.captures,[]);assert.equal(f.click(),true);
  f.run('setMapInteraction(true)');
  f.pointer('pointerdown',2,150,150);f.pointer('pointerup',2,150,150);
  assert.deepEqual(f.viewport.captures,[],'A stationary tap must not be retargeted by pointer capture');
  assert.equal(f.click(),true);assert.equal(f.elements['#interactMap'].attributes['aria-pressed'],'true');
});

test('active drag pans the map and suppresses only the click following the drag',async()=>{
  const f=fixture();f.run('setMapInteraction(true)');
  f.pointer('pointerdown',1,200,200);f.pointer('pointermove',1,100,100);f.pointer('pointerup',1,100,100);
  assert.equal(f.viewport.scrollLeft,100);assert.equal(f.viewport.scrollTop,100);assert.equal(f.click(),false);
  await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(f.click(),true);
});

test('two fingers zoom around their midpoint, respect limits, and recover after cancellation',()=>{
  const f=fixture();f.run('setMapInteraction(true)');
  f.pointer('pointerdown',1,90,150);f.pointer('pointerdown',2,210,150);
  f.pointer('pointermove',2,330,150);
  assert.equal(f.state.zoom,2);assert.equal(f.elements['#zoomValue'].textContent,'200%');
  const anchorX=(150-24)/272;
  assert.equal(Math.round(24+anchorX*f.stage.offsetWidth-f.viewport.scrollLeft),210,'The same map point stays under the moving midpoint');
  f.pointer('pointermove',2,2090,150);assert.equal(f.state.zoom,8);
  f.pointer('pointermove',2,91,150);assert.equal(f.state.zoom,1);
  f.pointer('pointercancel',1,90,150);f.pointer('pointercancel',2,91,150);
  f.pointer('pointermove',2,330,150);assert.equal(f.state.zoom,1);
});

test('map/list switching preserves zoom and Fit fits the available narrow viewport',()=>{
  const f=fixture();
  assert.ok(f.stage.offsetWidth+48<=f.viewport.clientWidth);
  f.run('changeZoom(1);setBuildingPanel("spots")');
  assert.equal(f.elements['.building-layout'].dataset.panel,'spots');assert.equal(f.buttons[1].attributes['aria-pressed'],'true');
  f.viewport.clientWidth=0;f.viewport.clientHeight=0;f.run('resizeDigitalMap()');
  assert.equal(f.state.zoom,2);assert.ok(f.stage.offsetWidth>0,'Hiding the map must not destroy its dimensions');
  f.viewport.clientWidth=260;f.viewport.clientHeight=300;f.run('setBuildingPanel("map");changeZoom(1-state.zoom)');
  assert.equal(f.state.zoom,1);assert.ok(f.stage.offsetWidth+48<=260);
  f.run('setFilterDisclosure(true)');assert.equal(f.elements['#toggleFilters'].attributes['aria-expanded'],'true');
  f.run('setFilterDisclosure(false)');assert.equal(f.elements['.filter-panel'].classList.contains('is-open'),false);
});
