import {writeFileSync,renameSync} from 'node:fs';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createGame, applyEvent, nextRound, note, gameNames} from './src/game.js';
import {gifts, weddingGift, defaultGiftRules, checkGiftRules, scheduleShot, defaultSceneSettings, checkSceneSettings} from './public/wedding.js';
import {trackVersion,saveTrack,serveTrack} from './src/music.js';
import {createPlaylist} from './src/playlist.js';
import {openLive,loadGiftCatalog} from './src/live.js';
import {phoneView} from './src/phone-view.js';
import {emptyChoreography,checkChoreography,makeDirection} from './public/choreography.js';

const port = Number(process.env.PORT || 4317);
const savedHandle = (process.env.TIKTOK_LIVE_HANDLE || '').trim().replace(/^@/, '');
const rulesFile = new URL('./hediye-ayarlari.json',import.meta.url);
let giftRules=defaultGiftRules;
try {
  const saved=JSON.parse(await readFile(rulesFile,'utf8'));
  if(saved.minimum && !Object.hasOwn(saved.minimum,'gold')){
    let price=2;
    while(Object.values(saved.minimum).includes(price))price++;
    saved.minimum.gold=price;
  }
  giftRules=checkGiftRules(saved);
}
catch (error) {if(error.code!=='ENOENT') throw error;}
const sceneFile=new URL('./sahne-ayarlari.json',import.meta.url);
let sceneSettings=defaultSceneSettings;
try {sceneSettings=checkSceneSettings(JSON.parse(await readFile(sceneFile,'utf8')));}
catch(error){if(error.code!=='ENOENT')throw error;}
const choreographyFile=new URL('./koreografi.json',import.meta.url);
let choreography=emptyChoreography;
try{choreography=checkChoreography(JSON.parse(await readFile(choreographyFile,'utf8')));}
catch(error){if(error.code!=='ENOENT')throw error;}
function newSession(game) {return {...createGame(game),giftRules,sceneSettings,choreography,direction:null};}
let session = newSession('halay');
const idleLink = {status:'idle', detail:'TikTok bağlantısı bekleniyor', handle:''};
let link = idleLink;
// A live update can pass the previous process's private /api/state snapshot once.
// Ordinary studio launches always start a new session.
if (process.env.SINYAL_RESUME_FILE) {
  const saved = JSON.parse(await readFile(process.env.SINYAL_RESUME_FILE, 'utf8'));
  if (!savedHandle || saved.link?.handle !== savedHandle || !['live','waiting'].includes(saved.link.status) ||
      !Object.hasOwn(gameNames, saved.game) || !Array.isArray(saved.players) || !Array.isArray(saved.queue)) {
    throw Error('Devir kaydı bu yayınla eşleşmiyor.');
  }
  session = newSession(saved.game);
  for (const field of Object.keys(session)) {
    if (!['giftRules','sceneSettings','choreography'].includes(field) && Object.hasOwn(saved, field)) session[field] = saved[field];
  }
  link = {...idleLink, handle:savedHandle};
}
let stopLive, broadcastTimer;
let musicVersion=await trackVersion();
const playlist=await createPlaylist();
const effectiveMusicVersion=()=>{const p=playlist.snapshot();return p.active?p.tracks.find(t=>t.id===p.current)?.version||0:musicVersion;};
const clients = new Set();
const mobileClients = new WeakSet();
const phone = phoneView(port, (req,res) => handleRequest(req,res,true));
const snapshot = () => ({...session, phoneUrl:phone.url, mode:link.status === 'idle' ? 'idle' : 'live', link, musicVersion:effectiveMusicVersion(), playlist:playlist.snapshot(), configured: Boolean(process.env.EULER_API_KEY)});
function sceneSnapshot() {
  const {game,players,likes,leader,roles,shots,celebrations,chatMessages,effect,giftMoment,winner,round} = session;
  return {game,players,likes,leader,roles,shots,celebrations,chatMessages,effect,giftMoment,winner,round,giftRules,sceneSettings,choreography,direction:session.direction,musicVersion:effectiveMusicVersion(),playlist:playlist.snapshot(),link:{status:link.status}};
}
function send(response) {
  if (response.writableLength > 512000) return response.destroy();
  response.write('data: ' + JSON.stringify(mobileClients.has(response) ? sceneSnapshot() : snapshot()) + '\n\n');
}
function update() {
  if (broadcastTimer) return;
  broadcastTimer = setTimeout(() => {broadcastTimer = null; clients.forEach(send);}, 60);
}
setInterval(() => {
  if (session.nextRoundAt && Date.now() >= session.nextRoundAt) {nextRound(session); update();}
}, 250).unref();
setInterval(() => clients.forEach(r => r.write(': ping\n\n')), 15000).unref();

function fail(message, status = 400) { throw Object.assign(new Error(message), {status}); }
async function command(body) {
  switch (body.action) {
    case 'playlist': await playlist.control(body);break;
    case 'direct':
      try{session.direction=makeDirection(body.command);}catch(error){fail(error.message);}
      break;
    case 'choreography': {
      let next;
      try{next=checkChoreography(body.choreography);}catch(error){fail(error.message);}
      if(next.trackVersion!==effectiveMusicVersion())fail('Müzik değişti. Paneli güncelleyip tekrar kaydet.');
      const temp=new URL(choreographyFile.href+'.tmp');
      writeFileSync(temp,JSON.stringify(next,null,2));renameSync(temp,choreographyFile);
      choreography=next;session.choreography=next;break;
    }
    case 'sceneSettings': {
      let next;
      try {next=checkSceneSettings(body.settings);}catch(error){fail(error.message);}
      const temp=new URL(sceneFile.href+'.tmp');
      writeFileSync(temp,JSON.stringify(next,null,2));renameSync(temp,sceneFile);
      sceneSettings=next;session.sceneSettings=next;
      break;
    }
    case 'showLeader': {
      const leader = session.players.find(player => player.id === session.leader);
      if (session.game !== 'halay' || !leader) fail('Şu anda halay başı yok.');
      scheduleShot(session, {tier:'leader', playerId:leader.id, name:leader.name, duration:10000}, Date.now());
      break;
    }
    case 'phoneView':
      if (typeof body.enabled !== 'boolean') fail('Geçersiz paylaşım ayarı.');
      try { await phone.setEnabled(body.enabled); } catch (error) { fail(error.message); }
      break;
    case 'giftRules': {
      let next;
      try {next=checkGiftRules(body.rules);} catch(error) {fail(error.message);}
      const temp=new URL(rulesFile.href+'.tmp');
      writeFileSync(temp,JSON.stringify(next,null,2));
      renameSync(temp,rulesFile);
      giftRules=next;
      session.giftRules=next;
      break;
    }
    case 'game':
      if (!Object.hasOwn(gameNames, body.game)) fail('Bilinmeyen oyun.');
      if (session.game !== body.game) {
        session = newSession(body.game);
        note(session, 'system', 'Stüdyo', gameNames[body.game] + ' açıldı');
      }
      break;
    case 'round': nextRound(session); break;
    case 'connect': {
      const handle = String(body.handle || '').trim().replace(/^@/, '');
      if (!/^[\w.]{1,24}$/.test(handle)) fail('Geçerli bir TikTok kullanıcı adı girin.');
      const key = String(body.key || process.env.EULER_API_KEY || '').trim();
      if (!key) fail('Euler Stream API anahtarı gerekli.');
      stopLive?.();
      if (link.handle !== handle) session = newSession(session.game);
      let newBroadcast = false;
      stopLive = openLive({handle, key, waitForLive:handle === savedHandle, catalog:loadGiftCatalog, canCue:event=>giftRules.mode==='coins'?!!event.coins:!!weddingGift(event.giftId,event.gift,event.coins), onStatus(status, detail) {
        if (link.status !== status || link.detail !== detail || handle !== link.handle) {
          if (status === 'waiting') newBroadcast = true;
          if (status === 'live' && newBroadcast) {
            session = newSession(session.game);
            newBroadcast = false;
          }
          link = {handle, status, detail};
          note(session, 'system', 'TikTok LIVE', detail);
          update();
        }
      }, onEvent(event) {applyEvent(session, event); update();}});
      break;
    }
    case 'disconnect':
      stopLive?.(); stopLive = null;
      session = newSession(session.game);
      link = idleLink;
      break;
    default: fail('Geçersiz işlem.');
  }
  update();
}
const files = new Map([
  ['/', ['index.html','text/html']], ['/overlay',['overlay.html','text/html']],
  ...['playlist.js','app.js','scene.js','overlay.js','icons.js','shared.js','halay.js','square.js','garden.js','dancers.js','halay-audio.js','music-motion.js','choreography.js','stage.js','wedding.js','wedding-view.js'].map(f => ['/'+f,[f,'text/javascript']]),
  ...gifts.map(({key}) => ['/gift-icons/'+key+'.webp',['gift-icons/'+key+'.webp','image/webp']]),
  ...['leaves','bark','garden-sky','limestone','limestone-normal','travertine','lawn'].map(name => ['/garden/'+name+'.webp',['garden/'+name+'.webp','image/webp']]),
  ['/garden/broadleaf.bin',['garden/broadleaf.bin','application/octet-stream']],
  ['/three.module.js',['../node_modules/three/build/three.module.min.js','text/javascript']],
  ['/three.core.min.js',['../node_modules/three/build/three.core.min.js','text/javascript']],
  ['/dugun-kamerasi.webm',['dugun-kamerasi.webm','video/webm']],
  ['/studio.css',['studio.css','text/css']], ['/mark.svg',['mark.svg','image/svg+xml']]
]);
function json(res, code, data) {
  res.writeHead(code, {'Content-Type':'application/json; charset=utf-8'});
  res.end(JSON.stringify(data));
}
async function handleRequest(req, res, mobile) {
  try {
    const hosts = mobile ? [req.socket.localAddress + ':' + port] : ['127.0.0.1:' + port, 'localhost:' + port];
    if (!hosts.includes(req.headers.host)) fail('Yerel adres kullanın.', 403);
    let path = req.url.split('?')[0];
    if (mobile) {
      if (req.method !== 'GET') fail('Bu adres yalnızca oyun görüntüsü içindir.', 405);
      if (path === '/') path = '/overlay';
      if ((path.startsWith('/api/') && path !== '/api/events') || path === '/app.js') fail('Bulunamadı.', 404);
    }
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    if(path==='/api/playlist/upload' && req.method==='POST'){
      if(req.headers.origin!=='http://'+req.headers.host)fail('Geçersiz istek kaynağı.',403);
      await playlist.add(req,new URL(req.url,'http://localhost').searchParams.get('name'));update();return json(res,200,playlist.snapshot());
    }
    if(path.startsWith('/music/library/') && req.method==='GET'){
      const id=path.slice('/music/library/'.length).replace(/\.mp3$/,'');
      const file=playlist.file(id);if(!file)fail('Parça bulunamadı.',404);
      return await serveTrack(req,res,file);
    }
    if(path==='/api/music' && req.method==='POST'){
      if(req.headers.origin!=='http://'+req.headers.host)fail('Geçersiz istek kaynağı.',403);
      musicVersion=await saveTrack(req);update();return json(res,200,{musicVersion});
    }
    if(path==='/music/dugun.mp3' && req.method==='GET')return await serveTrack(req,res);
    if (req.method === 'GET') {
      if (path === '/api/state') return json(res, 200, snapshot());
      if (path === '/api/events') {
        res.writeHead(200, {'Content-Type':'text/event-stream', Connection:'keep-alive'});
        if (mobile) mobileClients.add(res);
        clients.add(res); res.on('close', () => clients.delete(res)); send(res); return;
      }
      if (!files.has(path)) fail('Bulunamadı.', 404);
      const [file, type] = files.get(path);
      const data = await readFile(new URL('./public/' + file, import.meta.url)).catch(error=>{if(error.code==='ENOENT')fail('Bulunamadı.',404);throw error;});
      res.writeHead(200, {'Content-Type':type.startsWith('text/') ? type+'; charset=utf-8' : type, 'Content-Length':data.length}); res.end(data); return;
    }
    if (req.method !== 'POST' || path !== '/api/control') fail('Bulunamadı.', 404);
    if (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host) fail('Geçersiz istek kaynağı.', 403);
    if (req.headers['content-type']?.split(';')[0] !== 'application/json') fail('JSON gerekli.', 415);
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 8192) fail('İstek çok büyük.', 413);
      chunks.push(chunk);
    }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks)); } catch { fail('Geçersiz JSON.'); }
    if (!body || typeof body !== 'object') fail('Geçersiz istek.');
    await command(body); json(res, 200, snapshot());
  } catch (err) { json(res, err.status || 500, {error: err.status ? err.message : 'Sunucu işlemi tamamlanamadı.'}); }
}
const server = createServer((req,res) => handleRequest(req,res,false));
server.on('error', error => {console.error('Stüdyo açılamadı.', error.code); process.exit(1);});
server.listen(port, '127.0.0.1', async () => {
  console.log('Sinyal Studio • http://127.0.0.1:' + port);
  if (savedHandle && process.env.EULER_API_KEY) {
    try { await command({action:'connect', handle:savedHandle}); }
    catch (error) {
      link = {handle:savedHandle, status:'error', detail:error.status ? error.message : 'TikTok bağlantısı başlatılamadı.'};
      update();
    }
  }
});
