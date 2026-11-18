import {onAir,isWedding} from './wedding.js';
import {mountScene as mountFlat} from './scene.js';

export function halayTempo(state, now = Date.now()) {
  const moment = onAir(state, now);
  const boost = moment && ['confetti','money'].includes(moment.tier) && now - moment.at < 5000 ? 24 : 0;
  return 96 + Math.min(52, Math.floor((state.likes || 0) / 4)) + boost;
}

// A canvas's context type cannot change. Replace it when switching renderers.
export function mountScene(initialCanvas) {
  let canvas = initialCanvas;
  let state = {game:'halay', players:[], likes:0};
  let wanted, instance, generation = 0;
  const host = canvas.parentElement;
  let notice;
  if(host.id==='preview'){
    notice=document.createElement('aside');notice.className='scene-load-error';notice.hidden=true;notice.setAttribute('role','alert');
    const title=document.createElement('strong');title.textContent='3B oyun alanı açılamadı — 2B yedek görünüm gösteriliyor.';
    const hint=document.createElement('p'),detail=document.createElement('code'),retry=document.createElement('button');
    retry.type='button';retry.textContent='Önizlemeyi yeniden dene';
    retry.onclick=()=>{wanted=undefined;activate();};
    notice.append(title,hint,detail,retry);host.after(notice);
  }
  function reportError(error){
    if(!notice)return;
    const message=String(error?.message||error||'Bilinmeyen yükleme hatası').slice(0,500);
    notice.hidden=false;
    notice.querySelector('code').textContent=message;
    notice.querySelector('p').textContent=/webgl|context|gpu/i.test(message)
      ? 'Tarayıcı 3B grafik bağlamını açamadı. Chrome → Ayarlar → Sistem → Grafik hızlandırmayı kontrol edin. chrome://gpu sayfasında WebGL2 durumunu inceleyin.'
      : /fetch|import|module|load/i.test(message)
        ? 'Bir sahne dosyası yüklenemedi. Proje klasöründe npm ci çalıştırın; sunucuyu yeniden başlatıp sayfayı açın. Düzelmezse aşağıdaki hatayı paylaşın.'
        : 'Sahne başlatılırken hata oluştu. Aşağıdaki hata metnini paylaşın; TikTok bağlantısı bu hatadan ayrıdır.';
  }
  const observer = new ResizeObserver(() => activate());
  observer.observe(host);
  async function activate() {
    if (!host.clientWidth || !host.clientHeight || wanted === state.game) return;
    const ticket = ++generation;
    if(notice)notice.hidden=true;
    wanted = state.game;
    instance?.destroy();
    instance = null;
    function replaceCanvas() {
      const next = canvas.cloneNode(false);
      next.removeAttribute('style');
      canvas.replaceWith(next);
      canvas = next;
    }
    replaceCanvas();
    host.dataset.game = wanted;
    if (isWedding(wanted)) {
      try {
        const {createHalay} = await import('./halay.js');
        if (ticket !== generation) return;
        instance = createHalay(canvas, wanted === 'blok' ? 'block' : 'bug');
        host.dataset.renderer = '3d';
      } catch (error) {
        if (ticket !== generation) return;
        console.warn('3B sahne açılamadı.', error);
        reportError(error);
        replaceCanvas();
        host.dataset.renderer = '2d';
        instance = mountFlat(canvas);
      }
    } else if (wanted === 'race') {
      try {
        const {createRace} = await import('./race-scene.js');
        if (ticket !== generation) return;
        instance = createRace(canvas);
        host.dataset.renderer = '3d';
      } catch (error) {
        if (ticket !== generation) return;
        console.warn('3B yarış sahnesi açılamadı.', error);
        reportError(error);
        replaceCanvas();
        host.dataset.renderer = '2d';
        instance = mountFlat(canvas);
      }
    } else {
      host.dataset.renderer = '2d';
      instance = mountFlat(canvas);
    }
    instance.update(state);
  }
  return {
    update(next) {state = {...state, ...next}; activate(); instance?.update(state);},
    destroy() {generation++; observer.disconnect(); instance?.destroy();notice?.remove();}
  };
}
