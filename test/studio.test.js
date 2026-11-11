import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, applyEvent, nextRound} from '../src/game.js';
import {eventDecoder, openLive, loadGiftCatalog} from '../src/live.js';
import {weddingGift} from '../public/wedding.js';

const chat = (s, id, text) => applyEvent(s, {type:'chat',name:id,id,text});
test('halay tek kelimelik katılım isteklerini süsleme ve telefon yazımlarıyla tanır', () => {
  const wedding = createGame('halay');
  const accepted = ['kat', 'katılll', '  💃 KATIL! ', 'ka\u200Btıl', '  !KATI\u0307L ❤️', 'Kâtıl', 'halay 🎉'];
  const rejected = ['katılma', 'ben de katıl', 'katıldım', 'kat ıl', 'kat.ıl', 'katıl 2'];
  for (const text of [...accepted, ...rejected]) chat(wedding, text, text);
  assert.deepEqual(wedding.players.map(player => player.id), accepted);
  const rally = createGame('rally');
  for (const text of [...accepted, 'katıl']) chat(rally, text, text);
  assert.deepEqual(rally.players.map(player => player.id), ['katıl']);
});

test('katılımda ilk harf görünümü seçer ve seçim kuyrukta, rolde ve halaya dönüşte korunur', () => {
  const s = createGame('halay');
  s.capacity = 1;
  chat(s, '1', '!katıl');
  chat(s, '2', '💃 Katil!');
  assert.equal(s.players[0].gender, 'female');
  assert.equal(s.queue[0].gender, 'male');
  chat(s, '1', 'KATIL');
  chat(s, '2', 'katil');
  assert.equal(s.players[0].gender, 'male');
  assert.equal(s.shots.length, 1);
  nextRound(s);
  assert.equal(s.players[0].gender, 'female');
  assert.equal(s.queue[0].gender, 'male');
  const giveLeader = id => applyEvent(s, {type:'gift', id, name:id, giftId:'5269'});
  const giveBride = id => applyEvent(s, {type:'gift', id, name:id, giftId:'1473096'});
  giveLeader('1');
  assert.equal(s.players[0].gender, 'male');
  giveBride('1');
  assert.equal(s.roles.bride.gender, 'male');
  chat(s, '1', 'katıl');
  giveBride('3');
  assert.deepEqual(s.players.map(p => [p.id,p.gender]), [['1','female']]);
});

test('konuşan izleyici üyelik gerektirmeden görünür, paket tekrarları ve sohbet yığılması sınırlanır', () => {
  const s = createGame('halay'), decode = eventDecoder();
  const message = (id, content, msgId, at) => {
    const event = decode({type:'WebcastChatMessage', data:{user:{id, nickname:'Ada', displayId:'adacan'}, content, common:{msgId}}});
    if (event) applyEvent(s, event, at);
  };
  message('1', '  Selam\n herkese! ', '777', 1000);
  message('1', '  Selam\n herkese! ', '777', 3000);
  message('1', '...', '778', 1100);
  assert.deepEqual(s.chatMessages,[{id:'777',at:1000,playerId:'1',name:'Ada',username:'adacan',text:'Selam herkese!'}]);
  assert.equal(s.players.length, 0);
  message('1','Katıl','800',1200);
  assert.equal(s.players[0].gender, 'male');
  assert.equal(s.chatMessages.length, 1);
  for (let i = 0; i < 40; i++) message(String(i+2), 'Merhaba!', String(i+1000), 5000+i);
  assert.equal(s.chatMessages.length, 24);
  message('1', 'Halay çok güzel', '2500', 26000);
  assert.deepEqual(s.chatMessages.map(m=>m.id), ['2500']);
});

test('Türkiye kataloğu ve canlı hediye paketleri sekiz eylemi doğru kişiye yönlendirir', async()=>{
  let ws;
  const requests=[];
  const catalog=key=>loadGiftCatalog(key,async(url,opts)=>{
    requests.push([url,opts]);
    return {ok:true,json:async()=>requests.length===1?{url:'https://example.invalid/tr'}:
      {data:{gifts:[{id:1195081,name:'Level Up Arcade',diamond_count:10}]}}};
  });
  const state=createGame('halay'),events=[];
  const stop=openLive({handle:'demo',key:'test-key',catalog,Socket:class{constructor(){ws=this;}close(){}},
    onStatus(){},canCue:e=>!!weddingGift(e.giftId,e.gift,e.coins),onEvent:e=>{events.push(e);applyEvent(state,e);}});
  try{
    const expected=['gold','piper','drummer','bride','groom','leader','confetti','money'];
    const inputs=[[5655,1],[5994,5],[5487,5],[1473096,20],[1473095,20],[5269,1],[5282,10],[1195081,undefined],[10994,100,'Buket'],[999,20,'GG']];
    const messages=inputs.map(([id,price,name],i)=>({type:'WebcastGiftMessage',data:{user:{id:String(i+1),nickname:'Kişi '+i},gift:{id,name,type:0,diamondCount:price},common:{msgId:String(i+1)}}}));
    ws.onmessage({data:JSON.stringify({messages:[...messages,...messages]})});
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(requests.length,2);assert.equal(requests[1][1].headers,undefined);
    assert.equal(events[7].coins,10);assert.equal(events.length,10);assert.equal(state.gifts,10);
    assert.deepEqual(state.shots.map(s=>s.tier),expected);
    assert.deepEqual(state.shots.map(s=>s.name),inputs.slice(0,8).map((_,i)=>'Kişi '+i));
    assert.deepEqual(['bride','groom','drummer','piper'].map(r=>state.roles[r].id),['4','5','3','2']);
    assert.equal(state.leader,'6');
  }finally{stop();}
});
test('isimsiz seri, adı son pakette öğrenilirse efekti yitirmez',()=>{
  const state=createGame('halay'),decode=eventDecoder(e=>!!weddingGift(e.giftId,e.gift,e.coins));
  for(const [groupId,end,name] of [['a',0,''],['a',1,'Level Up Arcade'],['a',1,'Level Up Arcade'],['b',1,'']]){
    const event=decode({type:'WebcastGiftMessage',data:{user:{id:'99',nickname:'Eylül'},gift:{id:groupId==='b'?1195081:undefined,type:1,name,diamondCount:end && name?10:undefined},groupId,repeatEnd:end,repeatCount:1}});
    if(event)applyEvent(state,event);
  }
  assert.equal(state.gifts,2);
  assert.deepEqual(state.shots.map(s=>s.tier),['money','money']);
  assert.equal(weddingGift('14906','Buket',500),undefined);
  assert.equal(weddingGift('5780','Buket',30),undefined);
  assert.equal(weddingGift('13913','Bouquet'),undefined);
  assert.equal(weddingGift('','Bouquet',20),undefined);
  assert.equal(weddingGift('','Buket',100),undefined);
  assert.equal(weddingGift('','Buket'),undefined);
  assert.equal(weddingGift('','El Kalbi'),undefined);
});
test('etkin TikTok listesindeki her fiyat iki ayrı ödülü doğru kimlikle tetikler',()=>{
  const pairs = [
    [1,5655,'Gül','gold'], [1,5269,'TikTok','leader'],
    [5,5487,'Finger Heart','drummer'], [5,5994,'Turkish coffee','piper'],
    [10,5282,'Heart','confetti'], [10,1195081,'Level Up Arcade','money'],
    [20,1473096,'Tiny Blush','bride'], [20,1473095,'Rage Mode','groom']
  ];
  for (const [coins,id,name,key] of pairs) {
    assert.equal(weddingGift(id)?.key,key);
    assert.equal(weddingGift('',name,coins)?.key,key);
    assert.equal(weddingGift('0',name),undefined);
    assert.equal(weddingGift(id,name,coins+1),undefined);
    assert.equal(weddingGift('999999',name,coins),undefined);
    const state=createGame('halay');
    applyEvent(state,{type:'gift',id:'a',name:'Ada',giftId:id,coins,amount:20});
    assert.equal(state.giftMoment.tier,key);
  }
  assert.equal(weddingGift(6247,'Heart',1),undefined);
  assert.equal(weddingGift(6247,'Kalp',10),undefined);
  assert.equal(weddingGift('','Heart',1),undefined);
});

test('tekrarlanan katılım ve haksız gaz puanı engellenir, kazanan turu bitirir', () => {
  const state = createGame();
  chat(state, 'Deniz', 'gaz');
  chat(state, 'Deniz', ' KATIL ');
  chat(state, 'Deniz', '!katil');
  assert.equal(state.players.length, 1);
  chat(state, 'Deniz','gaz');
  applyEvent(state, {type:'like',id:'Deniz',name:'Deniz',amount:90}, 2000);
  assert.equal(state.winner,'Deniz');
  assert.equal(state.nextRoundAt,8000);
  nextRound(state);
  assert.equal(state.round,2);
  assert.equal(state.players[0].score,0);
});
test('dolu sahnede bekleyen oyuncular sonraki turda öncelik kazanır', () => {
  const state = createGame('halay');
  for (let i = 0; i < state.capacity+3; i++) chat(state, String(i), 'katıl');
  assert.equal(state.queue.length,3);
  assert.ok(state.nextRoundAt);
  nextRound(state);
  assert.equal(state.players.length,56);
  assert.deepEqual(state.players.slice(0,3).map(p=>p.id),['56','57','58']);
  applyEvent(state, {type:'gift',id:'57',name:'57',amount:2,giftId:'5269'});
  assert.equal(state.leader,'57');
});
test('hediye serisi bitişte bir kez işlenir, bağımsız hediyeler ayrı sayılır', () => {
  const decode = eventDecoder();
  const payload = {user:{id:'77',nickname:'Deniz'}, gift:{name:'Gül',type:1},groupId:'95',giftId:8};
  const msg = (n, end, id) => ({type:'WebcastGiftMessage',data:{...payload,common:{msgId:id},repeatEnd:end,repeatCount:n}});
  assert.equal(decode(msg(1,0,'a')).type,'giftCue');
  assert.equal(decode(msg(2,0,'b')),undefined);
  assert.equal(decode(msg(2,1,'c')).amount,2);
  assert.equal(decode(msg(2,1,'d')),undefined);
  payload.gift.type = 0;
  assert.equal(decode(msg(1,0,'e')).amount,1);
  assert.equal(decode(msg(1,0,'f')).amount,1);
});
test('örnek Euler WebSocket paketi gerçek oyun motoruna aktarılır', () => {
  let ws;
  class LocalSocket {constructor(url) {this.url = url; ws = this;} close() {}}
  const state = createGame();
  const statuses = [];
  const stop = openLive({Socket:LocalSocket,handle:'test',key:'example',onStatus:s=>statuses.push(s),onEvent:e=>applyEvent(state,e)});
  assert.equal(ws.url.searchParams.get('features.rawMessages'),'false');
  const user = {id:'7',nickname:'Ada'};
  const messages = [
    {type:'roomInfo', data:{}},
    {type:'WebcastChatMessage',data:{content:'katıl',user,common:{msgId:'1'}}},
    {type:'WebcastLikeMessage',data:{count:3,user,common:{msgId:'2'}}}
  ];
  ws.onmessage({data:JSON.stringify({messages})});
  ws.onmessage({data:JSON.stringify({messages})});
  assert.equal(state.likes,3);
  assert.equal(state.players[0].score,3);
  assert.equal(statuses.at(-1),'live');
  ws.onclose({code:4404});
  assert.equal(statuses.at(-1),'error');
  stop();
});

test('roller anında ve tek kişiye verilir; önceki gelin halaya döner', () => {
  const s=createGame('halay');
  const give=(id,giftId)=>applyEvent(s,{type:'gift',id,name:id,giftId,amount:1});
  give('Ada','1473096'); give('Deniz','1473095'); give('Ada','5269');
  assert.equal(s.roles.bride,undefined);
  assert.equal(s.roles.groom.name,'Deniz');
  assert.equal(s.leader,'Ada');
  give('Ada','1473096'); give('Can','1473096');
  assert.equal(s.leader,null);
  assert.equal(s.roles.bride.name,'Can');
  assert.deepEqual(s.players.map(p=>p.name),['Ada']);
  give('Ece','5487');give('Ali','5994');
  assert.equal(s.roles.drummer.name,'Ece');assert.equal(s.roles.piper.name,'Ali');
  give('Ece','1195081');give('Ali','5282');
  assert.deepEqual(s.celebrations.slice(-2).map(e=>e.tier),['money','confetti']);
  chat(s,'Can','!halay'); assert.equal(s.players.length,1);
});

test('tamamlanan seri eski rolü geri almaz ve yeniden gelen paketle efekt tekrarlanmaz', () => {
  const s=createGame('halay'), decode=eventDecoder();
  const msg=(id,groupId,repeatEnd,repeatCount)=>({type:'WebcastGiftMessage',data:{
    giftId:1473096, gift:{type:1,name:'Tiny Blush'},user:{id,nickname:id},repeatCount,repeatEnd,groupId
  }});
  const process=packet=>{const e=decode(packet);if(e)applyEvent(s,e);};
  process(msg('A','1',0,1)); assert.equal(s.roles.bride.name,'A');assert.equal(s.gifts,0);
  process(msg('B','2',1,1));
  process(msg('A','1',1,4));process(msg('A','1',0,1));process(msg('A','1',1,4));
  assert.equal(s.roles.bride.name,'B');assert.equal(s.gifts,5);
  assert.equal(s.celebrations.length,2);
});

test('katıl aynı dansçıyı ve görünen adı korur; sohbet ve beğeniler çekimi yeniden başlatmaz', () => {
  const s=createGame('halay'), decode=eventDecoder();
  const msg=text=>({type:'WebcastChatMessage',data:{user:{id:'47',nickname:'İpek ✿'},content:text}});
  applyEvent(s,decode(msg('merhaba')),950);
  applyEvent(s,decode(msg('katıl')),1000);
  applyEvent(s,decode(msg('KATIL')),1100);
  applyEvent(s,{type:'like',id:'47',name:'İpek ✿',amount:5},1200);
  assert.deepEqual(s.players.map(p=>[p.id,p.name]),[['47','İpek ✿']]);
  assert.equal(s.shots.length,1);
  assert.equal(s.shots[0].at,1000);
});

test('peş peşe konfeti → genel plan → ikinci konfeti → genel plan; iki ekranda da aynı zamanlama', async () => {
  const {onAir,wideBreak}=await import('../public/wedding.js');
  const s=createGame('halay');
  const give=(id,t)=>applyEvent(s,{type:'gift',id,name:id,giftId:'5282'},t);
  give('Ada',1000);give('Ada',1060);give('Ada',1090);give('Ece',1100);
  assert.equal(s.players.length,0);
  assert.equal(s.gifts,4);assert.equal(s.shots.length,3);
  const [a,b,c]=s.shots;
  assert.equal(b.at-a.end,wideBreak);
  assert.equal(c.at-b.end,wideBreak);assert.equal(b.count,2);
  for(const snapshot of [s,JSON.parse(JSON.stringify(s))]){
    assert.equal(onAir(snapshot,1500).at,1000);
    assert.equal(onAir(snapshot,a.end),undefined);
    assert.equal(onAir(snapshot,b.at).playerId,'Ada');
    assert.equal(onAir(snapshot,b.end),undefined);
    assert.equal(onAir(snapshot,c.at).playerId,'Ece');
    assert.equal(onAir(snapshot,c.end+5000),undefined);
  }
});

test('gelin ve damat hediyeleri aktif katılım çekimini keser, bekleyen katılımlar hediyelerden sonra görünür', async () => {
  const {onAir,wideBreak} = await import('../public/wedding.js');
  for (const [giftId, role] of [['1473095','groom'], ['1473096','bride']]) {
    const state = createGame('halay');
    for (const [i,id] of ['Ada','Can','Ece'].entries()) {
      applyEvent(state,{type:'chat',id,name:id,text:'katıl'},1000+i);
    }
    assert.equal(onAir(state,1100).playerId,'Ada');
    applyEvent(state,{type:'giftCue',id:'Can',name:'Can',giftId},1100);
    assert.equal(state.roles[role].id,'Can');
    assert.equal(onAir(state,1100).tier,role);
    assert.equal(onAir(state,1100).playerId,'Can');
    applyEvent(state,{type:'gift',id:'Ali',name:'Ali',giftId:'5282'},1200);
    const [first, second, remaining] = state.shots;
    assert.deepEqual(state.shots.map(s=>s.playerId),['Can','Ali','Ece']);
    assert.equal(first.at,1100);
    assert.equal(onAir(state,first.end),undefined);
    assert.equal(second.at,first.end+wideBreak);
    assert.equal(remaining.at,second.end+wideBreak);
  }
});

test('dolu katılım kuyruğunda genel plandayken gelen hediye hemen gösterilir', async () => {
  const {onAir} = await import('../public/wedding.js');
  const state = createGame('halay');
  for (let i=0;i<28;i++) {
    applyEvent(state,{type:'chat',id:String(i),name:String(i),text:'katıl'},1000+i);
  }
  assert.equal(state.shots.length,24);
  const now=state.shots[0].end+1;
  assert.equal(onAir(state,now),undefined);
  applyEvent(state,{type:'gift',id:'Ali',name:'Ali',giftId:'1473095'},now);
  assert.equal(onAir(state,now).tier,'groom');
  assert.equal(state.shots[1].playerId,'1');
  assert.equal(state.players.length,28);
});

test('jeton aralıkları birim fiyata göre tek ödül seçer, seri adedi eşiği yükseltmez', async () => {
  const {defaultGiftRules,checkGiftRules} = await import('../public/wedding.js');
  const rules=checkGiftRules({...defaultGiftRules,mode:'coins'});
  assert.throws(()=>checkGiftRules({...rules,minimum:{...rules.minimum,bride:50}}));
  for(const [price,expected] of [[1,'leader'],[49,'piper'],[50,'groom'],[99,'groom'],[100,'bride'],[10000,'bride'],[undefined,undefined]]){
    const state={...createGame('halay'),giftRules:rules};
    applyEvent(state,{type:'gift',id:'a',name:'Ada',giftId:'1473095',coins:price,amount:5});
    assert.equal(state.giftMoment?.tier,expected);
    assert.equal(state.gifts,5);
  }
});

test('seride fiyat ilk veya son pakette gelirse rol yalnızca bir kez verilir', async () => {
  const {defaultGiftRules}=await import('../public/wedding.js');
  for(const earlyPrice of [undefined,50]){
    const state={...createGame('halay'),giftRules:{...defaultGiftRules,mode:'coins'}};
    const decode=eventDecoder(event=>!!event.coins);
    for(const [end,price] of [[0,earlyPrice],[1,50],[1,50]]){
      const event=decode({type:'WebcastGiftMessage',data:{user:{id:'1',nickname:'Efe'},groupId:'9',giftId:99,
        gift:{type:1,diamondCount:price},repeatEnd:end,repeatCount:end?3:1}});
      if(event)applyEvent(state,event);
    }
    assert.equal(state.gifts,3);
    assert.equal(state.shots.length,1);assert.equal(state.roles.groom.name,'Efe');
  }
});
