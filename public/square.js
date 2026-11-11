import * as THREE from '/three.module.js';

import {buildGarden,terraceMaterial} from './garden.js';

export const terraceScale=1.28;
const TAU = 2 * Math.PI;

// Bake the village into a few vertex-coloured meshes. Each architectural
// detail shares the same material, including the individual roof tiles.
function paletteGeometry() {
  const vertices = [];
  const rgb = [];
  const palette = new Map();
  const transform = new THREE.Matrix4();
  const oldTransform = new THREE.Matrix4();
  const point = new THREE.Vector3();
  function vertex(p, tint) {
    point.fromArray(p).applyMatrix4(transform);
    vertices.push(point.x, point.y, point.z);
    rgb.push(tint.r, tint.g, tint.b);
  }
  function tri(a, b, c, color) {
    if (!palette.has(color)) palette.set(color, new THREE.Color(color).offsetHSL(0,.085,-.018));
    const tint = palette.get(color);
    vertex(a, tint); vertex(b, tint); vertex(c, tint);
  }
  function quad(a, b, c, d, color) {
    tri(a,b,c,color); tri(a,c,d,color);
  }
  function block(x,y,z,w,h,d,color) {
    const l=x-w/2, r=x+w/2, f=z+d/2, b=z-d/2, t=y+h;
    quad([l,y,f],[r,y,f],[r,t,f],[l,t,f],color);
    quad([r,y,b],[l,y,b],[l,t,b],[r,t,b],color);
    quad([l,y,b],[l,y,f],[l,t,f],[l,t,b],color);
    quad([r,y,f],[r,y,b],[r,t,b],[r,t,f],color);
    quad([l,t,f],[r,t,f],[r,t,b],[l,t,b],color);
    quad([l,y,b],[r,y,b],[r,y,f],[l,y,f],color);
  }
  // Polygonal beams, tapered pottery, tree trunks and ridge caps.
  function beam(a,b,r1,r2,color,sides=6) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const axis = end.clone().sub(start).normalize();
    const tangent = new THREE.Vector3(0,1,0);
    if (Math.abs(axis.y)>.85) tangent.set(1,0,0);
    tangent.cross(axis).normalize();
    const bitangent = axis.clone().cross(tangent);
    function ring(p,r,i) {
      const angle=i*TAU/sides;
      return p.clone().addScaledVector(tangent,r*Math.cos(angle))
        .addScaledVector(bitangent,r*Math.sin(angle)).toArray();
    }
    for(let i=0;i<sides;i++) {
      const v=ring(start,r1,i), w=ring(start,r1,i+1);
      const u=ring(end,r2,i+1), t=ring(end,r2,i);
      quad(v,w,u,t,color);
      if(r2) tri(t,u,b,color);
      if(r1) tri(w,v,a,color);
    }
  }
  function place(x,z,angle,draw) {
    oldTransform.copy(transform);
    transform.makeRotationY(angle).setPosition(x,0,z);
    draw();
    transform.copy(oldTransform);
  }
  function finish(scene, name, shadows=true) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({
      vertexColors:true, side:THREE.DoubleSide,
    }));
    mesh.name=name;
    mesh.castShadow=shadows; mesh.receiveShadow=true;
    scene.add(mesh);
    return mesh;
  }
  return {tri,quad,block,beam,place,finish};
}

function randomSequence(seed) {
  return () => { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
}
function choose(values, random) { return values[Math.floor(random()*values.length)]; }

function danceFloor(g,random) {
  // The main terrace is an octagon with an apothem of 7.35: even the outer
  // procession lies wholly within the inlaid border.
  const halfAngle=Math.PI/8;
  const fieldY=-.027;
  const brass='#ce9b68', ivory='#f4ddc1', rose='#bb807f', cream='#eacdc0';
  function polar(radius,angle,y) { return [Math.cos(angle)*radius,y,Math.sin(angle)*radius]; }
  function octagon(radius,side,t,y) {
    const a=side*Math.PI/4+halfAngle, b=a+Math.PI/4;
    const r=radius/Math.cos(halfAngle);
    return [r*((1-t)*Math.cos(a)+t*Math.cos(b)),y,r*((1-t)*Math.sin(a)+t*Math.sin(b))];
  }
  function ring(inner,outer,y,color) {
    for(let side=0;side<8;side++){
      g.quad(octagon(inner,side,0,y),octagon(inner,side,1,y),octagon(outer,side,1,y),octagon(outer,side,0,y),color);
    }
  }
  // The lawn meets a stone apron running under the seating bays.
  for(let i=0;i<128;i++) {
    const a=i*TAU/128,b=(i+1)*TAU/128;
    g.quad(polar(7,a,-.056),polar(7,b,-.056),polar(8.53,b,-.056),polar(8.53,a,-.056),'#c0ad95');
    g.quad(polar(8.53,a,-.056),polar(8.53,b,-.056),polar(8.54,b,-.265),polar(8.54,a,-.265),'#9b8574');
  }
  for(let side=0;side<8;side++){
    // Two shallow risers reveal the profile in the shoulder-height shots.
    for(const [y0,y1,r0,r1,color] of [[-.235,-.15,7.62,7.62,'#997e68'],[-.15,-.11,7.62,7.54,'#d4ae8c'],[-.11,-.06,7.54,7.44,'#c89878'],[-.06,-.03,7.44,7.36,'#ecc9a8']]){
      g.quad(octagon(r0,side,0,y0),octagon(r0,side,1,y0),octagon(r1,side,1,y1),octagon(r1,side,0,y1),color);
    }
    g.tri([0,-.051,0],octagon(7.37,side,1,-.051),octagon(7.37,side,0,-.051),'#c6a59a');
  }

  // Individual cut stones terminate beneath the border; alternating coursing
  // catches light without competing with the silhouettes above the floor.
  const stones=['#ebd1c0','#e6c8b8','#f0d6c1','#dfbfaf','#eacdb7','#eed4be','#e8c2b5'];
  const shell=.31, hexWidth=Math.sqrt(3)*shell;
  const stonesAt=[];
  for(let row=-17;row<=17;row++) for(let col=-16;col<=16;col++){
    const x=(col+(Math.abs(row)%2)*.5)*hexWidth,z=row*shell*1.5;
    const apothem=Math.max(Math.abs(x),Math.abs(z),(Math.abs(x)+Math.abs(z))/Math.sqrt(2));
    if(apothem>7.03) continue;
    stonesAt.push([x,z]);
  }
  for(const [x,z] of stonesAt){
    const top=shell-.010;
    const tint=choose(stones,random), bevel='#d5b0a0';
    const y=fieldY+random()*.003;
    function corner(i,r,h) {
      const a=i*TAU/6+Math.PI/6;
      return [x+Math.cos(a)*r,h,z+Math.sin(a)*r];
    }
    for(let k=0;k<6;k++){
      g.tri([x,y,z],corner(k+1,top,y),corner(k,top,y),tint);
      g.quad(corner(k,top,y),corner(k+1,top,y),corner(k+1,shell-.003,y-.009),corner(k,shell-.003,y-.009),bevel);
    }
  }
  // Concentric tesserae and braided edge: room for both guest rings on the
  // blush field. Two diamond repeats run along each of the eight straight edges.
  const inlayY=-.017;
  for(const [inner,outer,color] of [[6.78,6.82,brass],[6.82,6.91,ivory],[6.91,7.15,rose],[7.15,7.23,ivory],[7.23,7.30,brass],[7.30,7.37,cream],[4.97,5.01,'#c99585'],[5.01,5.05,'#f3d9bc'],[2.72,2.76,'#c29781'],[2.76,2.84,'#e2b8aa'],[2.84,2.87,ivory]]) ring(inner,outer,inlayY,color);
  for(let side=0;side<8;side++) for(let i=0;i<15;i++){
    const t=(i+.5)/15;
    g.quad(octagon(7.03,side,t-.026,-.013),octagon(6.934,side,t,-.013),
      octagon(7.03,side,t+.026,-.013),octagon(7.126,side,t,-.013),i%2===0?'#efd4b1':'#dba89a');
  }
  // The central eight-petal medallion is an inlay, flat and passable.
  for(let i=0;i<16;i++) {
    const a=i*TAU/16,r=i%2?.96:1.74;
    const p=(radius,delta=0,y=-.014)=>polar(radius,a+delta,y);
    const root=p(.14),ridge=p(r*.62),tip=p(r),left=p(r*.65,-.12),right=p(r*.65,.12);
    g.tri(root,left,ridge,'#d5a6a0'); g.tri(ridge,left,tip,'#dbb2a9');
    g.tri(root,ridge,right,'#e4bfb0'); g.tri(ridge,tip,right,'#edd1bb');
    if(i%2===0){
      g.quad(p(1.91,0),p(2.12,-.061),p(2.38,0),p(2.12,.061),'#cfa18d');
      g.tri(p(2.04,0,-.011),p(2.15,-.033,-.011),p(2.27,0,-.011),ivory);
    }
  }
}

const roofColors=['#b56347','#c07852','#b96549','#cb8059','#a75d47','#d28d65'];
const wood='#765243',darkWood='#60493f';
// Petals and leaves fold along a central ridge, giving each bloom a defined
// silhouette under directional light at thumbnail and phone sizes.
function bloom(g,x,y,z,r,colors,center,petals,turn=0) {
  const direction=.42;
  function point(a,rad,depth) {
    const dx=r*Math.cos(a)*rad, dy=r*Math.sin(a)*rad;
    return [x+dx,y+dy*(1-direction*.25)+depth*.28,z-dy*direction+depth];
  }
  for(let i=0;i<petals;i++){
    const a=turn+i*TAU/petals;
    const root=point(a,.08,.03*r), tip=point(a,1,.20*r), ridge=point(a,.67,.30*r);
    const spread=Math.PI*.83/petals;
    const left=point(a-spread,.74,.09*r), right=point(a+spread,.74,.11*r);
    g.tri(root,left,ridge,colors[(i+1)%colors.length]); g.tri(left,tip,ridge,colors[i%colors.length]);
    g.tri(root,ridge,right,colors[i%colors.length]); g.tri(ridge,tip,right,colors[(i+2)%colors.length]);
  }
  g.beam([x,y,z+.10*r],[x,y+.055*r,z+.27*r],r*.26,r*.21,center,8);
}
function leaf(g,start,end,w,color,accent) {
  const [x,y,z]=start,[u,v,t]=end;
  const dx=u-x,dy=v-y,length=Math.hypot(dx,dy) || 1;
  const mx=x+dx*.55, my=y+dy*.55,mz=z+(t-z)*.55;
  const left=[mx-dy/length*w,my+dx/length*w,mz], right=[mx+dy/length*w,my-dx/length*w,mz+.025];
  const ridge=[mx,my,mz+.11];
  g.tri(start,left,ridge,color); g.tri(left,end,ridge,color);
  g.tri(start,ridge,right,accent); g.tri(ridge,end,right,accent);
}

function lantern(g,lights,x,y,z,s) {
  g.beam([x,y,z],[x,y+.12*s,z],.25*s,.28*s,'#977249',8);
  lights.beam([x,y+.12*s,z],[x,y+.52*s,z],.18*s,.21*s,'#ffcc79',8);
  g.beam([x,y+.52*s,z],[x,y+.68*s,z],.29*s,.085*s,'#967452',8);
  g.beam([x,y+.68*s,z],[x,y+.74*s,z],.055*s,.048*s,'#d6ae72',6);
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2+.25,dx=Math.cos(a)*.23*s,dz=Math.sin(a)*.23*s;
    g.beam([x+dx,y+.1*s,z+dz],[x+dx,y+.54*s,z+dz],.019*s,.019*s,'#8a6c50',4);
  }
}
function weddingArch(g,lights,random) {
  const z=-8.76,w=3.32,column=2.60,archHeight=2.62;
  function arc(a,offset=0) {
    return [Math.cos(a)*(w+offset),column+Math.sin(a)*(archHeight+offset),z];
  }
  for(const side of [-1,1]){
    const x=side*w;
    g.block(x,-.05,z,.70,.18,.63,'#ccaa85');
    g.block(x,.13,z,.55,.13,.48,'#e7c79a');
    g.beam([x,.25,z],[x,column,z],.080,.080,'#b3905e',8);
    g.beam([x+side*.17,.24,z],[x+side*.17,column,z],.055,.055,'#d5ac71',6);
  }
  for(let i=0;i<30;i++){
    const a=i*Math.PI/30,b=(i+1)*Math.PI/30;
    g.beam(arc(a),arc(b),.074,.074,'#b99460',6);
    g.beam(arc(a,.17),arc(b,.17),.046,.046,'#d5af75',6);
    if(i%2===0) g.beam(arc(a),arc(b,.17),.025,.025,'#d5af75',5);
  }
  // Woven fabric is fixed at the crown and the outside of each arching rail;
  // the pleated swag dips into a catenary and gathers at a gilt tieback.
  const satin=['#fbecd1','#eadac6','#f6e1cc','#fff1dc','#efddc7','#fbebd7'];
  for(const side of [-1,1]) {
    function swag(t,u) {
      const wave=Math.sin(u*TAU*2+.8*t);
      return [side*(.05+w*.98*t),(column+archHeight+.035)-(column+archHeight-3.49)*t-1.30*Math.sin(Math.PI*t) + (u-.5)*(.13+Math.sin(Math.PI*t)*.48),
        z+.09+Math.sin(Math.PI*t)*.13+wave*.065];
    }
    const strips=7,steps=20;
    for(let i=0;i<steps;i++) for(let j=0;j<strips;j++){
      const t=i/steps,b=(i+1)/steps,u=j/strips,v=(j+1)/strips;
      g.quad(swag(t,u),swag(b,u),swag(b,v),swag(t,v),satin[j%satin.length]);
    }
    function panel(t,u) {
      const width=.17+.46*(1-Math.sin(t*Math.PI))+.13*Math.sin(t*TAU);
      return [side*(w-.02+.20*Math.sin(Math.PI*t*1.7)+(u-.5)*width),
        3.52*(1-t)+.07, z+.13+Math.sin(u*Math.PI*6)*.096+.12*t];
    }
    for(let i=0;i<19;i++) for(let j=0;j<6;j++) {
      const a=i/19,b=(i+1)/19,u=j/6,v=(j+1)/6;
      g.quad(panel(a,u),panel(b,u),panel(b,v),panel(a,v),satin[j]);
    }
    const tieX=side*(w+.11);
    g.beam([tieX,1.86,z+.12],[tieX,1.97,z+.12],.155,.16,'#b99257');
    g.beam([tieX,1.87,z+.24],[tieX+side*.16,1.52,z+.28],.024,.028,'#c9a163',5);
    lantern(g,lights,side*(w+.68),.00,z+.5,1.18);
  }
  const hues=[['#ce747d','#e69899','#ecc0ae'],['#fff1d8','#f0d6b8','#f7e4c9'],['#e4ab99','#f1bead','#eaac9a']];
  // Clusters arc asymmetrically across the rail and trail down one upright.
  for(let i=0;i<68;i++){
    const t=i/67,a=.04+t*(Math.PI-.08);
    const [x,y]=arc(a);
    const density=(Math.cos(a*2-.82)+1)/2;
    const r=.13+density*.10+random()*.05;
    const ox=x+(random()-.5)*.28,oy=y+(random()-.5)*.3;
    leaf(g,[ox,oy,z+.03],[ox+(random()-.5)*.7,oy+.23+random()*.29,z+.14],.105,'#608571','#819777');
    if(i%3!==1||density>.6) bloom(g,ox,oy,z+.20,r,hues[i%3],'#dbb373',7,random());
  }
  for(const side of [-1,1]) for(let i=0;i<12;i++){
    const x=side*(w+.08*Math.sin(i*1.1)),y=.23+i*.12;
    leaf(g,[x,y,z],[x+side*(.17+random()*.12),y+.26,z+.14],.10,'#698975','#90a07c');
    if(i%2===0) bloom(g,x+(random()-.5)*.25,y,z+.22,.14,hues[i%3],'#d1a66b',7,random());
  }
  lantern(g,lights,0,3.97,z,.63);
  g.beam([0,4.43,z],[0,column+archHeight,z],.017,.017,'#ad8b59',4);
}
function gardenLights(g,lights) {
  // Swooping warm bulbs sit behind the arch so guest silhouettes stay clear.
  for(const [z,top,sag,tilt] of [[-10.3,6.2,1.42,.065],[-14.8,6.7,1.34,-.105]]){
    const span=11.5;
    const point=x=>[x,top-sag*(1-(x/span)**2)+x*tilt,z+.06*x];
    for(let i=0;i<30;i++) {
      const x=-span+i*span/15;
      g.beam(point(x),point(x+span/15),.013,.013,'#72715e',4);
      const [a,b,c]=point(x+.38);
      const drop=i%4===1?.32:.12;
      g.beam([a,b,c],[a,b-drop,c],.014,.014,'#786e58',4);
      if(i%4===1) lantern(g,lights,a,b-drop-.37,c,.5);
      else {
        lights.beam([a,b-drop,c],[a,b-drop-.09,c],.035,.078,'#ffe7a5',8);
        lights.beam([a,b-drop-.09,c],[a,b-drop-.16,c],.078,.036,'#fff0ba',8);
      }
    }
    for(const side of [-1,1]) g.beam([side*span,0,z+side*span*.06],point(side*span),.085,.055,'#806c4e');
  }
}
export function buildSquare(scene) {
  const random=randomSequence(52961);
  const ground=paletteGeometry(),garden=paletteGeometry(),lights=paletteGeometry();
  const grounds=buildGarden(scene,random,terraceScale);
  danceFloor(ground,random);
  const floorMesh=ground.finish(scene,'Taş döşeli düğün terası',false);
  terraceMaterial(floorMesh);
  weddingArch(garden,lights,random);
  gardenLights(garden,lights);
  // Swags follow the outside of the seating banks; the dance floor stays open.
  for(let bay=0;bay<8;bay++){
    const a=(bay+.5)*TAU/8,b=a+TAU/8,r=9.18;
    const pt=t=>[r*((1-t)*Math.sin(a)+t*Math.sin(b)),3.6-.58*Math.sin(t*Math.PI),r*((1-t)*Math.cos(a)+t*Math.cos(b))];
    const [x,y,z]=pt(0);
    garden.beam([x,-.26,z],[x,y+.08,z],.055,.036,'#9b8263',12);
    for(let n=0;n<12;n++){
      const u=pt(n/12),v=pt((n+1)/12);
      garden.beam(u,v,.012,.012,'#665947',5);
      if(n%2===0){
        garden.beam(u,[u[0],u[1]-.13,u[2]],.021,.033,'#806747',7);
        lights.beam([u[0],u[1]-.13,u[2]],[u[0],u[1]-.20,u[2]],.031,.056,'#fff4cb',12);
        lights.beam([u[0],u[1]-.20,u[2]],[u[0],u[1]-.25,u[2]],.056,.018,'#ffe2a1',12);
      }
    }
    const angle=a+TAU/16,fx=8.22*Math.sin(angle),fz=8.22*Math.cos(angle);
    lantern(garden,lights,fx,-.05,fz,.86);
    for(const side of [-1,1]){
      const cx=fx+side*.43*Math.cos(angle),cz=fz-side*.43*Math.sin(angle);
      garden.beam([cx,-.05,cz],[cx,.36,cz],.13,.22,'#b5a17b',24);
      for(let j=0;j<23;j++){
        const k=j*2.4,spread=.32*Math.sqrt(j/23),px=cx+Math.sin(k)*spread,pz=cz+Math.cos(k)*spread,py=.46+.26*(1-j/23);
        leaf(garden,[cx,.31,cz],[px+.09*Math.sin(k),py+.05,pz+.09*Math.cos(k)],.055,'#536c52','#819070');
        bloom(garden,px,py,pz,.08+random()*.048,j%3?['#cc868a','#e9b5ad','#e4a19e']:['#ffe5d4','#fff6e6','#efc7bb'],'#d7b089',9,k);
      }
    }
  }
  // Low curved flower beds frame the seating bays and leave the entrance
  // aisles clear. Geometry is baked into the existing garden draw call.
  for(let bay=0;bay<8;bay++){
    const mid=(bay+.5)*TAU/8,r=8.67;
    for(let j=0;j<18;j++){
      const a=mid-.245+j*.49/18,b=mid-.245+(j+1)*.49/18;
      const x=r*Math.sin(a),z=r*Math.cos(a),u=r*Math.sin(b),v=r*Math.cos(b);
      garden.beam([x,.05,z],[u,.05,v],.16,.16,'#e7dbca',12);
      garden.beam([x,.19,z],[u,.19,v],.10,.10,'#667455',10);
      for(const side of [-1,1]){
        const px=x+side*.11*Math.sin(a),pz=z+side*.11*Math.cos(a);
        leaf(garden,[x,.15,z],[px,.34,pz],.09,'#3f6250','#77916b');
        bloom(garden,px,.34+.055*Math.sin(j*1.7),pz,.075+random()*.035,
          j%3?['#f5d5cc','#fff0e4','#e9b8b2']:['#b96b83','#e2a1b1','#cd8298'],'#e0bd77',9,j);
      }
    }
    for(const sign of [-1,1]){
      const a=mid+sign*.285;
      lantern(garden,lights,r*Math.sin(a),-.04,r*Math.cos(a),.63);
    }
  }
  const gardenMesh=garden.finish(scene,'Çiçekli tak, buketler ve bahçe ışıkları');
  const lightMesh=lights.finish(scene,'Düğün fenerleri',false);
  lightMesh.material.emissive.setHex(0xffcc89);
  return (time,extent=1,phase=0)=>{
    grounds.scale.set(extent,1,extent);
    const terrace=extent*terraceScale;
    for(const m of [floorMesh,gardenMesh,lightMesh])m.scale.set(terrace,1,terrace);
    grounds.userData.clock.value=time;
    grounds.userData.pulseSpeakers(phase);
    lightMesh.material.emissiveIntensity=.72+.035*Math.sin(time*1.7);
  };
}
