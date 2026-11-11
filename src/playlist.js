import {readFile,writeFile,rename,stat} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {saveTrack} from './music.js';

export async function createPlaylist(root=new URL('../',import.meta.url)) {
  const config=new URL('calma-listesi.json',root),folder=new URL('muzik/',root);
  let state={tracks:[],current:null,active:false,playing:false,revision:0};
  try {
    const saved=JSON.parse(await readFile(config,'utf8'));
    if(!Array.isArray(saved.tracks) || saved.tracks.length>100)throw Error('Çalma listesi geçersiz.');
    const tracks=[];
    for(const track of saved.tracks){
      if(!/^[a-f0-9-]{36}$/.test(track.id) || typeof track.title!=='string')throw Error('Çalma listesi geçersiz.');
      try {await stat(new URL(track.id+'.mp3',folder));tracks.push(track);} catch(e){if(e.code!=='ENOENT')throw e;}
    }
    state={tracks,current:tracks.some(t=>t.id===saved.current)?saved.current:tracks[0]?.id||null,
      active:!!saved.active && !!tracks.length,playing:false,revision:0};
  }catch(e){if(e.code!=='ENOENT')throw e;}
  let pending=Promise.resolve();
  function serial(fn){const next=pending.then(fn);pending=next.catch(()=>{});return next;}
  async function persist(next){await writeFile(new URL(config.href+'.tmp'),JSON.stringify(next,null,2),{mode:0o600});await rename(new URL(config.href+'.tmp'),config);state=next;}
  function failure(message){return Object.assign(Error(message),{status:400});}
  return {
    snapshot:()=>structuredClone(state),
    file:id=>state.tracks.some(t=>t.id===id)?new URL(id+'.mp3',folder):null,
    add:(req,title)=>serial(async()=>{
      if(state.tracks.length>=100)throw failure('En fazla 100 parça ekleyebilirsin.');
      const id=randomUUID(),file=new URL(id+'.mp3',folder);
      await saveTrack(req,file);
      const version=(await stat(file)).mtimeMs;
      const clean=String(title||'Yeni parça').replace(/[\p{Cc}]/gu,'').slice(0,120).replace(/\.mp3$/i,'');
      await persist({...state,tracks:[...state.tracks,{id,title:clean,version}],current:state.current||id});
    }),
    control:body=>serial(async()=>{
      const next=structuredClone(state),index=next.tracks.findIndex(t=>t.id===next.current);
      if(body.command==='ended' && (body.revision!==next.revision || body.id!==next.current || !next.active || !next.playing))return;
      if(body.command==='order'){
        if(!Array.isArray(body.ids) || body.ids.length!==next.tracks.length || new Set(body.ids).size!==next.tracks.length || body.ids.some(id=>!next.tracks.some(t=>t.id===id)))throw failure('Parça sırası geçersiz.');
        next.tracks=body.ids.map(id=>next.tracks.find(t=>t.id===id));
      }else if(body.command==='legacy'){
        next.active=false;next.playing=false;next.revision++;
      }else if(body.command==='pause')next.playing=false;
      else if(['play','next','previous','ended'].includes(body.command)){
        if(!next.tracks.length)throw failure('Önce MP3 ekle.');
        let id=body.id||next.current;
        if(['next','previous','ended'].includes(body.command))id=next.tracks[(Math.max(0,index)+(body.command==='previous'?-1:1)+next.tracks.length)%next.tracks.length].id;
        if(!next.tracks.some(t=>t.id===id))throw failure('Parça bulunamadı.');
        if(id!==next.current || !next.active || body.command==='ended')next.revision++;
        next.current=id;next.active=true;next.playing=true;
      }else throw failure('Geçersiz müzik komutu.');
      await persist(next);
    })
  };
}
