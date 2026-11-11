export const figures={step:'Halay adımı',shoulder:'Omuz silkme',knee:'Diz kırma',stamp:'Ayak vurma',squat:'Çömel ve kalk',heel:'Topuk vuruşu',sway:'Sağa sola salınma',frenzy:'Coşkulu halay'};
export const commandNames={hype:'Toplu coş',wide:'Genel plan',couple:'Gelin–damat dansı',calm:'Sakinleş'};
export const emptyChoreography={trackVersion:0,sections:[]};
export function checkChoreography(value){
  if(!value || !Number.isFinite(value.trackVersion) || value.trackVersion<0 || !Array.isArray(value.sections) || value.sections.length>60)throw Error('En fazla 60 müzik bölümü ekleyebilirsin.');
  const sections=value.sections.map(s=>{
    if(!Number.isFinite(s.start) || !Number.isFinite(s.end) || s.start<0 || s.end<=s.start || s.end>7200 || !Object.hasOwn(figures,s.figure) || !Number.isFinite(s.bpm) || s.bpm<70 || s.bpm>180)throw Error('Başlangıç, bitiş, figür ve tempo değerlerini kontrol et.');
    return {start:s.start,end:s.end,figure:s.figure,bpm:s.bpm};
  }).sort((a,b)=>a.start-b.start);
  if(sections.some((s,i)=>i && s.start<sections[i-1].end))throw Error('Müzik bölümleri birbiriyle çakışamaz.');
  return {trackVersion:value.trackVersion,sections};
}
export function makeDirection(action,now=Date.now()){
  if(!Object.hasOwn(commandNames,action))throw Error('Bilinmeyen düğün komutu.');
  return {action,at:now,end:now+({hype:20000,wide:15000,couple:18000,calm:30000}[action])};
}
// Build a repeatable set per 88-beat passage, not a random choice each frame.
// The opening step reconnects the chain; the other six figures change order.
const passageFigures=['shoulder','knee','stamp','squat','heel','sway'];
const phraseLengths=[16,8,16,8,16,8,16];
const passageBeats=phraseLengths.reduce((a,b)=>a+b,0);
let cachedPassage=-1,cachedOrder=[];
export function automaticFigure(phase){
  const beat=Math.max(0,phase/(Math.PI*2));
  const passage=Math.floor(beat/passageBeats);
  if(passage!==cachedPassage){
    const order=[...passageFigures];let seed=(Math.imul(passage+1,2654435761)>>>0)||1;
    for(let i=order.length-1;i>0;i--){
      seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
      const j=(seed>>>0)%(i+1);[order[i],order[j]]=[order[j],order[i]];
    }
    cachedOrder=['step',...order];cachedPassage=passage;
  }
  let position=beat-passage*passageBeats;
  for(let i=0;i<phraseLengths.length;i++){
    if(position<phraseLengths[i])return cachedOrder[i];
    position-=phraseLengths[i];
  }
  return 'step';
}
export function resolveDance(state,music,phase,now=Date.now()){
  const direction=state.direction?.end>now?state.direction.action:null;
  const section=music.playing && state.choreography?.trackVersion===state.musicVersion?
    state.choreography.sections.find(s=>music.time>=s.start && music.time<s.end):null;
  const figure=direction==='calm'?'step':direction==='hype'?'frenzy':section?.figure || automaticFigure(phase);
  return {figure,direction,section,bpm:section?.bpm,boost:direction==='calm'?0:figure==='frenzy'?1:0};
}
export function entrancePose(progress,identity){
  let hash=0;for(const c of String(identity))hash=(hash*31+c.codePointAt(0))>>>0;
  const p=Math.max(0,Math.min(1,progress));
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  return {style:hash%3,travel:p<.45?smooth(p/.45)*.62:p<.64?.62:.62+.38*smooth((p-.64)/.36),
    greeting:smooth((p-.40)/.08)*(1-smooth((p-.60)/.08)),
    walking:1-smooth((p-.9)/.1),gap:smooth((p-.55)/.12)*(1-smooth((p-.91)/.09))};
}
