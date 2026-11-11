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
const shells = [
  {body:0x9e4a2f, wing:0xb56036, edge:0x653026, amber:0xe4a558},
  {body:0xb8643d, wing:0x955225, edge:0x582b24, amber:0xf0b273},
  {body:0x8b492f, wing:0xad6538, edge:0x522f29, amber:0xd99c5b},
  {body:0xad5330, wing:0xcc7541, edge:0x733a27, amber:0xf1b16e}
];
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

function flower(piece,x,y,z,s,tint) {
  for(let j=0;j<5;j++) {
    const angle=j*TAU/5;
    piece.stone(x+Math.cos(angle)*s*.8,y+Math.sin(angle)*s*.8,z,s*.73,s*.83,s*.36,tint,7);
  }
  piece.stone(x,y,z+s*.32,s*.48,s*.48,s*.28,0xffcc54,7);
}

function tailor(b,p){b.cloth=new Map([[p.coat,.84],[p.shadow,.53],[p.pant,.31],[p.sash,.18]]);return b;}

// A bell-shaped panel cut on the bias. The waist stays fitted, while gathers
// open into deeper folds at the hem. The lining peeks out between scallops.
function skirtPanels(b,hem,width,p,bridal=false) {
  const layers=[[hem,width],[hem+.062,width*.99],[hem+(1.09-hem)*.44,width*.83],[.91,.289],[1.13,.225]];
  const n=48,pleats=bridal?12:8;
  function vertex(j,k,inset=0) {
    const [y,r]=layers[k],a=j*TAU/n,d=(1.09-y)/(1.09-hem);
    const fold=Math.cos(a*pleats+.5*d),radius=r*(1+d*.078*fold)-inset;
    return [Math.sin(a)*radius,y+d*d*(.015*Math.sin(a*3)+.012*fold),Math.cos(a)*radius*.77];
  }
  for(let j=0;j<n;j++) {
    for(let k=0;k<layers.length-1;k++) b.quad(vertex(j,k),vertex(j+1,k),vertex(j+1,k+1),vertex(j,k+1),p.coat);
    const a=vertex(j,0),c=vertex(j+1,0),u=vertex(j,0,.025),v=vertex(j+1,0,.025);
    b.quad(a,c,v,u,p.shadow);b.thread(a,c,bridal?.009:.005,p.trim);
    if(bridal && j%2===0){
      const dot=(k,h)=>{const q=vertex((j+k)%n,0);return [q[0]*.989,q[1]+h,q[2]*.989];};
      b.thread(dot(0,.052),dot(.5,.088),.005,0xd7b891);
      b.thread(dot(.5,.088),dot(1,.052),.005,0xd7b891);
      const q=dot(.5,.094);b.stone(...q,.010,.013,.011,0xfff6df,8);
    }
  }
}

function guestGarment(b,outfit,p,lower) {
  const dots=outfit==='dots', gown=outfit==='gown';
  if(dots || gown || outfit==='flowers'){
    const base=dots?.43:gown?.23:.30;
    const radius=dots?.46:gown?.48:.47;
    skirtPanels(lower,base,radius,p);
    b.rings([[1.055,.262,.202],[1.135,.254,.193]],p.sash,32);
    if(dots){
      for(const side of [-1,1]){
        b.stone(side*.078,1.595,.146,.056,.022,.012,p.trim,9);
        
      }
      // Fitted bolero with a curved opening and turned-down sleeves.
      for(const side of [-1,1]){
        for(let j=0;j<9;j++){
          const patch=(k,y,r,z,w)=>{const a=side*(w+k*.14);return [Math.sin(a)*r,y,Math.cos(a)*z];};
          b.quad(patch(j,1.61,.292,.177,.52),patch(j+1,1.61,.292,.177,.52),
            patch(j+1,1.34,.276,.188,1.00),patch(j,1.34,.276,.188,1.00),p.shadow);
        }
        b.thread([side*.146,1.61,.158],[side*.233,1.34,.12],.008,p.trim);
      }
      for(const side of [-1,1]) b.stone(side*.068,1.118,.183,.080,.035,.025,p.sash,7);
      b.stone(0,1.112,.209,.038,.032,.024,p.trim,7);
    }else if(gown){
      // An asymmetric wrap neckline and restrained embroidery.
      
      for(let i=0;i<7;i++){
        const t=i/6;
        lower.diamond(-.217+t*.267,.456+t*.52,.238+(1-t)*.056,.016,.022,p.trim);
      }
    }else{
      // Emerald evening dress: a continuous fitted skirt, without flat overlay
      // panels that used to intersect the gathered cloth during movement.

    }
    if(!dots){
      for(let i=-2;i<=2;i++){
        const x=i*.048,y=1.493+.018*i*i,z=.191-.011*Math.abs(i);
        b.stone(x,y,z,.014,.017,.009,p.trim,8);
        if(i<2)b.thread([x,y+.019,z],[x+.048,1.51+.018*(i+1)**2,.192],.009,p.trim);
      }
    }
  }else if(['denim','track','suit','waistcoat'].includes(outfit)){
    tailoredJacket(b,p,outfit);
  }
}

function tailoredJacket(b,p,outfit){
  const rows=[[.94,.263,.179],[1.10,.255,.181],[1.40,.291,.198],[1.57,.301,.177],[1.68,.165,.127]];
  b.rings(rows,p.coat,32);
  // Every shirt, lapel and pocket follows the same curved jacket surface.
  // A flat triangle behind a rounded chest only showed its corners before.
  const at=(x,y,lift=.007)=>{
    let i=1;while(i<rows.length-1 && rows[i][0]<y)i++;
    const a=rows[i-1],c=rows[i],t=THREE.MathUtils.clamp((y-a[0])/(c[0]-a[0]),0,1);
    const w=THREE.MathUtils.lerp(a[1],c[1],t),d=THREE.MathUtils.lerp(a[2],c[2],t);
    return [x,y,d*Math.sqrt(Math.max(.001,1-(x/w)**2))+lift];
  };
  const patch=(points,tint,lift)=>{
    const n=8,pt=(i,j)=>at(points[0][0]+(points[1][0]-points[0][0])*i/n+(points[2][0]-points[0][0])*j/n,
      points[0][1]+(points[1][1]-points[0][1])*i/n+(points[2][1]-points[0][1])*j/n,lift);
    for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){
      b.triangle(pt(i,j),pt(i+1,j),pt(i,j+1),tint);
      if(j<n-i-1)b.triangle(pt(i+1,j),pt(i+1,j+1),pt(i,j+1),tint);
    }
  };
  const shirt=[[1.21,.012],[1.35,.04],[1.51,.078],[1.62,.105],[1.668,.085]];
  for(let i=1;i<shirt.length;i++){
    const [ya,wa]=shirt[i-1],[yb,wb]=shirt[i];
    for(let j=0;j<8;j++){
      const u=j/4-1,v=(j+1)/4-1;
      b.quad(at(u*wa,ya),at(v*wa,ya),at(v*wb,yb),at(u*wb,yb),p.shirt);
    }
  }
  for(const side of [-1,1]){
    const lapel=[[side*.126,1.641],[side*.184,1.54],[side*.135,1.48],[side*.158,1.454],[side*.018,1.221]];
    for(let j=1;j<lapel.length-1;j++)patch([lapel[0],lapel[j],lapel[j+1]],p.shadow,.014);
    patch([[side*.083,1.666],[side*.011,1.621],[side*.070,1.568]],0xfff6e6,.021);
    for(let j=0;j<8;j++)b.thread(at(side*(.12+j*.011),1.11,.012),at(side*(.12+(j+1)*.011),1.11,.012),.004,p.shadow);
  }
  for(const y of [1.13,1.23])b.stone(...at(.025,y,.015),.010,.012,.007,p.trim,12);
  if(outfit!=='denim'){
    b.diamond(0,1.495,at(0,1.495,.025)[2],.023,.103,p.sash);
    b.stone(0,1.60,at(0,1.60,.022)[2],.023,.024,.012,p.sash,12);
  }
}

function drummerVest(b,p){
  // Both hems and their piping follow the belly. The two open fronts are
  // separate panels, revealing the sage shirt and its buttons between them.
  const rows=[[.95,.335,.242,.044],[1.04,.385,.286,.054],[1.22,.420,.315,.050],
    [1.39,.401,.279,.035],[1.54,.359,.222,.016],[1.65,.282,.167,0]];
  b.rings(rows.map(([y,w,d,z])=>[y,w,d,0,z]),p.shirt,28);
  function stitch(k,side,t) {
    const [y,w,d,z]=rows[k];
    const opening=[.38,.35,.33,.39,.52,.61][k];
    const a=opening+(Math.PI-opening)*t;
    return [side*Math.sin(a)*(w+.012),y+(k===0?.055*t:0),z+Math.cos(a)*(d+.012)];
  }
  for(const side of [-1,1]){
    for(let k=0;k<rows.length-1;k++){
      for(let j=0;j<14;j++)b.quad(stitch(k,side,j/14),stitch(k,side,(j+1)/14),
        stitch(k+1,side,(j+1)/14),stitch(k+1,side,j/14),p.coat);
      b.thread(stitch(k,side,0),stitch(k+1,side,0),.009,p.trim);
    }
    for(let j=0;j<7;j++) b.thread(stitch(1,side,.09+j*.017),stitch(1,side,.107+j*.017),.010,p.shadow);
  }
  b.rings([[.923,.332,.244,0,.044],[.957,.360,.266,0,.052],[.999,.373,.280,0,.051]],p.sash,24);
  b.rings([[.945,.354,.267,0,.052],[.954,.359,.27,0,.052]],0xc25245,24);
  for(let k=2;k<=4;k++){const [y,,d,z]=rows[k];b.stone(0,y,z+d+.008,.014,.015,.008,0x4c3931,10);}
  const strap=[[.215,1.65,.144],[.137,1.50,.267],[-.023,1.32,.361],[-.155,1.16,.358],[-.242,.985,.263]];
  for(let j=1;j<strap.length;j++)b.thread(strap[j-1],strap[j],.024,0x74482f);
}

function makeTorso(role,outfit,skirt,p,shell) {
  // The torso is dressed all the way around. Shell plates under a fitted
  // coat must not be rendered as a second, larger silhouette when it turns.
  const b=tailor(new Piece(),p),lower=tailor(new Piece(),p);
  if(!skirt) {
    b.rings([[.824,.159,.109],[.91,.215,.149],[1.035,.233,.168],[1.12,.223,.163]],p.pant,16);
    b.rings([[1.025,.236,.169],[1.076,.238,.17]],p.shadow,16);
  }
  if(!['denim','track','suit','waistcoat','bride'].includes(outfit))
    b.rings([[1.05,.222,.156],[1.18,.228,.164],[1.44,.277,.180],[1.59,.289,.165],[1.67,.205,.129]],p.coat);
  b.rings([[1.63,.126,.115],[1.81,.116,.111]],shell.body,9);
  const groom=role==='groom',bride=role==='bride';

  if(role==='drummer') {
    drummerVest(b,p);
  } else if(bride) {
    // Two tiers; the wider gathered outer layer falls behind the scalloped front.
    skirtPanels(lower,.18,.58,{...p,coat:0xfff3e3,trim:0xfaf1df,shadow:0xdfcbb9},true);
    b.rings([[1.032,.225,.163],[1.20,.218,.168],[1.42,.258,.19],[1.55,.283,.177],[1.62,.260,.155],[1.68,.142,.123]],0xfff5ef,32);
    for(const side of [-1,1]){
      b.thread([side*.19,1.52,.132],[side*.080,1.15,.16],.009,0xecceb1);
      for(let i=0;i<6;i++) b.stone(side*(.068+i*.025),1.45+i*.016,.182-i*.009,.018,.020,.010,0xfffcf5);
    }
    b.rings([[1.029,.274,.212],[1.063,.265,.205],[1.10,.252,.197]],p.sash,32);
    flower(b,.106,1.067,.164,.057,0xdf7880);
    for (let j=0;j<18;j++) {
      const a=j*TAU/18;
      lower.stone(Math.sin(a)*.49,.304,Math.cos(a)*.368,.055,.043,.041,0xfff8e9,8);
    }
    for(let i=-2;i<=2;i++) b.stone(i*.045,1.58+Math.abs(i)*.013,.167-Math.abs(i)*.013,.022,.022,.014,0xffefd3);
  } else if(['dots','denim','track','flowers','suit','gown','waistcoat'].includes(outfit)) {
    guestGarment(b,outfit,p,lower);
  } else {
    // Shirt and contrasting lapels. The groom wears a tailcoat with a boutonniere.
    b.triangle([-.162,1.641,.107],[.162,1.641,.107],[0,1.181,.180],p.shirt);
    for(const side of [-1,1]) {
      const x=side*.114;
      b.quad([side*.155,1.65,.111],[side*.200,1.510,.128],[x,1.465,.177],[0,1.19,.184],groom?0x485060:p.shadow);
      b.thread([side*.155,1.64,.113],[side*.085,1.422,.177],.011,groom?0x76808b:p.trim);
      if(groom) {
        b.triangle([side*.19,1.09,.142],[side*.055,1.10,.181],[side*.187,.808,.137],p.coat);
      } else {
        for(let j=0;j<3;j++) b.diamond(side*(.123+.012*j),1.22+j*.098,.164,.025,.032,p.trim);
      }
    }
    if(groom) {
      b.quad([-.144,1.635,.164],[.144,1.635,.164],[.081,1.40,.198],[-.081,1.40,.198],p.shirt);
      b.triangle([-.081,1.40,.198],[.081,1.40,.198],[0,1.25,.192],p.shirt);
      for(const side of [-1,1]){
        b.triangle([side*.145,1.66,.162],[side*.025,1.604,.192],[side*.082,1.527,.201],0xfffaf0);
        b.quad([side*.145,1.64,.163],[side*.21,1.50,.137],[side*.103,1.429,.194],[0,1.234,.194],0x445061);
      }
      for(let j=0;j<3;j++)b.stone(0,1.337+.08*j,.203,.011,.012,.007,p.shadow,10);
      for(const side of [-1,1]){
        b.quad([side*.265,1.36,-.01],[side*.075,1.31,-.178],[side*.063,.63,-.237],[side*.251,.81,-.109],p.coat);
        b.thread([side*.154,1.63,.119],[side*.055,1.39,.181],.012,0xbbac9c);
      }
      b.rings([[1.045,.273,.202],[1.12,.256,.190]],0x732d3c,32);

      b.triangle([-.117,1.639,.169],[-.117,1.55,.178],[0,1.594,.213],0xc52944);
      b.triangle([.117,1.639,.169],[.117,1.55,.178],[0,1.594,.213],0xc52944);
      b.stone(0,1.594,.203,.034,.035,.025,0x8a3445,8);
      flower(b,.173,1.482,.169,.072,0xf75168);
      b.stone(0,1.24,.176,.015,.015,.012,p.trim);
    } else {
      b.rings([[1.03,.241,.17],[1.08,.251,.183],[1.16,.24,.17]],p.sash,12);
      b.rings([[1.103,.252,.182],[1.121,.247,.182]],p.trim,12);
      if(skirt) {
        b.rings([[.655,.349,.235],[.69,.351,.228],[.886,.29,.191],[1.04,.223,.155]],p.shadow,12);
        b.rings([[.68,.352,.236],[.703,.349,.231]],p.trim,12);
        b.quad([-.151,1.028,.133],[.151,1.028,.133],[.19,.73,.208],[-.19,.73,.208],p.coat);
        b.diamond(0,.817,.207,.062,.067,p.trim);
      }
    }
  }
  if(role==='piper') {
    // Tall collar, frogs and broad diagonal gold piping distinguish the zurna player.
    b.rings([[1.602,.185,.146],[1.717,.153,.125]],p.shadow,10);
    for(let j=0;j<3;j++) {
      const y=1.27+j*.101;
      b.thread([-.112,y,.171],[.10,y+.02,.172],.014,p.trim);
      b.stone(.104,y+.02,.178,.021,.021,.015,p.trim);
    }
  }
  // The moving panel is cut as a single piece. Its top overlaps the
  // stationary waistband; no part of the bodice is assigned by triangle height.
  const body=b.mesh();
  // Clothing encloses the back; exposed wing cases used to protrude through
  // every jacket, dress and seated spectator. Antennae retain the bug identity.
  if(lower.positions.length){const panel=lower.mesh();panel.name='skirt';
    panel.geometry.translate(0,-1.08,0);panel.position.y=1.08;
    if(textilePrints[outfit])panel.material=textilePrints[outfit];body.add(panel);}
  return body;
}

function feeler(side,shell){
  const b=new Piece();
  const curve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,0,0),new THREE.Vector3(side*.052,.18,-.014),
    new THREE.Vector3(side*.21,.36,-.008),new THREE.Vector3(side*.42,.44,.03),
    new THREE.Vector3(side*.57,.36,.08)]);
  const path=curve.getPoints(28);
  for(let i=1;i<path.length;i++){
    const radius=.018*(1-i/path.length*.68);
    b.thread(path[i-1].toArray(),path[i].toArray(),radius,i<9?shell.edge:shell.body);
    if(i%6===0)b.stone(...path[i].toArray(),radius*1.15,radius*1.15,radius*1.15,shell.wing,8);
  }
  const mesh=b.mesh();
  mesh.position.set(side*.117,.168,.012);
  return mesh;
}

// Build a tapered lock of hair along a curved centreline. The oval section
// keeps a moustache or a braid readable in profile as well as from the front.
function lock(piece, points, color) {
  let previous;
  for (let i=0;i<points.length;i++) {
    const [x,y,z,r]=points[i];
    const before=points[Math.max(0,i-1)],after=points[Math.min(points.length-1,i+1)];
    const dx=after[0]-before[0],dy=after[1]-before[1];
    const length=Math.hypot(dx,dy)||1;
    const section=Array.from({length:10},(_,j)=>{
      const a=j*TAU/10, offset=r*Math.cos(a);
      return [x-offset*dy/length,y+offset*dx/length,z+r*.65*Math.sin(a)];
    });
    if(previous) for(let j=0;j<10;j++){
      const k=(j+1)%10;
      piece.quad(previous[j],previous[k],section[k],section[j],color);
    }
    previous=section;
  }
}

function facialHair(face,style,color) {
  if(style==='bare')return;
  if(style==='beard' || style==='silver'){
    // The beard follows the jaw from the sideburns under the chin. Leave an
    // opening above the chin so the lips remain visible.
    for(let j=-12;j<12;j++){
      function line(k){
        const a=k*Math.PI/24,t=Math.abs(Math.sin(a)),z=Math.cos(a);
        return [[.260*Math.sin(a),-.167+.161*t*t,.045+.181*z],
          [.236*Math.sin(a),-.219+.092*t*t,.043+.188*z],
          [.160*Math.sin(a),-.294+.104*t*t,.040+.136*z]];
      }
      const a=line(j),b=line(j+1);
      face.quad(a[0],b[0],b[1],a[1],color);
      face.quad(a[1],b[1],b[2],a[2],color);
    }
  }
  if(style==='goatee'){
    face.rings([[-.284,.017,.014,0,.149],[-.228,.075,.026,0,.177],[-.183,.053,.018,0,.204]],color,14);
  }
  for(const side of [-1,1]){
    const points=style==='handlebar'?
      [[.002,-.095,.257,.013],[.049,-.092,.266,.035],[.101,-.112,.268,.044],[.151,-.119,.248,.033],
       [.195,-.112,.222,.022],[.216,-.088,.207,.013],[.216,-.067,.208,.007],[.203,-.066,.211,.001]]:
      [[.003,-.099,.249,.009],[.043,-.099,.253,.021],[.085,-.113,.246,.019],[.125,-.119,.228,.010],[.146,-.111,.214,.001]];
    lock(face,points.map(([x,y,z,r])=>[side*x,y,z,r]),color);
  }
}

function makeHead(index,role,outfit,skirt,p,shell) {
  const root=new THREE.Group();
  const face=new Piece(),eyes=new Piece(),tulle=new Piece();
  const shape=index%4;
  const bridalFace=role==='bride';
  const jaw=bridalFace?.94:role==='drummer'?1.21:[.90,1.04,1.15,.96][shape];
  const eyeSize=bridalFace?1.02:[1.02,.98,.96,1.04][shape];
  const eyeTilt=bridalFace?.020:[.019,.006,-.011,.027][shape];
  const cosmetics=bridalFace?{lid:0x9d686e,lip:0xa63850,blush:0xdd8582}:[
    {lid:0x954d83,lip:0xb82047,blush:0xd57771}, {lid:0xb46b4a,lip:0xb23940,blush:0xd58972},
    {lid:0x9a6a68,lip:0x9b3b52,blush:0xc97085}, {lid:0x956877,lip:0xb0435c,blush:0xd57c80}
  ][shape];
  // Broad pronotum above a tapered bug face and paired mouth palps.
  const profile=[[-.275,.065*jaw,.084,0,.028],[-.236,.133*jaw,.148,0,.034],[-.186,.207*jaw,.195,0,.032],
    [-.125,.260,.217,0,.028],[-.066,.286,.226,0,.025],[.008,.309,.243,0,.016],
    [.08,.318,.241,0,.003],[.141,.306,.226,0,-.004],[.189,.280,.208,0,-.009],
    [.228,.236,.182,0,-.014],[.263,.174,.139,0,-.020],[.282,.066,.065,0,-.023]];
  face.rings(profile,shell.body,48);
  // Cosmetics follow the actual face profile, including in three-quarter shots.
  const faceZ=(x,y)=>{
    let row=1;while(row<profile.length-1 && profile[row][0]<y)row++;
    const a=profile[row-1],b=profile[row],t=THREE.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1);
    const w=THREE.MathUtils.lerp(a[1],b[1],t),d=THREE.MathUtils.lerp(a[2],b[2],t);
    return THREE.MathUtils.lerp(a[4],b[4],t)+d*Math.sqrt(Math.max(.001,1-(x/w)**2));
  };
  const skinPoint=(x,y,lift=.003)=>[x,y,faceZ(x,y)+lift];

  const mature=[5,7,10].includes(index)&&role==='guest' || role==='piper';
  const brow=mature?0xa89a89:0x42272b;
  const iris=[0x586f50,0x73532c,0x4c7681,0x896546][index%4];
  for(const side of [-1,1]) {
    if(skirt){
      const at=(r,a)=>{const x=side*(.185+r*.061*Math.cos(a)),y=-.066+r*.030*Math.sin(a);return skinPoint(x,y);};
      const skinColor=rgb(shell.body),rouge=rgb(cosmetics.blush);
      for(let ring=0;ring<4;ring++)for(let j=0;j<24;j++){
        const r0=ring/4,r1=(ring+1)/4,a=j*TAU/24,b=(j+1)*TAU/24,start=face.colors.length;
        face.quad(at(r0,a),at(r1,a),at(r1,b),at(r0,b),shell.body);
        for(let v=0;v<6;v++){
          const r=[r0,r1,r1,r0,r1,r0][v],mix=.62*(1-r*r);
          for(let k=0;k<3;k++)face.colors[start+v*3+k]=[rouge.r,rouge.g,rouge.b][k]*mix+[skinColor.r,skinColor.g,skinColor.b][k]*(1-mix);
        }
      }
    }
    const x=side*(.126+.005*shape),y=.041,edge=side*.116*eyeSize;
    // Almond sclera with an arched upper lid and a shallower lower lid.
    // The cornea and iris sit inside this opening, instead of bulging spheres.
    const rim=[];
    for(let j=0;j<28;j++) {
      const a=j*TAU/28,t=Math.cos(a),h=Math.sin(a);
      rim.push([x+edge*t,y+h*(h>0?.074:.050)*eyeSize+t*eyeTilt,.239-.028*t*t-.025*t]);
    }
    for(let j=0;j<28;j++) eyes.triangle([x,y,.267],rim[j],rim[(j+1)%28],0xfff3e3);
    eyes.stone(x+.004,y+.002,.262,.054,.057,.013,0x392c28,24);
    eyes.stone(x+.004,y+.002,.265,.047,.050,.013,iris,24);
    eyes.stone(x+.004,y+.003,.279,.024,.030,.006,0x211e26,16);
    eyes.stone(x-.009,y+.023,.286,.010,.011,.004,0xfffcf1,10);
    for(let j=0;j<14;j++) eyes.thread(rim[j],rim[j+1],skirt?.0055:.004,skirt?0x432235:shell.edge);
    for(let j=15;j<26;j++) eyes.thread(rim[j],rim[j+1],.003,shell.edge);
    if(skirt){
      for(let j=1;j<=4;j++){
        const v=rim[j];eyes.thread(v,[v[0]+side*(.027-.002*j),v[1]+.029,v[2]+.008],.0035,0x33202c);
      }
      for(let j=2;j<12;j++) {
        const a=rim[j],b=rim[j+1],start=face.colors.length;
        face.quad(skinPoint(a[0],a[1]+.007),skinPoint(b[0],b[1]+.007),
          skinPoint(b[0],b[1]+.027),skinPoint(a[0],a[1]+.027),cosmetics.lid);
        const skin=rgb(shell.body);
        for(const v of [2,4,5])for(let k=0;k<3;k++)face.colors[start+v*3+k]=[skin.r,skin.g,skin.b][k];
      }
      const corner=rim[0];
      eyes.triangle(corner,[corner[0]+side*.026,corner[1]+.019,corner[2]-.012],rim[3],0x362135);
      if(bridalFace){
        for(let j=3;j<12;j++){
          const a=rim[j],b=rim[j+1],k=(j-3)/9;
          face.thread([a[0],a[1]+.019,a[2]+.009],[b[0],b[1]+.019,b[2]+.009],.0035+.002*k,0xffd99e);
        }
        const inner=rim[14];
        eyes.stone(inner[0],inner[1]+.003,inner[2]+.006,.012,.009,.007,0xffdfa9,10);
        face.thread([side*.263,-.085,.122],[side*.272,-.148,.126],.009,0xefba69);
        face.stone(side*.272,-.160,.127,.021,.030,.018,0xffe9d4,14);
      }else face.stone(side*.269,-.11,.12,.021,.038,.017,p.trim,10);
    }
    const browY=skirt?.154:.139;
    for(let j=0;j<8;j++) {
      const pt=t=>skinPoint(side*(.045+.181*t),browY+(.018+.011*shape)*Math.sin(Math.PI*t)-(.008+.005*shape)*t,.006);
      face.thread(pt(j/8),pt((j+1)/8),(role==='drummer'?.025:mature?.014:skirt?.007:.012+.001*shape)*(1-.54*j/8),brow);
    }
    if(mature){for(let j=0;j<2;j++)face.thread([side*.223,-.022-j*.019,.196],[side*.255,-.030-j*.018,.158],.004,0x985f4a);}
  }
  face.rings([[-.077,.031,.019,0,.234],[-.062,.044,.028,0,.242],[-.044,.037,.035,0,.246],[.012,.021,.019,0,.239],[.057,.012,.010,0,.232]],shell.wing,16);
  if(mature && !skirt && role!=='piper'){
    for(const side of [-1,1]){
      const edge=t=>[side*(.132+.102*Math.cos(t)),.042+.069*Math.sin(t),.295-.022*Math.cos(t)];
      for(let j=0;j<20;j++)face.thread(edge(j*TAU/20),edge((j+1)*TAU/20),.0055,0x51453e);
      face.thread(edge(0),[side*.297,.066,.037],.006,0x504139);
    }
    face.thread([-.035,.060,.306],[.035,.060,.306],.006,0x51453e);
  }
  if(!skirt){
    const whiskers=role==='drummer'?'handlebar':role==='piper'?'goatee':role==='groom'?'short':
      ['bare','beard','goatee','bare','short','silver','bare','silver','bare','bare','silver','bare'][index%12];
    facialHair(face,whiskers,whiskers==='silver'?0x9f948a:role==='drummer'?0x221a19:0x52342e);
  }
  if(role==='drummer'){
    const top=[[-.122,-.144,.225],[-.067,-.151,.248],[0,-.150,.260],[.067,-.151,.248],[.122,-.144,.225]];
    const bottom=[top[0],[-.067,-.195,.231],[0,-.216,.237],[.067,-.195,.231],top[4]];
    for(let j=0;j<4;j++)face.quad(top[j],top[j+1],bottom[j+1],bottom[j],0x4d2728);
    face.stone(0,-.193,.245,.044,.012,.008,0xe3897c,12);
  } else if(role==='piper') face.stone(0,-.140,.226,.037,.042,.032,0x702d27,9);
  else if(!bridalFace){
    // A crescent smile; the dark opening and lower tongue read from a wide shot.
    face.quad([-.111,-.118,.213],[-.052,-.176,.221],[.049,-.176,.221],[.114,-.114,.213],0x59242a);
    face.triangle([-.111,-.118,.214],[.114,-.114,.214],[0,-.136,.245],0x59242a);
    face.quad([-.067,-.150,.225],[-.045,-.178,.224],[.046,-.177,.224],[.072,-.148,.225],0xe88376);
  }
  if(skirt){
    const lip=(points)=>points.map(([x,y,r])=>[x,y,faceZ(x,y)+.007,r]);
    lock(face,lip([[-.082,-.132,.001],[-.040,-.124,.009],[-.020,-.120,.010],
      [0,-.126,.007],[.020,-.120,.010],[.040,-.124,.009],[.082,-.132,.001]]),cosmetics.lip);
    lock(face,lip([[-.08,-.135,.001],[-.04,-.145,.011],[0,-.148,.014],[.04,-.145,.011],[.08,-.135,.001]]),cosmetics.lip);
    for(let j=0;j<8;j++){
      const pt=t=>skinPoint((t-.5)*.145,-.133-.004*Math.sin(Math.PI*t),.010);
      face.thread(pt(j/8),pt((j+1)/8),.002,0x632e39);
    }
    face.thread(skinPoint(-.017,-.147,.020),skinPoint(.012,-.147,.020),.0025,0xeeb7ac);
  }
  if(role==='bride') {
    face.rings([[.215,.238,.185],[.237,.237,.184]],0xd69a47,12);
    for(let j=-2;j<=2;j++) {
      const x=j*.079,top=.328-Math.abs(j)*.022;
      const z=.160-Math.abs(j)*.015;
      face.triangle([x-.049,.225,z],[x+.047,.225,z],[x,top,z+.013],0xf8c967);
      face.stone(x,top,z+.015,.019,.020,.015,j===0?0xfaeee2:0xeca2a4);
    }
    // Scalloped veil falls behind the shoulders, with outward folds framing the face.
    const top=[],middle=[],hem=[];
    for(let j=0;j<=12;j++){
      const a=-1.58+j*3.16/12;
      top.push([Math.sin(a)*.206,.239,-.03-Math.cos(a)*.113]);
      middle.push([Math.sin(a)*.345,-.096,-.051-Math.cos(a)*.216]);
      hem.push([Math.sin(a)*(.54+.025*Math.cos(j*2)),-.96+.065*Math.cos(j*Math.PI),-.14-Math.cos(a)*.36]);
      if(j){
        tulle.quad(top[j-1],top[j],middle[j],middle[j-1],j%3===0?0xf2dac8:0xffefdc);
        tulle.quad(middle[j-1],middle[j],hem[j],hem[j-1],j%3===0?0xe7ccbf:0xfff8ee);
        tulle.thread(hem[j-1],hem[j],.012,0xfff5e2);
      }
    }
    flower(face,-.237,.165,.082,.052,0xe88491);
    flower(face,-.196,.228,.101,.04,0xf9ddbc);
  } else if(role==='groom' || ['denim','track','suit','waistcoat'].includes(outfit)) {
    // A side-parted, close-cut hairstyle, leaving the antenna roots visible.
    const hair=mature?0x8e8277:role==='groom'?0x302827:0x49332c;
    face.rings([[.168,.302,.229,0,-.008],[.205,.274,.208,0,-.01],[.242,.222,.18,0,-.015],[.267,.173,.141,0,-.02],[.291,.108,.094,0,-.02],[.306,.055,.049,0,-.02],[.31,.01,.01,0,-.02]],hair,28);
    for(let j=0;j<6;j++)lock(face,[[-.19+j*.038,.218,.125,.012],
      [-.10+j*.028,.268,.140,.014],[.04+j*.021,.239,.171,.008]],hair);
  } else if(skirt){
    const hair=outfit==='gown'?0x50372e:outfit==='flowers'?0x342b2a:0x6c4834;
    face.rings([[.174,.300,.228,0,-.008],[.211,.271,.206,0,-.01],[.249,.213,.175,0,-.015],[.271,.167,.14,0,-.02],[.292,.108,.094,0,-.02],[.306,.055,.049,0,-.02],[.31,.01,.01,0,-.02]],hair,28);
    face.stone(0,.12,-.199,.145,.14,.107,hair,24);
    for(let j=0;j<9;j++){
      const a=(j-4)*.20;
      face.stone(Math.sin(a)*.275,.202+Math.cos(a)*.018,Math.cos(a)*.175,.010,.010,.010,0xf0dec9,10);
    }
  } else if(outfit==='suit' || outfit==='piper'){
    const hat=outfit==='suit'?0x463c48:0xede0b9;
    face.rings([[.18,.319,.261],[.198,.338,.271],[.213,.3,.236]],hat,12);
    face.rings([[.196,.232,.169],[.306,.228,.174],[.364,.182,.131],[.337,.10,.087]],hat,12);
    face.rings([[.212,.241,.177],[.254,.234,.173]],p.sash,12);
    if(outfit==='piper') face.stone(.199,.269,.071,.053,.062,.036,p.trim,8);
  } else if(outfit==='drummer'){
    face.rings([[.178,.288,.212],[.220,.282,.215],[.410,.221,.169,-.018],[.436,.192,.150,-.024]],0x651f26,20);
    face.rings([[.177,.29,.216],[.207,.285,.218]],0x492028,20);
    lock(face,[[-.02,.44,-.01,.014],[.15,.37,-.11,.016],[.246,.20,-.11,.021],
      [.280,.02,-.10,.024],[.332,-.033,-.099,.009],[.354,-.012,-.093,.002]],0x322528);
  } else if(outfit==='dots'){
    face.rings([[.177,.266,.186],[.206,.252,.184]],p.sash);
    face.triangle([-.127,.238,.129],[-.285,.333,.096],[-.292,.212,.102],p.coat);
    face.triangle([-.127,.238,.129],[-.067,.352,.131],[-.017,.263,.131],p.coat);
    face.stone(-.135,.246,.135,.035,.034,.025,p.sash);
  } else if(outfit==='gown'){
    face.rings([[.155,.263,.208],[.187,.27,.205]],p.shadow);
    for(let i=-3;i<=3;i++){
      const a=i*.286;
      face.stone(Math.sin(a)*.276,.128+.023*Math.abs(i),Math.cos(a)*.188,.022,.041,.020,p.trim);
    }
  } else if(skirt) {
    face.rings([[.185,.239,.169],[.208,.233,.172]],p.sash);
    flower(face,-.21,.187,.098,.058,p.coat);
    flower(face,-.14,.225,.126,.038,p.trim);
  } else {
    face.rings([[.176,.255,.175],[.205,.248,.172],[.228,.222,.164]],p.sash,12);
    face.quad([.19,.209,-.101],[.242,.196,-.071],[.33,.064,-.111],[.287,.039,-.139],p.sash);
  }
  // Style the temples around the shell rather than covering the antenna roots.
  for(const side of [-1,1]){
    if(skirt){
      const hair=outfit==='gown'?0x50372e:outfit==='flowers'?0x342b2a:0x6c4834;
      lock(face,[[side*.235,.211,.121,.032],[side*.282,.132,.089,.039],
        [side*.297,.033,.045,.036],[side*.29,-.064,.012,.030],[side*.267,-.135,-.005,.018],[side*.286,-.181,-.011,.003]],hair);
    }else if(mature) {
      face.stone(side*.25,.091,.045,.05,.108,.064,0xc2ae98,12);
      for(let j=0;j<3;j++)face.thread([side*(.207+.011*j),.208-j*.012,.119],[side*(.26+.007*j),.14-j*.014,.076],.007,0xd1c1af);
    }
  }
  const eyeMesh=eyes.mesh();eyeMesh.material=eyeMaterial;
  const antennae=[feeler(-1,shell),feeler(1,shell)];
  root.add(face.mesh(),eyeMesh,...antennae);
  let veil;
  if(tulle.positions.length){veil=tulle.mesh();
    veil.material=veilMaterial;veil.name='veil';veil.geometry.translate(0,-.235,0);veil.position.y=.235;root.add(veil);}
  return {root,eyeMesh,antennae,veil};
}

function armBone(upper,p,shell,outfit,build) {
  const b=tailor(new Piece(),p);
  const formal=['groom','suit','denim','track','folk','waistcoat','drummer','piper'].includes(outfit);
  if(!formal && outfit!=='bride'){
  if(upper) {
    b.rings([[-1,.039,.041],[-.83,.05,.046],[-.19,.063,.057],[0,.045,.045]],shell.wing,8);
    b.rings([[-.49,.078,.072],[-.36,.097,.083],[-.13,.093,.084],[0,.064,.060]],p.shirt,8);
    b.rings([[-.53,.073,.067],[-.46,.081,.071]],p.trim,8);
  } else {
    b.rings([[-1,.033,.031],[-.60,.035,.037],[-.19,.044,.044],[0,.039,.040]],shell.body,8);
    b.rings([[-.90,.04,.039],[-.83,.042,.040]],p.sash,8);
  }
  }
  if(outfit==='drummer'){
    if(upper)b.rings([[-1,.085,.076],[-.62,.113,.100],[-.25,.126,.119],[0,.108,.103]],p.shirt,16);
    else {
      b.rings([[-.95,.062,.057],[-.81,.082,.075],[-.48,.096,.081],[0,.090,.076]],p.shirt,16);
      b.rings([[-.99,.061,.059],[-.86,.069,.069]],0x647455,14);
    }
  } else if(formal){
    if(upper)b.rings([[-1,.073,.072],[-.66,.083,.087],[-.28,.109,.10],[0,.101,.095]],p.coat,14);
    else {b.rings([[-.91,.055,.061],[-.62,.065,.071],[-.23,.077,.076],[0,.074,.072]],p.coat,12);
      b.rings([[-1,.055,.056],[-.91,.058,.062]],p.shirt,12);}
  }else if(outfit==='bride'){
    if(upper){b.rings([[-1,.051,.050],[-.51,.071,.066]],0xfff1e6,14);b.rings([[-.56,.079,.081],[-.41,.112,.104],[-.16,.122,.111],[0,.076,.07]],0xfff7f0,18);}
    else b.rings([[-1,.046,.045],[-.42,.059,.060],[0,.058,.056]],0xfff3e8,12);
  }
  if(!upper)b.stone(0,0,0,formal?.073:.045,formal?.23:.16,formal?.069:.044,outfit==='bride'?0xfff1e6:outfit==='drummer'?p.shirt:formal?p.coat:shell.body,12);
  if(upper && !formal && outfit!=='bride'){
    b.rings([[-.94,.053,.054],[-.78,.071,.07],[-.58,.080,.079],[-.44,.076,.075]],shell.body,14);
  }
  const mesh=b.mesh();mesh.scale.x=build;mesh.scale.z=build;return mesh;
}
function legBone(upper,shell,outfit,p,side) {
  const b=tailor(new Piece(),p);
  const pants=['denim','track','suit','groom','waistcoat','drummer','piper','folk'].includes(outfit);
  if(outfit==='drummer'){
    if(upper)b.rings([[-1,.122,.126],[-.81,.188,.165],[-.52,.205,.193],[-.25,.195,.185],[0,.149,.151]],p.pant,18);
    else b.rings([[-1,.071,.067],[-.84,.080,.079],[-.53,.097,.095],[-.23,.123,.121],[0,.127,.129]],p.pant,16);
    if(!upper)for(const y of [-.79,-.72])b.rings([[y,.084,.083],[y+.027,.087,.084]],0x596447,12);
    return b.mesh();
  }
  if(pants){
    const baggy=outfit==='drummer' || outfit==='piper' || outfit==='waistcoat';
    const width=baggy?.140:.105;
    if(upper){
      b.rings([[-1,.077,.085],[-.64,width,.114],[-.21,width+.014,.122],[0,.099,.101]],p.pant,18);
      if(outfit==='denim') b.thread([side*.088,-.82,.047],[side*.103,-.14,.056],.006,p.trim);
    }else{
      const narrow=outfit==='track' || baggy;
      b.rings([[-1,narrow?.053:.080,.077],[-.78,narrow?.072:.088,.088],[-.22,.090,.095],[0,.076,.083]],p.pant,18);
      if(outfit==='denim') b.rings([[-1,.086,.081],[-.855,.087,.09]],0x7196ac,9);
    }

    if(!upper)b.stone(0,0,0,.079,.21,.084,p.pant,18);
    return b.mesh();
  }
  if(upper){
    b.rings([[-1,.053,.055],[-.65,.089,.088],[-.26,.104,.092],[0,.063,.066]],shell.wing,9);
    b.rings([[-.96,.058,.057],[-.82,.074,.068]],shell.amber,9);
  }else{
    b.rings([[-1,.034,.041],[-.74,.045,.05],[-.19,.055,.057],[0,.049,.051]],shell.body,8);
    for(const y of [-.68,-.45]) b.thread([.03,y,0],[.09,y+.085,-.03],.012,shell.edge);
  }
  return b.mesh();
}
function shoe(outfit,p) {
  const b=new Piece();
  const dress=['bride','gown','flowers','dots'].includes(outfit);
  const sneaker=outfit==='denim';
  const color=outfit==='bride'?0xe8d9c7:dress?p.sash:outfit==='drummer'?0x735337:sneaker?0xe8e3d9:0x352d2b;
  const width=dress?.062:.077, length=dress?.139:.153;
  // Rounded toe, a slim sole and a fitted ankle instead of the old block shoe.
  b.rings([[-.096,width*.89,length*.96,0,.046],[-.083,width,length,0,.046],
    [-.069,width,length,0,.046]],sneaker?0xcfcac1:sole,24);
  b.rings([[-.069,width,length,0,.046],[-.047,width*.97,length*.96,0,.047],
    [-.021,width*.85,length*.76,0,.037],[.017,width*.65,length*.46,0,.008],
    [.057,width*.60,length*.39,0,-.006],[.074,width*.57,length*.37,0,-.008]],color,24);
  if(!dress){
    for(let j=0;j<3;j++)b.thread([-.026,.025-j*.014,.048+j*.016],[.026,.025-j*.014,.048+j*.016],.003,sneaker?0xfff7e7:0x75665a);
  } else {
    for(let j=0;j<10;j++){
      const a=(j-5)*.22,c=(j-4)*.22;
      b.thread([Math.sin(a)*width*.84,-.015,.047+Math.cos(a)*.050],
        [Math.sin(c)*width*.84,-.015,.047+Math.cos(c)*.050],.003,outfit==='bride'?0xf4e6cf:p.trim);
    }
  }
  return b.mesh();
}

function makePalm(sign,skin,piper){
  const palm=new Piece();
  palm.rings([[.012,.027,.020],[0,.034,.023],[-.033,.036,.024],[-.055,.029,.022]],skin,18);
  // Four tapered fingers curl slightly forward; the thumb opposes the palm.
  if(!piper)for(let f=0;f<4;f++){
    const x=(f-1.5)*.017,pinky=f===(sign<0?0:3);
    const tip=pinky?-.092:-.071+.003*Math.abs(f-1.4);
    lock(palm,[[x,-.045,.002,.010],[x,-.062,.010,.010],
      [x,tip,pinky?.017:.030,.008],[x,tip+.002,pinky?.028:.042,.004]],skin);
  }
  lock(palm,[[-sign*.027,-.012,.008,.013],[-sign*.044,-.031,.017,.012],
    [-sign*.038,-.049,.030,.010],[-sign*.025,-.054,.032,.004]],skin);
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
  const shell=shells[style%shells.length];
  const group=new THREE.Group();
  group.userData.role=role;
  group.userData.outfit=outfit;
  const torso=makeTorso(role,outfit,skirt,p,shell);torso.name='bodice';
  const skirtMesh=torso.getObjectByName('skirt');
  const hemBase=role==='bride'?.18:outfit==='dots'?.43:outfit==='gown'?.23:.30;
  skirtMesh?.geometry.computeBoundingBox();
  const skirtBounds=skirtMesh?.geometry.boundingBox;
  const skirtBottom=skirtBounds?.min.y||-1;
  const skirtRadius=skirtBounds?Math.max(Math.abs(skirtBounds.min.x),Math.abs(skirtBounds.max.x),Math.abs(skirtBounds.min.z),Math.abs(skirtBounds.max.z)):0;
  const head=makeHead(style,role,outfit,skirt,p,shell);
  const scarf=makeScarf(p);
  group.add(torso,head.root,scarf.mesh);
  const older=role==='guest' && [5,7,10].includes(style) || role==='piper';
  const build=role==='drummer'?1.13:role==='groom'?1.14:role==='bride'?1:([1,.89,1.24,.93,1.21,.86,1.03,1.16,.91,1.28,.92,1.04][style%12]);
  torso.scale.set(build,1,1+(build-1)*.75);
  const proportions=role==='drummer'?[1.12,1.10,1.02]:[[1.01,1.10,1],[.95,1.18,1],[1.07,1.08,1],[.97,1.14,1]][style%4];
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
    zurna.position.set(0,-.142,.242);
    zurna.quaternion.setFromUnitVectors(down,pipeDir);
  }

  const limbs=[-1,1].map(sign=>{
    const upperArm=armBone(true,p,shell,outfit,build),forearm=armBone(false,p,shell,outfit,build);
    const thigh=legBone(true,shell,outfit,p,sign),shin=legBone(false,shell,outfit,p,sign),boot=shoe(outfit,p);
    if(skirt)thigh.visible=false;
    if(outfit==='bride' || outfit==='gown')shin.visible=false;
    const skin=role==='bride'?0xffeee1:shell.amber;
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
    for(let i=0;i<2;i++) {
      const side=i===0?-1:1;
      head.antennae[i].rotation.set(.045*Math.sin(seconds*2+side*.5),side*.035*Math.cos(seconds*1.4),side*.05*Math.sin(seconds*1.8+.5));

    }
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
