export const games = {
  rally: {name:'Sahil Rallisi', title:['SAHİL','RALLİSİ'], rules:'“katıl” yazıp piste çık. “gaz” yazmak 10 puan, her beğeni 1 puan ve her hediye 15 puan kazandırır. 100 puana ilk ulaşan turu kazanır.'},
  halay: {name:'Hamam Böcekleri Düğünü', title:['Böceklerin','Düğünü'], rules:'Kadın karakterle halaya girmek için “katıl”, erkek karakterle girmek için “Katıl” yaz. Gülle altın tak, Minik Allık ile gelin, Öfke Modu ile damat ol. Davulcu ve zurnacıya katıl, para saç veya konfeti patlat.'},
  blok: {name:'Blok Karakterler Düğünü', title:['Blokların','Düğünü'], rules:'Kadın karakterle halaya girmek için “katıl”, erkek karakterle girmek için “Katıl” yaz. Gülle altın tak, Minik Allık ile gelin, Öfke Modu ile damat ol. Davulcu ve zurnacıya katıl, para saç veya konfeti patlat.'}
};
export function stageText(state, title, badge, caption) {
  const words = games[state.game].title;
  title.replaceChildren(document.createTextNode(words[0]),document.createElement('br'),document.createTextNode(words[1]));
  const statuses = {idle:'TİKTOK BAĞLI DEĞİL', waiting:'YAYIN BEKLENİYOR', live:'CANLI', connecting:'BAĞLANIYOR', retry:'YENİDEN BAĞLANIYOR', error:'BAĞLANTI KAPALI'};
  if (badge) badge.textContent = statuses[state.link.status] || 'BAĞLANTI BEKLENİYOR';
  if (state.winner) caption.textContent = '🏁 ' + state.winner + ' kazandı!';
  else {
    const hint = document.createElement('b');
    hint.textContent = 'katıl';
    caption.replaceChildren('Katılmak için ', hint, ' yaz');
    if (state.players.length && state.game === 'rally') caption.append(' · Hızlanmak için gaz yaz');
  }
}
export function subscribe(render, offline) {
  const events = new EventSource('/api/events');
  events.onmessage = e => render(JSON.parse(e.data));
  events.onerror = offline;
}
