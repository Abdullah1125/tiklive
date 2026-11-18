import {isWedding} from './wedding.js';
export function setupPlaylist(){
  const host=document.querySelector('.playlist-settings');
  let current,key;
  if(!host)return ()=>{};
  const list=host.querySelector('ol'),message=host.querySelector('[role=status]'),picker=host.querySelector('input');
  async function command(command,extra={}){
    try{
      const r=await fetch('/api/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'playlist',command,...extra})});
      const body=await r.json();if(!r.ok)throw Error(body.error);
      message.textContent=command==='order'?'Sıra güncellendi; çalan parça kesilmedi.':command==='pause'?'Liste duraklatıldı.':'Müzik ayarı güncellendi.';
      update(body);
    }catch(e){message.textContent=e.message;}
  }
  host.querySelector('[data-playlist=play]').onclick=()=>command('play');
  host.querySelector('[data-playlist=pause]').onclick=()=>command('pause');
  host.querySelector('[data-playlist=next]').onclick=()=>command('next');
  host.querySelector('[data-playlist=previous]').onclick=()=>command('previous');
  host.querySelector('[data-playlist=legacy]').onclick=()=>command('legacy');
  picker.onchange=async()=>{
    const files=Array.from(picker.files);picker.disabled=true;
    let count=0;
    try{
      for(const file of files){
        message.textContent=`Ekleniyor: ${file.name}`;
        const r=await fetch('/api/playlist/upload?name='+encodeURIComponent(file.name),{method:'POST',headers:{'Content-Type':'audio/mpeg'},body:file});
        const body=await r.json();if(!r.ok)throw Error(body.error);
        count++;update({game:'halay',playlist:body});
      }
      message.textContent=`${count} parça eklendi. Başlatmak için Listeden çal düğmesine bas.`;
    }catch(e){message.textContent=`${count} parça eklendi. ${e.message}`;}
    finally{picker.disabled=false;picker.value='';}
  };
  function button(text,label,action,disabled=false){const b=document.createElement('button');b.type='button';b.textContent=text;b.ariaLabel=label;b.disabled=disabled;b.onclick=action;return b;}
  function update(s){
    host.hidden=!isWedding(s.game);current=s.playlist||{tracks:[]};
    const version=JSON.stringify(current);if(key===version)return;key=version;
    host.querySelector('.playlist-now').textContent=current.active?`${current.playing?'Çalıyor':'Duraklatıldı'}: ${current.tracks.find(t=>t.id===current.current)?.title||''}`:'Mevcut tek MP3 düzeni etkin';
    list.replaceChildren();
    current.tracks.forEach((track,i)=>{
      const row=document.createElement('li'),name=document.createElement('span');name.textContent=track.title;
      row.classList.toggle('selected',current.active && current.current===track.id);
      const move=offset=>{const ids=current.tracks.map(t=>t.id);[ids[i],ids[i+offset]]=[ids[i+offset],ids[i]];command('order',{ids});};
      row.append(name,button('Çal',track.title+' çal',()=>command('play',{id:track.id})),button('↑',track.title+' yukarı',()=>move(-1),i===0),button('↓',track.title+' aşağı',()=>move(1),i===current.tracks.length-1));list.append(row);
    });
    for(const b of host.querySelectorAll('[data-playlist]'))b.disabled=!current.tracks.length;
  }
  return update;
}
