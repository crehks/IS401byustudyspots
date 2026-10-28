// Saved-data checks cover refresh recovery, malformed fields, and legacy floor keys.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
const loader=source.slice(0,source.indexOf('let data=loadData()'));
function load(value){
  const result=vm.runInNewContext(loader+';loadData()', {localStorage:{getItem(){return typeof value==='string'?value:JSON.stringify(value)}}});
  return JSON.parse(JSON.stringify(result));
}

test('saved lists, custom location notes, legacy floors and reports survive reload',()=>{
  const result=load({
    lists:[{id:'favorites',name:'Favorites',spots:['wsc-tables']},{id:'list-123',name:'Project',spots:['custom-123']}],
    customSpots:[{id:'custom-123',building:'WSC',floor:'G',name:'Local tables',type:'group',capacity:4,noise:'medium',x:25,y:43,detail:'Near the east entrance'}],
    reports:{'custom-123':[{noise:'low',busy:'high',time:123,note:'Local report'}]},
    savedFilters:{study:'group',noise:'low',buildings:['WSC'],groupSize:6}
  });
  assert.equal(result.lists.length,2);
  assert.deepEqual(result.lists[1].spots,['custom-123']);
  assert.equal(result.customSpots[0].floor,'1E');
  assert.equal(result.customSpots[0].detail,'Near the east entrance');
  assert.equal(result.reports['custom-123'][0].note,'Local report');
  assert.equal(result.savedFilters.groupSize,6);
});

test('damaged saved fields cannot prevent startup or discard unrelated valid lists',()=>{
  const result=load({customSpots:[null,{id:'custom-bad',building:'unknown',name:'Bad'}],lists:[null,{id:'list-ok',name:'Class',spots:['hbll-west','missing','hbll-west']},{id:'broken',name:'Broken',spots:null}],reports:{'hbll-west':[null,{noise:'bad',busy:'low',time:123}]},savedFilters:{buildings:'HBLL'}});
  assert.deepEqual(result.lists,[{id:'favorites',name:'Favorites',spots:[]},{id:'list-ok',name:'Class',spots:['hbll-west']}]);
  assert.deepEqual(result.reports['hbll-west'],[]);
  assert.equal(result.savedFilters,null);
  for(const bad of ['{broken',null,{lists:[],customSpots:null,reports:null}])assert.equal(load(bad).lists[0].id,'favorites');
});
