// Run against a local editor serving this kit. Restores the sample author file.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.EDITOR_URL || 'http://127.0.0.1:5185';
const relative='chapters/01-introduction.tex';
const read=async()=>{const r=await fetch(`${base}/api/file?path=${encodeURIComponent(relative)}`);assert.equal(r.status,200);return r.json();};
const original=await read();
const save=async(content,hash)=>fetch(base+'/api/file',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({path:relative,content,expectedHash:hash})});
try {
 assert.equal((await fetch(base+'/')).status,200);
 assert.equal((await fetch(base+'/api/index',{headers:{Origin:'http://untrusted.invalid'}})).status,403);
 const changed=original.content+'\n% smoke test marker\n';
 assert.equal((await save(changed,original.hash)).status,200);
 assert.equal((await read()).content,changed);
 assert.equal(await fs.readFile('thesis-latex/'+relative,'utf8'),changed,'bind-mount save must reach host');
 assert.equal((await save('stale',original.hash)).status,409);
 const build=await fetch(base+'/api/preview',{method:'POST',headers:{'content-type':'application/json','X-Thesis-Latex-Editor-Action':'preview-pdf'},body:JSON.stringify({buffers:[{path:relative,content:changed+'\n% unsaved preview\n',baseHash:(await read()).hash}]})});
 assert.equal(build.status,202);
 let status;const deadline=Date.now()+180000;
 do {await new Promise(r=>setTimeout(r,1000));status=await (await fetch(base+'/api/preview/status')).json();} while(status.phase==='running' && Date.now()<deadline);
 assert.equal(status.phase,'succeeded',JSON.stringify(status));
 assert.equal((await read()).content,changed);
 assert.equal((await fetch(base+'/api/pdf')).status,200);
 const sync=await fetch(base+'/api/sync?path='+encodeURIComponent(relative)+'&line=3&revision='+status.revision);
 assert.equal(sync.status,200);
 console.log('PASS: frontend, origin policy, host persistence, conflict, real preview, source isolation, PDF, SyncTeX');
} finally { const current=await read();assert.equal((await save(original.content,current.hash)).status,200); }
