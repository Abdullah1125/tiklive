// Read the already playing track; never start, seek or replace the music.
let audio, context, analyser, bins, lastRead=0, lastBeat=0, average=.08, peak=.15;
const intervals=[];
const motion={active:false,playing:false,time:0,bpm:112,energy:.32};

export function attachMusicMotion(element) {
  audio=element;
  let connecting=false;
  async function connect() {
    if (connecting || analyser || audio.paused) return;
    const AudioContext=window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    connecting=true;
    try {
      context ??= new AudioContext();
      await context.resume();
      // Do not route the media element into a suspended audio context.
      if (context.state!=='running') return;
      const source=context.createMediaElementSource(audio);
      analyser=context.createAnalyser();
      analyser.fftSize=1024;analyser.smoothingTimeConstant=.55;
      source.connect(analyser);analyser.connect(context.destination);
      bins=new Uint8Array(analyser.frequencyBinCount);
    } catch { /* Autoplay restrictions leave ordinary media playback intact. */ }
    finally {connecting=false;}
  }
  audio.addEventListener('play',connect);
  const unlock=()=>{if(context?.state==='suspended')context.resume().catch(()=>{});connect();};
  document.addEventListener('pointerdown',unlock);
  document.addEventListener('keydown',unlock);
  return ()=>{
    audio.removeEventListener('play',connect);
    document.removeEventListener('pointerdown',unlock);
    document.removeEventListener('keydown',unlock);
    context?.close().catch(()=>{});
  };
}

export function readMusicMotion(ms) {
  motion.playing=!!audio && !audio.paused && !audio.ended;
  motion.time=audio?.currentTime || 0;
  motion.active=!!analyser && !audio.paused && context.state==='running';
  if (!motion.active || ms-lastRead<30) return motion;
  lastRead=ms;
  analyser.getByteFrequencyData(bins);
  const lowEnd=Math.min(bins.length,Math.ceil(260/context.sampleRate*analyser.fftSize));
  let low=0,full=0;
  for(let i=1;i<lowEnd;i++)low+=bins[i]/255;
  low/=Math.max(1,lowEnd-1);
  for(let i=1;i<100;i++)full+=bins[i]/255;
  full/=99;
  average+=(low-average)*.025;
  peak=Math.max(low,peak*.997,.12);
  if (low>average*1.13 && low>.16 && ms-lastBeat>340) {
    const gap=ms-lastBeat;
    if (gap<850) {
      intervals.push(gap);if(intervals.length>9)intervals.shift();
      if(intervals.length>=4){
        const sorted=[...intervals].sort((a,b)=>a-b);
        const bpm=Math.max(85,Math.min(155,60000/sorted[Math.floor(sorted.length/2)]));
        motion.bpm+=(bpm-motion.bpm)*.15;
      }
    }
    lastBeat=ms;
  }
  const energy=Math.min(1,full*.6+Math.max(0,(low-average)/peak)*1.7+low/peak*.38);
  motion.energy+=(energy-motion.energy)*(energy>motion.energy?.42:.09);
  return motion;
}
