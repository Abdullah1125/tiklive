import {gifts,defaultGiftRules,selectedGifts,checkGiftRules} from './wedding.js';
export function setupGiftSettings(control){
  const host=document.querySelector('#giftSettings'),form=host.querySelector('form'),rows=host.querySelector('#giftAssignments'),feedback=host.querySelector('#ruleFeedback');
  const search=host.querySelector('#giftSearch'),refresh=host.querySelector('#loadGiftCatalog'),guide=host.querySelector('#giftGuide');
  const catalog=new Map(),selections=new Map();let rules=defaultGiftRules,version;
  for(const gift of gifts){
    const label=document.createElement('label'),select=document.createElement('select');select.ariaLabel=gift.action+' hediyesi';
    label.append(gift.action,select);rows.append(label);selections.set(gift.key,select);
  }
  function options(){
    const query=search.value.trim().toLocaleLowerCase('tr');
    for(const select of selections.values()){
      const selected=select.value;select.replaceChildren(new Option('Eşleştirilmedi · kapalı',''));
      const choices=[...catalog].filter(([id,g])=>id===selected || !query || (g.name+' '+id).toLocaleLowerCase('tr').includes(query)).sort((a,b)=>a[1].name.localeCompare(b[1].name,'tr'));
      for(const [id,gift] of choices)select.append(new Option(gift.name+' · #'+id,id));
      select.value=selected;
    }
  }
  refresh.onclick=async()=>{
    refresh.disabled=true;feedback.textContent='TikTok hediye listesi alınıyor…';
    try{
      const r=await fetch('/api/gifts'),data=await r.json();if(!r.ok)throw Error(data.error);
      for(const gift of data.gifts)catalog.set(gift.id,gift);
      options();feedback.textContent=data.warning || data.gifts.length+' hediye yüklendi. Eylemleri seçip kaydet.';
    }catch(e){feedback.textContent=e.message || 'Katalog alınamadı.';}
    finally{refresh.disabled=false;}
  };
  search.oninput=options;
  form.onsubmit=async e=>{
    e.preventDefault();
    try{
      const assignments={};
      for(const [key,select] of selections){if(select.value)assignments[key]={id:select.value,name:catalog.get(select.value).name};}
      const next=checkGiftRules({mode:'named',minimum:rules.minimum||defaultGiftRules.minimum,assignments,showGuide:guide.checked});
      if(await control({action:'giftRules',rules:next}))feedback.textContent='Kaydedildi. Hediyeler TikTok kimliğine göre eşleşiyor; jeton fiyatını TikTok belirler.';
    }catch(e){feedback.textContent=e.message;}
  };
  return s=>{
    host.hidden=s.game!=='halay';const next=s.giftRules||defaultGiftRules,key=JSON.stringify(next);
    if(version===key)return;version=key;rules=next;
    const chosen=selectedGifts(rules);for(const g of chosen)catalog.set(g.ids[0],{id:g.ids[0],name:g.name});
    options();for(const [key,select] of selections)select.value=chosen.find(g=>g.key===key)?.ids[0]||'';
    guide.checked=rules.showGuide===true;
    host.querySelector('#giftLegacy').hidden=rules.mode!=='coins';
  };
}
