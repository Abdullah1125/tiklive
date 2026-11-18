import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Vector3} from 'three';

// Browser code uses the local Three.js URL served to OBS; use the same installed
// package for the geometric regression checks without creating a WebGL context.
const source=(await readFile(new URL('../public/dancers.js',import.meta.url),'utf8')).replace("'/three.module.js'",JSON.stringify(import.meta.resolve('three')));
const {makeDancer,placeJoinedHand,halayHandHeight}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('çiftin kolları sıraya girerken uzamaz; dirsek, bilek ve el her karede birleşir',()=>{
  const end=new Vector3(), target=new Vector3(4,-1,2);
  for(const role of ['bride','groom']){
    const actor=makeDancer(1,role);
    for(let i=0;i<160;i++){
      actor.pose({phase:i*.34,energy:1.4,moves:{squat:1,knee:.5,shoulder:.5,stamp:.5},greeting:(i%30)/30,entryStyle:i%3,jump:.25*Math.max(0,Math.sin(i*.34)),link:(1-Math.cos(i*.09))*.5,leftHand:target,rightHand:target});
      for(const sign of [-1,1]){
        const upper=actor.group.getObjectByName('upperArm:'+sign),lower=actor.group.getObjectByName('forearm:'+sign),hand=actor.group.getObjectByName('hand:'+sign);
        assert.ok(Math.abs(upper.scale.y-.35)<1e-5 && Math.abs(lower.scale.y-.34)<1e-5);
        for(const [a,b] of [[upper,lower],[lower,hand]]){
          end.set(0,-a.scale.y,0).applyQuaternion(a.quaternion).add(a.position);
          assert.ok(end.distanceTo(b.position)<1e-6);
        }
      }
    }
    actor.dispose();
  }
});

test('diz kırma, çömelme ve ayak vurmada bacak boyları sabit kalır',()=>{
  for(const role of ['guest','groom']){
    const actor=makeDancer(1,role);
    for(const figure of ['shoulder','knee','stamp','squat','heel','sway'])for(let i=0;i<120;i++){
      actor.pose({phase:i*.21,moves:{[figure]:1},energy:1.4});
      for(const sign of [-1,1]){
        const thigh=actor.group.getObjectByName('thigh:'+sign),shin=actor.group.getObjectByName('shin:'+sign),boot=actor.group.getObjectByName('boot:'+sign);
        assert.ok(Math.abs(thigh.scale.y-.497)<1e-5);
        assert.ok(Math.abs(shin.scale.y-.475)<1e-5);
        assert.ok(boot.position.y>=.05);
      }
    }
    actor.dispose();
  }
});

test('hızlı halayda vuruş geçişleri gövde, eller ve ayaklarda hız sıçraması oluşturmaz',()=>{
  const actor=makeDancer(1,'guest'),eps=.0001;
  for(const figure of ['step','knee','shoulder','stamp','heel','sway'])for(let beat=1;beat<=8;beat++){
    const positions=[];
    for(const offset of [-eps,0,eps]){
      actor.pose({phase:beat*Math.PI*2+offset,moves:{[figure]:1},energy:1.15});
      positions.push(Object.fromEntries(['bodice','boot:-1','boot:1','hand:-1','hand:1'].map(name=>[name,actor.group.getObjectByName(name).position.clone()])));
    }
    for(const name of Object.keys(positions[0])){
      const dv=positions[2][name].clone().sub(positions[1][name]).sub(positions[1][name].clone().sub(positions[0][name])).length()/eps;
      assert.ok(dv<.002,figure+' '+name+' hız sıçraması: '+dv);
    }
  }
  actor.dispose();
});

test('gelinlik ve abiyeler çömelme, eğilme ve yüksek adımda zemine girmez',()=>{
  const point=new Vector3();
  for(const [style,role] of [[0,'bride'],[0,'guest'],[3,'guest'],[6,'guest'],[8,'guest'],[11,'guest']]){
    const actor=makeDancer(style,role),skirt=actor.group.getObjectByName('skirt');
    const vertices=skirt.geometry.attributes.position;
    for(let i=0;i<128;i++){
      actor.pose({phase:i*Math.PI/8,energy:1.15,moves:{squat:1,knee:.5},greeting:.6,entryStyle:1});
      actor.group.updateMatrixWorld(true);
      for(let j=0;j<vertices.count;j++){
        point.fromBufferAttribute(vertices,j).applyMatrix4(skirt.matrixWorld);
        assert.ok(point.y>=.025,role+' '+style+' etek zemine girdi: '+point.y);
      }
      assert.equal(actor.group.getObjectByName('thigh:-1').visible,false);
      assert.equal(actor.group.getObjectByName('thigh:1').visible,false);
    }
    actor.dispose();
  }
});


test('ayakkabı tabanı hareketlerde zeminin üzerinde kalır, iki ayak birbirini kesmez',()=>{
  const point=new Vector3();
  for(const [style,role] of [[1,'guest'],[2,'guest'],[0,'bride'],[1,'groom'],[0,'drummer']]){
    const actor=makeDancer(style,role);
    for(const figure of ['step','heel','sway','stamp','squat'])for(let i=0;i<64;i++){
      actor.pose({phase:i*Math.PI/4,energy:1.15,moves:{[figure]:1}});
      actor.group.updateMatrixWorld(true);
      const left=actor.group.getObjectByName('boot:-1'),right=actor.group.getObjectByName('boot:1');
      assert.ok(right.position.x-left.position.x>.16,role+' ayaklar çakıştı');
      for(const boot of [left,right]){
        const vertices=boot.geometry.attributes.position;
        for(let j=0;j<vertices.count;j++){
          point.fromBufferAttribute(vertices,j).applyMatrix4(boot.matrixWorld);
          assert.ok(point.y>=.004,role+' taban zemine girdi: '+point.y);
        }
      }
    }
    actor.dispose();
  }
});

test('halay tutuşmasında avuçlar ve komşu dirsekler ayrı kalır; parmaklar birleşir',()=>{
  for(const [sa,sb,scaleA,scaleB] of [[1,2,.78,.86],[2,7,.86,.80],[3,6,.79,.83]]){
    const a=makeDancer(sa,'guest'),b=makeDancer(sb,'guest');
    a.group.position.set(-.52,0,0);b.group.position.set(.52,0,0);
    a.group.scale.setScalar(scaleA);b.group.scale.setScalar(scaleB);
    const wa=new Vector3(),ga=new Vector3(),wb=new Vector3(),gb=new Vector3(),pa=new Vector3(),pb=new Vector3();
    for(const offset of [0,40*Math.PI*2])for(const leading of [false,true])for(const yaw of [0,.17])for(const figure of ['step','squat','knee','heel'])for(let i=0;i<128;i++){
      a.group.rotation.y=yaw;b.group.rotation.y=-yaw;
      const phase=i*Math.PI/8+offset;
      const crouch=figure==='squat'?(.5-.5*Math.cos(phase*.25))*.34:figure==='knee'?Math.sin(phase*.5)**2*.18:0;
      const height=halayHandHeight(phase,{[figure]:1});
      placeJoinedHand(wa,ga,a.group.position,b.group.position,scaleA,scaleB,yaw,height);
      placeJoinedHand(wb,gb,b.group.position,a.group.position,scaleB,scaleA,-yaw,height);
      a.pose({phase,leader:leading,moves:{[figure]:1},rightHand:wa,rightGrip:ga});
      if(leading){
        assert.ok(a.group.getObjectByName('hand:-1').position.y>a.group.getObjectByName('hand:1').position.y+.18);
        assert.ok(a.group.getObjectByName('handkerchief').visible);
      }
      b.pose({phase,moves:{[figure]:1},leftHand:wb,leftGrip:gb});
      a.group.updateMatrixWorld(true);b.group.updateMatrixWorld(true);
      for(const [actor,side] of [[a,1],[b,-1]]){
        assert.ok(Math.abs(actor.group.getObjectByName('upperArm:'+side).scale.y-.35)<1e-6);
        assert.ok(Math.abs(actor.group.getObjectByName('forearm:'+side).scale.y-.34)<1e-6);
      }
      const ha=a.group.getObjectByName('hand:1'),hb=b.group.getObjectByName('hand:-1');
      ha.getWorldPosition(pa);hb.getWorldPosition(pb);
      assert.ok(pa.distanceTo(pb)>.12,'avuç merkezleri birbirine girdi');
      ha.localToWorld(pa.set(0,-.087,.017));hb.localToWorld(pb.set(0,-.087,.017));
      assert.ok(pa.distanceTo(pb)<.08,'parmak uçları ayrıldı: '+pa.distanceTo(pb)+' '+sa+','+sb+' '+figure+' '+i);
      a.group.getObjectByName('forearm:1').getWorldPosition(pa);
      b.group.getObjectByName('forearm:-1').getWorldPosition(pb);
      assert.ok(pa.distanceTo(pb)>.15,'dirsek '+sa+','+sb+' '+figure+' '+i+' yaw='+yaw+' uzaklık='+pa.distanceTo(pb)+' x='+(pb.x-pa.x));
    }
    a.dispose();b.dispose();
  }
});


test('eller çoğu zaman belde kalır; ortak kaldırma vuruşlarında yumuşak yükselip iner',()=>{
  const turn=Math.PI*2;
  for(let beat=0;beat<40;beat+=.25)assert.ok(halayHandHeight(beat*turn)<=1.12);
  assert.ok(halayHandHeight(44*turn)>1.44);
  assert.ok(halayHandHeight(48*turn)<1.12);
  const eps=.0001;
  for(const beat of [40,42,46,48]){
    const p=beat*turn;
    const acceleration=Math.abs(halayHandHeight(p+eps)-2*halayHandHeight(p)+halayHandHeight(p-eps))/eps;
    assert.ok(acceleration<.001);
  }
});

test('blok karakterler: etek ve ayakkabı zemine girmez, uzuv boyları sabit kalır',()=>{
  const point=new Vector3();
  for(const [style,role] of [[0,'bride'],[1,'groom'],[0,'drummer'],[0,'piper'],[0,'guest'],[3,'guest'],[6,'guest'],[9,'guest']]){
    const actor=makeDancer(style,role,'block');
    assert.equal(actor.group.getObjectByName('bodice').children.some(c=>c.name==='skirt'),['bride'].includes(role)||[0,3,6].includes(style%8)&&role==='guest');
    for(let i=0;i<64;i++){
      actor.pose({phase:i*Math.PI/8,energy:1.15,moves:{squat:1,knee:.5},greeting:.6,entryStyle:1});
      actor.group.updateMatrixWorld(true);
      // Under a skirt the hidden shin is shortened at the hem, as in the original wedding.
      if(!actor.group.getObjectByName('skirt'))for(const sign of [-1,1]){
        assert.ok(Math.abs(actor.group.getObjectByName('thigh:'+sign).scale.y-.497)<1e-5);
        assert.ok(Math.abs(actor.group.getObjectByName('shin:'+sign).scale.y-.475)<1e-5);
      }
      for(const name of ['skirt','boot:-1','boot:1']){
        const mesh=actor.group.getObjectByName(name);
        if(!mesh?.visible)continue;
        const v=mesh.geometry.attributes.position;
        for(let j=0;j<v.count;j++){
          point.fromBufferAttribute(v,j).applyMatrix4(mesh.matrixWorld);
          assert.ok(point.y>=.004,role+' '+style+' '+name+' zemine girdi: '+point.y);
        }
      }
    }
    actor.dispose();
  }
});
