// One local soundtrack, shared by the studio and broadcast browser profiles.
import {stat,open,rename,unlink,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const directory=new URL('../muzik/',import.meta.url);
const recording=new URL('dugun.mp3',directory);
const limit=128*1024*1024;
export async function trackVersion(){
  try {return (await stat(recording)).mtimeMs;} catch(err){if(err.code==='ENOENT')return 0;throw err;}
}
export async function saveTrack(req, target=recording){
  const invalid=message=>Object.assign(new Error(message),{status:400});
  if(req.headers['content-type']!=='audio/mpeg' || Number(req.headers['content-length'])>limit)throw invalid('En fazla 128 MB boyutunda bir MP3 seçin.');
  const targetDirectory=new URL('.',target);
  await mkdir(targetDirectory,{recursive:true});
  const temp=new URL(randomUUID()+'.part',targetDirectory);
  const file=await open(temp,'wx',0o600);
  let bytes=0,signature=Buffer.alloc(0);
  try{
    for await(const chunk of req){
      bytes+=chunk.length;
      if(bytes>limit)throw invalid('MP3 dosyası 128 MB sınırını aşıyor.');
      if(signature.length<3)signature=Buffer.concat([signature,chunk.subarray(0,3-signature.length)]);
      await file.writeFile(chunk);
    }
    if(bytes<4 || !(signature.toString()==='ID3' || (signature[0]===255 && (signature[1]&224)===224)))throw invalid('Dosya MP3 olarak okunamadı.');
    await file.close();await rename(temp,target);
  }finally{await file.close();await unlink(temp).catch(()=>{});}
  return (await stat(target)).mtimeMs;
}
export async function serveTrack(req,res,target=recording){
  const file=await open(target,'r').catch(()=>null);
  if(!file){res.writeHead(404);res.end();return;}
  try{
    const {size}=await file.stat(),range=req.headers.range;
    let start=0,end=size-1;
    if(range){
      const m=/^bytes=(\d*)-(\d*)$/.exec(range);
      if(m && (m[1]||m[2])){
        start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2]));
        end=m[1]&&m[2]?Math.min(size-1,Number(m[2])):size-1;
      }else start=size;
      if(start>end || start>=size){res.writeHead(416,{'Content-Range':'bytes */'+size});res.end();await file.close();return;}
    }
    res.writeHead(range?206:200,{'Content-Type':'audio/mpeg','Accept-Ranges':'bytes','Content-Length':end-start+1,...(range?{'Content-Range':'bytes '+start+'-'+end+'/'+size}:{})});
    const stream=file.createReadStream({start,end});res.on('close',()=>stream.destroy());stream.on('error',()=>res.destroy());stream.pipe(res);
  }catch(e){await file.close();throw e;}
}
