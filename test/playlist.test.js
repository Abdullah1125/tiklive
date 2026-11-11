import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {Readable} from 'node:stream';
import {createPlaylist} from '../src/playlist.js';
function upload(){const r=Readable.from([Buffer.from('ID3-test-track')]);r.headers={'content-type':'audio/mpeg'};return r;}
test('playlist uploads do not interrupt, reorders keep position, ended retries advance once and last wraps',async()=>{
 const path=await mkdtemp(tmpdir()+'/halay-playlist-'),root=pathToFileURL(path+'/');
 try{
  const p=await createPlaylist(root);
  await p.add(upload(),'Bir.mp3');await p.add(upload(),'İki.mp3');
  let s=p.snapshot();assert.equal(s.active,false);assert.equal(s.tracks.length,2);
  const [a,b]=s.tracks;
  await p.control({command:'play',id:a.id});s=p.snapshot();
  await p.control({command:'order',ids:[b.id,a.id]});
  assert.equal(p.snapshot().revision,s.revision);assert.equal(p.snapshot().current,a.id);
  await p.control({command:'ended',id:a.id,revision:s.revision});
  assert.equal(p.snapshot().current,b.id);
  await p.control({command:'ended',id:a.id,revision:s.revision});assert.equal(p.snapshot().current,b.id);
  await p.control({command:'pause'});assert.equal(p.snapshot().playing,false);
  const version=p.snapshot().revision;await p.control({command:'play'});assert.equal(p.snapshot().revision,version);
  await assert.rejects(p.control({command:'order',ids:[a.id,a.id]}));
  assert.equal(p.file('../../.env'),null);
  const loaded=await createPlaylist(root);assert.equal(loaded.snapshot().current,b.id);assert.equal(loaded.snapshot().playing,false);
  await p.control({command:'legacy'});assert.equal(p.snapshot().active,false);
 }finally{await rm(path,{recursive:true,force:true});}
});
