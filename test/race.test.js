import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, applyEvent, nextRound} from '../src/game.js';
import {tickRace, ranking} from '../src/race.js';
import {LAP, defaultRaceSettings, checkRaceSettings, raceGiftFor} from '../public/race-rules.js';

const settings = checkRaceSettings({...defaultRaceSettings, assignments:{
  turbo:{id:'11',name:'Turbo hediyesi'}, nitro:{id:'12',name:'Nitro'}, camera:{id:'13',name:'Kamera'},
  shield:{id:'14',name:'Kalkan'}, oil:{id:'15',name:'Yağ'}, cones:{id:'16',name:'Koni'},
  barrier:{id:'17',name:'Barikat'}, rocket:{id:'18',name:'Roket'}, lightning:{id:'19',name:'Yıldırım'},
  spikes:{id:'20',name:'Çivi'}, repair:{id:'21',name:'Tamir'}, gas:{id:'22',name:'Gaz'}
}});
const race = (overrides = {}) => createGame('race', {raceSettings:{...settings, ...overrides}});
const chat = (s, id, text, now) => applyEvent(s, {type:'chat', id, name:id, text}, now);
const gift = (s, id, giftId, now, extra = {}) => applyEvent(s, {type:'gift', id, name:id, giftId, gift:'x', coins:5, amount:1, ...extra}, now);
function run(s, from, to, step = 200) {for (let t = from; t <= to; t += step) tickRace(s, t);}
function start(s, ids, now = 1000) {
  for (const id of ids) chat(s, id, 'katıl', now);
  s.race.at = now;
  run(s, now, now + 5200);
  return now + 5200;
}

test('katılım panelde seçilen yola göre olur: “katıl” yazmak ve/veya Gül göndermek', () => {
  const both = race();
  chat(both, 'a', 'katıl', 0); gift(both, 'b', '5655', 0);
  assert.deepEqual(both.players.map(p => p.id), ['a', 'b']);

  const giftOnly = race({joinChat:false});
  chat(giftOnly, 'a', 'Katıl!', 0); gift(giftOnly, 'b', '5655', 0);
  assert.deepEqual(giftOnly.players.map(p => p.id), ['b']);

  const chatOnly = checkRaceSettings({...settings, joinGift:false});
  const s = createGame('race', {raceSettings:chatOnly});
  gift(s, 'b', '5655', 0); chat(s, 'a', 'katil', 0);
  assert.deepEqual(s.players.map(p => p.id), ['a']);
  assert.throws(() => checkRaceSettings({...settings, joinChat:false, joinGift:false}));
});

test('geri sayım biter, beğeni ve yorumlar arabayı yavaş yavaş hızlandırır', () => {
  const s = race();
  let now = start(s, ['a', 'b']);
  assert.equal(s.race.phase, 'racing');
  run(s, now, now + 6000); now += 6000;
  const cruise = s.players.find(p => p.id === 'b').speed;
  for (let i = 0; i < 10; i++) {applyEvent(s, {type:'like', id:'a', name:'a', amount:15}, now); chat(s, 'a', 'hadi', now); tickRace(s, now += 200);}
  const a = s.players.find(p => p.id === 'a');
  assert.ok(a.speed > cruise, 'beğeni hızlandırmadı');
  assert.ok(a.speed < cruise + 14, 'hız bir anda zıpladı: ' + a.speed);
  run(s, now, now + 6000); now += 6000;
  assert.ok(s.players.find(p => p.id === 'a').speed > cruise + 5);
  run(s, now, now + 40000);
  assert.ok(Math.abs(s.players.find(p => p.id === 'a').speed - cruise) < 1.5, 'etkileşim bitince hız normale dönmeli');
});

test('yorum spamı iki saniyede bir sayılır', () => {
  const s = race();
  const now = start(s, ['a']);
  for (let i = 0; i < 20; i++) chat(s, 'a', 'gaz', now + i * 10);
  assert.ok(s.players[0].heat <= 3.01);
});

test('turbo ve nitro hediyesi hızı belirgin artırır, hediye atan yarışta değilse otomatik katılır', () => {
  const s = race();
  let now = start(s, ['a', 'b']);
  run(s, now, now + 4000); now += 4000;
  gift(s, 'a', '11', now); gift(s, 'c', '12', now);
  assert.ok(s.players.some(p => p.id === 'c'), 'hediye atan otomatik katılmalı');
  run(s, now, now + 3000); now += 3000;
  const [a, b] = ['a', 'b'].map(id => s.players.find(p => p.id === id));
  assert.ok(a.speed > b.speed + 10);
  assert.ok(s.race.events.some(e => e.text.includes('TURBO')));
});

test('engeller: yağ arkadakini kaydırır, kalkan engeller, roket öndekini vurur, yıldırım öndekileri yavaşlatır', () => {
  const s = race();
  let now = start(s, ['lead', 'mid', 'back']);
  const [lead, mid, back] = ['lead', 'mid', 'back'].map(id => s.players.find(p => p.id === id));
  lead.dist = 100; mid.dist = 80; back.dist = 60;
  for (const p of [lead, mid, back]) {p.lane = p.laneTo = 1; p.laneAt = Infinity;}
  gift(s, 'mid', '15', now);
  const oil = s.race.hazards.find(h => h.type === 'oil');
  assert.ok(oil && oil.pos < mid.dist);
  run(s, now, now + 4000); now += 4000;
  assert.ok(oil.hitBy.includes('back'), 'arkadaki yağa basmalı');
  assert.ok(!oil.hitBy.includes('mid'), 'döken kendi yağına basmaz');

  gift(s, 'lead', '14', now);
  gift(s, 'mid', '18', now);
  run(s, now, now + 2000); now += 2000;
  assert.equal(lead.hit?.type, undefined, 'kalkan roketi durdurmalı');
  assert.equal(lead.shieldUntil, 0);
  gift(s, 'mid', '18', now);
  run(s, now, now + 1600); now += 1600;
  assert.equal(lead.hit?.type, 'rocket');

  run(s, now, now + 3000); now += 3000;
  gift(s, 'back', '19', now);
  const order = ranking(s).map(p => p.id);
  const ahead = order.slice(0, order.indexOf('back'));
  for (const id of ahead) assert.equal(s.players.find(p => p.id === id).hit?.type, 'lightning');
  assert.equal(back.hit, null);
});

test('barikat liderin önüne kurulur, koni öndekinin önüne düşer, tamir etkiyi kaldırır', () => {
  const s = race();
  const now = start(s, ['lead', 'mid', 'back']);
  const [lead, mid] = ['lead', 'mid'].map(id => s.players.find(p => p.id === id));
  lead.dist = 200; mid.dist = 150; s.players.find(p => p.id === 'back').dist = 100;
  gift(s, 'back', '17', now);
  gift(s, 'back', '16', now);
  const barrier = s.race.hazards.find(h => h.type === 'barrier'), cones = s.race.hazards.find(h => h.type === 'cones');
  assert.equal(barrier.pos, (lead.dist + 30) % LAP);
  assert.equal(barrier.lanes.length, 3);
  assert.equal(cones.pos, (mid.dist + 22) % LAP);
  mid.hit = {type:'spikes', at:now, until:now + 3000};
  gift(s, 'mid', '21', now);
  assert.equal(mid.hit, null);
});

test('kamera hediyesi yakın çekim sırasına girer', () => {
  const s = race();
  let now = start(s, ['a', 'b']);
  gift(s, 'a', '13', now); gift(s, 'b', '13', now);
  tickRace(s, now += 200);
  assert.equal(s.race.shot.playerId, 'a');
  run(s, now, now + 6200); now += 6200;
  assert.equal(s.race.shot.playerId, 'b');
});

test('3 tur modunda ilk bitiren kazanır, sonra yeni yarış geri sayımla başlar', () => {
  const s = race({laps:3});
  const now = start(s, ['a', 'b']);
  s.players.find(p => p.id === 'a').dist = 3 * LAP - 1;
  run(s, now, now + 1000);
  assert.equal(s.winner, 'a');
  assert.equal(s.race.phase, 'finished');
  assert.ok(s.nextRoundAt > 0);
  nextRound(s);
  assert.equal(s.race.phase, 'countdown');
  assert.equal(s.winner, null);
  assert.ok(s.players.every(p => p.dist <= 0 && p.speed === 0));
});

test('sınırsız modda yarış bitmez; sırada bekleyen, uzun süre hareketsiz kalanın yerine geçer', () => {
  const s = race({mode:'endless'});
  s.capacity = 2;
  let now = start(s, ['a', 'b']);
  chat(s, 'c', 'katıl', now);
  assert.deepEqual(s.queue.map(p => p.id), ['c']);
  s.players.find(p => p.id === 'a').dist = 50 * LAP;
  for (let i = 0; i < 130; i++) {now += 1000; chat(s, 'b', 'gaz ' + i, now); tickRace(s, now);}
  assert.equal(s.winner, null);
  assert.ok(s.players.some(p => p.id === 'c'));
  assert.ok(!s.players.some(p => p.id === 'a'));
});

test('hediye eşleştirmesi kimlikle yapılır; aynı hediye iki eyleme atanamaz', () => {
  assert.equal(raceGiftFor(settings, {giftId:'5655'}), 'join');
  assert.equal(raceGiftFor(settings, {giftId:'', gift:'Rose'}), 'join');
  assert.equal(raceGiftFor(settings, {giftId:'11'}), 'turbo');
  assert.equal(raceGiftFor(settings, {giftId:'99'}), null);
  assert.throws(() => checkRaceSettings({...settings, assignments:{turbo:{id:'5655', name:'Gül'}}}));
});
