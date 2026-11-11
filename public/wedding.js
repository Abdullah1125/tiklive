export function avatarUrl(value) {
  if (typeof value !== 'string' || value.length > 4096) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

export function userAvatar(user = {}) {
  for (const source of [user.avatarThumb, user.avatarMedium, user.avatarLarge,
    user.avatar_thumb, user.avatar_medium, user.avatar_large, user.profilePictureUrl, user.profilePicture]) {
    const candidates = typeof source === 'string' ? [source] : Array.isArray(source) ? source : source?.urlList || source?.url_list || [];
    if (!Array.isArray(candidates)) continue;
    for (const candidate of candidates) { const url = avatarUrl(candidate); if (url) return url; }
  }
  return '';
}

// Unit prices and icons are matched against the Turkish LIVE Studio gift picker.
export const gifts = [
  {key:'gold',icon:'🌹',name:'Gül',coins:1,action:'Altın tak',ids:['5655'],aliases:['Rose']},
  {key:'leader',icon:'🎵',name:'TikTok',coins:1,action:'Halaybaşı ol',role:'Halaybaşı',ids:['5269'],aliases:[]},
  {key:'drummer',icon:'🫰',name:'Finger Heart',coins:5,action:'Davul çal',role:'Davulcu',ids:['5487'],aliases:['Parmak kalbi']},
  {key:'piper',icon:'☕',name:'Türk kahvesi',coins:5,action:'Zurna çal',role:'Zurnacı',ids:['5994'],aliases:['Turkish Coffee']},
  {key:'confetti',icon:'❤️',name:'Kalp',coins:10,action:'Konfeti patlat',ids:['5282'],aliases:['Heart']},
  {key:'money',icon:'🕹️',name:'Level Up Arcade',coins:10,action:'Para saç',ids:['1195081'],aliases:['Level-up Arcade']},
  {key:'bride',icon:'💄',name:'Minik Allık',coins:20,action:'Gelin ol',role:'Gelin',ids:['1473096'],aliases:['Tiny Blush']},
  {key:'groom',icon:'😡',name:'Öfke Modu',coins:20,action:'Damat ol',role:'Damat',ids:['1473095'],aliases:['Rage Mode']}
];
const normalizeName=value=>String(value).trim().normalize('NFKC').toLowerCase().replace(/ı|i\u0307/g,'i').replace(/[-_]+/g,' ').replace(/\s+/g,' ');
export function weddingGift(id,name='',coins) {
  const giftId = String(id ?? '').trim();
  if (giftId && giftId !== '0') {
    return gifts.find(gift => gift.ids.includes(giftId) && (coins == null || Number(coins) === gift.coins));
  }
  const label = normalizeName(name);
  return gifts.find(gift => gift.coins === Number(coins) &&
    [gift.name, ...gift.aliases].some(alias => normalizeName(alias) === label));
}

export const defaultGiftRules = {
  mode:'named',
  assignments:{},showGuide:false,
  minimum:{gold:2, leader:1, confetti:5, money:10, drummer:20, piper:30, groom:50, bride:100}
};

export function checkGiftRules(rules) {
  if (!['named','coins'].includes(rules?.mode)) throw Error('Hediye türünü seç.');
  const minimum=Object.fromEntries(gifts.map(g=>[g.key,rules.minimum?.[g.key]]));
  const prices=Object.values(minimum);
  if (prices.some(n=>!Number.isSafeInteger(n) || n<1)) throw Error('Her rol için pozitif bir tam sayı gir.');
  if (new Set(prices).size!==prices.length) throw Error('İki rol aynı jeton değerinden başlayamaz.');
  const result={mode:rules.mode,minimum,showGuide:rules.showGuide===true};
  if(rules.assignments!==undefined){
    if(!rules.assignments || typeof rules.assignments!=='object' || Array.isArray(rules.assignments))throw Error('Hediye eşleştirmeleri geçersiz.');
    const assignments={},seen=new Set();
    for(const gift of gifts){
      const value=rules.assignments[gift.key];if(value==null)continue;
      const id=String(value.id||'');
      if(!/^\d{1,20}$/.test(id) || id==='0' || typeof value.name!=='string' || !value.name.trim())throw Error(gift.action+' için geçerli bir TikTok hediyesi seç.');
      if(seen.has(id))throw Error('Aynı hediye iki farklı eyleme atanamaz.');
      seen.add(id);assignments[gift.key]={id,name:value.name.trim().slice(0,80)};
    }
    result.assignments=assignments;
  }
  return result;
}

export function selectedGifts(rules){
  if(rules?.assignments===undefined)return gifts;
  return gifts.filter(g=>rules.assignments[g.key]).map(g=>({...g,name:rules.assignments[g.key].name,ids:[rules.assignments[g.key].id],custom:true}));
}

export function resolveWeddingGift(rules,event){
  if(rules?.mode==='coins')return giftForCoins(rules,event.coins);
  if(rules?.assignments===undefined)return weddingGift(event.giftId,event.gift,event.coins);
  // TikTok owns prices; a selected gift is identified by its immutable ID.
  return selectedGifts(rules).find(g=>g.ids.includes(String(event.giftId)));
}

export function coinBands(rules) {
  const ordered=gifts.map(g=>({...g,min:rules.minimum[g.key]})).sort((a,b)=>a.min-b.min);
  return ordered.map((g,i)=>({...g,max:ordered[i+1]?ordered[i+1].min-1:Infinity}));
}

export function coinLabel({min,max}) {
  if (max===Infinity) return min+'+ jeton';
  return (min===max ? min : min+'–'+max)+' jeton';
}

export function giftForCoins(rules,coins) {
  if (Number.isSafeInteger(coins)) return coinBands(rules).find(g=>coins>=g.min && coins<=g.max);
}

// The server schedules the same camera cuts for the panel and OBS.
export const defaultSceneSettings={formation:'circle',energy:1,tours:true};
export function checkSceneSettings(value) {
  if (!['circle','arc'].includes(value?.formation) || typeof value?.tours!=='boolean' ||
      typeof value?.energy!=='number' || !Number.isFinite(value.energy) || value.energy<.5 || value.energy>1.5) {
    throw Error('Halay düzeni, kamera ve hareket ayarlarını kontrol et.');
  }
  return {formation:value.formation,energy:value.energy,tours:value.tours};
}

export const walkDuration = 7200;
export const wideBreak = 1600;
const maxShots = 24;

export function arrivalStart(previous, joinedAt, shots, playerId, now) {
  const current=shots?.find(shot=>shot.playerId===playerId && shot.at<=now && now<shot.end);
  if(current && current.tier!=='join')return now-walkDuration;
  const join=shots?.find(shot=>shot.playerId===playerId && shot.tier==='join' && shot.end>now);
  if(join && (previous===undefined || now<previous))return join.at;
  return previous ?? joinedAt;
}

function appendShot(shots, shot, now) {
  const previous = shots.at(-1);
  const at = previous ? Math.max(now, previous.end + wideBreak) : now;
  const duration = shot.duration ?? (shot.tier === 'join' ? walkDuration + 1800 : shot.tier === 'leader' ? 10000 : 6500);
  shots.push({...shot, at, end: at + duration});
}

export function scheduleShot(state, event, now) {
  const shots = state.shots.filter(shot => shot.end + wideBreak > now);
  state.shots = shots;
  const pending = shots.find(shot =>
    shot.at > now && shot.playerId === event.playerId && shot.tier === event.tier);
  if (pending) {
    pending.count++;
    return;
  }
  const incoming = {...event, count: 1};
  if (event.tier === 'join') {
    if (shots.length < maxShots) appendShot(shots, incoming, now);
    return;
  }

  // An ongoing join gives up the camera immediately. Keep the timing of gifts,
  // including the wide break after each one, and rebook the waiting joins.
  const gifts = shots.filter(shot => shot.tier !== 'join');
  if (gifts.length >= maxShots) return;
  appendShot(gifts, incoming, now);
  for (const shot of shots) {
    if (gifts.length === maxShots) break;
    if (shot.tier === 'join' && shot.at > now && shot.playerId !== event.playerId) {
      appendShot(gifts, shot, now);
    }
  }
  state.shots = gifts;
}
export function onAir(state, now = Date.now()) {
  return state.shots?.find(s => s.at <= now && now < s.end);
}
