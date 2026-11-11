import {onAir} from './wedding.js';
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
  const observer = new ResizeObserver(() => activate());
  observer.observe(host);
  async function activate() {
    if (!host.clientWidth || !host.clientHeight || wanted === state.game) return;
    const ticket = ++generation;
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
    if (wanted === 'halay') {
      try {
        const {createHalay} = await import('./halay.js');
        if (ticket !== generation) return;
        instance = createHalay(canvas);
        host.dataset.renderer = '3d';
      } catch (error) {
        if (ticket !== generation) return;
        console.warn('3B sahne açılamadı.', error);
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
    destroy() {generation++; observer.disconnect(); instance?.destroy();}
  };
}
