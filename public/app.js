import {setupPlaylist} from './playlist.js';
import {setupWedding} from './wedding-view.js';
import {figures,commandNames,checkChoreography} from './choreography.js';
import {gifts,defaultGiftRules,checkGiftRules,defaultSceneSettings,checkSceneSettings} from './wedding.js';
import {fillIcons, icon} from './icons.js';
import {mountScene} from './stage.js';
import {games, stageText, subscribe} from './shared.js';

const $ = id => document.getElementById(id);
const scene = mountScene($('scene'));
const dialog = $('connection');
const weddingView=setupWedding();
const playlistView=setupPlaylist();
const clock = new Intl.DateTimeFormat('tr-TR', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
const format = new Intl.NumberFormat('tr-TR');
let current;
let toastTimer;
let busy = false;
const tabInfo = {
  studio:['Yayın stüdyosu','Oyun sahneni yönet ve TikTok etkileşimlerini takip et.'],
  games:['Oyunlar','Yayınında oynatmak istediğin oyunu seç. Oyun değiştiğinde yeni bir oturum başlar.'],
  activity:['Etkinlikler','Bu oyun oturumundaki son 60 etkileşimi takip et.']
};
function tab(key) {
  for (const name of Object.keys(tabInfo)) $(name).hidden = name !== key;
  document.querySelectorAll('[data-tab]').forEach(b => {
    b.classList.toggle('selected', b.dataset.tab === key);
    if (b.dataset.tab === key) b.setAttribute('aria-current','page');
    else b.removeAttribute('aria-current');
  });
  [$('heading').textContent, $('intro').textContent] = tabInfo[key];
}
function toast(text) {
  clearTimeout(toastTimer);
  $('toast').textContent = text;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => $('toast').hidden = true, 3200);
}
async function control(body) {
  if (busy) return;
  busy = true;
  try {
    const response = await fetch('/api/control', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    render(result);
    return true;
  } catch (error) {
    if (dialog.open) $('connectionStatus').textContent = error.message;
    else toast(error.message || 'İşlem tamamlanamadı.');
    return false;
  } finally {busy = false;}
}
const eventTypes = {system:['wave','neutral'],join:['users','mint'],chat:['chat','mint'],like:['heart','pink'],gift:['gift','lilac'],win:['flag','peach']};
function renderEvents(id, list) {
  const nodes = list.map(entry => {
    const li = document.createElement('li');
    const [glyph, color] = eventTypes[entry.kind] || eventTypes.system;
    const symbol = document.createElement('span');
    symbol.className = 'event-icon ' + color;
    symbol.innerHTML = icon(glyph);
    const summary = document.createElement('span');
    const author = document.createElement('strong');
    author.textContent = entry.name;
    summary.append(author, ' ' + entry.detail);
    const time = document.createElement('time');
    time.textContent = clock.format(entry.at);
    li.append(symbol,summary,time);
    return li;
  });
  if (!nodes.length) {
    const li = document.createElement('li');
    li.textContent = 'İlk etkileşim bekleniyor.';
    nodes.push(li);
  }
  $(id).replaceChildren(...nodes);
}
function render(s) {
  current = s;
  $('phoneShare').textContent = s.phoneUrl ? 'Telefon paylaşımını kapat' : 'Telefon için oyun adresini aç';
  $('phoneInstructions').hidden = !s.phoneUrl;
  $('phoneAddress').textContent = s.phoneUrl || '';
  if (s.phoneUrl) $('phoneAddress').href = s.phoneUrl;
  else $('phoneAddress').removeAttribute('href');
  scene.update(s);
  weddingView(s);
  playlistView(s);
  $('choreographySettings').hidden=s.game!=='halay';
  const choreoKey=JSON.stringify([s.choreography,s.musicVersion]);
  if(choreoKey!==choreographyVersion){
    choreographyVersion=choreoKey;
    $('musicSections').replaceChildren();
    const matched=s.choreography?.trackVersion===s.musicVersion;
    for(const section of matched?s.choreography.sections:[])addMusicSection(section);
    $('choreographyNotice').textContent=matched?'Bölümler bu MP3 için kayıtlı. İlk ritim işaretlerini dinleyerek ince ayar yapabilirsin.':'Bu MP3 için henüz bölüm yok. Dinleyip başlangıç ve bitiş zamanlarını ekle.';
  }
  $('sceneSettings').hidden=s.game!=='halay';
  const settings=s.sceneSettings || defaultSceneSettings;
  const sceneVersion=JSON.stringify(settings);
  if(sceneVersion!==settingsVersion){
    settingsVersion=sceneVersion;
    $('formation').value=settings.formation;
    $('danceEnergy').value=String(settings.energy);
    $('cameraTours').value=settings.tours?'on':'off';
  }
  const rules=s.giftRules || defaultGiftRules;
  $('giftSettings').hidden=s.game!=='halay';
  const version=JSON.stringify(rules);
  if(version!==ruleVersion){
    ruleVersion=version;
    $('ruleMode').value=rules.mode;
    for(const g of gifts) $('min-'+g.key).value=rules.minimum[g.key];
    showRuleMode();
  }
  document.querySelector('.local').lastChild.textContent = 'Yerel sunucu';
  stageText(s, document.querySelector('.arcade'), $('mode'), $('stageCmd'));
  $('players').textContent = format.format(s.players.length+Object.keys(s.roles||{}).length);
  $('likes').textContent = format.format(s.likes);
  $('gifts').textContent = format.format(s.gifts);
  $('connect').querySelector('span').textContent = s.mode === 'idle' ? 'TikTok LIVE’a bağlan' : '@' + s.link.handle + ' · Bağlantı';
  $('disconnect').hidden = s.mode === 'idle';
  $('connectionStatus').textContent = s.mode === 'idle' ? '' : s.link.detail;
  $('key').placeholder = s.configured ? 'Sunucudaki anahtar kullanılabilir' : 'API anahtarını gir';
  $('key').required = !s.configured;
  if (!dialog.open && s.link.handle) $('handle').value = '@' + s.link.handle;
  renderEvents('recent', s.activity.slice(0,4));
  renderEvents('history', s.activity);
  $('eventCount').textContent = s.activity.length + ' kayıt';
  document.querySelectorAll('button[data-game]').forEach(el => {
    el.textContent = s.game === el.dataset.game ? 'Stüdyoya dön' : 'Oyunu seç';
    el.className = s.game === el.dataset.game ? 'secondary' : 'primary';
  });
}
function buildLibrary() {
  for (const [key, info] of Object.entries(games)) {
    const article = document.createElement('article');
    article.className = 'card';
    article.innerHTML = '<div class="game-art"><canvas></canvas></div><div class="game-body"><h2></h2><p></p><button>Oyunu seç</button></div>';
    article.querySelector('h2').textContent = info.name;
    article.querySelector('p').textContent = info.rules;
    const button = article.querySelector('button');
    button.dataset.game = key;
    button.onclick = async () => {
      if (current?.game === key || await control({action:'game',game:key})) tab('studio');
    };
    $('library').append(article);
    mountScene(article.querySelector('canvas')).update({game:key});
  }
}
let ruleVersion='',settingsVersion='',choreographyVersion='';
const timeLabel=n=>Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');
function parseMusicTime(text){
  const match=/^(\d{1,3}):([0-5]\d)$/.exec(text.trim());
  if(!match)throw Error('Zamanı dakika:saniye olarak yaz. Örnek: 1:24');
  return Number(match[1])*60+Number(match[2]);
}
function addMusicSection(section={start:0,end:20,figure:'frenzy',bpm:124}){
  const row=document.createElement('div');row.className='music-section';
  row.innerHTML='<label>Başlangıç<input data-field="start" placeholder="1:24" required></label><label>Bitiş<input data-field="end" placeholder="1:48" required></label><label>Figür<select data-field="figure"></select></label><label>Tempo<input data-field="bpm" type="number" min="70" max="180" required></label><button type="button" class="subtle" aria-label="Bu bölümü kaldır">Kaldır</button>';
  for(const [key,label] of Object.entries(figures)){
    const option=document.createElement('option');option.value=key;option.textContent=label;row.querySelector('select').append(option);
  }
  for(const name of ['start','end','figure','bpm'])row.querySelector('[data-field="'+name+'"]').value=['start','end'].includes(name)?timeLabel(section[name]):section[name];
  row.querySelector('button').onclick=()=>row.remove();$('musicSections').append(row);
}
$('addMusicSection').onclick=()=>addMusicSection();
$('choreographyForm').onsubmit=async e=>{
  e.preventDefault();
  try{
    const sections=[...$('musicSections').children].map(row=>{
      const get=name=>row.querySelector('[data-field="'+name+'"]').value;
      return {start:parseMusicTime(get('start')),end:parseMusicTime(get('end')),figure:get('figure'),bpm:Number(get('bpm'))};
    });
    const choreography=checkChoreography({trackVersion:current.musicVersion,sections});
    if(await control({action:'choreography',choreography}))$('choreographyFeedback').textContent='Kaydedildi. Şarkı kaldığı yerden devam ediyor.';
  }catch(error){$('choreographyFeedback').textContent=error.message;}
};
document.querySelectorAll('[data-direct]').forEach(button=>button.onclick=()=>control({action:'direct',command:button.dataset.direct}));
setInterval(()=>{
  const direction=current?.direction;
  $('directionFeedback').textContent=direction?.end>Date.now()?commandNames[direction.action]+' · '+Math.ceil((direction.end-Date.now())/1000)+' sn':'Otomatik düğün akışı';
},500);
$('sceneForm').onsubmit=async e=>{
  e.preventDefault();
  try{
    const settings=checkSceneSettings({formation:$('formation').value,energy:Number($('danceEnergy').value),tours:$('cameraTours').value==='on'});
    if(await control({action:'sceneSettings',settings}))$('sceneFeedback').textContent='Yayına uygulandı.';
  }catch(error){$('sceneFeedback').textContent=error.message;}
};
for(const g of gifts){
  const label=document.createElement('label'),input=document.createElement('input');
  input.id='min-'+g.key;input.type='number';input.min='1';input.step='1';input.required=true;
  label.append(g.action,input);$('ruleInputs').append(label);
}
function showRuleMode(){
  $('coinFields').hidden=$('coinFields').disabled=$('ruleMode').value!=='coins';
}
$('ruleMode').onchange=showRuleMode;
$('ruleForm').oninput=()=>{$('ruleFeedback').textContent='';};
$('ruleForm').onsubmit=async e=>{
  e.preventDefault();
  try {
    const minimum=Object.fromEntries(gifts.map(g=>[g.key,Number($('min-'+g.key).value)]));
    const rules=checkGiftRules({mode:$('ruleMode').value,minimum:$('ruleMode').value==='named'?current.giftRules.minimum:minimum});
    if(await control({action:'giftRules',rules})) $('ruleFeedback').textContent='Ayarlar kaydedildi.';
  }catch(error){$('ruleFeedback').textContent=error.message;}
};
fillIcons();
buildLibrary();
document.querySelectorAll('[data-tab]').forEach(el => el.onclick = () => tab(el.dataset.tab));
$('choose').onclick = () => tab('games');
$('allActivity').onclick = () => tab('activity');
$('connect').onclick = () => {dialog.showModal(); $('handle').focus();};
$('close').onclick = () => dialog.close();
dialog.addEventListener('click', e => {if (e.target === dialog && e.offsetX < 0) dialog.close();});
dialog.addEventListener('close', () => {$('key').value = '';});
$('liveForm').onsubmit = async e => {
  e.preventDefault();
  if (await control({action:'connect', handle:$('handle').value, key:$('key').value})) {
    $('key').value = '';
    dialog.close();
    tab('studio');
  }
};
$('disconnect').onclick = async () => {if (await control({action:'disconnect'})) dialog.close();};
$('url').value = location.origin + '/overlay';
$('phoneShare').onclick = () => control({action:'phoneView',enabled:!current?.phoneUrl});
$('liveWindow').onclick = () => {
  const height = Math.min(960, window.screen.availHeight - 100);
  const width = Math.round(height * 9 / 16);
  const gameWindow = window.open('/overlay?studio=tiktok', 'sinyalLiveStudio', `popup,width=${width},height=${height}`);
  if (gameWindow) gameWindow.focus();
  else toast('Oyun penceresini açmak için tarayıcıda açılır pencerelere izin ver.');
};
$('copy').onclick = async () => {
  try {await navigator.clipboard.writeText($('url').value);toast('OBS adresi kopyalandı.');}
  catch {$('url').select();toast('Adresi kopyalamak için ⌘C veya Ctrl+C kullan.');}
};
$('expand').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await $('preview').requestFullscreen();
  } catch {window.open('/overlay','_blank','noopener');}
};
subscribe(render, () => {document.querySelector('.local').lastChild.textContent = 'Sunucu bekleniyor'; $('mode').textContent = 'STÜDYO BAĞLANTISI KESİLDİ';});
