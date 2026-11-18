import * as T from '/three.module.js';
import {LAP,LANES,LANE_WIDTH,raceActions,defaultRaceSettings} from './race-rules.js';

const ROAD=LANES*LANE_WIDTH+1.2;
const SAMPLES=1040;
const UP=new T.Vector3(0,1,0);
const lateral=lane=>(lane-(LANES-1)/2)*LANE_WIDTH;
const wrap=d=>((d%LAP)+LAP)%LAP;

// A closed city circuit: long straights, a hairpin and a chicane between blocks.
function buildCurve(){
  const raw=[[-120,-60],[-40,-62],[40,-60],[110,-58],[132,-38],[134,-4],[116,12],[82,12],[62,26],[60,50],[42,66],
    [-20,67],[-80,65],[-122,55],[-137,30],[-138,-32]];
  let curve=new T.CatmullRomCurve3(raw.map(([x,z])=>new T.Vector3(x,0,z)),true,'centripetal');
  const scale=LAP/curve.getLength();
  curve=new T.CatmullRomCurve3(raw.map(([x,z])=>new T.Vector3(x*scale,0,z*scale)),true,'centripetal');
  const points=curve.getSpacedPoints(SAMPLES),tangents=[],rights=[];
  for(let i=0;i<=SAMPLES;i++){
    const t=points[(i+1)%SAMPLES].clone().sub(points[(i+SAMPLES-1)%SAMPLES]).setY(0).normalize();
    tangents.push(t);rights.push(new T.Vector3().crossVectors(t,UP).normalize());
  }
  return {points,tangents,rights};
}

function canvasTexture(w,h,paint,repeat){
  const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
  if(repeat){tex.wrapS=tex.wrapT=T.RepeatWrapping;}
  tex.anisotropy=4;return tex;
}

function seeded(seed){return()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};}

export function createRace(canvas){
  const host=canvas.parentElement;
  const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const scene=new T.Scene();
  scene.background=canvasTexture(16,256,(g,w,h)=>{
    const sky=g.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,'#24305e');sky.addColorStop(.45,'#6a5a8e');sky.addColorStop(.75,'#e98f6f');sky.addColorStop(1,'#f7c08a');
    g.fillStyle=sky;g.fillRect(0,0,w,h);
  });
  scene.fog=new T.Fog(0xc98a7c,120,520);
  scene.add(new T.HemisphereLight(0xbcc8ff,0x5a4a48,1.25));
  const sun=new T.DirectionalLight(0xffd2a4,2.3);
  sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);
  Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:1,far:200});
  sun.shadow.bias=-.0004;sun.shadow.normalBias=.03;
  scene.add(sun,sun.target);
  const ambientFlash=new T.AmbientLight(0xcfe3ff,0);scene.add(ambientFlash);
  const camera=new T.PerspectiveCamera(48,1,.5,900);

  const track=buildCurve();
  function frameAt(d,out={pos:new T.Vector3(),tan:new T.Vector3(),right:new T.Vector3()}){
    const u=wrap(d)/LAP*SAMPLES,i=Math.floor(u)%SAMPLES,f=u-Math.floor(u),j=(i+1)%SAMPLES;
    out.pos.lerpVectors(track.points[i],track.points[j],f);
    out.tan.lerpVectors(track.tangents[i],track.tangents[j],f).normalize();
    out.right.lerpVectors(track.rights[i],track.rights[j],f).normalize();
    return out;
  }
  const disposables=[];
  const keep=x=>{disposables.push(x);return x;};

  // ---- Road, markings, curbs and pavements ------------------------------
  function ribbon(inner,outer,y,color,{every=0,dash=0,uv=false,alt}={}){
    // Keep the winding facing up on both sides of the centre line.
    if(outer<inner)[inner,outer]=[outer,inner];
    const pos=[],col=[],uvs=[],index=[];const c=new T.Color(color),c2=alt?new T.Color(alt):c;
    let n=0;
    for(let i=0;i<SAMPLES;i++){
      const d=i/SAMPLES*LAP;
      if(every && (d%every)>dash)continue;
      const a=track.points[i],b=track.points[(i+1)%SAMPLES],ra=track.rights[i],rb=track.rights[(i+1)%SAMPLES];
      for(const [p,r,v] of [[a,ra,d],[b,rb,d+LAP/SAMPLES]]){
        pos.push(p.x+r.x*inner,y,p.z+r.z*inner,p.x+r.x*outer,y,p.z+r.z*outer);
        const tint=alt&&Math.floor(d/2.2)%2?c2:c;col.push(tint.r,tint.g,tint.b,tint.r,tint.g,tint.b);
        if(uv)uvs.push(0,v/8,1,v/8);
      }
      index.push(n,n+1,n+2,n+1,n+3,n+2);n+=4;
    }
    const g=keep(new T.BufferGeometry());
    g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
    g.setAttribute('color',new T.Float32BufferAttribute(col,3));
    if(uv)g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
    g.setIndex(index);g.computeVertexNormals();
    // Ribbon winding depends on the side; flip normals that face down.
    const normals=g.attributes.normal;for(let i=0;i<normals.count;i++)if(normals.getY(i)<0)normals.setXYZ(i,0,1,0);
    return g;
  }
  const asphaltMap=keep(canvasTexture(256,256,(g,w,h)=>{
    g.fillStyle='#3b3d43';g.fillRect(0,0,w,h);
    const r=seeded(7);for(let i=0;i<5000;i++){const v=50+r()*40;g.fillStyle=`rgb(${v},${v},${v+4})`;g.fillRect(r()*w,r()*h,1.5,1.5);}
    g.fillStyle='#2e3035';for(let i=0;i<12;i++)g.fillRect(r()*w,r()*h,r()*40,2);
  },true));
  const roadMat=keep(new T.MeshStandardMaterial({map:asphaltMap,vertexColors:true,roughness:.92}));
  const road=new T.Mesh(ribbon(-ROAD/2,ROAD/2,.02,0xffffff,{uv:true}),roadMat);road.receiveShadow=true;scene.add(road);
  const paint=keep(new T.MeshStandardMaterial({vertexColors:true,roughness:.6,emissive:0x222222}));
  for(let k=1;k<LANES;k++){
    const x=(k-LANES/2)*LANE_WIDTH;
    scene.add(new T.Mesh(ribbon(x-.08,x+.08,.035,0xf4f1e8,{every:9,dash:3.2}),paint));
  }
  for(const s of [-1,1]){
    const e=s*(ROAD/2-.35);
    scene.add(new T.Mesh(ribbon(e-.09,e+.09,.035,0xf6f3ea),paint));
    const curb=new T.Mesh(ribbon(s*ROAD/2,s*(ROAD/2+.9),.07,0xd8322b,{alt:0xf3f0ea}),paint);curb.receiveShadow=true;scene.add(curb);
    const walk=new T.Mesh(ribbon(s*(ROAD/2+.9),s*(ROAD/2+5.5),.16,0x9d9a97),keep(new T.MeshStandardMaterial({vertexColors:true,roughness:.85})));
    walk.receiveShadow=true;scene.add(walk);
  }
  const ground=new T.Mesh(keep(new T.PlaneGeometry(1400,1400)),keep(new T.MeshStandardMaterial({color:0x4d5058,roughness:1})));
  ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);

  // Start/finish line, gantry and the countdown lights.
  const start=frameAt(0);
  const checker=keep(canvasTexture(64,16,(g,w,h)=>{for(let x=0;x<16;x++)for(let y=0;y<4;y++){g.fillStyle=(x+y)%2?'#111':'#f4f4f4';g.fillRect(x*4,y*4,4,4);}}));
  const line=new T.Mesh(keep(new T.PlaneGeometry(ROAD,1.6)),keep(new T.MeshStandardMaterial({map:checker,roughness:.7})));
  line.rotation.x=-Math.PI/2;line.position.copy(start.pos).setY(.045);line.rotation.z=Math.atan2(start.tan.x,start.tan.z);scene.add(line);
  const gantry=new T.Group();
  const steel=keep(new T.MeshStandardMaterial({color:0x2b2f3a,metalness:.6,roughness:.4}));
  for(const s of [-1,1]){const pillar=new T.Mesh(keep(new T.BoxGeometry(.7,8,.7)),steel);pillar.position.set(s*(ROAD/2+1.5),4,0);pillar.castShadow=true;gantry.add(pillar);}
  const banner=keep(canvasTexture(1024,128,(g,w,h)=>{
    const grad=g.createLinearGradient(0,0,w,0);grad.addColorStop(0,'#ff5a3c');grad.addColorStop(1,'#ffb43c');
    g.fillStyle=grad;g.fillRect(0,0,w,h);g.fillStyle='#fff';g.font='italic 900 86px Arial Black, Impact, sans-serif';
    g.textAlign='center';g.textBaseline='middle';g.fillText('ŞEHİR YARIŞI',w/2,h/2+4);
  }));
  const beam=new T.Mesh(keep(new T.BoxGeometry(ROAD+3.7,1.6,.5)),[steel,steel,steel,steel,...Array(2).fill(keep(new T.MeshStandardMaterial({map:banner,emissive:0xffffff,emissiveMap:banner,emissiveIntensity:.35})))]);
  beam.position.y=7.6;gantry.add(beam);
  const lights=[];
  for(let i=0;i<3;i++){
    const m=new T.MeshStandardMaterial({color:0x330a0a,emissive:0x000000});keep(m);
    const bulb=new T.Mesh(keep(new T.SphereGeometry(.42,16,12)),m);bulb.position.set((i-1)*1.3,6.1,.2);gantry.add(bulb);lights.push(m);
  }
  gantry.position.copy(start.pos);gantry.lookAt(start.pos.clone().add(start.tan));scene.add(gantry);

  // ---- City blocks: towers with lit windows, street lamps and trees -------
  const rand=seeded(20251118);
  const windowMap=keep(canvasTexture(64,128,(g,w,h)=>{
    g.fillStyle='#1b1d26';g.fillRect(0,0,w,h);
    const r=seeded(3);for(let y=0;y<16;y++)for(let x=0;x<8;x++){
      const lit=r();g.fillStyle=lit>.55?`hsl(${38+r()*12},90%,${62+r()*20}%)`:lit>.35?'#3b4560':'#262a36';g.fillRect(x*8+2,y*8+2,5,5);
    }
  },true));
  windowMap.repeat.set(2,3);
  const wallMat=keep(new T.MeshStandardMaterial({map:windowMap,emissiveMap:windowMap,emissive:0xffffff,emissiveIntensity:.55,roughness:.7}));
  const roofMat=keep(new T.MeshStandardMaterial({color:0x50535d,roughness:.9}));
  const spots=[];
  const coarse=track.points.filter((_,i)=>i%8===0);
  const near=(x,z,limit)=>coarse.some(p=>(p.x-x)**2+(p.z-z)**2<limit*limit);
  for(let x=-330;x<=330;x+=17)for(let z=-260;z<=260;z+=17){
    const px=x+(rand()-.5)*5,pz=z+(rand()-.5)*5,w=9+rand()*6,d=9+rand()*6;
    if(near(px,pz,ROAD/2+6+Math.max(w,d)*.72))continue;
    const far=Math.min(1,Math.hypot(px,pz)/260);
    spots.push([px,pz,w,d,10+rand()*(20+45*far)]);
  }
  const towers=new T.InstancedMesh(keep(new T.BoxGeometry(1,1,1)),[wallMat,wallMat,roofMat,roofMat,wallMat,wallMat],spots.length);
  const palette=[0xb9b3c8,0xd4c3a8,0x9fb0c4,0xc9a8a0,0xa9b7a7,0xe0d6cf,0x8f97ab];
  const m4=new T.Matrix4(),q=new T.Quaternion(),v=new T.Vector3(),s3=new T.Vector3(),color=new T.Color();
  spots.forEach(([x,z,w,d,h],i)=>{
    m4.compose(v.set(x,h/2,z),q.setFromAxisAngle(UP,(rand()-.5)*.08),s3.set(w,h,d));towers.setMatrixAt(i,m4);
    towers.setColorAt(i,color.setHex(palette[i%palette.length]));
  });
  towers.receiveShadow=true;scene.add(towers);
  const lampPoints=[],treePoints=[];
  for(let d=0;d<LAP;d+=26){
    const f=frameAt(d);
    for(const s of [-1,1]){
      const at=f.pos.clone().addScaledVector(f.right,s*(ROAD/2+3.8));
      if(Math.abs(d)<10 || Math.abs(d-LAP)<10)continue;
      lampPoints.push([at,f.right.clone().multiplyScalar(-s)]);
      const tree=frameAt(d+13);treePoints.push(tree.pos.clone().addScaledVector(tree.right,s*(ROAD/2+3.2)));
    }
  }
  const pole=new T.InstancedMesh(keep(new T.CylinderGeometry(.12,.16,7,8)),steel,lampPoints.length);
  const lampHead=new T.InstancedMesh(keep(new T.BoxGeometry(.5,.25,1.6)),keep(new T.MeshStandardMaterial({color:0xfff2c6,emissive:0xffd98a,emissiveIntensity:1.6})),lampPoints.length);
  lampPoints.forEach(([p,inward],i)=>{
    m4.makeTranslation(p.x,3.5+.16,p.z);pole.setMatrixAt(i,m4);
    const head=p.clone().addScaledVector(inward,.8);
    m4.compose(v.set(head.x,7.1,head.z),q.setFromUnitVectors(new T.Vector3(0,0,1),inward),s3.set(1,1,1));lampHead.setMatrixAt(i,m4);
  });
  scene.add(pole,lampHead);
  const trunk=new T.InstancedMesh(keep(new T.CylinderGeometry(.18,.24,2.4,7)),keep(new T.MeshStandardMaterial({color:0x5a3f2c})),treePoints.length);
  const crown=new T.InstancedMesh(keep(new T.IcosahedronGeometry(1.6,1)),keep(new T.MeshStandardMaterial({color:0x3f7a43,roughness:.9,flatShading:true})),treePoints.length);
  treePoints.forEach((p,i)=>{
    m4.makeTranslation(p.x,1.36,p.z);trunk.setMatrixAt(i,m4);
    m4.compose(v.set(p.x,3.4,p.z),q.identity(),s3.setScalar(.8+rand()*.5));crown.setMatrixAt(i,m4);
  });
  crown.castShadow=true;scene.add(trunk,crown);

  // ---- Cars -------------------------------------------------------------
  const shared={
    glass:keep(new T.MeshStandardMaterial({color:0x1d2b3d,metalness:.4,roughness:.15})),
    dark:keep(new T.MeshStandardMaterial({color:0x17181c,roughness:.6})),
    rim:keep(new T.MeshStandardMaterial({color:0xc9ccd4,metalness:.8,roughness:.3})),
    head:keep(new T.MeshStandardMaterial({color:0xffffff,emissive:0xfff3d0,emissiveIntensity:2})),
    tail:keep(new T.MeshStandardMaterial({color:0xff2b2b,emissive:0xff1a1a,emissiveIntensity:1.6})),
    flame:keep(new T.MeshBasicMaterial({color:0xff8a2a,transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false})),
    nitro:keep(new T.MeshBasicMaterial({color:0x58b4ff,transparent:true,opacity:.95,blending:T.AdditiveBlending,depthWrite:false})),
    shield:keep(new T.MeshBasicMaterial({color:0x6fe3ff,transparent:true,opacity:.22,blending:T.AdditiveBlending,depthWrite:false}))
  };
  const geo={
    body:keep(new T.BoxGeometry(2,.55,4.3)),cabin:keep(new T.BoxGeometry(1.72,.5,2.05)),roof:keep(new T.BoxGeometry(1.6,.09,1.7)),
    bumper:keep(new T.BoxGeometry(2.04,.22,.25)),wheel:keep(new T.CylinderGeometry(.4,.4,.34,16)),hub:keep(new T.CylinderGeometry(.22,.22,.36,10)),
    lamp:keep(new T.BoxGeometry(.42,.16,.06)),spoiler:keep(new T.BoxGeometry(2,.08,.45)),strut:keep(new T.BoxGeometry(.1,.35,.1)),
    flame:keep(new T.ConeGeometry(.2,1.2,10)),shield:keep(new T.SphereGeometry(3,24,16)),stripe:keep(new T.BoxGeometry(.34,.02,4.32))
  };
  function makeCar(hex,variant){
    const g=new T.Group(),body=new T.Group();g.add(body);
    const paintMat=keep(new T.MeshStandardMaterial({color:hex,metalness:.35,roughness:.35}));
    const add=(geometry,mat,x,y,z,parent=body)=>{const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};
    add(geo.body,paintMat,0,.62,0);
    add(geo.cabin,shared.glass,0,1.13,-.3);
    add(geo.roof,paintMat,0,1.42,-.3);
    add(geo.bumper,shared.dark,0,.42,2.18);add(geo.bumper,shared.dark,0,.42,-2.18);
    if(variant%3!==1)add(geo.stripe,variant%2?shared.dark:keep(new T.MeshStandardMaterial({color:0xffffff})),0,.905,0);
    for(const s of [-1,1]){
      add(geo.lamp,shared.head,s*.62,.7,2.16);add(geo.lamp,shared.tail,s*.62,.72,-2.16);
    }
    if(variant%2===0){add(geo.spoiler,paintMat,0,1.32,-2);for(const s of [-1,1])add(geo.strut,shared.dark,s*.7,1.12,-2);}
    const wheels=[];
    for(const [x,z] of [[-1,1.35],[1,1.35],[-1,-1.35],[1,-1.35]]){
      const w=new T.Group();w.position.set(x*1.02,.4,z);
      const tyre=new T.Mesh(geo.wheel,shared.dark);tyre.rotation.z=Math.PI/2;tyre.castShadow=true;
      const hub=new T.Mesh(geo.hub,shared.rim);hub.rotation.z=Math.PI/2;
      w.add(tyre,hub);body.add(w);wheels.push(w);
    }
    const flames=[-1,1].map(s=>{const f=new T.Mesh(geo.flame,shared.flame);f.rotation.x=-Math.PI/2;f.position.set(s*.5,.45,-2.85);f.visible=false;body.add(f);return f;});
    const shield=new T.Mesh(geo.shield,shared.shield);shield.position.y=1;shield.visible=false;g.add(shield);
    return {group:g,body,wheels,flames,shield};
  }

  // ---- HUD (DOM) ----------------------------------------------------------
  const hud=document.createElement('div');hud.className='race-hud';
  hud.innerHTML='<div class="race-board"><header></header><ol></ol></div><div class="race-count" hidden></div><ul class="race-feed"></ul><div class="race-shot" hidden></div><div class="race-guide" hidden></div><div class="race-win" hidden></div><div class="race-speedlines"></div><div class="race-tags"></div>';
  host.insertBefore(hud,canvas.nextSibling);
  const $=s=>hud.querySelector(s);
  const tags=$('.race-tags');
  function makeTag(person){
    const tag=document.createElement('span');tag.className='racer-tag';
    const pos=document.createElement('b'),portrait=document.createElement('span'),name=document.createElement('span');
    portrait.className='racer-avatar';name.className='racer-name';
    tag.append(pos,portrait,name);tags.append(tag);
    tag.set=p=>{
      name.textContent=p.name;tag.style.setProperty('--car',p.color||'#fff');
      if(p.avatar!==tag.avatar){
        tag.avatar=p.avatar;portrait.replaceChildren();
        if(p.avatar){const img=document.createElement('img');img.alt='';img.referrerPolicy='no-referrer';img.src=p.avatar;img.onerror=()=>{img.remove();portrait.textContent=(p.name||'?').slice(0,1);};portrait.append(img);}
        else portrait.textContent=(p.name||'?').slice(0,1).toLocaleUpperCase('tr');
      }
    };
    tag.place=n=>{pos.textContent=n;};
    tag.set(person);return tag;
  }

  // ---- State, interpolation and effects -----------------------------------
  let state={players:[],race:null,raceSettings:defaultRaceSettings},skew=0,dead=false,frame=0,last=performance.now();
  const cars=new Map(),hazards=new Map(),rockets=new Map(),seenFlashes=new Set(),bursts=[],bolts=[];
  const demo=Array.from({length:6},(_,i)=>({id:'demo'+i,name:'',color:['#ef4b3f','#2f8ff0','#f6c443','#33c27b','#a565f0','#ff8a2a'][i],
    dist:-Math.floor(i/2)*9,speed:15,lane:i%LANES,demo:true}));
  const serverNow=()=>Date.now()-skew;
  function carFor(p,index){
    let car=cars.get(p.id);
    if(!car){
      car={...makeCar(new T.Color(p.color||'#ffffff'),index),vis:p.dist,lane:p.lane,yaw:0,hitAt:0,tag:p.demo?null:makeTag(p)};
      scene.add(car.group);cars.set(p.id,car);
    }
    return car;
  }
  function dropCar(id){
    const car=cars.get(id);if(!car)return;
    scene.remove(car.group);car.tag?.remove();cars.delete(id);
  }
  function burst(at,colorHex,size=4,life=.8){
    const m=new T.Mesh(keep(new T.SphereGeometry(1,16,12)),new T.MeshBasicMaterial({color:colorHex,transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false}));
    m.position.copy(at);scene.add(m);bursts.push({m,age:0,life,size});
  }
  function hazardMesh(h){
    const g=new T.Group(),f=frameAt(h.pos);
    g.position.copy(f.pos);g.lookAt(f.pos.clone().add(f.tan));
    const mat=type=>({
      oil:new T.MeshStandardMaterial({color:0x07080b,metalness:.6,roughness:.05}),
      cone:new T.MeshStandardMaterial({color:0xff6a1a,roughness:.5}),
      stripe:new T.MeshStandardMaterial({color:0xffffff}),
      block:new T.MeshStandardMaterial({color:0xd2cfc8,roughness:.9}),
      red:new T.MeshStandardMaterial({color:0xd42d2d}),
      spike:new T.MeshStandardMaterial({color:0x9aa2ad,metalness:.8,roughness:.3})
    })[type];
    const mats={};const use=k=>mats[k]??=mat(k);
    for(const lane of h.lanes){
      const x=-lateral(lane);
      if(h.type==='oil'){
        const puddle=new T.Mesh(new T.CircleGeometry(1.5,24),use('oil'));puddle.rotation.x=-Math.PI/2;puddle.position.set(x,.05,0);puddle.scale.set(1.1,.8,1);g.add(puddle);
      } else if(h.type==='spikes'){
        const strip=new T.Mesh(new T.BoxGeometry(LANE_WIDTH*.95,.06,.5),use('block'));strip.position.set(x,.06,0);g.add(strip);
        for(let i=0;i<7;i++){const c=new T.Mesh(new T.ConeGeometry(.08,.28,6),use('spike'));c.position.set(x+(i-3)*.42,.2,0);g.add(c);}
      } else if(h.type==='cones'){
        for(let i=0;i<3;i++){
          const c=new T.Mesh(new T.ConeGeometry(.32,.9,12),use('cone'));c.position.set(x+(i-1)*1,.48,(i%2)*.8);c.castShadow=true;
          const band=new T.Mesh(new T.CylinderGeometry(.2,.23,.12,12),use('stripe'));band.position.y=.05;c.add(band);g.add(c);
        }
      } else {
        const block=new T.Mesh(new T.BoxGeometry(LANE_WIDTH*.92,1.05,.8),use('block'));block.position.set(x,.55,0);block.castShadow=true;g.add(block);
        for(let i=0;i<3;i++){const s=new T.Mesh(new T.BoxGeometry(.42,.6,.02),use('red'));s.position.set(x+(i-1)*.95,.65,.41);g.add(s);}
      }
    }
    g.scale.setScalar(.01);g.userData.born=performance.now();
    scene.add(g);return g;
  }
  function makeRocket(){
    const g=new T.Group();
    const body=new T.Mesh(keep(new T.CylinderGeometry(.16,.16,1.2,10)),keep(new T.MeshStandardMaterial({color:0xe8e8ec,metalness:.4})));body.rotation.x=Math.PI/2;
    const nose=new T.Mesh(keep(new T.ConeGeometry(.16,.4,10)),keep(new T.MeshStandardMaterial({color:0xd8302c})));nose.rotation.x=Math.PI/2;nose.position.z=.8;
    const trail=new T.Mesh(geo.flame,shared.flame);trail.rotation.x=-Math.PI/2;trail.position.z=-1.1;
    g.add(body,nose,trail);scene.add(g);return g;
  }
  function bolt(from,to){
    const pts=[];const steps=12;
    for(let i=0;i<=steps;i++){const p=from.clone().lerp(to,i/steps);if(i&&i<steps){p.x+=(Math.random()-.5)*3;p.z+=(Math.random()-.5)*3;}pts.push(p);}
    const line=new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:0xdff3ff,transparent:true}));
    scene.add(line);bolts.push({line,age:0});
  }

  function renderBoard(){
    const race=state.race,settings=state.raceSettings||defaultRaceSettings;
    const order=[...state.players].sort((a,b)=>(a.finishedAt||Infinity)-(b.finishedAt||Infinity)||b.dist-a.dist);
    const header=$('.race-board header');
    const lap=order[0]?Math.min(race?.laps||3,Math.floor(Math.max(0,order[0].dist)/LAP)+1):0;
    header.textContent=race?.mode==='endless'?'ŞEHİR YARIŞI · SINIRSIZ':'ŞEHİR YARIŞI · TUR '+(lap||1)+'/'+(race?.laps||settings.laps);
    const list=$('.race-board ol');list.replaceChildren();
    order.slice(0,8).forEach((p,i)=>{
      const li=document.createElement('li');li.style.setProperty('--car',p.color);
      const name=document.createElement('span');name.textContent=p.name;
      const info=document.createElement('small');
      info.textContent=p.finishedAt?'🏁':race?.mode==='endless'?(Math.max(0,p.dist)/1000).toFixed(1)+' km':Math.round(p.speed*3.6)+' km/sa';
      li.append(Object.assign(document.createElement('b'),{textContent:i+1}),name,info);list.append(li);
      cars.get(p.id)?.tag?.place(i+1);
    });
    if(order.length>8){const more=document.createElement('li');more.className='more';more.textContent='+'+(order.length-8)+' yarışçı';list.append(more);}
    if(state.queueSize||state.queue?.length){const q=document.createElement('li');q.className='more';q.textContent=(state.queueSize??state.queue.length)+' kişi sırada';list.append(q);}
    $('.race-board').hidden=!order.length;
    const feed=$('.race-feed');feed.replaceChildren();
    for(const e of (race?.events||[]).slice(-5)){
      const li=document.createElement('li');li.className='kind-'+e.kind;
      const action=raceActions.find(a=>a.key===e.kind);
      li.textContent=(action?action.icon+' ':e.kind==='hit'?'💥 ':e.kind==='win'?'🏆 ':e.kind==='join'?'🏎️ ':e.kind==='shield'?'🛡️ ':'')+e.text;
      feed.append(li);
    }
    const guide=$('.race-guide');
    const lines=[];
    const join=[settings.joinChat?'<b>katıl</b> yaz':'',settings.joinGift?(settings.joinGiftId==='5655'?'🌹':'🎁')+' <b></b> gönder':''].filter(Boolean).join(' veya ');
    guide.replaceChildren();
    const head=document.createElement('p');head.innerHTML='Katılmak için '+join;
    if(settings.joinGift)head.querySelector('b:last-of-type').textContent=settings.joinGiftName;
    guide.append(head);
    if(settings.showGuide){
      for(const a of raceActions){const g=settings.assignments?.[a.key];if(!g)continue;
        const row=document.createElement('p');row.textContent=a.icon+' '+g.name+' → '+a.action;lines.push(row);}
      guide.append(...lines.slice(0,8));
      const tip=document.createElement('p');tip.className='tip';tip.textContent='❤️ Beğeni ve 💬 yorum arabayı hızlandırır';guide.append(tip);
    }
    guide.hidden=false;
  }

  function update(next){
    if(next.race)skew=Date.now()-next.race.at;
    state={...state,...next};
    const live=new Set(state.players.map(p=>p.id));
    for(const id of [...cars.keys()])if(!live.has(id) && !(id.startsWith('demo') && !state.players.length))dropCar(id);
    state.players.forEach((p,i)=>{
      const car=carFor(p,i);car.tag?.set(p);
      if(p.hit && p.hit.at!==car.hitAt){
        car.hitAt=p.hit.at;car.hitType=p.hit.type;
        const at=car.group.position.clone().setY(1.2);
        if(p.hit.type==='rocket'||p.hit.type==='barrier')burst(at,0xff7a2a,2.4,.6);
        else if(p.hit.type==='cones'||p.hit.type==='spikes')burst(at,0xffd36b,1.1,.4);
      }
    });
    const race=state.race;
    const ids=new Set((race?.hazards||[]).map(h=>h.id));
    for(const [id,m] of hazards)if(!ids.has(id)){scene.remove(m);m.traverse(o=>o.geometry?.dispose());hazards.delete(id);}
    for(const h of race?.hazards||[])if(!hazards.has(h.id))hazards.set(h.id,hazardMesh(h));
    const rocketIds=new Set((race?.rockets||[]).map(r=>r.id));
    for(const [id,m] of rockets)if(!rocketIds.has(id)){scene.remove(m);rockets.delete(id);}
    for(const r of race?.rockets||[])if(!rockets.has(r.id))rockets.set(r.id,makeRocket());
    for(const f of race?.flashes||[])if(!seenFlashes.has(f.id)){
      seenFlashes.add(f.id);ambientFlash.intensity=3;
      for(const id of f.targets){const car=cars.get(id);if(car)bolt(car.group.position.clone().add(new T.Vector3(0,45,0)),car.group.position.clone().setY(1));}
    }
    renderBoard();
  }

  const camPos=new T.Vector3(0,80,0),camLook=new T.Vector3(),goalPos=new T.Vector3(),goalLook=new T.Vector3(),f1=frameAt(0);
  let shake=0;
  function draw(nowMs){
    if(dead)return;
    frame=requestAnimationFrame(draw);
    const dt=Math.min(.1,(nowMs-last)/1000);last=nowMs;
    const w=host.clientWidth,h=host.clientHeight;
    if(w && h && (canvas.width!==Math.floor(w*renderer.getPixelRatio()) || canvas.height!==Math.floor(h*renderer.getPixelRatio()))){
      renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    }
    const race=state.race,now=serverNow(),settings=state.raceSettings||defaultRaceSettings;
    const players=state.players.length?state.players:demo;
    if(!state.players.length)demo.forEach((p,i)=>{p.dist+=p.speed*dt;carFor(p,i);if(Math.random()<dt*.15)p.lane=Math.floor(Math.random()*LANES);});
    const ahead=(race?.phase==='countdown'||race?.phase==='waiting')?0:(now-(race?.at||now))/1000;
    for(const p of players){
      const car=cars.get(p.id);if(!car)continue;
      const target=p.demo?p.dist:p.dist+p.speed*Math.max(0,Math.min(.6,ahead));
      if(Math.abs(target-car.vis)>40)car.vis=target;else car.vis+=(target-car.vis)*Math.min(1,dt*6);
      car.lane+=(p.lane-car.lane)*Math.min(1,dt*3);
      const f=frameAt(car.vis);
      car.group.position.copy(f.pos).addScaledVector(f.right,lateral(car.lane)).setY(0);
      let yaw=Math.atan2(f.tan.x,f.tan.z);
      const hit=p.hit&&p.hit.until>now?p.hit:null;
      car.body.position.y=0;car.body.rotation.set(0,0,0);
      if(hit){
        const k=(now-hit.at)/(hit.until-hit.at);
        if(hit.type==='oil'||hit.type==='rocket')yaw+=Math.sin(Math.min(1,k)*Math.PI)*Math.PI*2*(1-k*.5);
        if(hit.type==='rocket'||hit.type==='barrier'){car.body.position.y=Math.sin(Math.min(1,k*2)*Math.PI)*1.4;car.body.rotation.z=Math.sin(k*Math.PI*3)*.3;}
        if(hit.type==='spikes'||hit.type==='lightning')car.body.rotation.z=Math.sin(nowMs/60)*.06;
      }
      car.group.rotation.set(0,yaw,0);
      for(const wheel of car.wheels)wheel.rotation.x+=(p.speed||15)*dt/.4;
      const boosts=p.boosts||{};
      const nitro=boosts.nitro?.until>now,fire=nitro||boosts.turbo?.until>now||boosts.gas?.until>now;
      car.flames.forEach((fl,i)=>{fl.visible=fire;fl.material=nitro?shared.nitro:shared.flame;
        fl.scale.set(1,(nitro?1.9:boosts.turbo?.until>now?1.4:.8)*(.75+.35*Math.sin(nowMs/35+i*2)),1);});
      car.shield.visible=p.shieldUntil>now;
      if(car.shield.visible)car.shield.rotation.y+=dt;
    }
    // Hazards grow in; rockets fly in an arc from the sender to the target.
    for(const m of hazards.values()){const age=(nowMs-m.userData.born)/350;m.scale.setScalar(Math.min(1,.01+age));}
    for(const r of race?.rockets||[]){
      const m=rockets.get(r.id),from=cars.get(r.from),to=cars.get(r.to);if(!m||!from||!to)continue;
      const k=(now-r.at)/(r.hitAt-r.at);m.visible=k>=0;if(k<0)continue;
      const a=from.group.position,b=to.group.position,kk=Math.min(1,k);
      const p=a.clone().lerp(b,kk);p.y=1.5+Math.sin(kk*Math.PI)*6;
      const n=a.clone().lerp(b,Math.min(1,kk+.03));n.y=1.5+Math.sin(Math.min(1,kk+.03)*Math.PI)*6;
      m.position.copy(p);m.lookAt(n);
    }
    for(let i=bursts.length-1;i>=0;i--){const b=bursts[i];b.age+=dt;const k=b.age/b.life;
      b.m.scale.setScalar(.3+b.size*Math.sqrt(k));b.m.material.opacity=.75*(1-k)*(1-k);if(k>=1){scene.remove(b.m);b.m.material.dispose();bursts.splice(i,1);}}
    for(let i=bolts.length-1;i>=0;i--){const b=bolts[i];b.age+=dt;b.line.material.opacity=1-b.age/.5;if(b.age>.5){scene.remove(b.line);b.line.geometry.dispose();b.line.material.dispose();bolts.splice(i,1);}}
    ambientFlash.intensity*=Math.pow(.02,dt);

    // Countdown lights and banner.
    const count=$('.race-count');
    if(race?.phase==='countdown'){
      const left=Math.ceil((race.goAt-now)/1000);
      lights.forEach((m,i)=>m.emissive.setHex(i<4-left&&left<=3?0xff2020:0x000000));
      count.hidden=left>3;count.textContent=left;
    } else if(race?.phase==='racing' && now-race.goAt<1500){
      lights.forEach(m=>m.emissive.setHex(0x20ff60));count.hidden=false;count.textContent='BAŞLA!';
    } else {lights.forEach(m=>m.emissive.setHex(0x000000));count.hidden=true;}
    const win=$('.race-win');win.hidden=!state.winner;if(state.winner)win.textContent='🏆 '+state.winner+' kazandı!';

    // ---- Camera ----
    const order=[...players].sort((a,b)=>(a.finishedAt||Infinity)-(b.finishedAt||Infinity)||b.dist-a.dist);
    const carOf=p=>p&&cars.get(p.id);
    const leader=carOf(order[0]);
    const shot=race?.shot&&race.shot.end>now?cars.get(race.shot.playerId):null;
    const shotBanner=$('.race-shot');shotBanner.hidden=!shot;if(shot)shotBanner.textContent='🎥 '+race.shot.name+' yakın çekimde';
    let smooth=2.2;
    if(shot){
      const f=frameAt(shot.vis);
      goalLook.copy(shot.group.position).setY(.9);
      // Front three-quarter view, raised so neighbouring cars cannot block it.
      const side=lateral(shot.lane)>0?-1:1;
      goalPos.copy(shot.group.position).addScaledVector(f.tan,8.5).addScaledVector(f.right,side*5.5).setY(4.2);
      smooth=4;
    } else if(state.winner && race?.phase==='finished'){
      const winner=cars.get(order[0]?.id)||leader;const a=nowMs/2500;
      if(winner)goalLook.copy(winner.group.position).setY(1);goalPos.copy(goalLook).add(v.set(Math.cos(a)*13,5,Math.sin(a)*13));
    } else if(settings.camera==='aerial'){
      goalLook.set(0,0,0);goalPos.set(0,330,120);smooth=1;
    } else if(race?.phase==='countdown'){
      // Behind the starting grid, high enough to see every car and the lights.
      const back=frameAt(-34),ahead=frameAt(6);goalLook.copy(ahead.pos);goalPos.copy(back.pos).setY(16);
    } else {
      let focus=leader;
      if(settings.camera==='gifter'){
        const top=[...players].filter(p=>!p.demo).sort((a,b)=>(b.coins||0)-(a.coins||0))[0];
        if(top?.coins)focus=cars.get(top.id);
      }
      if(focus){
        const f=frameAt(focus.vis,f1);
        const [back,up,lead]=settings.camera==='high'?[30,26,14]:settings.camera==='gifter'?[16,9.5,8]:[11,4.6,7];
        goalLook.copy(focus.group.position).addScaledVector(f.tan,lead).setY(1);
        goalPos.copy(focus.group.position).addScaledVector(f.tan,-back).setY(up);
        const p=order.find(o=>cars.get(o.id)===focus);
        if(p?.boosts?.nitro?.until>now)shake=.35;
      }
    }
    hud.classList.toggle('nitro',shake>.05);
    const k=1-Math.exp(-dt*smooth);
    camPos.lerp(goalPos,k);camLook.lerp(goalLook,Math.min(1,k*1.6));
    camera.position.copy(camPos);
    if(shake>.01){camera.position.x+=(Math.random()-.5)*shake;camera.position.y+=(Math.random()-.5)*shake;shake*=Math.pow(.05,dt);}
    camera.lookAt(camLook);
    sun.target.position.copy(camLook);sun.position.copy(camLook).add(v.set(-40,70,30));

    // Name tags follow their cars on screen.
    for(const p of players){
      const car=cars.get(p.id);if(!car?.tag)continue;
      const at=car.group.position.clone().setY(2.6).project(camera);
      const visible=at.z<1 && Math.abs(at.x)<1.1 && Math.abs(at.y)<1.1;
      car.tag.style.visibility=visible?'visible':'hidden';
      if(visible)car.tag.style.transform=`translate(${(at.x*.5+.5)*w}px,${(-at.y*.5+.5)*h}px) translate(-50%,-100%)`;
      car.tag.classList.toggle('featured',car===shot);
    }
    renderer.render(scene,camera);
  }
  frame=requestAnimationFrame(draw);
  renderBoard();

  return {update,destroy(){
    dead=true;cancelAnimationFrame(frame);hud.remove();
    const geometries=new Set(),materials=new Set();
    scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of [].concat(o.material))materials.add(m);if(o.isInstancedMesh)o.dispose();});
    geometries.forEach(g=>g.dispose());
    materials.forEach(m=>{for(const val of Object.values(m))if(val?.isTexture)val.dispose();m.dispose();});
    for(const d of disposables)d.dispose?.();
    scene.background?.dispose?.();sun.shadow.dispose();renderer.dispose();renderer.forceContextLoss();
  }};
}
