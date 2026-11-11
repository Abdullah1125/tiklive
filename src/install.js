import {access} from 'node:fs/promises';
export async function checkInstallation(root=new URL('../',import.meta.url)){
  for(const file of ['three.module.min.js','three.core.min.js']){
    try{await access(new URL('node_modules/three/build/'+file,root));}
    catch{throw Error('3B oyun dosyaları eksik. Proje klasöründe önce "npm ci", ardından "npm start" çalıştırın. Eksik dosya: '+file);}
  }
}
