import * as THREE from '/three.module.js';

// Colors are baked into each articulated piece so all of its embroidery,
// fasteners and different fabrics can be drawn together.
const surface = new THREE.MeshStandardMaterial({
  vertexColors: true, flatShading: false, roughness: 0.63, side: THREE.DoubleSide
});
// Instance dyes affect woven cloth only. Skin, pearls, piping and instruments
// retain their own colors irrespective of the viewer's costume.
surface.onBeforeCompile = shader => {
  shader.vertexShader='attribute float clothWeight; varying vec3 tailorPos; varying float weave;\n'+shader.vertexShader.replace('#include <color_vertex>',
    THREE.ShaderChunk.color_vertex.replace('vColor.rgb *= instanceColor.rgb;', `vColor.xyz = mix(vColor.xyz, instanceColor.xyz * (.12 + 1.95 * dot(vColor.xyz, vec3(.25,.55,.20))), clothWeight);`));
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\n tailorPos = position; weave = clothWeight;');
  shader.fragmentShader='varying vec3 tailorPos; varying float weave;\n'+shader.fragmentShader.replace('#include <color_fragment>',`
    #include <color_fragment>
    vec2 warp=vec2(tailorPos.x+.62*tailorPos.z,tailorPos.y)*vec2(440.,320.);
    vec2 aa=1.-smoothstep(vec2(.4),vec2(3.),fwidth(warp));
    float yarn=.041*sin(warp.x)*aa.x+.032*sin(warp.y+.35*sin(warp.x))*aa.y;
    diffuseColor.rgb*=1.+weave*yarn;
  `);

};
// Print directly on the folded surface so the motif bends with the garment.
const textilePrints={};
for(const pattern of ['dots','gown']){
  const material=surface.clone();
  material.customProgramCacheKey=()=>pattern;
  material.onBeforeCompile=shader=>{
    surface.onBeforeCompile(shader);
    const design=pattern==='dots'?`
      vec2 repeatAt=vec2(atan(tailorPos.x,tailorPos.z/.77)*5.1,tailorPos.y*17.);
      repeatAt.x+=.5*mod(floor(repeatAt.y),2.);
      float dist=length(fract(repeatAt)-.5);
      float edge=min(.12,fwidth(dist));
      float ink=1.-smoothstep(.15-edge,.15+edge,dist);
    `:`
      float around=atan(tailorPos.x,tailorPos.z/.77);
      float border=abs(tailorPos.y+.716-.028*cos(around*15.));
      float edge=min(.01,fwidth(border));
      float ink=1.-smoothstep(.006-edge,.008+edge,border);
    `;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\n'+design+'\n diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.94,.78,.56),ink*weave);');
  };
  textilePrints[pattern]=material;
}

const eyeMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.24,metalness:0,side:THREE.DoubleSide});
eyeMaterial.onBeforeCompile=surface.onBeforeCompile;
const veilMaterial=new THREE.MeshStandardMaterial({vertexColors:true,transparent:true,opacity:.79,
  roughness:.85,side:THREE.DoubleSide,depthWrite:false});
const garments = [
  {coat:0xa92747, shadow:0x651a39, trim:0xf6c16a, sash:0x176767, shirt:0xffe8c8, pant:0x2a3850},
  {coat:0x176a76, shadow:0x174650, trim:0xf2c574, sash:0xb84340, shirt:0xffedd0, pant:0x263b50},
  {coat:0x47598c, shadow:0x332c57, trim:0xf4bd78, sash:0xc45748, shirt:0xffddbc, pant:0x36304c},
  {coat:0xa7412f, shadow:0x692d40, trim:0xffcd71, sash:0x263e63, shirt:0xffe8c6, pant:0x263b43},
  {coat:0x25796d, shadow:0x154d50, trim:0xfac669, sash:0xc95542, shirt:0xffedd8, pant:0x2e4051},
  {coat:0x743258, shadow:0x462d48, trim:0xf5ca79, sash:0x22676c, shirt:0xfde1bc, pant:0x353746}
];
const wardrobes = ['dots','denim','track','flowers','suit','folk','gown','waistcoat'];
const guestDresses = new Set(['dots','flowers','gown']);
export function guestGender(style) {
  return guestDresses.has(wardrobes[style % wardrobes.length]) ? 'female' : 'male';
}
const outfitted = {
  dots:{coat:0x86394f,shadow:0x562b3b,trim:0xf1d5bc,sash:0x5d263c,shirt:0xd4a69b,pant:0x6d3147},
  denim:{coat:0x40566b,shadow:0x273a4d,trim:0x9ea8ad,sash:0x644044,shirt:0xf8f1e5,pant:0x293b50},
  track:{coat:0x657867,shadow:0x394f45,trim:0xd8d2ba,sash:0x574738,shirt:0xf1eade,pant:0x34413b},
  flowers:{coat:0x346e64,shadow:0x214a43,trim:0xd5b78f,sash:0x20443e,shirt:0x92afa0,pant:0x29433e},
  suit:{coat:0x4e4b82,shadow:0x363656,trim:0xf3a95f,sash:0xe0911f,shirt:0xffeed5,pant:0x424464},
  gown:{coat:0x5c527b,shadow:0x37314e,trim:0xd8c1a9,sash:0x423753,shirt:0xb5a0bb,pant:0x433a57},
  waistcoat:{coat:0x3b686b,shadow:0x264548,trim:0xc1ac89,sash:0x7d4b42,shirt:0xf2e8d7,pant:0x35434c},
  drummer:{coat:0xae2d30,shadow:0x68262d,trim:0xe0a754,sash:0x932d33,shirt:0x82916d,pant:0x495541},
  piper:{coat:0x167c68,shadow:0x244c4c,trim:0xffc16c,sash:0xffa158,shirt:0xe7bd78,pant:0x414959}
};
// A second party in the same cut gets a different cloth and trim combination.
const alternateCloth={
  dots:{coat:0x307da7,shadow:0x234c76,sash:0xfe9c68},
  denim:{coat:0x728d9d,shadow:0x42526d,shirt:0xfc9a78,pant:0x434b69},
  track:{coat:0xc8679d,shadow:0x814971,pant:0xa75282,trim:0xffdb89},
  flowers:{coat:0xb95339,shadow:0x673743,sash:0x4d66a0}
};
const bridal={coat:0xffead4,shadow:0xe5c6ab,trim:0xf5be61,sash:0xdd6e74,shirt:0xfff7e7,pant:0xf1ddc6};
const formal={coat:0x252d3b,shadow:0x141f2c,trim:0xf3c56f,sash:0x6b2330,shirt:0xfff0ce,pant:0x29303d};
const TAU = Math.PI * 2;
const down = new THREE.Vector3(0,-1,0);
const white = 0xfff2db;
const leather = 0x593a36;
const sole = 0x302935;
const colorCache = new Map();
function rgb(hex) {
  if (!colorCache.has(hex)) colorCache.set(hex,new THREE.Color(hex));
  return colorCache.get(hex);
}

class Piece {
  positions = [];
  colors = [];
  weights = [];
  cloth = null;
  triangle(a,b,c,tint) {
    this.positions.push(...a,...b,...c);
    const w=this.cloth?.get(tint)||0;this.weights.push(w,w,w);
    const col = rgb(tint);
    for(let i=0;i<3;i++) this.colors.push(col.r,col.g,col.b);
  }
  quad(a,b,c,d,tint) {
    this.triangle(a,b,c,tint);
    this.triangle(a,c,d,tint);
  }
  // Each cross section is [y, width radius, depth radius, center x, center z].
  rings(rows,tint,sides=10,offset=0) {
    const rings = rows.map(([y,rx,rz,cx=0,cz=0]) => Array.from({length:sides},(_,i) => {
      const angle=(i+.5)*TAU/sides+offset;
      return [cx+Math.sin(angle)*rx,y,cz+Math.cos(angle)*rz];
    }));
    for(let r=1;r<rings.length;r++) {
      for(let i=0;i<sides;i++) {
        const j=(i+1)%sides;
        this.quad(rings[r-1][i],rings[r-1][j],rings[r][j],rings[r][i],tint);
      }
    }
    for(const r of [0,rings.length-1]) {
      const [y,,,cx=0,cz=0]=rows[r];
      for(let i=0;i<sides;i++) {
        const j=(i+1)%sides;
        if(r===0) this.triangle([cx,y,cz],rings[r][j],rings[r][i],tint);
        else this.triangle([cx,y,cz],rings[r][i],rings[r][j],tint);
      }
    }
  }
  stone(x,y,z,rx,ry,rz,tint,sides=8) {
    this.rings([[y-ry,.16*rx,.16*rz,x,z],[y-.56*ry,.82*rx,.82*rz,x,z],
      [y+.08*ry,rx,rz,x,z],[y+.65*ry,.75*rx,.75*rz,x,z],[y+ry,.2*rx,.2*rz,x,z]],tint,sides);
  }
  // A raised thread / seam or other narrow solid between two points.
  thread(a,b,r,tint) {
    const start=new THREE.Vector3(...a), end=new THREE.Vector3(...b);
    const axis=end.clone().sub(start).normalize();
    const tangent=new THREE.Vector3(0,0,1);
    if(Math.abs(axis.z)>.92) tangent.set(1,0,0);
    tangent.cross(axis).normalize().multiplyScalar(r);
    const normal=axis.clone().cross(tangent);
    const offsets=[tangent,normal,tangent.clone().negate(),normal.clone().negate()];
    for(let i=0;i<4;i++) {
      const p=offsets[i],q=offsets[(i+1)%4];
      this.quad(start.clone().add(p).toArray(),start.clone().add(q).toArray(),
        end.clone().add(q).toArray(),end.clone().add(p).toArray(),tint);
    }
  }
  diamond(x,y,z,rx,ry,tint) {
    this.quad([x-rx,y,z],[x,y-ry,z+.002],[x+rx,y,z],[x,y+ry,z+.002],tint);
  }
  mesh() {
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(this.positions,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(this.colors,3));
    g.computeVertexNormals();
    g.setAttribute('clothWeight',new THREE.Float32BufferAttribute(this.weights,1));
    // Smooth the duplicate vertices along a curved surface, while keeping
    // seams between different fabrics and hard edges such as collars intact.
    const n=g.attributes.normal,xyz=g.attributes.position, buckets=new Map();
    const key=i=>[xyz.getX(i).toFixed(4),xyz.getY(i).toFixed(4),xyz.getZ(i).toFixed(4),this.colors[3*i]].join('/');
    for(let i=0;i<n.count;i++){const k=key(i);let faces=buckets.get(k);if(!faces)buckets.set(k,faces=[]);
      faces.push([n.getX(i),n.getY(i),n.getZ(i)]);}
    for(let i=0;i<n.count;i++){const x=n.getX(i),y=n.getY(i),z=n.getZ(i);let a=0,b=0,c=0;
      for(const f of buckets.get(key(i))) if(x*f[0]+y*f[1]+z*f[2]>.48){a+=f[0];b+=f[1];c+=f[2];}
      const l=Math.hypot(a,b,c)||1;n.setXYZ(i,a/l,b/l,c/l);}

    const m=new THREE.Mesh(g,surface);
    m.castShadow=true;
    return m;
  }
}

function tailor(b,p){b.cloth=new Map([[p.coat,.84],[p.shadow,.53],[p.pant,.31],[p.sash,.18]]);return b;}

// A bell-shaped panel cut on the bias. The waist stays fitted, while gathers
// open into deeper folds at the hem. The lining peeks out between scallops.
// ---- Blocky characters -------------------------------------------------
// Every body part is built from axis-aligned blocks. Faces are drawn as an
// 8×8 pixel grid on the front of a cube head; eyes live on their own mesh so
// they can still blink.
const PX=.0575, HEAD=.23, HEAD_TOP=.26, HEAD_BOTTOM=-.20;
const faceGrids={
  steve:  ['hhhhhhhh','hhhhhhhh','hssssssh','ssssssss','swessews','sssnnsss','ssmssmss','ssmmmmss'],
  alex:   ['hhhhhhhh','hhhhhhhh','hhssssss','hsssssss','swessews','ssssssss','sssmmsss','ssssssss'],
  bride:  ['hhhhhhhh','hhhhhhhh','hhssssss','hsssssss','swessews','csssssc','sssmmsss','ssssssss'],
  zombie: ['hhhhhhhh','hhhhhhhh','ssssssss','ssssssss','seessees','sssnnsss','ssmmmmss','ssssssss'],
  creeper:['sgssgssg','ssgsssgs','seessees','seessees','sgsmmsgs','ssmmmmss','ssmmmmss','gsmssmss'],
  skeleton:['ssssssss','ssssssss','ssssssss','seessees','sssmmsss','ssssssss','smmmmmms','ssssssss'],
  villager:['hhhhhhhh','hhhhhhhh','sbbbbbbs','swessews','ssssssss','ssssssss','ssssssss','ssssssss'],
  enderman:['ssssssss','ssssssss','ssssssss','ssssssss','swessews','ssssssss','ssssssss','ssssssss']
};
// Pad any short row with skin so every grid is exactly 8×8.
for(const grid of Object.values(faceGrids))for(let r=0;r<8;r++)grid[r]=(grid[r]+'ssssssss').slice(0,8);
const mobs={
  steve:   {face:'steve',skin:0xc08a68,hair:0x3b281b,w:0xfdfdfd,e:0x47369e,n:0x8f5a3e,m:0x6a3b2a},
  alex:    {face:'alex',skin:0xf0c49c,hair:0xd5702a,w:0xfdfdfd,e:0x3c8a3a,m:0xb5594a},
  zombie:  {face:'zombie',skin:0x5e9b4c,hair:0x325c2a,e:0x182616,n:0x3e6a32,m:0x2c4a24},
  creeper: {face:'creeper',skin:0x5dbb48,g:0x3f8a31,e:0x101410,m:0x101410},
  skeleton:{face:'skeleton',skin:0xd4d4cc,e:0x2e2e2e,m:0x4a4a46},
  villager:{face:'villager',skin:0xb4805f,hair:0x6b4a32,b:0x3d2a1c,w:0xfdfdfd,e:0x2f7d3a,nose:0xa06e50},
  enderman:{face:'enderman',skin:0x17141d,w:0xf0b0ff,e:0xc54dff},
  husk:    {face:'zombie',skin:0xbfa46c,hair:0x8a7448,e:0x2b2316,n:0x96804f,m:0x5c4a2c}
};
// Wardrobe order: dots, denim, track, flowers, suit, folk, gown, waistcoat.
const guestMobs=['alex','steve','zombie','creeper','skeleton','villager','enderman','husk'];
function pickMob(index,role){
  if(role==='bride')return {...mobs.alex,face:'bride',skin:0xf6d3b4,c:0xf09a9a,m:0xd2566b,hair:0xb85a22};
  if(role==='groom')return {...mobs.steve,hair:0x1f1813};
  if(role==='drummer')return mobs.villager;
  if(role==='piper')return mobs.skeleton;
  const base=mobs[guestMobs[index%guestMobs.length]];
  // A second guest in the same costume gets a sibling with different hair.
  if(index>=guestMobs.length && base.hair)return {...base,hair:[0x2a1d14,0x8c5a2b,0xe2c07a,0x4a2c1a][index%4]};
  return base;
}

Piece.prototype.box=function(x0,y0,z0,x1,y1,z1,tint){
  this.quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],tint);
  this.quad([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],tint);
  this.quad([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],tint);
  this.quad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],tint);
  this.quad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],tint);
  this.quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],tint);
};
// A centred block: position plus half extents.
Piece.prototype.block=function(x,y,z,hx,hy,hz,tint){this.box(x-hx,y-hy,z-hz,x+hx,y+hy,z+hz,tint);};

function blockFlower(piece,x,y,z,s,tint){
  for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])piece.block(x+dx*s,y+dy*s,z,s*.5,s*.5,s*.5,tint);
  piece.block(x,y,z+s*.1,s*.5,s*.5,s*.55,0xffcc54);
}

function blockSkirt(lower,hem,width,p,bridal){
  const top=1.12,steps=bridal?5:4;
  for(let i=0;i<steps;i++){
    const y0=hem+(top-hem)*i/steps,y1=hem+(top-hem)*(i+1)/steps+.002;
    const hx=THREE.MathUtils.lerp(width*.86,.185,i/(steps-1)),hz=hx*.74;
    lower.box(-hx,y0,-hz,hx,y1,hz,i%2&&!bridal?p.shadow:p.coat);
  }
  // A contrasting hem band.
  const hx=width*.86+.006,hz=hx*.74;
  lower.box(-hx,hem,-hz,hx,hem+.05,hz,bridal?0xfaf1df:p.trim);
}

const TORSO_X=.17,TORSO_Z=.115,FRONT=TORSO_Z+.004;
function makeTorso(role,outfit,skirt,p,mob) {
  const b=tailor(new Piece(),p),lower=tailor(new Piece(),p);
  const bride=role==='bride',groom=role==='groom';
  const vest=['drummer','waistcoat'].includes(outfit);
  const body=bride?0xfff5ef:vest?p.shirt:p.coat;
  b.box(-TORSO_X,.98,-TORSO_Z,TORSO_X,1.70,TORSO_Z,body);
  // Neck: a sliver of skin under the head.
  b.box(-.09,1.69,-.08,.09,1.73,.08,mob.skin);
  if(!skirt){
    b.box(-.19,.88,-.125,.19,1.02,.125,p.pant);
    b.box(-.176,1.0,-.121,.176,1.07,.121,p.sash);
    b.block(0,1.035,.124,.03,.024,.006,p.trim);
  } else {
    b.box(-.176,1.04,-.121,.176,1.11,.121,p.sash);
  }
  const panel=(x0,y0,x1,y1,tint,z=FRONT)=>b.box(x0,y0,TORSO_Z-.002,x1,y1,z,tint);
  if(bride){
    blockSkirt(lower,.18,.58,{...p,coat:0xfff3e3,shadow:0xf3e2d2},true);
    for(let i=-3;i<=3;i++)b.block(i*.04,1.63-Math.abs(i)*.012,FRONT+.004,.014,.014,.008,0xfffcf5);
    blockFlower(b,.10,1.075,FRONT+.012,.028,0xdf7880);
  } else if(groom){
    panel(-.06,1.30,.06,1.69,p.shirt);
    b.block(0,1.64,FRONT+.012,.06,.022,.01,0xc52944);
    b.block(0,1.64,FRONT+.018,.016,.016,.012,0x8a3445);
    for(let j=0;j<3;j++)b.block(0,1.36+.08*j,FRONT+.008,.01,.01,.006,p.shadow);
    blockFlower(b,.12,1.55,FRONT+.006,.022,0xf75168);
    // Tails of the tailcoat.
    b.box(-.17,.70,-.125,-.02,1.0,-.10,p.coat);b.box(.02,.70,-.125,.17,1.0,-.10,p.coat);
  } else if(vest){
    panel(-TORSO_X+.001,1.08,-.035,1.69,p.coat);panel(.035,1.08,TORSO_X-.001,1.69,p.coat);
    for(let j=0;j<4;j++)b.block(.05,1.18+.12*j,FRONT+.008,.012,.012,.006,p.trim);
  } else if(['suit','denim'].includes(outfit)){
    panel(-.055,1.20,.055,1.69,p.shirt);
    if(outfit==='suit')panel(-.022,1.25,.022,1.66,p.sash,FRONT+.004);
    else for(const side of [-1,1])panel(side*.13-.03,1.48,side*.13+.03,1.54,p.trim,FRONT+.004);
  } else if(outfit==='track'){
    panel(-.012,1.07,.012,1.69,p.trim);
    for(const side of [-1,1])b.box(side*TORSO_X-.004,1.07,-.02,side*TORSO_X+.004,1.69,.02,p.trim);
  } else if(['folk','piper'].includes(outfit)){
    for(let j=0;j<3;j++)panel(-.11,1.30+j*.11,.11,1.335+j*.11,p.trim);
    if(outfit==='piper')b.box(-.13,1.66,-.10,.13,1.74,.10,p.shadow);
  } else if(skirt){
    const base=outfit==='dots'?.43:outfit==='gown'?.23:.30;
    const radius=outfit==='dots'?.46:outfit==='gown'?.48:.47;
    blockSkirt(lower,base,radius,p,false);
    panel(-.10,1.60,.10,1.69,p.trim);
    if(outfit==='flowers')blockFlower(b,-.09,1.42,FRONT+.006,.026,p.trim);
  }
  const mesh=b.mesh();
  if(lower.positions.length){const skirtMesh=lower.mesh();skirtMesh.name='skirt';
    skirtMesh.geometry.translate(0,-1.08,0);skirtMesh.position.y=1.08;
    if(textilePrints[outfit])skirtMesh.material=textilePrints[outfit];mesh.add(skirtMesh);}
  return mesh;
}

function makeHead(index,role,outfit,skirt,p,mob) {
  const root=new THREE.Group();
  const face=new Piece(),eyes=new Piece(),tulle=new Piece();
  const hair=mob.hair;
  face.box(-HEAD,HEAD_BOTTOM,-HEAD,HEAD,HEAD_TOP,HEAD,mob.skin);
  const grid=faceGrids[mob.face];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const key=grid[r][c];
    const x0=-HEAD+c*PX,x1=x0+PX,y1=HEAD_TOP-r*PX,y0=y1-PX;
    if(key==='w'||key==='e'){
      face.quad([x0,y0,HEAD+.002],[x1,y0,HEAD+.002],[x1,y1,HEAD+.002],[x0,y1,HEAD+.002],mob.skin);
      const z=HEAD+.004;
      eyes.quad([x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z],mob[key]??0x111111);
    } else if(key!=='s'){
      const tint=key==='h'?hair??mob.skin:mob[key]??mob.skin;
      face.quad([x0,y0,HEAD+.002],[x1,y0,HEAD+.002],[x1,y1,HEAD+.002],[x0,y1,HEAD+.002],tint);
    }
  }
  // Mottled sides for the green mob, painted pixel by pixel.
  if(mob.g){
    for(const [side,col,row] of [[1,1,2],[1,5,5],[-1,2,1],[-1,6,4],[1,3,6],[-1,0,6]]){
      const z0=-HEAD+col*PX,y1=HEAD_TOP-row*PX,x=side*(HEAD+.002);
      face.quad([x,y1-PX,z0],[x,y1-PX,z0+PX],[x,y1,z0+PX],[x,y1,z0],mob.g);
    }
  }
  if(hair && !['skeleton','creeper','enderman'].includes(mob.face)){
    // Hair cap over the top two pixel rows and down the back.
    face.box(-HEAD-.006,HEAD_TOP-2*PX,-HEAD-.006,HEAD+.006,HEAD_TOP+.008,HEAD+.006,hair);
    face.box(-HEAD-.006,HEAD_TOP-5*PX,-HEAD-.008,HEAD+.006,HEAD_TOP,-HEAD+PX,hair);
    if(['alex','bride'].includes(mob.face)){
      // Long hair falling to the shoulders behind the head.
      face.box(-HEAD-.008,HEAD_BOTTOM-.04,-HEAD-.012,HEAD+.008,HEAD_TOP-4*PX,-HEAD+PX*.8,hair);
      face.box(-HEAD-.008,HEAD_TOP-4*PX,-HEAD,-HEAD+.002,HEAD_TOP-2*PX,HEAD-PX*2,hair);
    }
  }
  if(mob.nose){
    face.box(-PX,HEAD_TOP-7*PX,HEAD,PX,HEAD_TOP-4*PX,HEAD+.10,mob.nose);
  }
  if(role==='bride'){
    for(let j=-3;j<=3;j++)blockFlower(face,j*.07,HEAD_TOP+.03,HEAD-.06-Math.abs(j)*.03,.022,j%2?0xf9ddbc:0xe88491);
    const top=[],middle=[],hem=[];
    for(let j=0;j<=12;j++){
      const a=-1.58+j*3.16/12;
      top.push([Math.sin(a)*.25,.27,-.03-Math.cos(a)*.21]);
      middle.push([Math.sin(a)*.36,-.096,-.06-Math.cos(a)*.26]);
      hem.push([Math.sin(a)*(.54+.025*Math.cos(j*2)),-.96+.065*Math.cos(j*Math.PI),-.14-Math.cos(a)*.36]);
      if(j){
        tulle.quad(top[j-1],top[j],middle[j],middle[j-1],j%3===0?0xf2dac8:0xffefdc);
        tulle.quad(middle[j-1],middle[j],hem[j],hem[j-1],j%3===0?0xe7ccbf:0xfff8ee);
        tulle.thread(hem[j-1],hem[j],.012,0xfff5e2);
      }
    }
  } else if(role==='drummer'){
    // A red fez with a black tassel.
    face.box(-.17,HEAD_TOP,-.17,.17,HEAD_TOP+.17,.17,0xa8262c);
    face.box(-.175,HEAD_TOP,-.175,.175,HEAD_TOP+.03,.175,0x651f26);
    face.box(.10,HEAD_TOP+.02,.17,.13,HEAD_TOP+.17,.20,0x221a19);
  } else if(role==='piper'){
    face.box(-.25,HEAD_TOP,-.25,.25,HEAD_TOP+.03,.25,0xede0b9);
    face.box(-.16,HEAD_TOP+.03,-.16,.16,HEAD_TOP+.16,.16,0xede0b9);
    face.box(-.165,HEAD_TOP+.03,-.165,.165,HEAD_TOP+.06,.165,p.sash);
  } else if(outfit==='suit'){
    face.box(-.27,HEAD_TOP,-.27,.27,HEAD_TOP+.03,.27,0x463c48);
    face.box(-.18,HEAD_TOP+.03,-.18,.18,HEAD_TOP+.20,.18,0x463c48);
    face.box(-.185,HEAD_TOP+.03,-.185,.185,HEAD_TOP+.07,.185,p.sash);
  } else if(outfit==='folk'||outfit==='waistcoat'){
    face.box(-HEAD-.012,HEAD_TOP-2.6*PX,-HEAD-.012,HEAD+.012,HEAD_TOP-1.8*PX,HEAD+.012,p.sash);
  } else if(outfit==='dots'){
    face.block(-.13,HEAD_TOP+.02,.10,.05,.035,.03,p.sash);
    face.block(-.21,HEAD_TOP+.02,.10,.04,.05,.03,p.coat);face.block(-.05,HEAD_TOP+.02,.10,.04,.05,.03,p.coat);
  } else if(outfit==='flowers'){
    blockFlower(face,-.15,HEAD_TOP+.02,.12,.03,p.coat);
    blockFlower(face,-.06,HEAD_TOP+.01,.16,.022,p.trim);
  } else if(outfit==='gown'){
    for(let i=-3;i<=3;i++)face.block(i*.06,HEAD_TOP+.015,.20-Math.abs(i)*.02,.018,.018,.018,p.trim);
  }
  const eyeMesh=eyes.mesh();eyeMesh.material=eyeMaterial;
  root.add(face.mesh(),eyeMesh);
  let veil;
  if(tulle.positions.length){veil=tulle.mesh();
    veil.material=veilMaterial;veil.name='veil';veil.geometry.translate(0,-.235,0);veil.position.y=.235;root.add(veil);}
  return {root,eyeMesh,veil};
}

const LIMB=.066;
function armBone(upper,p,mob,outfit,build) {
  const b=tailor(new Piece(),p);
  const formal=['groom','suit','denim','track','folk','waistcoat','drummer','piper'].includes(outfit);
  const sleeve=outfit==='bride'?0xfff1e6:outfit==='drummer'?p.shirt:formal?p.coat:p.shirt;
  if(upper){
    // The block reaches above the shoulder joint so the arm sits flush with the top of the torso.
    b.box(-LIMB,-1.04,-LIMB,LIMB,.40,LIMB,sleeve);
    if(!formal && outfit!=='bride')b.box(-LIMB,-1.04,-LIMB,LIMB,-.62,LIMB,mob.skin);
  } else {
    const fore=formal||outfit==='bride'?sleeve:mob.skin;
    b.box(-LIMB*.97,-1.04,-LIMB*.97,LIMB*.97,.06,LIMB*.97,fore);
    if(formal)b.box(-LIMB,-1.04,-LIMB,LIMB,-.86,LIMB,outfit==='track'?p.trim:p.shirt);
  }
  const mesh=b.mesh();mesh.scale.x=build;mesh.scale.z=build;return mesh;
}
function legBone(upper,mob,outfit,p,side) {
  const b=tailor(new Piece(),p);
  const pants=['denim','track','suit','groom','waistcoat','drummer','piper','folk'].includes(outfit);
  const w=outfit==='drummer'?.085:.068;
  const tint=pants?p.pant:mob.skin;
  b.box(-w,-1.03,-w,w,.04,w,tint);
  if(!upper && outfit==='denim')b.box(-w-.002,-1.03,-w-.002,w+.002,-.9,w+.002,0x7196ac);
  if(!upper && outfit==='track')b.box(side*w-.004,-1,-.02,side*w+.004,0,.02,p.trim);
  return b.mesh();
}
function shoe(outfit,p) {
  const b=new Piece();
  const dress=['bride','gown','flowers','dots'].includes(outfit);
  const sneaker=outfit==='denim';
  const color=outfit==='bride'?0xe8d9c7:dress?p.sash:outfit==='drummer'?0x735337:sneaker?0xe8e3d9:0x352d2b;
  const w=dress?.064:.074;
  b.box(-w,-.096,-.075,w,-.066,.19,sneaker?0xcfcac1:sole);
  b.box(-w,-.066,-.07,w,.065,.17,color);
  if(sneaker)b.box(-w*.6,.02,.17,w*.6,.035,.174,0xfff7e7);
  return b.mesh();
}

function makePalm(sign,skin,piper){
  const palm=new Piece();
  palm.box(-.052,-.10,-.045,.052,.03,.045,skin);
  return palm.mesh();
}

function makeDavul() {
  const b=new Piece(),gold=0xf5bb69;
  b.rings([[-.184,.328,.328],[-.155,.347,.347],[.155,.347,.347],[.184,.328,.328]],0xa3442d,16);
  b.rings([[-.171,.351,.351],[-.141,.351,.351]],gold,16);
  b.rings([[.141,.351,.351],[.171,.351,.351]],gold,16);
  for(const y of [-.183,.183]) b.rings([[y-.011,.326,.326],[y+.011,.326,.326]],0xf3dfad,16);
  for(let i=0;i<16;i++) {
    const a=i*TAU/16, next=(i+1)*TAU/16, y=(i%2===0?1:-1)*.154;
    b.thread([Math.sin(a)*.352,y,Math.cos(a)*.352],[Math.sin(next)*.352,-y,Math.cos(next)*.352],.012,0xffdb8a);
  }
  b.rings([[.197,.066,.066],[.201,.065,.065]],0xd9ab72,12);
  const mesh=b.mesh();mesh.name='davul';mesh.scale.setScalar(1.23);mesh.position.set(-.275,1.02,.385);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(.60,.06,.80).normalize());
  return mesh;
}
function makeStick(heavy){
  const b=new Piece();
  b.thread([0,0,0],[0,-.285,0],heavy?.018:.009,0x723819);
  if(heavy) b.stone(0,-.282,0,.053,.081,.049,0x543126,14);
  return b.mesh();
}
function makeZurna(){
  const b=new Piece();
  b.rings([[-.755,.142,.142],[-.711,.140,.14],[-.565,.066,.066],[-.406,.046,.046],[-.119,.036,.036],[-.063,.023,.023]],0x9c5328,12);
  for(const [y,r] of [[-.739,.147],[-.552,.070],[-.168,.044],[-.083,.034]]) b.rings([[y-.009,r,r],[y+.009,r,r]],0xf5bc66,12);
  b.rings([[-.762,.118,.118],[-.758,.118,.118]],0x4a322d,12);
  b.rings([[-.081,.03,.03],[0,.018,.018]],0xf6d18b,8);
  for(let i=0;i<6;i++){
    const y=-.17-i*.062;
    b.stone(0,y,.039+i*.002,.012,.015,.006,0x4a3029,7);
  }
  return b.mesh();
}

const scarfVertices=18,scarfColumns=[-1,-.87,0,.87,1];
const scarfMaterial=surface.clone();
scarfMaterial.onBeforeCompile=surface.onBeforeCompile;
scarfMaterial.roughness=.43;scarfMaterial.metalness=.08;
scarfMaterial.emissive=new THREE.Color(0x430510);scarfMaterial.emissiveIntensity=.22;
function makeScarf() {
  const geom=new THREE.BufferGeometry(),columns=scarfColumns.length;
  const count=scarfVertices*columns,pos=new Float32Array(count*3),colors=new Float32Array(count*3),indices=[];
  for(let i=0;i<scarfVertices;i++)for(let j=0;j<columns;j++){
    // Cream-gold edging stays legible against the warm wedding floor.
    rgb(j===0 || j===columns-1 || i===scarfVertices-1?0xffdf83:0xf02f49).toArray(colors,(i*columns+j)*3);
    if(i<scarfVertices-1 && j<columns-1){
      const a=i*columns+j,b=a+columns;
      indices.push(a,b,a+1,a+1,b,b+1);
    }
  }
  const verts=new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage);
  geom.setAttribute('position',verts);geom.setAttribute('color',new THREE.BufferAttribute(colors,3));
  geom.setAttribute('clothWeight',new THREE.BufferAttribute(new Float32Array(count),1));
  geom.setIndex(indices);
  const mesh=new THREE.Mesh(geom,scarfMaterial);mesh.name='handkerchief';mesh.frustumCulled=false;
  function wave(hand,phase) {
    mesh.position.copy(hand);
    for(let i=0;i<scarfVertices;i++){
      const t=i/(scarfVertices-1),half=Math.sin(Math.PI*t*.88)*.30+.005;
      for(let j=0;j<columns;j++){
        const across=scarfColumns[j];
        verts.setXYZ(i*columns+j,-t*1.06+.035*t*across,
          t*(.29*Math.sin(phase*.5-t*4.5)+.22)-t*t*.15+half*across,
          t*(.08+.22*Math.cos(phase*.5-t*4))-.22*half*across);
      }
    }
    verts.needsUpdate=true;geom.computeVertexNormals();
  }
  return {mesh,wave};
}

// Entrance, close, lift and kick, then repeat in the opposite direction.
// Only the stepping foot travels. The planted foot holds its exact floor mark.
const floorMarks=[
  [-.24,.07],[-.24,.33],[0,.33],[0,.44],[0,.44],
  [-.18,.44],[-.18,.16],[-.24,.16],[-.24,.07]
];
const stepFeet=[1,-1,1,-1,-1,1,-1,1];

// Resting pinky grip near the hips. Once per 48 beats the whole row lifts
// together for eight beats, with two-beat eased ramps instead of constant flapping.
export function halayHandHeight(phase,moves={}){
  const beat=Math.max(0,phase/(Math.PI*2)),bar=beat%48;
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  const lift=smooth((bar-40)/2)*(1-smooth((bar-46)/2));
  const crouch=(moves.squat||0)*(.5-.5*Math.cos(phase*.25))*.34+
    (moves.knee||0)*Math.sin(phase*.5)**2*.18;
  return 1.00+.012*Math.sin(phase*.5)+.46*lift-.85*crouch;
}

// Each dancer owns a separate wrist; only fingertips meet at the common grip.
export function placeJoinedHand(hand,grip,origin,neighbor,scale,neighborScale,yaw,height){
  const dx=(neighbor.x-origin.x)*.5,dz=(neighbor.z-origin.z)*.5;
  hand.set((Math.cos(yaw)*dx-Math.sin(yaw)*dz)/scale,
    height*(scale+neighborScale)*.5/scale,(Math.sin(yaw)*dx+Math.cos(yaw)*dz)/scale);
  grip.copy(hand);
  const distance=Math.hypot(hand.x,hand.z);
  if(distance>.001){hand.x-=hand.x/distance*.092;hand.z-=hand.z/distance*.092;}
}

export function makeDancer(index=0,role='guest') {
  const style=Math.abs(Math.floor(index));
  const outfit=role==='guest' ? wardrobes[style%wardrobes.length] : role;
  const skirt=role==='bride' || guestDresses.has(outfit);
  const original=role==='bride'?bridal:role==='groom'?formal:(outfitted[outfit]||garments[style%garments.length]);
  const p=role==='guest' && style>=wardrobes.length && alternateCloth[outfit]
    ? {...original,...alternateCloth[outfit]} : original;
  const mob=pickMob(style,role);
  const group=new THREE.Group();
  group.userData.role=role;
  group.userData.outfit=outfit;
  const torso=makeTorso(role,outfit,skirt,p,mob);torso.name='bodice';
  const skirtMesh=torso.getObjectByName('skirt');
  const hemBase=role==='bride'?.18:outfit==='dots'?.43:outfit==='gown'?.23:.30;
  skirtMesh?.geometry.computeBoundingBox();
  const skirtBounds=skirtMesh?.geometry.boundingBox;
  const skirtBottom=skirtBounds?.min.y||-1;
  // Block skirts have corners, so measure the farthest vertex, not the box axes.
  let skirtRadius=0;
  if(skirtMesh){const v=skirtMesh.geometry.attributes.position;
    for(let i=0;i<v.count;i++)skirtRadius=Math.max(skirtRadius,Math.hypot(v.getX(i),v.getZ(i)));}
  const head=makeHead(style,role,outfit,skirt,p,mob);
  const scarf=makeScarf(p);
  group.add(torso,head.root,scarf.mesh);
  const older=role==='guest' && [5,7,10].includes(style) || role==='piper';
  const build=role==='drummer'?1.13:role==='groom'?1.14:role==='bride'?1:([1,.89,1.24,.93,1.21,.86,1.03,1.16,.91,1.28,.92,1.04][style%12]);
  torso.scale.set(build,1,1+(build-1)*.75);
  const proportions=role==='drummer'?[1.06,1.04,1.04]:[[1,1,1],[.97,1.03,.97],[1.03,1,1.03],[1,1.04,1]][style%4];
  head.root.scale.set(...proportions);
  const drummer=role==='drummer',piper=role==='piper';
  const drum=drummer?makeDavul():null;
  const sticks=drummer?[makeStick(false),makeStick(true)]:[];
  const drumMount=drummer?new THREE.Group():null;
  if(drummer){drumMount.add(drum);group.add(drumMount,...sticks);}
  const zurna=piper?makeZurna():null;
  const pipeDir=new THREE.Vector3(.18,-.79,.57).normalize();
  if(zurna) {
    head.root.add(zurna);
    zurna.position.set(0,-.115,.236);
    zurna.quaternion.setFromUnitVectors(down,pipeDir);
  }

  const limbs=[-1,1].map(sign=>{
    const upperArm=armBone(true,p,mob,outfit,build),forearm=armBone(false,p,mob,outfit,build);
    const thigh=legBone(true,mob,outfit,p,sign),shin=legBone(false,mob,outfit,p,sign),boot=shoe(outfit,p);
    if(skirt)thigh.visible=false;
    if(outfit==='bride' || outfit==='gown')shin.visible=false;
    const skin=mob.skin;
    const hand=makePalm(sign,skin,piper),fingers=[];
    // Cache the sole support vertices once; no geometry allocations per frame.
    const solePoints=[],vertices=boot.geometry.attributes.position;
    for(let i=0;i<vertices.count;i++)if(vertices.getY(i)<-.068)solePoints.push(new THREE.Vector3().fromBufferAttribute(vertices,i));
    if(piper)for(let f=0;f<3;f++){
      const finger=new Piece();
      finger.thread([0,0,0],[-sign*.045,-.010,.011],.011,skin);
      finger.thread([-sign*.045,-.010,.011],[-sign*.064,-.021,-.011],.009,skin);
      finger.stone(-sign*.064,-.021,-.011,.012,.013,.011,skin,8);
      const mesh=finger.mesh();mesh.position.set(sign*.003,.057-f*.052,.010);
      hand.add(mesh);fingers.push(mesh);
    }
    thigh.name='thigh:'+sign;shin.name='shin:'+sign;boot.name='boot:'+sign;
    upperArm.name='upperArm:'+sign;forearm.name='forearm:'+sign;hand.name='hand:'+sign;
    group.add(upperArm,forearm,hand,thigh,shin,boot);
    return {sign,upperArm,forearm,hand,thigh,shin,boot,fingers,solePoints};
  });
  const shoulder=new THREE.Vector3(),elbow=new THREE.Vector3(),handPos=new THREE.Vector3();
  const hip=new THREE.Vector3(),knee=new THREE.Vector3(),ankle=new THREE.Vector3();
  const hemPoint=new THREE.Vector3(),hemNormal=new THREE.Vector3();
  const dir=new THREE.Vector3(),bend=new THREE.Vector3(),axis=new THREE.Vector3();
  const jointCenter=new THREE.Vector3(),elbowSide=new THREE.Vector3(),elbowForward=new THREE.Vector3();
  const elbowPole=new THREE.Vector3(0,-1,.24),kneePole=new THREE.Vector3(0,.02,1);

  function segment(mesh,from,to) {
    axis.subVectors(to,from);
    mesh.position.copy(from);
    mesh.scale.y=axis.length();
    mesh.quaternion.setFromUnitVectors(down,axis.normalize());
  }
  function solveJoint(out,start,end,upper,lower,pole) {
    dir.subVectors(end,start);
    const distance=Math.max(.0001,dir.length());
    dir.multiplyScalar(1/distance);
    const along=(distance*distance+upper*upper-lower*lower)/(2*distance);
    const height=Math.sqrt(Math.max(0,upper*upper-along*along));
    bend.copy(pole).addScaledVector(dir,-pole.dot(dir)).normalize();
    out.copy(start).addScaledVector(dir,along).addScaledVector(bend,height);
  }
  function pose({phase=0,seconds=phase/TAU,leader=false,celebrating=false,leaderEnergy=1,jump=0,leftHand,rightHand,leftGrip,rightGrip,link=1,plantFoot,edition=0,march=0,walking=0,energy=0,moves={},greeting=0,entryStyle=0}) {
    const clock=phase/TAU;
    const stepNumber=((Math.floor(clock)%8)+8)%8;
    const progress=clock-Math.floor(clock);
    const ease=progress*progress*(3-2*progress);
    const beat=Math.sin(phase),pulse=Math.sin(Math.PI*progress)**2;
    const kick=stepNumber%4===3;
    const activeFoot=stepFeet[stepNumber];
    const leftX=THREE.MathUtils.lerp(floorMarks[stepNumber][0],floorMarks[stepNumber+1][0],ease);
    const rightX=THREE.MathUtils.lerp(floorMarks[stepNumber][1],floorMarks[stepNumber+1][1],ease);
    const partner=role==='bride'?1:role==='groom'?-1:0;
    const musicians=drummer||piper;
    // Keep the common beat and linked hands, vary only small expressive accents.
    const flourish=leader && !musicians?leaderEnergy*(1-walking)*(1-greeting):0;
    const personality=Math.sin(phase*.125+style*1.73+edition*.91);
    const accent=((!musicians && !partner)?[.74,1.12,1.28,.82,1.04,.62][style%6]:1)*(1+.16*energy)*(1+(musicians?0:.07*personality));
    const heelMove=musicians?0:(moves.heel||0)*(1-walking);
    const sideMove=musicians?0:(moves.sway||0)*(1-walking);
    const shoulderShake=(moves.shoulder||0)*Math.sin(phase);
    const crouch=((moves.squat||0)*(.5-.5*Math.cos(phase*.25))*.34+(moves.knee||0)*pulse*.18)*(1-walking);
    const stamp=moves.stamp||0;
    const heelTap=stepNumber%4===2;
    const shoulderBeat=Math.sin(phase-.40)*pulse;
    const weight=((leftX+rightX)*.48-activeFoot*pulse*(kick?.077:.049))*((leftGrip||rightGrip)?.35:1);
    const bow=partner ? Math.max(0,Math.sin(phase*.125))**3 : 0;
    const sway=Math.sin(phase*.25);
    torso.position.set(weight*(drummer?.82:piper?.36:accent),-.075+pulse*(kick?.112:.085)*accent*((leftGrip||rightGrip)?.45:1)+.27*jump,.034*beat-.018);
    torso.rotation.set((older?.14:.043)+.098*(1-pulse)+bow*.105,(partner*(.33*bow+.09)+sway*.16)*(musicians?.42:1),
      .052*activeFoot*pulse*accent-.066*sway+(drummer?.10*shoulderBeat:0));
    if(!musicians){
      torso.position.y-=crouch;
      torso.rotation.z+=shoulderShake*.075+sideMove*.075*Math.sin(phase*.5);
      torso.rotation.x+=crouch*.34+(entryStyle===1?greeting*.22:0)+heelMove*.035*pulse;
      torso.rotation.z+=flourish*.045*Math.sin(phase*.5);
      torso.rotation.y+=flourish*.045*Math.sin(phase*.25);
      torso.position.y+=flourish*.035*pulse;
    }
    if(drumMount){drumMount.position.copy(torso.position);drumMount.quaternion.copy(torso.quaternion);}
    if(skirtMesh){
      // The waistband stays fixed. Gather the fabric vertically when bending;
      // swinging the whole skirt about the waist used to expose legs and seams.
      skirtMesh.rotation.set(0,.018*Math.sin(phase*.25-.7),0);
      let gather=Math.max(.36,1-crouch/(1.08-hemBase));
      // Account for the tilted outer hem as well as the center: the bridal
      // skirt is wider and previously sank into the floor during deep bows.
      hemNormal.set(0,1,0).applyQuaternion(torso.quaternion);
      const waistY=torso.position.y+1.08*hemNormal.y;
      const spread=skirtRadius*Math.max(torso.scale.x,torso.scale.z)*(1+crouch*.10)*Math.hypot(hemNormal.x,hemNormal.z);
      gather=Math.min(gather,Math.max(.18,(waistY-.035-spread)/(-skirtBottom*hemNormal.y)));
      skirtMesh.scale.set(1+crouch*.10,gather,1+crouch*.10);
      skirtMesh.updateMatrix();
      hemPoint.set(0,hemBase-1.08,0).applyMatrix4(skirtMesh.matrix).multiply(torso.scale).applyQuaternion(torso.quaternion).add(torso.position);
      hemNormal.set(0,1,0).applyQuaternion(skirtMesh.quaternion).divide(torso.scale).applyQuaternion(torso.quaternion).normalize();
    }
    if(head.veil)head.veil.rotation.set(.045+.056*Math.sin(phase*.5-.8),-.10*sway,.048*Math.sin(phase*.25-.65));
    head.root.position.set(0,1.91,.025).applyQuaternion(torso.quaternion).add(torso.position);
    head.root.rotation.set(torso.rotation.x*(older?.35:.54)-.032*Math.cos(phase*.5),
      torso.rotation.y+partner*(.13+.14*bow)+.079*Math.sin(phase*.5+style*.16),
      torso.rotation.z*1.22+.026*Math.sin(phase*.5)+(musicians?0:.022*personality));
    if(role==='guest'){
      head.root.scale.set(proportions[0]*(1+.045*(edition%3)),proportions[1]*(1-.04*(edition%3)),proportions[2]);
    }
    if(zurna){
      pipeDir.set(.15+.052*Math.sin(phase*.25),-.74+.057*Math.sin(phase*.5),.59+.035*Math.cos(phase*.25)).normalize();
      zurna.quaternion.setFromUnitVectors(down,pipeDir);
    }
    const blinkTime=(seconds+style*.73)%5.3;
    const blink=blinkTime<.24?Math.sin(Math.PI*blinkTime/.24)**2:0;
    head.eyeMesh.scale.y=1-.94*blink;
    for(const limb of limbs) {
      const {sign}=limb;
      // Musicians and the couple articulate the outer shoulder even with hands linked.
      shoulder.set(sign*.247*build,1.555+sign*(.044*beat+.055*shoulderShake),.016*sign*sway).applyQuaternion(torso.quaternion).add(torso.position);
      const target=sign===-1?leftHand:rightHand;
      if(drummer) {
        // Strike relative to the actual skin. The padded beater works the front
        // head; the slim switch plays the far head with a shorter double stroke.
        const t=sign>0?progress:(clock*2+.5)%1;
        const swing=t<.18?Math.sin(t/.18*Math.PI/2)**2*.72:
          t<.70?.72+.28*Math.sin((t-.18)/.52*Math.PI/2)**2:Math.cos((t-.7)/.3*Math.PI/2)**2;
        const headPt=sign>0?.25:-.203;
        handPos.set(sign*.064,headPt,-.095).multiply(drum.scale).applyQuaternion(drum.quaternion).add(drum.position);
        // The tip leaves the skin, rises above the shoulder and comes back to
        // precisely the same point. The switch uses a smaller offbeat stroke.
        handPos.x+=sign*swing*(sign>0?.80:.21);
        handPos.y+=swing*(sign>0?.95:.35);
        handPos.z-=swing*(sign>0?.14:.045);
        axis.set(-sign*(.75-.45*swing),-.32+1.10*swing,-sign*.56).normalize();
        handPos.addScaledVector(axis,-.285).applyQuaternion(torso.quaternion).add(torso.position);
        sticks[sign>0?1:0].quaternion.setFromUnitVectors(down,axis.applyQuaternion(torso.quaternion));
      }else if(piper) {
        // Both palms ride the instrument, not world space. Fingers lift in
        // different combinations over the six holes as the melody changes.
        const startHole=sign<0?0:3, localY=-.17-(startHole+1)*.062;
        handPos.set(sign*.063,localY,.055).applyQuaternion(zurna.quaternion).add(zurna.position);
        handPos.multiply(head.root.scale).applyQuaternion(head.root.quaternion).add(head.root.position);
        limb.hand.quaternion.copy(head.root.quaternion).multiply(zurna.quaternion);
        const notes=[2,3,4,3,2,1,2,4,5,4,3,2,1,0,1,2];
        const eighth=Math.floor(clock*2),gate=notes[eighth%notes.length],next=notes[(eighth+1)%notes.length];
        const ramp=THREE.MathUtils.smoothstep((clock*2)%1,.73,1);
        for(let f=0;f<3;f++){
          const h=startHole+f,lift=THREE.MathUtils.lerp(Number(h>=gate),Number(h>=next),ramp);
          limb.fingers[f].rotation.y=sign*(.07+lift*.67+.06*Math.sin(phase*3+f));
        }
      }else {
        // The free wrist stays in front of its own shoulder; reach for the
        // neighbour gradually as the couple arrives instead of snapping arms.
        const gripHeight=halayHandHeight(phase,moves);
        if(partner)handPos.set(sign*(.40+.025*pulse),gripHeight+.025*sway*sign,.17+.035*Math.sin(phase*.5+sign));
        else handPos.set(sign*.48,gripHeight+.06*jump,.12+.015*beat);
        if(target) handPos.lerp(target,partner?link:1);
        if(sign===-1 && leader){
          // Broad, measured scarf circles above the outside shoulder; the
          // opposite hand remains in the shared halay grip.
          handPos.set(-.48-.12*Math.sin(phase*.5),2.04+.14*Math.cos(phase*.5),.21+.13*Math.sin(phase*.5+.6));
        }else if(!target && sign===-1 && celebrating)handPos.set(-.56,1.82+.15*pulse,.18);
        if(walking){
          handPos.x=THREE.MathUtils.lerp(handPos.x,sign*.34,walking);
          handPos.y=THREE.MathUtils.lerp(handPos.y,1.08+.07*beat*sign,walking);
          handPos.z=THREE.MathUtils.lerp(handPos.z,.10+.32*beat*sign,walking);
        }
        if(greeting && (sign===1 || entryStyle===2)){
          const greet=axis;
          if(entryStyle===1)greet.set(.23,1.48,.39);else greet.set(sign*.52,1.99+.09*Math.sin(phase*2),.26);
          handPos.lerp(greet,greeting);
        }
        handPos.x=sign*Math.max(.06,sign*handPos.x);
        limb.hand.rotation.set(-.17,.2*sign,sign*(-.33-.28*pulse));
      }
      // Clamp the effector before solving, so neither bone stretches even
      // when neighbours separate or the camera catches a join in progress.
      const upper=musicians?.46:.35, lower=musicians?.44:.34;
      dir.subVectors(handPos,shoulder);const len=dir.length();
      if(len>upper+lower-.002) handPos.copy(shoulder).addScaledVector(dir,(upper+lower-.002)/len);
      else if(len<Math.abs(upper-lower)+.002){
        if(len<.0001)dir.set(0,-1,0);else dir.multiplyScalar(1/len);
        handPos.copy(shoulder).addScaledVector(dir,Math.abs(upper-lower)+.002);
      }
      elbowPole.set(musicians?sign*.80:-sign*.25,-.92,musicians?-.22:.65);
      solveJoint(elbow,shoulder,handPos,upper,lower,elbowPole);
      if(!musicians && (sign<0?leftGrip:rightGrip)){
        // Choose another point on the same IK elbow circle when the elbow
        // would fold past its wrist into the neighbour's sleeve.
        const limit=handPos.x-sign*.14;
        if(sign*(elbow.x-limit)>0){
          dir.subVectors(handPos,shoulder);const distance=dir.length();dir.normalize();
          const along=(distance*distance+upper*upper-lower*lower)/(2*distance);
          const radius=Math.sqrt(Math.max(0,upper*upper-along*along));
          jointCenter.copy(shoulder).addScaledVector(dir,along);
          elbowSide.set(1,0,0).addScaledVector(dir,-dir.x).normalize();
          if(radius>1e-5 && elbowSide.x>1e-5){
            const u=THREE.MathUtils.clamp((limit-jointCenter.x)/(radius*elbowSide.x),-1,1);
            elbowForward.crossVectors(dir,elbowSide).normalize();
            if(elbowForward.dot(elbowPole)<0)elbowForward.negate();
            elbow.copy(jointCenter).addScaledVector(elbowSide,radius*u).addScaledVector(elbowForward,radius*Math.sqrt(1-u*u));
          }
        }
      }
      segment(limb.upperArm,shoulder,elbow);
      segment(limb.forearm,elbow,handPos);
      limb.hand.position.copy(handPos);
      if(!musicians){
        const grip=sign<0?leftGrip:rightGrip;
        // Keep the wrist continuous with its sleeve. In the chain, fingers
        // point toward the shared grip instead of two palms occupying it.
        limb.hand.quaternion.copy(limb.forearm.quaternion);
        if(grip && !walking && !greeting){
          dir.subVectors(grip,handPos).normalize();
          limb.hand.quaternion.setFromUnitVectors(down,dir);
        }
      }
      if(drummer) {
        sticks[sign>0?1:0].position.copy(handPos);
        limb.hand.quaternion.copy(sticks[sign>0?1:0].quaternion);
      }
      if(sign===-1 && (leader||celebrating) && !musicians){
        axis.set(0,-.086,.020).applyQuaternion(limb.hand.quaternion).add(handPos);
        scarf.wave(axis,phase);
      }

      // Lift the knee first; extend the lower leg at the crest, then return to
      // the floor. This produces a distinct hooked kick on beats four and eight.
      const swing=sign===activeFoot?pulse:0;
      const extension=kick && sign===activeFoot?Math.sin(Math.PI*progress)**2:0;
      const range=(musicians?.39:role==='bride'?.36:skirt?.58:1)*accent;
      const mark=sign<0?leftX:rightX;
      hip.set(sign*(drummer?.182:.122),1.01,0).applyQuaternion(torso.quaternion).add(torso.position);
      const footX=THREE.MathUtils.lerp(sign*(drummer?.245:.15),mark,range)+sign*extension*(partner?.22:.16);
      ankle.set(footX,.105+range*(swing*(heelTap?.068:.185)+extension*.206)+.29*jump,
        .018+range*(swing*.11+extension*.34+(heelTap?.15*swing:0))-partner*.074*sign*bow);
      ankle.y+=flourish*.055*swing;
      ankle.z+=flourish*.065*extension;
      if(heelMove){
        ankle.y=THREE.MathUtils.lerp(ankle.y,.105+.075*swing,heelMove);
        ankle.z=THREE.MathUtils.lerp(ankle.z,.018+.24*swing,heelMove);
      }
      if(sideMove){
        ankle.x+=sign*sideMove*.045*pulse;
        ankle.y=THREE.MathUtils.lerp(ankle.y,.105+.065*swing,sideMove);
        ankle.z=THREE.MathUtils.lerp(ankle.z,.018+.055*swing,sideMove);
      }
      if(!musicians && stamp){
        const lift=sign===activeFoot?Math.sin(Math.PI*Math.min(1,progress/.65))**2:0;
        ankle.y=THREE.MathUtils.lerp(ankle.y,.105+lift*.30,stamp);
        ankle.z=THREE.MathUtils.lerp(ankle.z,.10+lift*.10,stamp);
      }
      if(musicians && march){
        ankle.x+=march*sign*.19*Math.cos(phase*.5);
        ankle.y+=Math.abs(march)*.15*Math.max(0,sign*Math.sin(phase*.5));
      }
      if(walking){
        ankle.x=THREE.MathUtils.lerp(ankle.x,sign*.15,walking);
        ankle.y=THREE.MathUtils.lerp(ankle.y,.105+.16*Math.max(0,sign*Math.cos(phase))**2,walking);
        ankle.z=THREE.MathUtils.lerp(ankle.z,.06-.37*sign*beat,walking);
      }
      if(plantFoot && walking<.05)plantFoot(ankle,sign,sign!==activeFoot && jump<.05,progress);
      // Separate left/right foot lanes even when world-space planting is
      // correcting the drifting ring. This also keeps the knees uncrossed.
      const lane=torso.position.x;
      ankle.x=sign<0?Math.min(ankle.x,lane-.105):Math.max(ankle.x,lane+.105);
      limb.boot.rotation.set((heelTap?.22:-.12)*swing-.22*extension+heelMove*.32*swing,
        sign*(.07+.09*extension)+partner*.10*bow,.018*beat*swing);
      let soleY=Infinity;
      for(const point of limb.solePoints)soleY=Math.min(soleY,axis.copy(point).applyQuaternion(limb.boot.quaternion).y);
      ankle.y=Math.max(ankle.y,.006-soleY);
      // Keep the sole on its floor mark while bounding lateral reach. A high
      // kick or deep bend must not lengthen either leg bone.
      const reach=.970;
      const dy=THREE.MathUtils.clamp(ankle.y-hip.y,-reach,reach);
      ankle.y=hip.y+dy;
      const horizontal=Math.hypot(ankle.x-hip.x,ankle.z-hip.z);
      const allowed=Math.sqrt(Math.max(0,reach*reach-dy*dy));
      if(horizontal>allowed && horizontal>0){
        ankle.x=hip.x+(ankle.x-hip.x)*allowed/horizontal;
        ankle.z=hip.z+(ankle.z-hip.z)*allowed/horizontal;
      }
      solveJoint(knee,hip,ankle,.497,.475,kneePole.set(sign*.13,.02,1));
      segment(limb.thigh,hip,knee);
      if(skirtMesh){
        // Clip only the hidden shin, against the actual tilted skirt hem plane.
        // The foot is not allowed to cut through the front of the dress on kicks.
        const hem=hemPoint.y-(hemNormal.x*(ankle.x-hemPoint.x)+hemNormal.z*(ankle.z-hemPoint.z))/Math.max(.2,hemNormal.y)-.018;
        limb.shin.visible=ankle.y<hem;
        limb.boot.visible=ankle.y+.035<hem;
        if(knee.y>hem && knee.y>ankle.y)knee.lerp(ankle,Math.min(1,(knee.y-hem)/(knee.y-ankle.y)));
      }
      segment(limb.shin,knee,ankle);
      limb.boot.position.copy(ankle);

    }
    scarf.mesh.visible=(leader||celebrating) && !musicians;
    scarf.mesh.scale.setScalar(leader?1:.62);
  }
  function seat(){
    // Hips rest on the cushion, with knees in front of the seat and feet on the ground.
    torso.position.set(0,-.36,-.09);
    torso.rotation.set(.065,0,0);
    head.root.position.set(0,1.91,.025).applyQuaternion(torso.quaternion).add(torso.position);
    head.root.rotation.set(.02,.10*Math.sin(style*2),.035*Math.cos(style));
    if(skirtMesh){
      const cloth=skirtMesh.geometry.attributes.position;
      for(let i=0;i<cloth.count;i++){
        const drop=Math.max(0,-cloth.getY(i));
        cloth.setZ(i,cloth.getZ(i)+.41*Math.min(1,drop/.30));
        cloth.setY(i,cloth.getY(i)+Math.min(.19,drop*.55));
      }
      skirtMesh.rotation.set(0,0,0);cloth.needsUpdate=true;
    }
    for(const limb of limbs){
      const side=limb.sign;
      hip.set(side*.14,.65,-.08);
      knee.set(side*.18,.58,.40);
      ankle.set(side*.20,.10,.43+side*.06);
      segment(limb.thigh,hip,knee);segment(limb.shin,knee,ankle);
      limb.boot.position.copy(ankle);limb.boot.rotation.set(0,side*.13,0);
      shoulder.set(side*.245*build,1.54,0).applyQuaternion(torso.quaternion).add(torso.position);
      handPos.set(side*.16,.76,.36);
      solveJoint(elbow,shoulder,handPos,.35,.34,elbowPole.set(side*.45,-1,-.2));
      segment(limb.upperArm,shoulder,elbow);segment(limb.forearm,elbow,handPos);
      limb.hand.position.copy(handPos);limb.hand.rotation.set(-.9,0,side*.21);
    }
    group.updateMatrixWorld(true);
  }
  pose({phase:0});
  return {group,pose,seat,dispose() {
    group.traverse(object=>object.geometry?.dispose());
  }};
}
