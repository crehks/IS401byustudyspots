// The hard-coded backup rules used by tag-report when Gemini keeps failing. They must catch obvious spam
// and must not reject ordinary student wording.
import test from 'node:test';
import assert from 'node:assert/strict';

const {ruleCheck}=await import('../supabase/functions/tag-report/rules.ts');

test('ordinary wording is approved or left for the AI, including words with several consonants in a row',()=>{
  for(const text of ['Pretty quiet, a few open tables near the windows','Room 3320 is packed right now but quiet','Strengths and rhythms study group here','Noise low, crowding low.','Lots of sync-ups and rhythmic typing, mostly nymphs of the night shift']){
    assert.equal(ruleCheck(text,'low','medium')?.valid,true,text);
  }
  assert.equal(ruleCheck('quiet',null,null),null,'no levels and no spam signs: stays pending for the AI');
});

test('obvious spam is rejected with a reason',()=>{
  for(const [text,why] of [['Buy now cheap watches www.spam.com','link'],['asdfghjkl qwrtpsdf','gibberish'],['Call 801-555-1234 for deals','phone'],['email me bob@example.com','email'],['FREE MONEY giveaway click here','spam wording'],['aaaaaaaaaaaa','junk']]){
    const v=ruleCheck(text,'low','low');
    assert.equal(v?.valid,false,text);
    assert.match(v.reason,/backup rules/i);
  }
});
