import * as T from '/three.module.js';
import {makeDancer} from './dancers.js';

const tau=Math.PI*2;
const loader=new T.TextureLoader();
function texture(name,repeat=false,linear=false){
  const map=loader.load('/garden/'+name);
  if(!linear)map.colorSpace=T.SRGBColorSpace;
  if(repeat)map.wrapS=map.wrapT=T.RepeatWrapping;
  map.anisotropy=4;
  return map;
}

function instance(parent,geometry,material,transforms){
  const mesh=new T.InstancedMesh(geometry,material,transforms.length);
  transforms.forEach((m,i)=>mesh.setMatrixAt(i,m));
  mesh.castShadow=true;
  mesh.receiveShadow=true;
  parent.add(mesh);
  return mesh;
}

function matrix(x,y,z,sx=1,sy=1,sz=1,yaw=0){
  return new T.Matrix4().makeRotationY(yaw).scale(new T.Vector3(sx,sy,sz)).setPosition(x,y,z);
}

function addTrees(parent){
  const leaves=texture('leaves.webp',true);
  const bark=texture('bark.webp',true);
  const materials=[
    new T.MeshStandardMaterial({map:bark,roughness:.95,side:T.DoubleSide}),
    new T.MeshStandardMaterial({map:leaves,alphaTest:.42,side:T.DoubleSide,roughness:.88})
  ];
  const placements=[];
  for(let i=0;i<20;i++){
    const angle=(i+.36)*tau/20, radial=14.6+2.3*Math.cos(i*5.3);
    const h=.37+.115*Math.sin(i*2.17);
    placements.push(matrix(Math.sin(angle)*radial,-.25,Math.cos(angle)*radial,h,h,h,i*2.31));
  }
  // A second row masks the join between the lawn and the distant panorama.
  for(let i=0;i<22;i++){
    const a=i*tau/22, scale=.42+.13*Math.cos(i*2.63);
    placements.push(matrix(24*Math.sin(a),-.28,25*Math.cos(a),scale,scale*1.13,scale,i*1.7));
  }
  const geometry=new T.BufferGeometry();
  const trees=instance(parent,geometry,materials,placements);
  trees.visible=false;
  let disposed=false;geometry.addEventListener('dispose',()=>{disposed=true;});
  fetch('/garden/broadleaf.bin').then(r=>{if(!r.ok)throw Error(r.status);return r.arrayBuffer();}).then(data=>{
    if(disposed)return;
    const [vertices,trunk,foliage]=new Uint32Array(data,0,3);
    let offset=12;
    for(const [name,size] of [['position',3],['normal',3],['uv',2]]){
      geometry.setAttribute(name,new T.BufferAttribute(new Float32Array(data,offset,vertices*size),size));
      offset+=vertices*size*4;
    }
    const indices=new Uint16Array(data,offset,trunk+foliage);
    // The asset's original left-handed winding is opposite to its vertex normals.
    for(let i=0;i<indices.length;i+=3){const a=indices[i];indices[i]=indices[i+2];indices[i+2]=a;}
    geometry.setIndex(new T.BufferAttribute(indices,1));
    geometry.addGroup(0,trunk,0);geometry.addGroup(trunk,foliage,1);
    geometry.computeBoundingSphere();trees.computeBoundingSphere();trees.visible=true;
  }).catch(err=>console.warn('Bahçe ağaç modeli yüklenemedi',err));
}

function addRocks(parent,random,terraceScale){
  const mat=new T.MeshStandardMaterial({map:texture('limestone.webp',true),normalMap:texture('limestone-normal.webp',true,true),roughness:.93});
  mat.normalScale.set(.60,.60);
  for(let variant=0;variant<3;variant++){
    const geometry=new T.SphereGeometry(1,30,18);
    const p=geometry.attributes.position;
    for(let k=0;k<p.count;k++){
      const x=p.getX(k),y=p.getY(k),z=p.getZ(k);
      const d=1+.15*Math.sin(4*x+3*y+variant)*Math.cos(2*z-3*y)+.055*Math.sin(7*z+3*x);
      p.setXYZ(k,d*x+.17*y,d*y,d*z);
    }
    geometry.computeVertexNormals();
    const transforms=[];
    for(let i=0;i<15;i++){
      const a=tau*(i+random()*.91)/15,r=9.1*terraceScale+random()*2.5,size=.17+random()*.53;
      transforms.push(matrix(Math.sin(a)*r,-.26+size*.13,Math.cos(a)*r,size*1.32,size*.71,size,random()*tau));
    }
    instance(parent,geometry,mat,transforms);
  }
}

// Merge each seated costume once. Weld subpixel details so a bank of spectators
// doesn't incur a draw call for every button, finger or eyelash.
function spectatorGeometry(style){
  const rig=makeDancer(style,'guest');rig.seat();
  const xyz=[],color=[],indices=[],lookup=new Map(),v=new T.Vector3();
  rig.group.traverseVisible(part=>{
    if(!part.isMesh)return;
    const {position:p,color:c}=part.geometry.attributes;
    const src=part.geometry.index;
    const total=src?src.count:p.count;
    for(let i=0;i<total;i+=3){
      const tri=[];
      for(let j=i;j<i+3;j++){
        const k=src?src.getX(j):j;
        v.fromBufferAttribute(p,k).applyMatrix4(part.matrixWorld);
        const rgb=[c.getX(k),c.getY(k),c.getZ(k)];
        const key=[v.x,v.y,v.z].map(x=>Math.round(x*32)).concat(rgb.map(x=>Math.round(x*27))).join(',');
        let id=lookup.get(key);
        if(id===undefined){id=xyz.length/3;lookup.set(key,id);xyz.push(v.x,v.y,v.z);color.push(...rgb);}
        tri.push(id);
      }
      if(tri[0]!==tri[1] && tri[1]!==tri[2] && tri[2]!==tri[0])indices.push(...tri);
    }
  });
  rig.dispose();
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(xyz,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(color,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

function seating(parent,clock,terraceScale){
  const white=new T.MeshStandardMaterial({color:0xfff9e9,roughness:.4}),cushion=new T.MeshStandardMaterial({color:0xf5e6de,roughness:.92});
  const rose=new T.MeshStandardMaterial({color:0xbd7480,roughness:.52});
  const chair=[],costumes=Array.from({length:5},()=>[]);
  // Leave an aisle between each group, including the entrance below the arch.
  for(let bay=0;bay<8;bay++)for(let n=0;n<4;n++){
    const a=(bay+.5)*tau/8+(n-1.5)*.128,r=7.85*terraceScale;
    const x=r*Math.sin(a),z=r*Math.cos(a),yaw=a+Math.PI;
    const chairWorld=matrix(x,-.055,z,.91,.91,.91,yaw);
    chair.push(chairWorld);
    if((bay*4+n)%7!==3)costumes[(bay*3+n)%5].push(chairWorld.clone().multiply(new T.Matrix4().makeRotationY(.06*Math.sin(bay+n))));
  }
  function part(geometry,material,local){
    instance(parent,geometry,material,chair.map(m=>m.clone().multiply(local)));
  }
  function rail(a,b,r){
    const start=new T.Vector3(...a),end=new T.Vector3(...b),axis=end.clone().sub(start);
    const m=new T.Matrix4().compose(start.addScaledVector(axis,.5),
      new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),axis.clone().normalize()),new T.Vector3(1,1,1));
    part(new T.CylinderGeometry(r*.91,r,axis.length(),10),white,m);
  }
  part(new T.SphereGeometry(1,22,12),cushion,matrix(0,.54,-.015,.425,.082,.37));
  for(const x of [-.34,.34]){
    rail([x*1.13,0,.29],[x,.52,.23],.042);rail([x*1.12,0,-.33],[x,1.45,-.36],.043);
    rail([x,.27,.24],[x,.28,-.3],.026);
  }
  for(const x of [-.21,-.105,0,.105,.21])rail([x*.86,.59,-.29],[x,1.43,-.36],.025);
  const arched=new T.CatmullRomCurve3([[-.35,1.32,-.36],[-.31,1.49,-.36],[0,1.56,-.37],[.31,1.49,-.36],[.35,1.32,-.36]].map(p=>new T.Vector3(...p)));
  part(new T.TubeGeometry(arched,24,.048,8,false),white,new T.Matrix4());
  rail([-.34,.94,-.34],[.34,.94,-.34],.044);
  part(new T.SphereGeometry(1,16,8),rose,matrix(0,1.01,-.36,.37,.056,.053));
  const fabric=new T.MeshStandardMaterial({vertexColors:true,roughness:.78,side:T.DoubleSide});
  // Sway above the hip: the seated silhouette moves while legs and chair stay planted.
  fabric.onBeforeCompile=shader=>{
    shader.uniforms.gardenTime=clock;
    shader.vertexShader='uniform float gardenTime;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float phase=instanceMatrix[3].x*1.7+instanceMatrix[3].z*.83;
      float sway=sin(gardenTime*2.06+phase)*.031+sin(gardenTime*.87+phase)*.018;
      float above=max(position.y-.67,0.);
      transformed.x+=sway*above;
      transformed.z+=cos(gardenTime*2.06+phase)*.012*above;
    `);
  };
  [0,1,3,5,4].forEach((style,i)=>instance(parent,spectatorGeometry(style),fabric,costumes[i]));
}

// Four inward-facing PA cabinets share geometry and materials.
function speakerStands(parent, terraceScale) {
  const mounts = [];
  for (let i=0; i<4; i++) {
    const angle = (i+.5)*Math.PI/2;
    const radius = 8.96*terraceScale;
    mounts.push(matrix(radius*Math.sin(angle),-.26,radius*Math.cos(angle),1,1,1,angle+Math.PI));
  }
  const dark = new T.MeshStandardMaterial({color:0x25262c,roughness:.78});
  const steel = new T.MeshStandardMaterial({color:0x525158,metalness:.70,roughness:.36});
  const cone = new T.MeshStandardMaterial({color:0x414149,roughness:.87,side:T.DoubleSide});
  const trim = new T.MeshStandardMaterial({color:0xb19a6f,roughness:.48,metalness:.6});
  function part(geometry, material, local) {
    return instance(parent,geometry,material,mounts.map(m=>m.clone().multiply(local)));
  }
  function strut(start,end,radius) {
    const a=new T.Vector3(...start), b=new T.Vector3(...end), axis=b.clone().sub(a);
    const local=new T.Matrix4().compose(a.lerp(b,.5),
      new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),axis.clone().normalize()),new T.Vector3(1,1,1));
    part(new T.CylinderGeometry(radius,radius,axis.length(),12),steel,local);
  }
  strut([0,.10,0],[0,1.67,0],.048);
  for(let i=0;i<3;i++){
    const x=.50*Math.sin(i*tau/3), z=.50*Math.cos(i*tau/3);
    strut([0,.66,0],[x,.028,z],.036);
    strut([0,.23,0],[x*.72,.21,z*.72],.019);
  }
  // Bevelled front baffle and a tapered shell around the bass and horn.
  const outline=new T.Shape();
  outline.moveTo(-.40,0);outline.lineTo(.40,0);outline.lineTo(.45,.08);
  outline.lineTo(.42,1.25);outline.lineTo(.35,1.32);outline.lineTo(-.35,1.32);
  outline.lineTo(-.42,1.25);outline.lineTo(-.45,.08);outline.closePath();
  const cabinet=new T.ExtrudeGeometry(outline,{depth:.49,bevelEnabled:true,bevelThickness:.045,bevelSize:.04,bevelSegments:3});
  part(cabinet,dark,matrix(0,1.57,-.27));
  const wooferY=2.02, front=.282;
  const profile=[[.001,.055],[.087,.073],[.12,.041],[.23,.084],[.268,.112],[.29,.084],[.295,.068]];
  const driver=new T.LatheGeometry(profile.map(([r,d])=>new T.Vector2(r,d)),48);
  driver.rotateX(Math.PI/2);
  part(driver,cone,matrix(0,wooferY,front));
  part(new T.TorusGeometry(.30,.012,8,48),trim,matrix(0,wooferY,front+.07));
  part(new T.BoxGeometry(.52,.19,.043),steel,matrix(0,2.61,front));
  part(new T.BoxGeometry(.45,.128,.038),dark,matrix(0,2.61,front+.033));
  for(const y of [2.58,2.64])part(new T.BoxGeometry(.41,.009,.014),steel,matrix(0,y,front+.060));
  part(new T.BoxGeometry(.11,.025,.015),trim,matrix(0,1.64,front));
  const ring=new T.TorusGeometry(1,.021,8,64);
  const waves=Array.from({length:2},()=>{
    const glow=new T.MeshBasicMaterial({color:0xffdfa6,transparent:true,depthWrite:false});
    const wave=part(ring,glow,new T.Matrix4());
    wave.castShadow=false;wave.receiveShadow=false;wave.frustumCulled=false;
    wave.instanceMatrix.setUsage(T.DynamicDrawUsage);
    return wave;
  });
  const local=new T.Matrix4(),world=new T.Matrix4();
  return phase=>{
    waves.forEach((wave,i)=>{
      const progress=(phase/(tau*2)+i*.5)%1;
      const radius=.24+progress*.68;
      local.makeScale(radius,radius,radius).setPosition(0,wooferY,front+.15+progress*1.42);
      mounts.forEach((mount,j)=>wave.setMatrixAt(j,world.multiplyMatrices(mount,local)));
      wave.instanceMatrix.needsUpdate=true;
      wave.material.opacity=.70*Math.sin(Math.PI*progress)*(1-.32*progress);
    });
  };
}

export function buildGarden(scene,random,terraceScale){
  const garden=new T.Group();scene.add(garden);
  const sky=texture('garden-sky.webp');sky.mapping=T.EquirectangularReflectionMapping;
  scene.background=sky;scene.environment=sky;scene.environmentIntensity=.35;
  const lawnMap=texture('lawn.webp',true);lawnMap.repeat.set(37,37);
  const lawn=new T.Mesh(new T.PlaneGeometry(150,150),new T.MeshStandardMaterial({map:lawnMap,color:0xc0d9a7,roughness:1}));
  lawn.rotation.x=-Math.PI/2;lawn.position.y=-.265;lawn.receiveShadow=true;garden.add(lawn);
  const clock={value:0};garden.userData.clock=clock;
  addTrees(garden);addRocks(garden,random,terraceScale);seating(garden,clock,terraceScale);
  garden.userData.pulseSpeakers=speakerStands(garden,terraceScale);
  return garden;
}

export function terraceMaterial(mesh){
  const mat=new T.MeshStandardMaterial({vertexColors:true,map:texture('travertine.webp',true),roughness:.87,
    normalMap:texture('limestone-normal.webp',true,true),side:T.DoubleSide});
  mat.normalScale.set(.21,.21);
  const p=mesh.geometry.attributes.position,uv=[];
  for(let i=0;i<p.count;i++)uv.push(p.getX(i)*.32,p.getZ(i)*.32);
  mesh.geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  mesh.material.dispose();mesh.material=mat;
}
