import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {checkInstallation} from '../src/install.js';
test('fresh installation reports the npm ci step when browser Three.js files are missing',async()=>{
 const path=await mkdtemp(tmpdir()+'/halay-install-'),root=pathToFileURL(path+'/');
 try{
  await assert.rejects(checkInstallation(root),/npm ci/);
  await mkdir(new URL('node_modules/three/build/',root),{recursive:true});
  await writeFile(new URL('node_modules/three/build/three.module.min.js',root),'');
  await assert.rejects(checkInstallation(root),/three.core.min.js/);
  await writeFile(new URL('node_modules/three/build/three.core.min.js',root),'');
  await checkInstallation(root);
 }finally{await rm(path,{recursive:true,force:true});}
});
