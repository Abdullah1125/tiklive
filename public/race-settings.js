import {raceActions,cameraModes,defaultRaceSettings,checkRaceSettings} from './race-rules.js';

export function setupRaceSettings(control){
  const host=document.querySelector('#raceSettings'),form=host.querySelector('#raceForm');
  const $=id=>host.querySelector('#'+id),feedback=$('raceFeedback'),rows=$('raceAssignments');
  // Rose is preselected for new installs, so it is always offered.
  const catalog=new Map([['5655',{id:'5655',name:'Gül'}]]),selections=new Map();
  let version;
  for(const [key,label] of Object.entries(cameraModes))$('raceCamera').append(new Option(label,key));
  for(const action of raceActions){
    const label=document.createElement('label'),select=document.createElement('select');
    select.ariaLabel=action.action+' hediyesi';
    label.append(action.icon+' '+action.action,select);rows.append(label);selections.set(action.key,select);
  }
  const allSelects=()=>[$('raceJoinGiftSelect'),...selections.values()];
  function options(){
    const query=$('raceGiftSearch').value.trim().toLocaleLowerCase('tr');
    for(const select of allSelects()){
      const selected=select.value;
      select.replaceChildren(new Option(select===$('raceJoinGiftSelect')?'Hediye seç':'Eşleştirilmedi · kapalı',''));
      const choices=[...catalog].filter(([id,g])=>id===selected || !query || (g.name+' '+id).toLocaleLowerCase('tr').includes(query))
        .sort((a,b)=>a[1].name.localeCompare(b[1].name,'tr'));
      for(const [id,gift] of choices)select.append(new Option(gift.name+' · #'+id,id));
      select.value=selected;
    }
  }
  const syncMode=()=>{$('raceLaps').disabled=$('raceMode').value!=='laps';$('raceJoinGiftSelect').disabled=!$('raceJoinGift').checked;};
  $('raceMode').onchange=syncMode;$('raceJoinGift').onchange=syncMode;
  $('raceGiftSearch').oninput=options;
  $('raceLoadGifts').onclick=async()=>{
    const button=$('raceLoadGifts');button.disabled=true;feedback.textContent='TikTok hediye listesi alınıyor…';
    try{
      const r=await fetch('/api/gifts'),data=await r.json();if(!r.ok)throw Error(data.error);
      for(const gift of data.gifts)catalog.set(gift.id,gift);
      options();feedback.textContent=data.warning || data.gifts.length+' hediye yüklendi. Eylemleri seçip kaydet.';
    }catch(e){feedback.textContent=e.message || 'Katalog alınamadı.';}
    finally{button.disabled=false;}
  };
  $('raceRestart').onclick=async()=>{if(await control({action:'round'}))feedback.textContent='Yeni yarış geri sayımla başladı.';};
  form.onsubmit=async e=>{
    e.preventDefault();
    try{
      const assignments={};
      for(const [key,select] of selections)if(select.value)assignments[key]={id:select.value,name:catalog.get(select.value).name};
      const joinId=$('raceJoinGiftSelect').value;
      const next=checkRaceSettings({joinChat:$('raceJoinChat').checked,joinGift:$('raceJoinGift').checked,
        joinGiftId:joinId,joinGiftName:catalog.get(joinId)?.name||'',mode:$('raceMode').value,laps:Number($('raceLaps').value),
        camera:$('raceCamera').value,assignments,showGuide:$('raceGuide').checked});
      if(await control({action:'raceSettings',settings:next}))feedback.textContent='Kaydedildi. Mod veya tur sayısı değiştiyse yarış yeniden başlar.';
    }catch(error){feedback.textContent=error.message;}
  };
  return state=>{
    host.hidden=state.game!=='race';
    const settings=state.raceSettings||defaultRaceSettings,key=JSON.stringify(settings);
    if(version===key)return;version=key;
    if(settings.joinGiftId)catalog.set(settings.joinGiftId,{id:settings.joinGiftId,name:settings.joinGiftName});
    for(const g of Object.values(settings.assignments||{}))catalog.set(g.id,g);
    options();
    $('raceJoinChat').checked=settings.joinChat;$('raceJoinGift').checked=settings.joinGift;
    $('raceJoinGiftSelect').value=settings.joinGiftId||'5655';
    $('raceMode').value=settings.mode;$('raceLaps').value=settings.laps;$('raceCamera').value=settings.camera;
    for(const [k,select] of selections)select.value=settings.assignments?.[k]?.id||'';
    $('raceGuide').checked=settings.showGuide;
    syncMode();
  };
}
