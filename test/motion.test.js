import test from 'node:test';
import assert from 'node:assert/strict';
import {arrivalStart,walkDuration,scheduleShot,checkSceneSettings} from '../public/wedding.js';
import {automaticFigure,checkChoreography,resolveDance,makeDirection,entrancePose} from '../public/choreography.js';

test('şarkı bölümü müzik zamanı ile döner; duraklama, başka MP3 ve bitiş sınırı yanlış figür çalıştırmaz',()=>{
  const choreography=checkChoreography({trackVersion:7,sections:[{start:84,end:108,figure:'frenzy',bpm:134}]});
  const state={musicVersion:7,choreography};
  const at=time=>resolveDance(state,{playing:true,time},0,1000);
  assert.equal(at(84).figure,'frenzy');assert.equal(at(107.9).bpm,134);
  assert.equal(at(108).figure,'step');assert.equal(at(0).figure,'step');assert.equal(at(84).figure,'frenzy');
  assert.equal(resolveDance(state,{playing:false,time:85},0,1000).figure,'step');
  assert.equal(resolveDance({...state,musicVersion:8},{playing:true,time:85},0,1000).figure,'step');
  assert.throws(()=>checkChoreography({trackVersion:7,sections:[...choreography.sections,{start:90,end:120,figure:'squat',bpm:112}]}));
});

test('kumanda süresi biter; sakinleş müzik coşmasını geçici olarak bastırır',()=>{
  const state={direction:makeDirection('calm',1000),musicVersion:7,choreography:{trackVersion:7,sections:[{start:0,end:60,figure:'frenzy',bpm:130}]}};
  assert.equal(resolveDance(state,{playing:true,time:20},0,2000).boost,0);
  assert.equal(resolveDance(state,{playing:true,time:20},0,31000).figure,'frenzy');
  state.direction=makeDirection('wide',40000);
  assert.equal(resolveDance(state,{playing:false},0,41000).direction,'wide');
  assert.equal(resolveDance(state,{playing:false},0,55000).direction,null);
  assert.throws(()=>makeDirection('invalid'));
});

test('girişte selam için duraklar; üç giriş tipi ve sıranın yeniden kapanması vardır',()=>{
  assert.equal(entrancePose(.48,'a').travel,entrancePose(.60,'a').travel);
  assert.ok(entrancePose(.55,'a').greeting>.99);
  assert.equal(new Set(['a','b','c'].map(id=>entrancePose(.5,id).style)).size,3);
  assert.deepEqual([entrancePose(1,'a').walking,entrancePose(1,'a').gap],[0,0]);
  assert.equal(entrancePose(0,'a').travel,0);assert.equal(entrancePose(1,'a').travel,1);
});

test('sırada bekleyen giriş kamera ile başlar; hediye gelirse kişi pistte öne çıkar',()=>{
  const s={shots:[]};
  scheduleShot(s,{tier:'join',playerId:'first'},1000);
  scheduleShot(s,{tier:'join',playerId:'next'},1001);
  const waiting=s.shots[1];
  let start=arrivalStart(undefined,1001,s.shots,'next',1500);
  assert.equal(start,waiting.at);
  scheduleShot(s,{tier:'leader',playerId:'first'},1700);
  start=arrivalStart(start,1001,s.shots,'next',1800);
  assert.equal(start,s.shots[1].at);
  assert.ok(start>waiting.at);
  assert.equal(arrivalStart(start,1001,s.shots,'next',start+100),start);
  scheduleShot(s,{tier:'leader',playerId:'next'},2000);
  const featured=s.shots.find(shot=>shot.playerId==='next');
  assert.equal(featured.end-featured.at,10000);
  assert.equal(arrivalStart(start,1001,s.shots,'next',featured.at),featured.at-walkDuration);
});

test('sahne ayarları geçersiz veya aşırı hareket değerlerini reddeder',()=>{
  assert.deepEqual(checkSceneSettings({formation:'arc',energy:1.4,tours:false}),{formation:'arc',energy:1.4,tours:false});
  for(const bad of [{formation:'line',energy:1,tours:true},{formation:'arc',energy:Infinity,tours:true},{formation:'circle',energy:9,tours:false},{formation:'arc',energy:1,tours:'yes'}]){
    assert.throws(()=>checkSceneSettings(bad));
  }
});


test('otomatik halay yedi figürü kullanır; pasaj sırası değişir, ardışık figür tekrarlanmaz',()=>{
  const turn=Math.PI*2,orders=[];let previous;
  for(let passage=0;passage<12;passage++){
    const order=[];
    for(let beat=0;beat<88;beat++){
      const figure=automaticFigure((passage*88+beat+.01)*turn);
      if(order.at(-1)!==figure)order.push(figure);
    }
    assert.equal(order.length,7);assert.equal(new Set(order).size,7);
    assert.notEqual(previous,order[0]);previous=order.at(-1);orders.push(order.join(','));
  }
  assert.ok(new Set(orders).size>=10);
  const at=automaticFigure(123*turn);automaticFigure(800*turn);
  assert.equal(automaticFigure(123*turn),at);
  const state={musicVersion:2,choreography:{trackVersion:2,sections:[{start:10,end:30,figure:'heel',bpm:110}]}};
  assert.equal(resolveDance(state,{playing:true,time:20},123*turn,0).figure,'heel');
  assert.equal(resolveDance({...state,direction:makeDirection('calm',0)},{playing:true,time:20},123*turn,1).figure,'step');
});
