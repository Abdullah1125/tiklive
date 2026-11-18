// Shared by the server simulation, the 3D scene and the studio panel.
export const LAP=520;          // metres per lap
export const LANES=4;
export const LANE_WIDTH=3.3;
export const RACE_CAPACITY=12;

// Every action is mapped to a TikTok gift by the broadcaster in the panel.
export const raceActions=[
  {key:'gas',icon:'⛽',action:'Gaz ver',kind:'boost',add:10,dur:4000,label:'GAZ verdi'},
  {key:'turbo',icon:'🔥',action:'Turbo',kind:'boost',add:18,dur:5000,label:'TURBO açtı'},
  {key:'nitro',icon:'💨',action:'Nitro',kind:'boost',add:30,dur:2500,label:'NİTRO bastı'},
  {key:'camera',icon:'🎥',action:'Kamerayı üstüne çek',kind:'camera',label:'kamerayı üstüne çekti'},
  {key:'shield',icon:'🛡️',action:'Kalkan',kind:'shield',dur:20000,label:'kalkan aldı'},
  {key:'repair',icon:'🔧',action:'Tamir et',kind:'repair',label:'arabasını tamir etti'},
  {key:'oil',icon:'🛢️',action:'Yağ dök (arkaya)',kind:'hazard',label:'arkasına yağ döktü'},
  {key:'spikes',icon:'📌',action:'Çivi tuzağı (arkaya)',kind:'hazard',label:'çivi tuzağı bıraktı'},
  {key:'cones',icon:'🚧',action:'Koni at (öndekine)',kind:'hazard',label:'öndekine koni attı'},
  {key:'barrier',icon:'🧱',action:'Barikat kur (lidere)',kind:'hazard',label:'liderin önüne barikat kurdu'},
  {key:'rocket',icon:'🚀',action:'Roket at (öndekine)',kind:'rocket',label:'roket fırlattı'},
  {key:'lightning',icon:'⚡',action:'Yıldırım (öndekilere)',kind:'lightning',label:'yıldırım çaktırdı'}
];
export const raceActionByKey=Object.fromEntries(raceActions.map(a=>[a.key,a]));

// What happens to a car that runs into something. factor scales its speed.
export const hitEffects={
  oil:{factor:.3,dur:1800,spin:true,label:'yağda kaydı'},
  spikes:{factor:.55,dur:3000,label:'çivilere bastı'},
  cones:{factor:.6,dur:1300,label:'konilere daldı'},
  barrier:{factor:0,dur:2000,label:'barikata çarptı'},
  rocket:{factor:0,dur:2200,spin:true,label:'roketle vuruldu'},
  lightning:{factor:.5,dur:3000,label:'yıldırım yedi'}
};

export const cameraModes={
  high:'Yüksekten takip (lider)',
  gifter:'En çok hediye atanı takip et',
  leader:'Lideri yakından takip et',
  aerial:'Tüm pist (kuşbakışı)'
};

export const defaultRaceSettings={
  joinChat:true, joinGift:true, joinGiftId:'5655', joinGiftName:'Gül',
  mode:'laps', laps:3, camera:'high', assignments:{}, showGuide:true
};

export function checkRaceSettings(input){
  const s=input&&typeof input==='object'?input:{};
  const result={joinChat:s.joinChat===true, joinGift:s.joinGift===true,
    joinGiftId:String(s.joinGiftId??'').trim(), joinGiftName:String(s.joinGiftName??'').trim().slice(0,80),
    mode:s.mode, laps:Number(s.laps), camera:s.camera, assignments:{}, showGuide:s.showGuide!==false};
  if(!result.joinChat && !result.joinGift)throw Error('Katılım için en az bir yol seç: “katıl” yazmak veya hediye göndermek.');
  if(result.joinGift && (!/^\d{1,20}$/.test(result.joinGiftId) || result.joinGiftId==='0' || !result.joinGiftName))
    throw Error('Katılım hediyesini seç.');
  if(!result.joinGift){result.joinGiftId='';result.joinGiftName='';}
  if(!['laps','endless'].includes(result.mode))throw Error('Yarış modunu seç.');
  if(!Number.isInteger(result.laps) || result.laps<1 || result.laps>20)throw Error('Tur sayısı 1 ile 20 arasında olmalı.');
  if(!Object.hasOwn(cameraModes,result.camera))throw Error('Kamera modunu seç.');
  const assignments=s.assignments&&typeof s.assignments==='object'&&!Array.isArray(s.assignments)?s.assignments:{};
  const seen=new Set(result.joinGift?[result.joinGiftId]:[]);
  for(const action of raceActions){
    const value=assignments[action.key];if(value==null)continue;
    const id=String(value.id||'');
    if(!/^\d{1,20}$/.test(id) || id==='0' || typeof value.name!=='string' || !value.name.trim())throw Error(action.action+' için geçerli bir TikTok hediyesi seç.');
    if(seen.has(id))throw Error('Aynı hediye iki farklı eyleme (katılım dahil) atanamaz.');
    seen.add(id);result.assignments[action.key]={id,name:value.name.trim().slice(0,80)};
  }
  return result;
}

const normalize=value=>String(value??'').trim().normalize('NFKC').toLocaleLowerCase('tr').replace(/\s+/g,' ');
// Returns 'join', an action key, or null. Gifts are matched by TikTok gift id;
// the name is used only when an event arrives without an id.
export function raceGiftFor(settings,event){
  const id=String(event.giftId??'').trim(),name=normalize(event.gift);
  const matches=(giftId,giftName,aliases=[])=>id&&id!=='0'?id===giftId:!!name&&[giftName,...aliases].some(n=>normalize(n)===name);
  if(settings.joinGift && matches(settings.joinGiftId,settings.joinGiftName,settings.joinGiftId==='5655'?['Rose','Gül']:[]))return 'join';
  for(const action of raceActions){
    const chosen=settings.assignments?.[action.key];
    if(chosen && matches(chosen.id,chosen.name))return action.key;
  }
  return null;
}

export function isJoinWord(text){
  const word=String(text).normalize('NFKC').toLocaleLowerCase('tr').replace(/[^\p{L}]/gu,'');
  return ['katıl','katil','kat','katılıyorum'].includes(word);
}
