import test from 'node:test';
import assert from 'node:assert/strict';
import {avatarUrl,userAvatar} from '../public/wedding.js';
import {eventDecoder} from '../src/live.js';
import {createGame,applyEvent,nextRound} from '../src/game.js';
const portrait='https://example.com/portrait.jpg';
test('Euler avatar variants reach chat, like and gift events; unsafe URLs are ignored',()=>{
  const variants=[{avatarThumb:{urlList:[portrait]}},{avatar_thumb:{url_list:[portrait]}},{profilePictureUrl:portrait},{avatarMedium:{urlList:['http://bad.test/a',portrait]}}];
  for(const user of variants)for(const type of ['WebcastChatMessage','WebcastLikeMessage','WebcastGiftMessage']) {
    const event=eventDecoder()({type,data:{user:{id:'a',nickname:'Ada',...user},content:'katıl',giftId:5655}});
    assert.equal(event.avatar,portrait);
  }
  for(const bad of ['javascript:alert(1)','data:image/png;base64,abc','http://example.com/a','https://name:pass@example.com/a','/local.png',{},'x'.repeat(5000)])assert.equal(avatarUrl(bad),'');
  assert.equal(userAvatar({avatarThumb:{urlList:'broken'}}),'');
});
test('portraits survive queue, role changes and return; new events update without erasing',()=>{
  const s=createGame('halay');s.capacity=1;
  const join=(id,avatar)=>applyEvent(s,{type:'chat',id,name:id,text:'katıl',avatar});
  join('a',portrait);join('b',portrait);
  nextRound(s);assert.equal(s.queue[0].avatar,portrait);
  applyEvent(s,{type:'gift',id:'a',name:'Ada',giftId:'1473096'});
  assert.equal(s.roles.bride.avatar,portrait);
  const updated='https://example.com/new.jpg';
  applyEvent(s,{type:'chat',id:'a',name:'Ada',text:'Merhaba',avatar:updated});
  assert.equal(s.roles.bride.avatar,updated);
  applyEvent(s,{type:'gift',id:'c',name:'Can',giftId:'1473096',avatar:portrait});
  assert.equal(s.queue.find(p=>p.id==='a').avatar,updated);
  nextRound(s);assert.equal(s.players[0].avatar,updated);
  join('a');assert.equal(s.players[0].avatar,updated);
  applyEvent(s,{type:'gift',id:'visitor',name:'Ziyaretçi',giftId:'5282',avatar:portrait});
  assert.equal(s.giftMoment.avatar,portrait);
  assert.equal(s.shots.find(p=>p.playerId==='visitor').avatar,portrait);
});
