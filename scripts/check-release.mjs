import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
const paths=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
if(!paths.length){console.error('Önce yayınlanacak dosyaları git add ile seçin.');process.exit(1);}
const forbidden=/^(?:\.env(?:\..*)?$|Kayitlar\/|muzik\/(?!\.gitkeep$)|public\/(?:dugun-kamerasi\.webm|wedding-portrait\.jpg)$|(?:koreografi|calma-listesi|hediye-ayarlari|sahne-ayarlari)\.json|obs\/Sinyal_Studio\.json$)/;
const secrets=[];
if(existsSync('.env'))for(const line of readFileSync('.env','utf8').split(/\r?\n/)){
 const match=/^\s*([A-Z_]*(?:KEY|TOKEN|SECRET|PASSWORD)[A-Z_]*)\s*=\s*(.*?)\s*$/.exec(line);
 if(match){const value=match[2].replace(/^(['"])(.*)\1$/,'$2');if(value.length>=8)secrets.push(value);}
}
const errors=[];
for(const path of paths){
 if(path!=='.env.example' && (forbidden.test(path)||/\.(?:log|pem|key|p12|zip)$/i.test(path)))errors.push(path+': özel dosya');
 const bytes=execFileSync('git',['show',':'+path],{maxBuffer:32*1024*1024});
 if(secrets.some(value=>bytes.includes(Buffer.from(value))))errors.push(path+': yerel gizli değer bulundu');
 if(/\.(?:js|mjs|json|md|html|css|yml|ini|command)$/.test(path)){
  const text=bytes.toString();
  if(/(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(text))errors.push(path+': olası erişim anahtarı');
  if(/\/Users\/[^/]+\//.test(text))errors.push(path+': bilgisayara özel mutlak yol');
 }
}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`${paths.length} dosya kontrol edildi; özel dosya veya bilinen gizli değer bulunmadı.`);
