import {mountScene} from './stage.js';
import {stageText, subscribe} from './shared.js';
import {setupWedding} from './wedding-view.js';
if (new URLSearchParams(location.search).get('studio') === 'tiktok') {
  document.title = 'Düğün yayını';
  // LIVE Studio supplies the viewer's tappable gift list above this capture.
  document.querySelector('.gift-guide')?.remove();
}
const wedding=setupWedding();
const scene = mountScene(document.querySelector('canvas'));
subscribe(state => {
  scene.update(state);
  wedding(state);
  stageText(state, document.querySelector('.arcade'), null, document.querySelector('#caption'));
});
