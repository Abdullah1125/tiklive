import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultGiftRules,checkGiftRules,resolveWeddingGift,selectedGifts} from '../public/wedding.js';
import {eventDecoder} from '../src/live.js';
import {createGame,applyEvent} from '../src/game.js';
test('new studios have no preset priced rewards; selected ID works independently of price',()=>{
 assert.deepEqual(selectedGifts(defaultGiftRules),[]);
 assert.equal(resolveWeddingGift(defaultGiftRules,{giftId:'5655',coins:1}),undefined);
 const rules=checkGiftRules({...defaultGiftRules,assignments:{bride:{id:'900',name:'Seçilen hediye'}}});
 for(const coins of [undefined,1,20,500])assert.equal(resolveWeddingGift(rules,{giftId:'900',coins})?.key,'bride');
 assert.equal(resolveWeddingGift(rules,{giftId:'901',gift:'Seçilen hediye',coins:20}),undefined);
 assert.throws(()=>checkGiftRules({...rules,assignments:{bride:{id:'900',name:'A'},groom:{id:'900',name:'A'}}}));
 assert.throws(()=>checkGiftRules({...rules,assignments:{bride:{id:'bad',name:'A'}}}));
});
test('custom mapping cues a streak immediately and does not repeat the role on completion',()=>{
 const rules=checkGiftRules({...defaultGiftRules,assignments:{piper:{id:'900',name:'Yayıncı hediyesi'}}});
 const state={...createGame('halay'),giftRules:rules};
 const decode=eventDecoder(event=>!!resolveWeddingGift(rules,event));
 for(const repeatEnd of [0,1,1]){
  const e=decode({type:'WebcastGiftMessage',data:{user:{id:'42',nickname:'Ada'},giftId:'900',gift:{type:1},groupId:'10',repeatEnd,repeatCount:repeatEnd?3:1}});
  if(e)applyEvent(state,e);
 }
 assert.equal(state.roles.piper.name,'Ada');assert.equal(state.gifts,3);assert.equal(state.shots.length,1);
});
