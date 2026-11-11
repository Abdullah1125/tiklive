import * as T from '/three.module.js';
import {makeDancer,guestGender,placeJoinedHand,halayHandHeight} from './dancers.js';
import {mountWeddingChat} from './scene.js';
import {buildSquare,terraceScale} from './square.js';
import {onAir,walkDuration,arrivalStart,avatarUrl} from './wedding.js';
import {halayTempo} from './stage.js';
import {resolveDance,entrancePose} from './choreography.js';
import {readMusicMotion} from './music-motion.js';

const innerCount=20, outerCount=36;
const turn = Math.PI * 2;
const roles = {bride:'Gelin', groom:'Damat', drummer:'Davulcu', piper:'Zurnacı'};
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

function nameplate() {
  const tag=document.createElement('span');tag.className='dancer-tag';
  const portrait=document.createElement('span');portrait.className='dancer-avatar';
  const initials=document.createElement('span');initials.className='dancer-initials';
  const photo=document.createElement('img');photo.alt='';photo.decoding='async';
  photo.referrerPolicy='no-referrer';photo.draggable=false;photo.hidden=true;
  photo.onload=()=>{photo.hidden=false;initials.hidden=true;};
  photo.onerror=()=>{photo.hidden=true;initials.hidden=false;};
  const name=document.createElement('span');name.className='dancer-name';
  portrait.append(initials,photo);tag.append(portrait,name);
  tag.setPerson=person=>{
    const label=person?.name || '',url=avatarUrl(person?.avatar);
    const key=JSON.stringify([person?.id,label,url]);
    if(tag.personKey===key)return;
    tag.personKey=key;name.textContent=label;
    initials.textContent=label.trim().split(/\s+/u).slice(0,2).map(word=>Array.from(word)[0]).join('').toLocaleUpperCase('tr') || '?';
    let hash=0;for(const char of String(person?.id || label))hash=(hash*31+char.codePointAt(0))>>>0;
    portrait.style.backgroundColor=`hsl(${hash%360} 35% 37%)`;
    if(tag.photoUrl!==url){
      tag.photoUrl=url;photo.hidden=true;initials.hidden=false;
      if(url)photo.src=url;else photo.removeAttribute('src');
    }
  };
  return tag;
}

function makePaper(scene, money) {
  let map;
  if (money) {
    const sheet = document.createElement('canvas'); sheet.width=128; sheet.height=64;
    const pen=sheet.getContext('2d'); pen.fillStyle='#a8d493'; pen.fillRect(0,0,128,64);
    pen.strokeStyle='#386b55'; pen.lineWidth=3; pen.strokeRect(5,5,118,54);
    pen.fillStyle='#466c54'; pen.font='bold 38px Georgia'; pen.fillText('₺',50,46);
    pen.font='bold 14px Georgia'; pen.fillText('50',10,21); pen.fillText('50',98,52);
    map=new T.CanvasTexture(sheet); map.colorSpace=T.SRGBColorSpace;
  }
  const material=new T.MeshBasicMaterial({side:T.DoubleSide, map:map||null});
  const paper=new T.InstancedMesh(new T.PlaneGeometry(money?.34:.13,money?.17:.17),material,256);
  paper.frustumCulled=false; paper.count=0;
  const colors=['#ffc246','#18a989','#f65979','#ad69c5','#ffedd8'];
  const parts=Array.from({length:64}, (_,i)=>({
    a:Math.random()*turn, v:1+Math.random()*2.5, up:3+Math.random()*3, spin:1+Math.random()*6, color:new T.Color(colors[i%colors.length])
  }));
  if (!money) for (let i=0;i<256;i++) paper.setColorAt(i,parts[i%64].color);
  const pivot=new T.Object3D(); scene.add(paper);
  return {
    draw(moments,positions,now) {
      let count=0;
      if (!reduced.matches) for (const m of moments) {
        const age=(now-m.at)/1000;
        if (m.tier !== (money?'money':'confetti') || age<0 || age>3.6 || count >= 256) continue;
        const source=positions.get(m.playerId);
        for (const p of parts) {
          const localAge=age-(money?(count%8)*.08:0);
          const radius=p.v*Math.max(0,localAge);
          pivot.position.set((source?.x||0)+Math.cos(p.a)*radius,Math.max(.09,1.8+p.up*localAge-2.6*localAge*localAge+.22*Math.sin(localAge*p.spin)),
            (source?.z||0)+Math.sin(p.a)*radius*.70);
          pivot.rotation.set(localAge*p.spin,p.a+localAge,localAge*p.spin*.8);
          pivot.scale.setScalar(Math.max(0,Math.min(1,(3.6-age)*2,localAge*15)));
          pivot.updateMatrix(); paper.setMatrixAt(count++,pivot.matrix);
        }
      }
      paper.count=count;
      if (count) paper.instanceMatrix.needsUpdate=true;
    },
    dispose(){map?.dispose();}
  };
}

function makeWeddingGold(scene) {
  const group=new T.Group();group.visible=false;scene.add(group);
  const gold=new T.MeshStandardMaterial({color:0xffc544,metalness:.36,roughness:.28,emissive:0xce7521,emissiveIntensity:.21});
  const rim=new T.MeshStandardMaterial({color:0xffe495,metalness:.34,roughness:.21});
  const ribbon=new T.MeshStandardMaterial({color:0xb41938,roughness:.8,side:T.DoubleSide});
  function piece(geo,mat,x,y,z){const p=new T.Mesh(geo,mat);p.position.set(x,y,z);group.add(p);return p;}
  for(const side of [-1,1])piece(new T.BoxGeometry(.062,.21,.017),ribbon,side*.038,.125,-.012).rotation.z=-side*.35;
  piece(new T.CylinderGeometry(.136,.136,.035,36),gold,0,0,0).rotation.x=Math.PI/2;
  piece(new T.TorusGeometry(.115,.008,6,36),rim,0,0,.019);
  const stamp=new T.Shape();
  for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,r=i%2?.029:.066;
    if(i)stamp.lineTo(Math.cos(a)*r,Math.sin(a)*r);else stamp.moveTo(Math.cos(a)*r,Math.sin(a)*r);}
  stamp.closePath();piece(new T.ShapeGeometry(stamp),rim,0,0,.022);
  const from=new T.Vector3(),to=new T.Vector3();
  return {group,from,to};
}

function footContacts(actor){
  const anchors=[new T.Vector2(),new T.Vector2()], planted=[false,false];
  const release=[new T.Vector2(),new T.Vector2()];
  return (foot,side,support,progress)=>{
    const i=side<0?0:1;
    if(!support){
      const lift=1-T.MathUtils.smoothstep(progress,0,.48);
      foot.x+=release[i].x*lift;
      foot.z+=release[i].y*lift;
      planted[i]=false;
      return;
    }
    const group=actor.group,scale=group.scale.x,yaw=group.rotation.y;
    const c=Math.cos(yaw),s=Math.sin(yaw),origin=group.position,anchor=anchors[i];
    if(!planted[i]){
      anchor.set(origin.x+scale*(c*foot.x+s*foot.z),origin.z+scale*(-s*foot.x+c*foot.z));
      planted[i]=true;
    }
    const dx=(anchor.x-origin.x)/scale,dz=(anchor.y-origin.z)/scale;
    // Release gradually on a large change of formation to keep knees in reach.
    release[i].set(T.MathUtils.clamp(c*dx-s*dz-foot.x,-.21,.21),
      T.MathUtils.clamp(s*dx+c*dz-foot.z,-.21,.21));
    foot.x+=release[i].x;
    foot.z+=release[i].y;
  };
}

export function createHalay(canvas) {
  const host=canvas.parentElement;
  const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
  renderer.setClearColor(0xffffff,0);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFShadowMap;
  const scene=new T.Scene();
  scene.fog=new T.FogExp2(0xc1c6b9,.011);
  scene.add(new T.HemisphereLight(0xfff4df,0xb3a598,1.15));
  const sun=new T.DirectionalLight(0xffebd1,2.05);
  sun.position.set(-6,10,6); sun.castShadow=true;
  sun.shadow.mapSize.set(1536,1536);
  Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,far:42});
  sun.shadow.normalBias=.025; sun.shadow.bias=-.00035; scene.add(sun);
  const rim=new T.DirectionalLight(0xffd4b4,.70);
  rim.position.set(4,5,-6);scene.add(rim);
  const animateSet=buildSquare(scene);
  const camera=new T.PerspectiveCamera(35,1,.1,140);
  const eye=new T.Vector3(), goal=new T.Vector3();
  const cameraTarget=new T.Vector3();
  const moves={shoulder:0,knee:0,stamp:0,squat:0,heel:0,sway:0};
  let tempoNow=112,energyNow=.45,occlusionLift=0;
  let currentShot='', shotStart=0,lastClose=-100, orbitTime=0,crowd=0;
  let idleStart, lastTourIndex=-1, tourNumber=-1;
  // Townspeople share articulated rigs. Each costume part is drawn in one
  // instanced batch, even when the dance floor is full.
  const groups=new Map(), matrix=new T.Matrix4();
  const wardrobeCount=12;
  const dyes=['#76384c','#354d67','#536959','#32675c','#40455e','#705342','#60527b','#49676a',
    '#a06c78','#536782','#56695a','#7c6557'];
  const colorWheel=new T.Color(), taken=new Set();
  function dress(gender){
    // Reserve a distinct cut + dye for every person currently on the floor,
    // independent of changes in order when somebody takes the handkerchief.
    let look=0;
    while(taken.has(look) || (gender && guestGender(look%wardrobeCount)!==gender))look++;
    taken.add(look);
    const style=look%wardrobeCount,edition=Math.floor(look/wardrobeCount);
    colorWheel.set(dyes[style]).offsetHSL(.045*edition,-.035,(edition%3)*.022);
    return {look,tint:colorWheel.clone(),height:[1,.965,1.07,.98,1.04,.91,1.01,.94,1.03,1.09,.93,1][style]*(1+(edition%3-1)*.019),
      rig:wardrobe(style)};
  }
  function wardrobe(style) {
    if (groups.has(style)) return groups.get(style);
    const model=makeDancer(style,'guest'), pieces=[];
    model.group.traverse(part=>{
      if (!part.isMesh) return;
      const batch=new T.InstancedMesh(part.geometry,part.material,innerCount+outerCount);
      batch.setColorAt(0,new T.Color(1,1,1));
      batch.frustumCulled=false;batch.castShadow=part.castShadow;batch.receiveShadow=part.receiveShadow;
      batch.instanceMatrix.setUsage(T.DynamicDrawUsage);
      batch.count=0;scene.add(batch);pieces.push({part,batch});
    });
    const rig={model,pieces};
    groups.set(style,rig);return rig;
  }
  const ring=new T.Mesh(new T.RingGeometry(.54,.62,48),new T.MeshBasicMaterial({color:0xffbf4a,transparent:true,opacity:.93,depthWrite:false}));
  ring.rotation.x=-Math.PI/2; scene.add(ring);
  const chiefRing=ring.clone();
  chiefRing.material=ring.material.clone();chiefRing.material.opacity=.48;
  scene.add(chiefRing);
  const steps=new T.InstancedMesh(new T.CircleGeometry(1,16),
    new T.MeshBasicMaterial({color:0xffdaa2,transparent:true,opacity:.82,depthWrite:false}),6);
  steps.frustumCulled=false;steps.count=0;scene.add(steps);
  const tread=new T.Object3D(),trail=[];
  let trailShot='',lastPrint=0;
  const money=makePaper(scene,true),confetti=makePaper(scene,false);
  const gold=makeWeddingGold(scene);
  const labels=document.createElement('div'); labels.className='dancer-labels';host.insertBefore(labels,canvas.nextSibling);
  const chat=mountWeddingChat(host);
  const cast=new Map(), positions=new Map();
  const left=new T.Vector3(),right=new T.Vector3(),leftGrip=new T.Vector3(),rightGrip=new T.Vector3(),projected=new T.Vector3(),target=new T.Vector3();
  let lineup=[],crew=[],state={},signature,previous=0,phase=0,frame,dead=false,width=0,height=0,time=0;
  function update(next) {

    state=next;
    chat.update(next.chatMessages);
    const guests=[...(state.players||[])];
    guests.sort((a,b)=>Number(b.id===state.leader)-Number(a.id===state.leader));
    const key=JSON.stringify([guests.map(p=>[p.id,p.name,p.joinedAt,p.gender,p.avatar]),state.roles,state.leader]);
    if (key===signature) return;
    if(signature===undefined)crowd=guests.length;
    signature=key;
    labels.classList.toggle('crowded',guests.length>innerCount);

    const keep=new Set(guests.map(p=>'guest:'+p.id));
    for(const [slot,actor] of cast)if(actor.rig && !keep.has(slot)){taken.delete(actor.look);actor.tag.remove();cast.delete(slot);}
    const active=new Set();
    function place(slot,person,role,index) {
      active.add(slot);
      let actor=cast.get(slot);
      const gender=person?.gender==='female' || person?.gender==='male' ? person.gender : null;
      if (!actor) {
        actor=role==='guest'?{...dress(gender),group:new T.Object3D()}:makeDancer(index,role);
        if(actor.rig)actor.plantFoot=footContacts(actor);
        cast.set(slot,actor); if(!actor.rig) scene.add(actor.group);
        actor.tag=nameplate();
        labels.append(actor.tag); actor.fresh=true;
      } else if(actor.rig && gender && guestGender(actor.look%wardrobeCount)!==gender) {
        taken.delete(actor.look);
        Object.assign(actor,dress(gender));
        actor.pinningHand=null;
      }
      const title = role==='guest' && person?.id===state.leader;
      actor.tag.hidden=!person?.name;
      actor.tag.classList.toggle('special',!!title);
      actor.tag.setPerson(person);
      return {actor,person,role};
    }
    lineup=guests.map((p,i)=>place('guest:'+p.id,p,'guest',i));
    // A free place on the inside is available to the next arrival. Existing
    // outer dancers keep their row when a role or the leader changes.
    const chief=lineup.find(member=>member.person.id===state.leader);
    if(chief?.actor.row===1){
      const exchange=lineup.find(member=>member!==chief && member.actor.row===0);
      if(exchange)exchange.actor.row=1;
      chief.actor.row=0;
    }
    const occupied=[0,0];
    for (const {actor} of lineup) if (actor.row!==undefined) occupied[actor.row]++;
    for (const {actor} of lineup) if (actor.row===undefined) {
      actor.row=occupied[0]<innerCount?0:1;
      occupied[actor.row]++;
    }
    crew=Object.keys(roles).map((role,i)=>place('role:'+role,state.roles?.[role],role,i+1));
    for (const [slot,actor] of cast) if (!active.has(slot)) {
      scene.remove(actor.group);actor.dispose?.();actor.tag.remove();cast.delete(slot);
    }
  }
  // A sender can celebrate without first joining the halay. Give them their own
  // temporary performer; the bride and groom never stand in for someone else.
  const visitor=makeDancer(3,'guest');
  const visitorTag=nameplate();
  labels.append(visitorTag);visitor.tag=visitorTag;visitor.fresh=true;visitor.group.visible=false;
  scene.add(visitor.group);
  function draw(ms) {
    if (dead) return;
    frame=requestAnimationFrame(draw);
    const cw=canvas.clientWidth,ch=canvas.clientHeight;
    if (!cw || !ch || !crew.length || ms-previous<31) return;
    const dt=Math.min(.08,(ms-previous)/1000);previous=ms;time+=dt;
    const aspect=cw/ch,now=Date.now();
    const speaker=chat.tick(now);
    let chatAnchor;
    if (cw!==width||ch!==height) {
      width=cw;height=ch;renderer.setSize(cw,ch,false);camera.aspect=aspect;camera.updateProjectionMatrix();
    }
    const guestScale=.81, step=1.04;
    const music=readMusicMotion(ms);
    const dance=resolveDance(state,music,phase,now);
    const baseTempo=music.active?music.bpm:halayTempo(state);
    const requestedTempo=dance.direction==='calm'?90:dance.boost?Math.max(baseTempo,dance.bpm||0)*1.10:dance.bpm||baseTempo;
    const wantedTempo=T.MathUtils.clamp(requestedTempo,78,138);
    tempoNow+=(wantedTempo-tempoNow)*(1-Math.exp(-dt*1.4));
    const tempo=tempoNow;
    const requestedEnergy=dance.direction==='calm'?.12:(state.sceneSettings?.energy??1)*Math.max(dance.boost*.95,music.active?music.energy:.45);
    energyNow+=(Math.min(1.15,requestedEnergy)-energyNow)*(1-Math.exp(-dt*2.2));
    const energy=energyNow;
    phase+=dt*tempo/60*turn*(reduced.matches?.35:1);
    for(const name of Object.keys(moves)){
      const selected=dance.figure===name || (dance.boost && name===['shoulder','stamp','knee'][Math.floor(phase/(turn*8))%3]);
      moves[name]+=(Number(selected)-moves[name])*(1-Math.exp(-dt*4));
    }
    rim.intensity=.70+dance.boost*(.28+.16*Math.sin(phase));
    rim.color.set(dance.boost?0xffae72:0xffd4b4);
    const travelPhase=reduced.matches?0:phase*.0065+Math.sin(phase*.5)*.008;
    const rows=[[],[]];
    for(const member of lineup) rows[member.actor.row].push(member);
    const counts=rows.map(row=>row.length);
    // Leave room for two real dancers only while the couple is in the chain.
    const cycle=(phase/turn)%48;
    const blend=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
    const visit=counts[0] && dance.direction!=='couple'?blend((cycle-16)/5)*(1-blend((cycle-35)/5)):0;
    crowd+=(lineup.length-crowd)*(1-Math.exp(-dt*1.6));
    // At capacity each row closes at a reachable hand-to-hand distance.
    const radii=[Math.max(3.40,step/(2*Math.sin(Math.PI/Math.max(3,counts[0])))),
      Math.max(6.10,step/(2*Math.sin(Math.PI/Math.max(3,counts[1]))))];
    const floorScale=.96+.39*Math.sqrt(crowd/56);
    const openArc=state.sceneSettings?.formation==='arc';
    const strides=counts.map((n,i)=>Math.min(2*Math.asin(step/(2*radii[i])),(openArc?turn*.76:turn-.35)/Math.max(1,n+(i?0:2*visit))));
    function mark(outer,j) {
      const row=outer?1:0;
      const a=2.66+j*strides[row]+(outer?.30-travelPhase:travelPhase);
      const r=radii[row]+.035*Math.sin(phase*.25+(outer?.6:0));
      return {x:Math.sin(a)*r,z:-Math.cos(a)*r,yaw:-a};
    }
    const arc=rows.flatMap((row,rowIndex)=>row.map((member,j)=>{
      const outer=rowIndex===1;
      const p=mark(outer,j),actor=member.actor;
      actor.walkStarted=arrivalStart(actor.walkStarted,member.person.joinedAt,state.shots,member.person.id,now);
      const joinedAt=actor.walkStarted;
      const progress=joinedAt===undefined?1:T.MathUtils.clamp((now-joinedAt)/walkDuration,0,1);
      const entry=entrancePose(progress,member.person.id);
      const walking=reduced.matches?0:entry.walking;
      if(walking>0){
        const angle=Math.atan2(p.x,p.z);
        // All arrivals pass through the floral entrance, then follow the rim.
        actor.aisle ??= Math.PI;
        const delta=Math.atan2(Math.sin(angle-actor.aisle),Math.cos(angle-actor.aisle));
        const heading=actor.aisle+delta*blend(entry.travel/.72);
        const destination=Math.hypot(p.x,p.z);
        const rimRadius=destination+1.4;
        const radius=entry.travel<.35?T.MathUtils.lerp(8.65*terraceScale*floorScale,rimRadius,blend(entry.travel/.35)):
          T.MathUtils.lerp(rimRadius,destination,blend((entry.travel-.65)/.35));
        p.x=Math.sin(heading)*radius;p.z=Math.cos(heading)*radius;
        const inward=heading+Math.PI;
        p.yaw+=walking*Math.atan2(Math.sin(inward-p.yaw),Math.cos(inward-p.yaw));
        if(actor.pathX!==undefined && entry.greeting<.2){
          const dx=p.x-actor.pathX,dz=p.z-actor.pathZ;
          if(Math.hypot(dx,dz)>.003){const facing=Math.atan2(dx,dz);p.yaw+=walking*Math.atan2(Math.sin(facing-p.yaw),Math.cos(facing-p.yaw));}
        }
      }
      actor.pathX=p.x;actor.pathZ=p.z;
      return {...p,member,walking,waiting:joinedAt>now,greeting:reduced.matches?0:entry.greeting,entryStyle:entry.style,gap:entry.gap,
        scale:guestScale*actor.height,chief:state.leader===member.person.id,outer};
    }));
    for(let i=0;i<arc.length;i++){
      const newcomer=arc[i];if(!newcomer.gap)continue;
      for(const side of [-1,1]){
        const friend=arc[i+side];if(!friend || friend.outer!==newcomer.outer || friend.walking)continue;
        const angle=Math.atan2(friend.x,friend.z)+side*newcomer.gap*.06;
        const r=Math.hypot(friend.x,friend.z);
        friend.x=Math.sin(angle)*r;friend.z=Math.cos(angle)*r;
        friend.greeting=Math.max(friend.greeting||0,newcomer.greeting*.5);friend.entryStyle=1;
      }
    }
    const coupleStep=Math.sin(phase*.25);
    // Six beats to cross on opposite arcs, then settle on the other side.
    const bar=phase/turn,pass=bar%24,side=Math.floor(bar/24)%2===0?1:-1;
    const u=blend((pass-14)/6),angle=Math.PI*u;
    const march=side*Math.sin(angle);
    const bandX=side*1.21*Math.cos(angle);
    const center=[
      {x:-.85+.18*coupleStep,z:.65+.20*Math.cos(phase*.25),yaw:.58+.34*coupleStep},
      {x:.85+.18*coupleStep,z:.65-.20*Math.cos(phase*.25),yaw:-.62+.34*coupleStep},
      {x:-bandX,z:-1.54-.78*march,yaw:.21*bandX+.76*march+.08*Math.sin(phase*.5)},
      {x:bandX,z:-1.54+.78*march,yaw:-.21*bandX-.76*march+.08*Math.sin(phase*.5)}
    ].map((p,i)=>({...p,member:crew[i],scale:i<2?1.13:1.0}));
    if(dance.direction==='couple'){
      const angle=phase*.055;
      center.slice(0,2).forEach((p,i)=>{
        const side=i?1:-1;p.x=side*.92*Math.cos(angle);p.z=.65+side*.92*Math.sin(angle);
        p.yaw=Math.atan2(-p.x,.65-p.z);
      });
    }
    if(visit>0){
      // Move as a pair around a shared midpoint. Independent interpolation
      // would let the two torsos pass through each other on the way to a slot.
      const a=mark(false,-2),b=mark(false,-1),mx=(a.x+b.x)*.5,mz=(a.z+b.z)*.5;
      const axis=Math.atan2(b.z-a.z,b.x-a.x),heading=axis*visit;
      const span=T.MathUtils.lerp(.85,Math.hypot(b.z-a.z,b.x-a.x)/2,visit);
      for(let i=0;i<2;i++){const p=center[i],slot=i?b:a,side=i?1:-1;
        p.x=.18*coupleStep*(1-visit)+mx*visit+side*span*Math.cos(heading);
        p.z=.65*(1-visit)+mz*visit+side*span*Math.sin(heading);
        p.yaw+=Math.atan2(Math.sin(slot.yaw-p.yaw),Math.cos(slot.yaw-p.yaw))*visit;
      }
    }
    const subjects=[...center,...arc.filter(p=>!p.waiting)];
    const cue=onAir(state,now);
    let close=cue ? subjects.find(p=>p.member.person?.id===cue.playerId) : null;
    visitor.group.visible=false;visitorTag.hidden=true;
    if (cue && !close && cue.tier!=='join') {
      close={member:{actor:visitor,person:{id:cue.playerId,name:cue.name,avatar:cue.avatar},role:'visitor'},x:0,z:2.55,yaw:.12,scale:.94};
      visitorTag.setPerson(close.member.person);visitorTag.hidden=false;
    }
    if(dance.direction==='wide')close=null;
    if(close)lastClose=time;
    const since=time-lastClose;
    if(!close && !reduced.matches)orbitTime+=dt;
    const tour=reduced.matches || dance.direction==='wide'?0:blend((since-4)/3)*Math.pow(.5-.5*Math.cos(orbitTime*.24),2);
    const wideYaw=reduced.matches?.14:.14+orbitTime*.117;
    const viewRadius=Math.max(3.12,(6.85-2.8*tour)*floorScale*T.MathUtils.lerp(terraceScale,1,tour),counts[1]?radii[1]:radii[0]);
    const wideDistance=Math.max(10.5,(2*viewRadius+2.65)/(2*Math.tan(T.MathUtils.degToRad(camera.fov*.5))*Math.min(aspect,1.38))+2.2);
    const elevation=(reduced.matches?.89:1.02)-tour*.39;
    goal.set(0,.54,0);
    eye.set(Math.sin(wideYaw)*wideDistance*Math.cos(elevation),
      .54+wideDistance*Math.sin(elevation),Math.cos(wideYaw)*wideDistance*Math.cos(elevation));
    // Shoot a short moving insert between stretches of the overhead halay.
    // Restart the idle interval after every cue, preserving the wide gift breaks.
    if (idleStart===undefined || cue) {idleStart=ms;lastTourIndex=-1;}
    const idleSeconds=(ms-idleStart)/1000;
    const tourIndex=Math.floor(idleSeconds/21);
    const elapsed=idleSeconds%21-7;
    const roaming=!cue && !dance.direction && state.sceneSettings?.tours!==false && !reduced.matches && elapsed>=0 && elapsed<12;
    let idleShot='wide';
    if (roaming) {
      if (lastTourIndex!==tourIndex) {lastTourIndex=tourIndex;tourNumber++;}
      const u=elapsed/12;
      const terrace=floorScale*terraceScale;
      if (tourNumber%3!==2 && arc.length) {
        idleShot='dancers';
        const row=rows[0].length?0:1;
        const n=counts[row];
        const span=Math.min(4,n-1);
        const position=(tourNumber*3)%Math.max(1,n-span)+u*span;
        const subject=mark(row===1,position);
        // Camera travels along the clear inside edge of the dancers' circle.
        const radial=Math.atan2(subject.x,subject.z);
        const distance=Math.max(3.8,2.65/aspect);
        goal.set(subject.x,1.12,subject.z);
        eye.set(subject.x-Math.sin(radial+.14)*distance,1.95+.28*Math.sin(u*Math.PI),
          subject.z-Math.cos(radial+.14)*distance);
      } else if (tourNumber%2===0) {
        idleShot='audience';
        // Track along the inside of a seating bank, looking out at faces.
        const bank=(3+Math.floor(tourNumber/2)*3)%8;
        const heading=(bank+.5)*turn/8+(u-.5)*.53;
        const distance=Math.max(4.8,2.9/aspect);
        goal.set(7.85*terrace*Math.sin(heading),1.18,7.85*terrace*Math.cos(heading));
        eye.set(goal.x-distance*Math.sin(heading-.27),1.55+.18*Math.sin(Math.PI*u),
          goal.z-distance*Math.cos(heading-.27));
      } else {
        idleShot='garden';
        // Glide past the aisle, framing the seated guests under the floral arch.
        const side=tourNumber%4===1?1:-1;
        goal.set(side*(2.6-u*2.35)*terrace,2.18,-8.56*terrace);
        eye.set(side*(4.15-u*2.20)*terrace,2.30+.55*u,goal.z+Math.max(7.9,5.8/aspect));
      }
    }
    if(dance.boost && !close && dance.direction!=='wide' && !reduced.matches){
      idleShot='celebration';
      const distance=Math.max(10,(Math.max(radii[0],counts[1]?radii[1]:0)+1.6)/(Math.tan(T.MathUtils.degToRad(camera.fov*.5))*Math.min(aspect,1.3)));
      const angle=orbitTime*.23;
      goal.set(0,.7,0);eye.set(Math.sin(angle)*distance*.66,.7+distance*.75,Math.cos(angle)*distance*.66);
    }
    const shot=close?cue.playerId+'/'+cue.tier+'/'+cue.at:idleShot;
    if (trailShot!==shot) {trail.length=0;lastPrint=0;trailShot=shot;}
    steps.count=0;
    if(close?.walking && cue?.tier==='join' && now-lastPrint>=220){
      const side=lastPrint===0?1:-trail.at(-1).side;
      trail.push({x:close.x+Math.cos(close.yaw)*side*.12,z:close.z-Math.sin(close.yaw)*side*.12,
        yaw:close.yaw,at:now,side});
      if(trail.length>6)trail.shift();
      lastPrint=now;
    }
    for(const print of trail){
      const fade=1-(now-print.at)/1000;
      if(fade<=0)continue;
      tread.position.set(print.x,.045,print.z);tread.rotation.set(-Math.PI/2,0,-print.yaw);
      tread.scale.set(.085*fade,.18*fade,1);tread.updateMatrix();
      steps.setMatrixAt(steps.count++,tread.matrix);
    }
    if(steps.count)steps.instanceMatrix.needsUpdate=true;
    const cut=shot!==currentShot;
    if (cut) {currentShot=shot;shotStart=ms;host.dataset.shot=close?(['money','confetti','gold'].includes(cue.tier)?cue.tier:close.member.role==='guest'?'guest':close.member.role):idleShot;host.dispatchEvent(new Event('wedding-cut',{bubbles:true}));}
    if (close) {
      const musician=['drummer','piper'].includes(close.member.role);
      const heading=close.yaw+(musician?.30*close.x:.13)+(reduced.matches?0:.32*Math.sin((ms-shotStart)/3500-.6));
      const dolly=reduced.matches?0:.32*Math.exp(-(ms-shotStart)/900);
      const burst=['confetti','money'].includes(cue.tier);
      const distance=Math.max(burst?6.9:4.1,(burst?4.6:2.85)/aspect)+dolly;
      goal.set(close.x,(burst?1.70:1.36)*close.scale,close.z);
      eye.set(close.x+Math.sin(heading)*distance,1.88*close.scale,close.z+Math.cos(heading)*distance);
    }
    if(!close && dance.direction==='couple'){
      const a=(now-state.direction.at)/1000*.15;
      goal.set(0,1.15,.65);eye.set(Math.sin(a)*6.5,2.75,Math.cos(a)*6.5+.65);
    }
    const pin=close && cue.tier==='gold'?center[close===center[0]?1:0]:null;
    const flight=pin?(reduced.matches?1:blend((now-cue.at-550)/1500)):0;
    if(pin){
      const x=T.MathUtils.lerp(close.x,pin.x,flight),z=T.MathUtils.lerp(close.z,pin.z,flight);
      const heading=pin.yaw+.18, distance=Math.max(4.70,2.9/aspect);
      goal.set(x,1.48*pin.scale,z);
      eye.set(x+Math.sin(heading)*distance,2.20,z+Math.cos(heading)*distance);
    }
    if(close && cue.tier==='join'){
      // Track from the inside of the floor, facing the arriving viewer.
      const facing=Math.atan2(close.x,close.z)+Math.PI+.34;
      const distance=Math.max(4.8,3.25/aspect);
      goal.set(close.x,1.16,close.z);
      eye.set(close.x+Math.sin(facing)*distance,2.55,close.z+Math.cos(facing)*distance);
    }
    const originalEyeY=eye.y;
    if(close || roaming || dance.direction==='couple'){
      // Lift the lens over foreground dancers instead of removing them from the ring.
      const dx=eye.x-goal.x,dz=eye.z-goal.z,lengthSq=dx*dx+dz*dz;
      for(const p of subjects){
        if(p===close || lengthSq<.01)continue;
        const x=p.x-goal.x,z=p.z-goal.z,t=(x*dx+z*dz)/lengthSq;
        if(t<.09 || t>1.12 || Math.hypot(x-t*dx,z-t*dz)>1.20*p.scale)continue;
        eye.y=Math.max(eye.y,Math.min(6.8,goal.y+(2.68*p.scale-goal.y)/t));
      }
    }
    const wantedLift=eye.y-originalEyeY;
    occlusionLift+=(wantedLift-occlusionLift)*(1-Math.exp(-dt*(wantedLift>occlusionLift?4:1.2)));
    eye.y=originalEyeY+occlusionLift;
    if (ms<100 || !camera.position.lengthSq() || reduced.matches) {camera.position.copy(eye);cameraTarget.copy(goal);}
    else {const k=1-Math.exp(-dt*(close?3.8:since<1?2.6:2.2));camera.position.lerp(eye,k);cameraTarget.lerp(goal,k);}
    camera.lookAt(cameraTarget);camera.updateMatrixWorld();
    for (const {pieces} of groups.values()) for(const {batch} of pieces)batch.count=0;
    const moment=cue;
    const giftAge=moment?(now-moment.at)/1000:Infinity;
    const handY=halayHandHeight(phase,moves);
    ring.visible=false;chiefRing.visible=false;positions.clear();
    const posed=close?.member.actor===visitor?[...subjects,close]:subjects;
    for(const p of posed){
      const actor=p.member.actor;
      target.set(p.x,0,p.z);
      if(actor.fresh){actor.group.position.copy(target);actor.fresh=false;}
      else actor.group.position.lerp(target,1-Math.exp(-dt*8));
      actor.group.rotation.y+=Math.atan2(Math.sin(p.yaw-actor.group.rotation.y),Math.cos(p.yaw-actor.group.rotation.y))*(1-Math.exp(-dt*6));
      actor.group.scale.setScalar(p.scale);
    }
    function show(member,x,z,scale,yaw,chief,index,adjacent,walking=0,greeting=0,entryStyle=0) {
      const {actor,person,role}=member;
      const isGuest=role==='guest';
      x=actor.group.position.x;z=actor.group.position.z;yaw=actor.group.rotation.y;
      const marked=person && giftAge>=0 && person.id===moment?.playerId;
      if(chief){chiefRing.visible=true;chiefRing.position.copy(actor.group.position);chiefRing.position.y=.06;chiefRing.scale.setScalar(scale*1.2);}
      const giftJump=marked&&moment.tier!=='join'?Math.sin(Math.PI*Math.min(1,giftAge/1.2))**2*.45:0;
      const danceJump=!walking && energy>.62?Math.max(0,Math.sin(phase*.5))**2*(energy-.62)*.28:0;
      const jump=reduced.matches?0:Math.max(giftJump,danceJump);
      left.set(isGuest?-step/scale/2:-.52,chief?1.88+Math.sin(phase*.5)*.16:handY,.12);
      right.set(isGuest?step/scale/2:.54,handY,.12);
      const festiveScarf=dance.boost>0 && !chief && isGuest && actor.look%7===0 && !walking;
      if(chief || festiveScarf)left.set(-.68,1.98+.20*Math.sin(phase),.22+.12*Math.cos(phase*.5));
      let linkedLeft=false,linkedRight=false;
      if (adjacent) {
        for (const [hand,grip,near,sign] of [[left,leftGrip,adjacent.prev,-1],[right,rightGrip,adjacent.next,1]]) {
          const nearScarf=near && dance.boost>0 && near.member.role==='guest' && near.member.actor.look%7===0;
          const freeScarf=sign<0?(chief||festiveScarf):(near?.chief||nearScarf);
          if(!near || near.waiting || near.walking || walking || greeting || near.greeting || freeScarf)continue;
          placeJoinedHand(hand,grip,actor.group.position,near.member.actor.group.position,scale,near.scale,yaw,handY);
          if(sign<0)linkedLeft=true;else linkedRight=true;
        }
      }
      const celebrate=moment && ['money','confetti','gold'].includes(moment.tier);
      const toss=marked && celebrate && !reduced.matches;
      if(toss) {const lift=Math.sin(Math.min(1,giftAge/.55)*Math.PI/2)*Math.max(0,1-giftAge/2.4);
        right.set(.62,1.35+.91*lift,.13+.28*lift);linkedRight=false;
      }
      const rig=actor.rig, model=rig?.model || actor;
      model.pose({phase,seconds:time,index,leader:chief,celebrating:festiveScarf,leaderEnergy:reduced.matches?0:1,jump,walking:walking*(1-greeting),greeting,entryStyle,moves:reduced.matches?{}:moves,energy:reduced.matches?0:energy,
        leftGrip:linkedLeft?leftGrip:undefined,rightGrip:linkedRight?rightGrip:undefined,
        march:role==='drummer'?march:role==='piper'?-march:0,plantFoot:actor.plantFoot,edition:Math.floor((actor.look||0)/wardrobeCount),
        link:isGuest || dance.direction==='couple'?1:blend((visit-.76)/.22),leftHand:isGuest || adjacent?.prev?left:undefined,rightHand:toss || isGuest || adjacent?.next?right:undefined});
      if(pin && marked){
        actor.pinningHand??=model.group.getObjectByName('hand:1');
        gold.from.copy(actor.pinningHand.position);actor.group.localToWorld(gold.from);
      }
      if(rig) {
        actor.group.updateMatrix(); model.group.updateMatrixWorld(true);
        for(const {part,batch} of rig.pieces) {
          let visible=true;
          for(let parent=part;parent;parent=parent.parent) if(!parent.visible){visible=false;break;}
          if(!visible)continue;
          matrix.multiplyMatrices(actor.group.matrix,part.matrixWorld);
          batch.setColorAt(batch.count,actor.tint);batch.setMatrixAt(batch.count++,matrix);
        }
      }
      if (person?.id) positions.set(person.id,actor.group.position);
      if (!actor.tag.hidden) {

        actor.tag.classList.toggle('featured',close?.member===member);
        projected.copy(actor.group.position); projected.y+=(2.48+jump*.22)*scale;
        projected.project(camera);
        const coversFeatured=close && close.member!==member && Math.abs(projected.x)<.47 && Math.abs(projected.y-.27)<.46;
        actor.tag.style.visibility=close?.member===member && !(pin && flight>.8) ? '' : coversFeatured || projected.z < -1 || projected.z > 1 || Math.abs(projected.x)>1.04 || Math.abs(projected.y)>1.1 || (pin && flight>.8 && marked) ? 'hidden' : '';
        actor.tag.style.left=(projected.x*.5+.5)*100+'%';
        const anchor=(.5-projected.y*.5)*100;
        actor.tag.style.top=(close?.member===member?Math.max(10,anchor):anchor)+'%';
        if(person?.id===speaker && Math.abs(projected.z)<=1){
          chatAnchor={x:projected.x*.5+.5,y:anchor/100-.027};
        }
      }
      if (marked) {
        ring.visible=true;ring.position.copy(actor.group.position);ring.position.y=.072;
        ring.scale.setScalar(scale*(1.2+.12*Math.sin(giftAge*7)));
      }
    }
    arc.forEach((p,i)=>{
      if(p.waiting){p.member.actor.tag.style.visibility='hidden';return;}
      const start=p.outer?counts[0]:0,n=counts[p.outer?1:0],j=i-start;
      const closed=n>2 && turn-strides[p.outer?1:0]*(n-1)<strides[p.outer?1:0]*1.15;
      show(p.member,p.x,p.z,p.scale,p.yaw,p.chief,i,{
        prev:p.chief?null:j>0?arc[i-1]:!p.outer && visit>.76?center[1]:closed?arc[start+n-1]:null,
        next:j<n-1?arc[i+1]:closed?arc[start]:null
      },p.walking,p.greeting,p.entryStyle);
    });
    center.forEach((p,i)=>show(p.member,p.x,p.z,p.scale,p.yaw,false,i,(visit>.76 || dance.direction==='couple') && i<2?
      (i===0?{next:center[1]}:{prev:center[0],next:dance.direction==='couple'?null:arc[0]}):null));
    if(close?.member.actor===visitor) show(close.member,close.x,close.z,close.scale,close.yaw,false,4);
    chat.place(chatAnchor);
    gold.group.visible=!!pin;
    if(pin){
      const wearer=pin.member.actor;
      wearer.bodice??=wearer.group.getObjectByName('bodice');
      wearer.bodice.localToWorld(gold.to.set(-.13,1.45,.24));
      gold.group.position.lerpVectors(gold.from,gold.to,flight);
      gold.group.position.y+=.88*Math.sin(Math.PI*flight);
      wearer.bodice.getWorldQuaternion(gold.group.quaternion);
      gold.group.rotateY(turn*flight);
      gold.group.scale.setScalar(pin.scale*(.69+.63*Math.sin(Math.PI*flight)));
    }
    for(const {pieces} of groups.values())for(const {batch} of pieces){batch.instanceMatrix.needsUpdate=true;batch.instanceColor.needsUpdate=true;}
    const effects=cue?[cue]:[];money.draw(effects,positions,now);confetti.draw(effects,positions,now);
    if (typeof animateSet==='function') animateSet(time,floorScale,phase);
    renderer.render(scene,camera);
  }
  frame=requestAnimationFrame(draw);
  return {update,destroy(){
    dead=true;cancelAnimationFrame(frame);scene.remove(visitor.group);visitor.dispose();labels.remove();chat.destroy();money.dispose();confetti.dispose();
    for(const actor of cast.values()){scene.remove(actor.group);actor.dispose?.();}
    for (const {model,pieces} of groups.values()) {for(const {batch} of pieces){scene.remove(batch);batch.dispose();}model.dispose?.();}
    const geometries=new Set(),materials=new Set();
    scene.traverse(o=>{
      if(o.geometry)geometries.add(o.geometry);
      if(o.material)for(const mat of [].concat(o.material))materials.add(mat);
      if(o.isInstancedMesh)o.dispose();
    });
    const textures=new Set([scene.background,scene.environment]);
    geometries.forEach(g=>g.dispose());materials.forEach(m=>{for(const v of Object.values(m))if(v?.isTexture)textures.add(v);m.dispose();});
    textures.forEach(t=>t?.dispose?.());
    sun.shadow.dispose();renderer.dispose();renderer.forceContextLoss();
  }};
}
