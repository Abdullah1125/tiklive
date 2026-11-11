import {gifts,onAir,defaultGiftRules,coinBands,coinLabel,walkDuration} from './wedding.js';
import {attachMusicMotion} from './music-motion.js';

const byKey=new Map(gifts.map(g=>[g.key,g]));
export function setupWedding() {
  const deck=document.querySelector('.wedding-deck');
  const guide=deck.querySelector('.gift-guide');
  const cameraClip=deck.querySelector('.wedding-cam');
  cameraClip.addEventListener('error',()=>{cameraClip.hidden=true;});
  if(cameraClip.error)cameraClip.hidden=true;
  const announce=document.querySelector('.wedding-callout');
  let guideVersion;
  function updateGuide(rules){
    const version=JSON.stringify(rules);
    if (guideVersion===version)return;
    guideVersion=version;
    const rewards=rules.mode==='coins'?coinBands(rules).map(g=>({...g,name:coinLabel(g),icon:'🪙'})):gifts;
    guide.replaceChildren();
    for (const rule of rewards) {
      const tile=document.createElement('div');
      const icon=document.createElement('span');
      icon.className='gift-symbol';
      icon.setAttribute('aria-hidden','true');
      icon.textContent=rule.icon;
      if (rules.mode==='named') {
        const img=document.createElement('img');
        img.alt='';
        img.onload=()=>icon.replaceChildren(img);
        img.src='/gift-icons/'+rule.key+'.webp';
      }
      const text=document.createElement('div'),name=document.createElement('strong'),action=document.createElement('small');
      name.textContent=rules.mode==='named' && rule.coins ? rule.name+' · '+rule.coins+' jeton' : rule.name;
      action.textContent=rule.action;
      text.append(name,action);tile.append(icon,text);guide.append(tile);
    }
  }
  const sound=document.querySelector('.sound-toggle');
  const broadcast=document.body.classList.contains('overlay');
  const obsMediaSource=broadcast && new URLSearchParams(location.search).get('music')==='obs';
  // Kept off the page: no transport controls or media slot in the broadcast.
  const audio=new Audio();
  audio.loop=true;
  audio.hidden=true;
  document.body.append(audio);
  const releaseMotion=attachMusicMotion(audio);
  let active=false,state,source=0,enabled=broadcast;
  const settings=document.querySelector('.track-settings'),status=settings?.querySelector('small');
  if(settings){
    const picker=settings.querySelector('input');
    picker.onchange=async()=>{
      const file=picker.files[0]; if(!file)return;
      picker.disabled=true;status.textContent='Ses dosyası yerel stüdyoya kaydediliyor…';
      try{
        const r=await fetch('/api/music',{method:'POST',headers:{'Content-Type':'audio/mpeg'},body:file});
        if(!r.ok)throw new Error((await r.json()).error);
        status.textContent='Yerel MP3 · Döngü açık';
      }catch(err){status.textContent=err.message || 'Dosya yüklenemedi.';}
      finally{picker.value='';picker.disabled=false;}
    };
  }
  function updatePreviewButton(){
    if(!sound)return;
    const playing=!audio.paused;
    sound.textContent=playing?'Dinlemeyi durdur':'Önizlemede dinle';
    sound.setAttribute('aria-pressed',String(playing));
    sound.disabled=!source;
  }
  function play(){
    audio.play().catch(err=>{
      if(source && settings && err.name!=='AbortError'){
        status.textContent=err.name==='NotAllowedError'?'Dinlemek için önizleme düğmesine bas.':'Ses dosyası çalınamadı. Başka bir MP3 seç.';
      }
    });
  }
  function syncMusic(){
    if(obsMediaSource)return; // The OBS scene mixes the looping MP3 directly.
    const queue=state?.playlist;
    const track=queue?.active?queue.tracks.find(t=>t.id===queue.current):null;
    const next=active?(track?track.id+':'+queue.revision:(state?.musicVersion||0)):0;
    if(source!==next){
      audio.pause();
      source=next;
      if(source){
        audio.loop=!track;
        audio.src=track?'/music/library/'+track.id+'.mp3':'/music/dugun.mp3?v='+encodeURIComponent(source);
        if(enabled && (!track || queue.playing))play();
      }else{audio.removeAttribute('src');audio.load();}
    }
    if(track){
      if(!queue.playing)audio.pause();
      else if(enabled && audio.paused && !audio.ended)play();
    }
    updatePreviewButton();
  }
  let ending=false;
  audio.addEventListener('ended',async()=>{
    const q=state?.playlist;
    if(!q?.active || !q.playing || ending || obsMediaSource)return;
    ending=true;
    try{
      const r=await fetch('/api/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'playlist',command:'ended',id:q.current,revision:q.revision})});
      if(!r.ok)throw Error('Sıradaki parçaya geçilemedi.');
    }catch(e){if(status)status.textContent=e.message;}
    finally{ending=false;}
  });
  audio.addEventListener('play',updatePreviewButton);
  audio.addEventListener('pause',updatePreviewButton);
  if(sound)sound.onclick=()=>{
    if(!source)return;
    enabled=audio.paused;
    if(enabled && (!state?.playlist?.active || state.playlist.playing))play();else audio.pause();
  };
  // If autoplay was blocked, an interaction with the stage unlocks sound
  // without adding a button or other visible element to the audience view.
  function unlock(){if(broadcast && source && audio.paused && (!state?.playlist?.active || state.playlist.playing))play();}
  if(broadcast){document.addEventListener('click',unlock);document.addEventListener('keydown',unlock);}
  function tick(){
    if (!active || !state) return;
    const m=onAir(state);
    const visible=!!m;
    announce.hidden=!visible;
    if (visible) {
      const g=byKey.get(m.tier);
      const action=m.tier==='join'?(Date.now()-m.at<walkDuration?'halaya geliyor':'halaya katıldı'):m.tier==='leader'?'mendili aldı':g?.role?g.role.toLocaleLowerCase('tr')+' oldu':m.tier==='gold'?'altın taktı':m.tier==='money'?'para saçtı':m.tier==='confetti'?'konfeti patlattı':'hediye gönderdi';
      announce.textContent=(state.giftRules?.mode==='coins' && m.tier!=='join'?'🪙':g?.icon || '✦')+'  '+m.name+' '+action+(m.count>1?' ×'+m.count:'');
    }
  }
  document.addEventListener('wedding-cut',tick);
  const timer=setInterval(tick,300);
  window.addEventListener('pagehide',e=>{if(!e.persisted){clearInterval(timer);audio.pause();releaseMotion();document.removeEventListener('click',unlock);document.removeEventListener('keydown',unlock);}}, {once:true});
  return s=>{
    if(status && (state?.musicVersion!==s.musicVersion || state?.playlist?.playing!==s.playlist?.playing || state?.playlist?.active!==s.playlist?.active)){
      const p=s.playlist;status.textContent=p?.active?(p.playing?'Çalma listesi · Sırayla ve döngüde':'Çalma listesi · Duraklatıldı'):s.musicVersion?'Yerel MP3 · Döngü açık':'Henüz MP3 seçilmedi';
    }
    state=s;
    const show=s.game==='halay';
    if(show && guide)updateGuide(s.giftRules || defaultGiftRules);
    if(active!==show){
      if(show)cameraClip.play().catch(()=>{});
      else cameraClip.pause();
    }
    active=show;syncMusic();if(settings)settings.hidden=!show;
    deck.hidden=!show;if(sound)sound.hidden=!show;
    if (!show) announce.hidden=true;
    tick();
  };
}
