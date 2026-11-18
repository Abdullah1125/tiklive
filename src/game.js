import {resolveWeddingGift, scheduleShot, avatarUrl} from '../public/wedding.js';
const colors = ['#fa654e', '#77c9fb', '#f2cb60', '#a693ea', '#75d0a2', '#f68fc1'];
export const gameNames = {rally: 'Sahil Rallisi', halay: 'Blok Karakterler Düğünü'};

export function createGame(game = 'rally') {
  return {game, players: [], queue: [], capacity:game === 'halay' ? 56 : 16, likes: 0, gifts: 0, round: 1,
    effect: null, giftMoment: null, roles: {}, shots: [], celebrations: [], chatMessages: [], leader: null, winner: null, nextRoundAt: 0, activity: [], serial: 0};
}

export function note(state, kind, name, detail) {
  state.activity.unshift({id: ++state.serial, at: Date.now(), kind, name, detail});
  state.activity.length = Math.min(60, state.activity.length);
}

function memberInfo({id, name, gender, avatar}) {
  const info = gender ? {id, name, gender} : {id, name};
  if (avatarUrl(avatar)) info.avatar = avatarUrl(avatar);
  return info;
}

function addPlayer(state, member, joinedAt) {
  const {id, name} = member;
  const player = {...memberInfo(member), color: colors[state.players.length % colors.length], score: 0};
  if (joinedAt !== undefined) player.joinedAt = joinedAt;
  state.players.push(player);
  if (state.game === 'halay' && !state.nextRoundAt) state.nextRoundAt = Date.now() + 120000;
  state.effect = {type: 'join', at: Date.now(), playerId: id};
  note(state, 'join', name, state.game === 'rally' ? 'piste katıldı' : 'halaya katıldı');
}

export function nextRound(state) {
  state.round++;
  state.winner = null;
  state.nextRoundAt = 0;
  state.effect = null;
  state.giftMoment = null;
  if (state.game !== 'halay') state.leader = null;
  // Waiting viewers take the next available seats before returning players.
  const lineup = [...state.queue, ...state.players];
  state.players = lineup.slice(0, state.capacity).map((p, i) => ({...p, color: colors[i % colors.length], score: 0}));
  if (state.game === 'halay' && (state.players.length || Object.keys(state.roles).length)) state.nextRoundAt = Date.now() + 120000;
  if (state.leader && !state.players.some(p => p.id === state.leader)) state.leader = null;
  state.queue = lineup.slice(state.capacity).map(memberInfo);
  note(state, 'system', 'Oyun', state.round + '. tur başladı');
}

function weddingAction(state, event, now) {
  const {id, name} = event;
  const gift = resolveWeddingGift(state.giftRules,event);
  if (!gift) return;
  const key = gift.key;
  if (gift?.role) {
    const currentRole = Object.keys(state.roles).find(role => state.roles[role].id === id);
    const member = state.roles[currentRole] || state.players.find(p => p.id === id) || state.queue.find(p => p.id === id);
    const recipient = memberInfo({id, name, gender:member?.gender, avatar:event.avatar || member?.avatar});
    if (currentRole) delete state.roles[currentRole];
    if (state.leader === id) state.leader = null;
    state.queue = state.queue.filter(p => p.id !== id);
    if (key === 'leader') {
      if (!state.players.some(p => p.id === id)) {
        if (state.players.length >= state.capacity) state.queue.unshift(state.players.pop());
        addPlayer(state, recipient);
      }
      state.leader = id;
    } else {
      state.players = state.players.filter(p => p.id !== id);
      const previous = state.roles[key];
      state.roles[key] = recipient;
      if (previous && previous.id !== id) {
        if (state.players.length < state.capacity) addPlayer(state, previous);
        else state.queue.unshift(previous);
      }
      if (!state.nextRoundAt) state.nextRoundAt = now + 120000;
    }
    state.queue.length = Math.min(128, state.queue.length);
    note(state,'gift',name,gift.role + ' oldu');
  }
  const portrait = event.avatar ? {avatar:event.avatar} : {};
  scheduleShot(state,{tier:key, playerId:id, name, ...portrait},now);
  state.giftMoment = {tier:key, at:now, playerId:id, name, ...portrait};
  state.celebrations = state.celebrations.filter(m => now-m.at < 5000).slice(-15);
  state.celebrations.push(state.giftMoment);
}

function joinChoice(text, game) {
  if (game !== 'halay') {
    const command = text.toLocaleLowerCase('tr').replace(/^!/, '');
    return command === 'katıl' || command === 'katil' ? {} : null;
  }
  const word = text.normalize('NFKD')
    .replace(/[\p{M}\p{Cf}]/gu, '')
    .replace(/^[\s\p{P}\p{S}]+|[\s\p{P}\p{S}]+$/gu, '');
  const command = word.toLocaleLowerCase('tr');
  if (/^kat[ıi]l+$/.test(command)) return {gender:word.startsWith('K') ? 'male' : 'female'};
  return command === 'kat' || command === 'halay' ? {} : null;
}

function recordSpeech(state, event, now) {
  const text = event.text.replace(/[\s\p{Cc}]+/gu, ' ').trim();
  if (!text) return;
  const messages = (state.chatMessages || []).filter(m => now - m.at < 20000);
  if (messages.some(m => m.playerId === event.id && now - m.at < 1500)) return;
  const id = event.messageId || now + '-' + (++state.serial);
  messages.push({id, at:now, playerId:event.id, name:event.name, username:event.username || event.name, text:text.slice(0, 256)});
  state.chatMessages = messages.slice(-24);
}

export function applyEvent(state, event, now = Date.now()) {
  const avatar = avatarUrl(event.avatar);
  event = {...event, avatar};
  const {id, name, type} = event;
  if (avatar) for (const member of [...state.players, ...state.queue, ...Object.values(state.roles)]) {
    if (member.id === id) member.avatar = avatar;
  }
  const player = state.players.find(p => p.id === id);
  const amount = Math.max(1, Math.min(100000, Math.trunc(Number(event.amount)) || 1));
  if (type === 'giftCue') {
    if (state.game === 'halay') weddingAction(state,event,now);
    return;
  }
  if (type === 'chat') {
    const text = event.text.trim();
    const choice = joinChoice(text, state.game);
    if (choice) {
      const existing = player || Object.values(state.roles).find(p => p.id === id) || state.queue.find(p => p.id === id);
      if (existing) {
        if (choice.gender) existing.gender = choice.gender;
        return;
      }
      const member = memberInfo({id, name, ...choice, avatar});
      if (state.players.length < state.capacity) {
        addPlayer(state, member, state.game === 'halay' ? now : undefined);
        if (state.game === 'halay') scheduleShot(state,{tier:'join',playerId:id,name},now);
      }
      else if (state.queue.length < 128) {
        state.queue.push(member);
        note(state, 'join', name, 'sonraki tur için sıraya girdi');
      }
      return;
    }
    if (state.game === 'halay') {recordSpeech(state,event,now); return;}
    if (text.toLocaleLowerCase('tr').replace(/^!/, '') !== 'gaz' || !player || state.winner) return;
    player.score += 10;
    note(state, 'chat', name, 'gaz verdi');
  } else if (type === 'like' || type === 'gift') {
    if (type === 'like') state.likes += amount;
    else state.gifts += amount;
    note(state, type, name, type === 'like' ? amount + ' beğeni gönderdi' : amount + ' × ' + (event.gift || 'hediye') + ' gönderdi' + (event.coins ? ' (' + event.coins + ' jeton/adet)' : ''));
    state.effect = {type, at: now, playerId: id};
    if (state.game === 'halay' && type === 'gift' && !event.cued) weddingAction(state,event,now);
    if (player && !state.winner) player.score += type === 'gift' ? amount * 15 : amount;
  } else return;
  if (state.game === 'rally' && !state.winner && player?.score >= 100) {
    player.score = 100;
    state.winner = player.name;
    state.leader = player.id;
    state.effect = {type: 'win', at: now, playerId: id};
    state.nextRoundAt = now + 6000;
    note(state, 'win', name, state.round + '. turu kazandı');
  }
  if (state.game === 'halay' && state.players.length && !state.nextRoundAt) state.nextRoundAt = now + 120000;
}
