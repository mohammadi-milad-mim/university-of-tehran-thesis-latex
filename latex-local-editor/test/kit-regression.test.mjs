import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
test('terminology registry follows used keys and preserves first-use terms',async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'ut-terms-'));
 try {
  await fs.cp(path.join(root,'thesis-latex'),temp,{recursive:true,filter:p=>!['.build','output'].includes(path.basename(p))});
  execFileSync('python3',[path.join(temp,'tools/prepare_terms.py')]);
  const registry=await fs.readFile(path.join(temp,'glossary/preliminary-acronyms.tex'),'utf8');
  assert.match(registry,/glsadd\{en-dataset\}/);
  assert.match(registry,/glsadd\{acr-user-interface\}/);
  assert.doesNotMatch(registry,/unused-term|glsadd\{dataset\}/);
 } finally {await fs.rm(temp,{recursive:true,force:true});}
});

test('preview preserves sibling resources, excludes symlinks and build output',async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'ut-snapshot-'));
 try {
  const thesis=path.join(temp,'thesis-latex');
  for (const name of ['thesis-latex','figures','experiment_results']) await fs.cp(path.join(root,name),path.join(temp,name),{recursive:true,filter:p=>!['.build','output'].includes(path.basename(p))});
  await fs.mkdir(path.join(temp,'figures/.git'));
  await fs.writeFile(path.join(temp,'figures/.git/private'),'excluded');
  await fs.symlink(os.tmpdir(),path.join(temp,'figures/escape'));
  process.env.THESIS_LATEX_EDITOR_WORKSPACE=thesis;
  process.env.THESIS_LATEX_EDITOR_CACHE=path.join(temp,'cache');
  const {createPreviewSnapshot,discardWorkspace}=await import('../server/previewWorkspace.mjs');
  const preview=await createPreviewSnapshot('shared-test',[]);
  assert.equal(await fs.readFile(path.join(preview,'../figures/workflow.tex'),'utf8'),await fs.readFile(path.join(temp,'figures/workflow.tex'),'utf8'));
  assert.match(await fs.readFile(path.join(preview,'../experiment_results/sample-data.tex'),'utf8'),/Synthetic/);
  await assert.rejects(fs.access(path.join(preview,'../figures/escape')));
  await assert.rejects(fs.access(path.join(preview,'../figures/.git')));
  await discardWorkspace(preview);
  await assert.rejects(fs.access(path.dirname(preview)));
 } finally {await fs.rm(temp,{recursive:true,force:true});}
});
