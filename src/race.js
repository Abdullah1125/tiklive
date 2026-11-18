import {LAP,LANES,RACE_CAPACITY,raceActionByKey,hitEffects,defaultRaceSettings,raceGiftFor,isJoinWord} from '../public/race-rules.js';

const BASE=16;              // cruising speed with no interaction, m/s
const HEAT_CAP=18;          // extra speed likes and chat can build up
const HEAT_HALF_LIFE=5;     // seconds for chat/like speed to halve
const ACCEL=6, BRAKE=16;    // m/s² — speed changes gradually ("yavaş yavaş")
const MAX_SPEED=72;
const COUNTDOWN=5000, FINISH_PAUSE=9000, IDLE_SWAP=120000;
const colors=['#ef4b3f','#2f8ff0','#f6c443','#33c27b','#a565f0','#ff8a2a','#22c3cf','#f067b3','#e8e8ee','#3b3f4a','#9ad14b','#c9764a'];
const hazardRules={
  oil:{ttl:30000,maxHits:3}, spikes:{ttl:30000,maxHits:2},
  cones:{ttl:25000,maxHits:1}, barrier:{ttl:20000,maxHits:3}
};

function random(race){
  let t=(race.seed=(race.seed+0x6D2B79F5)|0);
  t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);
  return ((t^t>>>14)>>>0)/4294967296;
}
const settingsOf=state=>state.raceSettings||defaultRaceSettings;

export function createRace(settings=defaultRaceSettings,now=Date.now()){
  return {phase:'waiting',mode:settings.mode,laps:settings.laps,at:now,goAt:0,seed:(now%2147483647)|1,
    hazards:[],rockets:[],flashes:[],shot:null,shots:[],events:[],serial:0};
}

export function ranking(state){
  return [...state.players].sort((a,b)=>(a.finishedAt||Infinity)-(b.finishedAt||Infinity) || b.dist-a.dist);
}

function toast(state,text,kind,now,playerId){
  const race=state.race;
  race.events.push({id:++race.serial,at:now,text,kind,playerId});
  if(race.events.length>8)race.events.shift();
}
function note(state,kind,name,detail,now){
  state.activity.unshift({id:++state.serial,at:now,kind,name,detail});
  state.activity.length=Math.min(60,state.activity.length);
}

function resetRacer(p,slot,now){
  Object.assign(p,{dist:-Math.floor(slot/LANES)*7,speed:0,lane:slot%LANES,laneTo:slot%LANES,laneAt:now+3000,
    heat:0,boosts:{},shieldUntil:0,hit:null,finishedAt:0,lastTalk:0,lastActive:now,score:0});
}

function seat(state,p,now){
  const race=state.race;
  p.color=colors[state.players.length%colors.length];
  p.coins=p.coins||0;
  if(race.phase==='waiting'||race.phase==='countdown'){
    resetRacer(p,state.players.length,now);
    if(race.phase==='waiting'){race.phase='countdown';race.goAt=now+COUNTDOWN;}
  } else {
    // Late arrivals enter just behind the last car, in its lap.
    const last=Math.min(...state.players.map(o=>o.dist));
    resetRacer(p,0,now);
    p.dist=Number.isFinite(last)?Math.max(0,last-6):0;
    p.lane=p.laneTo=Math.floor(random(race)*LANES);
    p.speed=BASE*.6;
  }
  state.players.push(p);
}

export function joinRace(state,member,now=Date.now()){
  const existing=state.players.find(p=>p.id===member.id);
  if(existing)return existing;
  if(state.queue.some(p=>p.id===member.id))return null;
  const person={id:member.id,name:member.name};
  if(member.avatar)person.avatar=member.avatar;
  if(state.players.length<state.capacity){
    seat(state,person,now);
    state.effect={type:'join',at:now,playerId:person.id};
    note(state,'join',person.name,'yarışa katıldı',now);
    toast(state,person.name+' piste çıktı','join',now,person.id);
    return person;
  }
  if(state.queue.length<128){state.queue.push(person);note(state,'join',person.name,'sonraki yarış için sıraya girdi',now);}
  return null;
}

function hit(state,target,type,now){
  if(!target || target.finishedAt)return false;
  const effect=hitEffects[type];
  if(target.shieldUntil>now){
    target.shieldUntil=0;
    toast(state,target.name+' kalkanla korundu','shield',now,target.id);
    return false;
  }
  target.hit={type,at:now,until:now+effect.dur};
  toast(state,target.name+' '+effect.label,'hit',now,target.id);
  return true;
}

function placeHazard(state,player,type,k,now){
  const race=state.race,order=ranking(state).filter(p=>!p.finishedAt),index=order.indexOf(player);
  const lane=Math.round(player.laneTo),pair=l=>[l,l<LANES-1?l+1:l-1];
  let pos,lanes;
  if(type==='oil'){pos=player.dist-7-k*5;lanes=[lane];}
  else if(type==='spikes'){pos=player.dist-9-k*6;lanes=pair(lane);}
  else if(type==='cones'){
    const ahead=order[index-1];
    if(ahead){pos=ahead.dist+22+k*8;lanes=pair(Math.round(ahead.laneTo));}
    else{pos=player.dist-10-k*6;lanes=pair(lane);}
  } else {
    // Barrier: three lanes blocked, one gap left open.
    const leader=order[0];
    pos=leader&&leader!==player?leader.dist+30+k*12:player.dist-14-k*10;
    const gap=Math.floor(random(race)*LANES);
    lanes=[0,1,2,3].filter(l=>l!==gap);
  }
  const rule=hazardRules[type];
  race.hazards.push({id:++race.serial,type,pos:((pos%LAP)+LAP)%LAP,lanes,owner:player.id,ownerName:player.name,
    at:now,until:now+rule.ttl,hits:0,maxHits:rule.maxHits,hitBy:[]});
  if(race.hazards.length>40)race.hazards.shift();
}

export function applyRaceAction(state,player,key,count,now=Date.now()){
  const race=state.race,action=raceActionByKey[key],n=Math.max(1,Math.min(5,count));
  if(!action || !player)return;
  player.lastActive=now;
  if(action.kind==='boost'){
    const b=player.boosts[key];
    const until=Math.min(now+action.dur*4,Math.max(b?.until||0,now)+action.dur*n);
    player.boosts[key]={add:action.add,until};
  } else if(action.kind==='camera'){
    if(race.shot?.playerId===player.id)race.shot.end=Math.min(race.shot.end+4000*n,now+16000);
    else if(!race.shots.some(s=>s.playerId===player.id))race.shots.push({playerId:player.id,name:player.name,dur:Math.min(12000,6000+2000*(n-1))});
  } else if(action.kind==='shield'){
    player.shieldUntil=Math.min(now+60000,Math.max(player.shieldUntil,now)+action.dur*n);
  } else if(action.kind==='repair'){
    player.hit=null;
    player.boosts.repair={add:6,until:now+2000};
  } else if(action.kind==='hazard'){
    for(let k=0;k<Math.min(n,3);k++)placeHazard(state,player,key,k,now);
  } else if(action.kind==='rocket'){
    const order=ranking(state).filter(p=>!p.finishedAt),index=order.indexOf(player);
    const targets=[...order.slice(0,index).reverse(),...order.slice(index+1)];
    targets.slice(0,Math.min(n,3)).forEach((target,k)=>
      race.rockets.push({id:++race.serial,from:player.id,to:target.id,at:now+k*250,hitAt:now+1500+k*250}));
  } else if(action.kind==='lightning'){
    const order=ranking(state).filter(p=>!p.finishedAt),index=order.indexOf(player);
    const targets=index>0?order.slice(0,index):order.filter(p=>p!==player);
    race.flashes.push({id:++race.serial,at:now,from:player.id,targets:targets.map(p=>p.id)});
    for(const target of targets)hit(state,target,'lightning',now);
  }
  toast(state,player.name+' '+action.label+(n>1?' ×'+n:''),key,now,player.id);
}

export function applyRaceEvent(state,event,now=Date.now()){
  const settings=settingsOf(state),{id,name,type}=event;
  const player=state.players.find(p=>p.id===id);
  const amount=Math.max(1,Math.min(100000,Math.trunc(Number(event.amount))||1));
  const member={id,name,avatar:event.avatar};
  if(type==='chat'){
    const text=String(event.text||'').trim();
    if(isJoinWord(text)){
      if(settings.joinChat)joinRace(state,member,now);
      return;
    }
    if(!player)return;
    const gas=text.toLocaleLowerCase('tr').replace(/^!/,'')==='gaz';
    // Each viewer counts at most once every two seconds, so spam does not win.
    if(now-player.lastTalk<2000)return;
    player.lastTalk=now;player.lastActive=now;
    player.heat=Math.min(HEAT_CAP,player.heat+(gas?3:1.5));
    return;
  }
  if(type==='like'){
    state.likes+=amount;
    if(player){player.heat=Math.min(HEAT_CAP,player.heat+Math.min(6,.5*amount));player.lastActive=now;}
    return;
  }
  if(type!=='gift' && type!=='giftCue')return;
  const key=raceGiftFor(settings,event);
  if(type==='gift'){
    state.gifts+=amount;
    note(state,'gift',name,amount+' × '+(event.gift||'hediye')+' gönderdi'+(event.coins?' ('+event.coins+' jeton/adet)':''),now);
    state.effect={type:'gift',at:now,playerId:id};
    if(player)player.coins=(player.coins||0)+(Number(event.coins)||1)*amount;
  }
  if(!key)return;
  // The first tap of a gift streak acts at once; the closing event adds the rest.
  const count=type==='giftCue'?1:event.cued?amount-1:amount;
  let racer=player;
  if(!racer){
    racer=joinRace(state,member,now);
    if(!racer){
      const queued=state.queue.findIndex(p=>p.id===id);
      if(queued>0)state.queue.unshift(...state.queue.splice(queued,1));
      return;
    }
    if(type==='gift')racer.coins=(Number(event.coins)||1)*amount;
    if(key==='join')return;
  }
  if(count<1)return;
  if(key==='join')applyRaceAction(state,racer,'gas',Math.min(2,count),now);
  else applyRaceAction(state,racer,key,count,now);
}

function crossed(prev,next,pos){
  return Math.floor((next-pos)/LAP)>Math.floor((prev-pos)/LAP);
}

export function tickRace(state,now=Date.now()){
  const race=state.race;
  if(!race)return false;
  const dt=Math.min(.5,Math.max(0,(now-race.at)/1000));
  race.at=now;
  race.hazards=race.hazards.filter(h=>h.until>now && h.hits<h.maxHits);
  race.flashes=race.flashes.filter(f=>now-f.at<1500);
  race.events=race.events.filter(e=>now-e.at<6000);
  if(race.shot && (now>=race.shot.end || !state.players.some(p=>p.id===race.shot.playerId)))race.shot=null;
  while(!race.shot && race.shots.length){
    const next=race.shots.shift();
    if(state.players.some(p=>p.id===next.playerId))race.shot={...next,start:now,end:now+next.dur};
  }
  if(race.phase==='waiting')return false;
  if(race.phase==='countdown'){
    if(now<race.goAt)return true;
    race.phase='racing';
    toast(state,'BAŞLA!','start',now);
  }
  for(const p of state.players){
    p.heat*=Math.pow(.5,dt/HEAT_HALF_LIFE);
    let boost=0;
    for(const [key,b] of Object.entries(p.boosts)){if(b.until>now)boost+=b.add;else delete p.boosts[key];}
    if(p.hit && p.hit.until<=now)p.hit=null;
    const factor=p.hit?hitEffects[p.hit.type].factor:1;
    const target=Math.min(MAX_SPEED,(BASE+Math.min(HEAT_CAP,p.heat)+boost)*factor);
    const change=target-p.speed;
    p.speed=Math.max(0,p.speed+Math.max(-(p.hit?BRAKE*2:BRAKE)*dt,Math.min(ACCEL*(boost>20?2.2:1)*dt,change)));
    const prev=p.dist;
    p.dist+=p.speed*dt;
    if(now>=p.laneAt){p.laneTo=Math.floor(random(race)*LANES);p.laneAt=now+2500+random(race)*4000;}
    const laneStep=1.4*dt;
    p.lane+=Math.max(-laneStep,Math.min(laneStep,p.laneTo-p.lane));
    if(!p.finishedAt)for(const h of race.hazards){
      if(h.owner===p.id || h.hitBy.includes(p.id) || h.hits>=h.maxHits)continue;
      if(!h.lanes.includes(Math.round(p.lane)) || !crossed(prev,p.dist,h.pos))continue;
      h.hitBy.push(p.id);h.hits++;
      hit(state,p,h.type,now);
    }
    p.score=Math.max(0,Math.floor(p.dist/LAP));
    if(race.mode==='laps' && race.phase==='racing' && !p.finishedAt && p.dist>=race.laps*LAP){
      p.finishedAt=now;
      if(!state.winner){
        state.winner=p.name;
        state.effect={type:'win',at:now,playerId:p.id};
        race.phase='finished';
        state.nextRoundAt=now+FINISH_PAUSE;
        toast(state,p.name+' YARIŞI KAZANDI! 🏁','win',now,p.id);
        note(state,'win',p.name,state.round+'. yarışı kazandı',now);
      }
    }
  }
  for(const r of race.rockets)if(now>=r.hitAt){
    const target=state.players.find(p=>p.id===r.to);
    hit(state,target,'rocket',now);
    r.done=true;
  }
  race.rockets=race.rockets.filter(r=>!r.done);
  state.leader=ranking(state)[0]?.id||null;
  if(race.mode==='endless' && state.queue.length){
    const idle=state.players.find(p=>now-p.lastActive>IDLE_SWAP);
    if(idle){
      state.players=state.players.filter(p=>p!==idle);
      const next=state.queue.shift();
      state.queue.push({id:idle.id,name:idle.name,...(idle.avatar?{avatar:idle.avatar}:{})});
      joinRace(state,next,now);
    }
  }
  return true;
}

export function nextRace(state,now=Date.now()){
  const settings=settingsOf(state);
  const lineup=[...state.queue,...state.players].map(p=>({id:p.id,name:p.name,...(p.avatar?{avatar:p.avatar}:{}),coins:p.coins||0}));
  state.race=createRace(settings,now);
  state.players=[];state.queue=[];state.winner=null;state.leader=null;state.nextRoundAt=0;state.effect=null;
  for(const member of lineup.slice(0,state.capacity)){seat(state,member,now);}
  state.queue=lineup.slice(state.capacity).map(({id,name,avatar})=>avatar?{id,name,avatar}:{id,name});
}

export {RACE_CAPACITY};
