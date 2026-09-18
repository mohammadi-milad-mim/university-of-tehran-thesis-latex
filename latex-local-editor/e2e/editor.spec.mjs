import {test as base, expect} from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const test = base.extend({kit: [async ({}, use, workerInfo) => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'ut-editor-e2e-'));
  for (const name of ['thesis-latex','figures','experiment_results']) await fs.cp(path.join(root,name),path.join(temp,name),{recursive:true,filter: p => !['.build','output'].includes(path.basename(p))});
  const port = 19100 + workerInfo.workerIndex;
  const child = spawn(process.execPath,['scripts/start.mjs'],{cwd:path.join(root,'latex-local-editor'),env:{...process.env,THESIS_LATEX_EDITOR_API_PORT:String(port),THESIS_LATEX_EDITOR_WORKSPACE:path.join(temp,'thesis-latex'),THESIS_LATEX_EDITOR_CACHE:path.join(temp,'cache')},stdio:'pipe'});
  let logs='';child.stderr.on('data',d=>logs+=d);
  const url=`http://127.0.0.1:${port}`;
  try {
    await expect.poll(async()=>{try{return (await fetch(url+'/api/index')).status;}catch{return 0;}}).toBe(200);
    await use({temp,url,chapter:path.join(temp,'thesis-latex/chapters/01-introduction.tex')});
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve=>{if(child.exitCode!==null)resolve();else child.once('exit',resolve);});
    await fs.rm(temp,{recursive:true,force:true});
    if (logs) console.log(logs);
  }
}, {scope:'worker'}]});
const mod = process.platform==='darwin' ? 'Meta' : 'Control';
async function source(page) {await page.getByRole('button',{name:'لاتک',exact:true}).click();return page.locator('.editor-host .cm-content');}
async function open(page,kit) {await page.goto(kit.url);await page.locator('[title="chapters/01-introduction.tex"]').click();}
async function replace(page,editor,text) {await editor.click();await page.keyboard.press(mod+'+a');await page.keyboard.insertText(text);}

test('Persian editing, mixed direction, mode fidelity, undo, search, and save/reopen',async({page,kit},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await open(page,kit);const editor=await source(page);
 const text='\\chapter{آزمون}\nمتن فارسی با نیم‌فاصله و عدد ۱۲٫۵، سپس \\lr{sample.txt} و \\cite{lamport1994}.\nEnglish text (42).\n';
 await replace(page,editor,text);
 await page.getByRole('button',{name:'نوشتاری',exact:true}).click();
 await page.getByRole('button',{name:'لاتک',exact:true}).click();
 await page.getByRole('button',{name:'ذخیره',exact:true}).click();
 await expect.poll(()=>fs.readFile(kit.chapter,'utf8')).toBe(text);
 await expect(editor.locator('.cm-line').filter({hasText:'متن فارسی'})).toHaveAttribute('dir','rtl');
 await expect(editor.locator('.cm-line').filter({hasText:'English text'})).toHaveAttribute('dir','ltr');
 await expect(editor.locator('.cm-line').first()).toHaveAttribute('dir','ltr');
 await expect(editor.locator('.cm-line').first()).toHaveCSS('unicode-bidi','isolate');
 await expect(editor.locator('[dir="ltr"]').filter({hasText:'\\cite{lamport1994}'})).toBeVisible();
 await editor.click();await page.keyboard.press(mod+'+End');await page.keyboard.type(' appended');
 await expect(editor).toContainText('appended');
 await expect(page.locator('.save-state')).toHaveText('ذخیره‌نشده');
 await page.keyboard.press(mod+'+z');
 await expect(page.locator('.save-state')).toHaveText('ذخیره شده');
 await page.keyboard.press(mod+'+Shift+z');
 await expect(page.locator('.save-state')).toHaveText('ذخیره‌نشده');
 await page.keyboard.press(mod+'+z');
 await page.getByTitle('جست‌وجو در فایل').click();
 await expect(page.locator('.cm-search')).toBeVisible();
 await page.locator('.cm-search input[name="search"]').fill('فارسی');
 await page.locator('.cm-search input[name="search"]').press('Enter');
 await expect(page.locator('.cm-searchMatch').first()).toBeVisible();
 await page.keyboard.press('Escape');
 await page.screenshot({path:info.outputPath('rtl-source.png'),fullPage:true});
 await page.reload();await page.getByRole('button',{name:'لاتک',exact:true}).click();
 await expect(page.locator('.cm-content')).toContainText('نیم‌فاصله');
 expect(await fs.readFile(kit.chapter,'utf8')).toBe(text);
 expect(errors).toEqual([]);
});

test('external edits surface conflicts and disk reload is explicit',async({page,kit})=>{
 await open(page,kit);const editor=await source(page);
 await replace(page,editor,'\\chapter{نسخه محلی}\nتغییر ذخیره‌نشده');
 const external='\\chapter{نسخه دیسک}\nتغییر بیرونی';
 await fs.writeFile(kit.chapter,external);
 await expect(page.getByRole('dialog')).toBeVisible();
 expect(await fs.readFile(kit.chapter,'utf8')).toBe(external);
 await page.getByRole('button',{name:'بارگذاری نسخهٔ دیسک'}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(editor).toContainText('تغییر بیرونی');
 await expect(page.locator('.save-state')).toHaveText('ذخیره شده');
});

test('protected environments open exact source and glossary keys complete',async({page,kit})=>{
 await open(page,kit);
 await page.locator('[title="chapters/03-methodology.tex"]').click();
 await page.getByRole('button',{name:'نوشتاری',exact:true}).click();
 await expect(page.locator('.cm-protected-card').first()).toBeVisible();
 await page.locator('.cm-protected-card').first().click();
 await expect(page.getByRole('button',{name:'لاتک',exact:true})).toHaveClass('active');
 const editor=page.locator('.editor-host .cm-content');
 await replace(page,editor,'\\gls{user');
 await page.keyboard.press('Control+Space');
 await expect(page.locator('.cm-tooltip-autocomplete')).toContainText('user-interface');
 // Simulate a composition sequence without claiming physical Persian IME coverage.
 await editor.dispatchEvent('compositionstart',{data:''});
 await page.keyboard.insertText('فارسی');
 await editor.dispatchEvent('compositionend',{data:'فارسی'});
 await expect(editor).toContainText('فارسی');
});

test('typing during a delayed save survives the response',async({page,kit})=>{
 await open(page,kit);const editor=await source(page);
 await replace(page,editor,'\\chapter{آزمون ذخیره}\nنسخه نخست');
 let release;const held=new Promise(r=>release=r);
 await page.route('**/api/file',async route=>{
  if(route.request().method()!=='POST') return route.continue();
  const response=await route.fetch();await held;await route.fulfill({response});
 });
 await page.getByRole('button',{name:'ذخیره',exact:true}).click();
 await expect(page.locator('.save-state')).toHaveText('در حال ذخیره…');
 await editor.click();await page.keyboard.press(mod+'+End');await page.keyboard.insertText(' نوشته تازه');
 release();await expect(page.locator('.save-state')).toHaveText('ذخیره‌نشده');
 await expect(editor).toContainText('نوشته تازه');
 await page.unroute('**/api/file');
 await page.getByRole('button',{name:'ذخیره',exact:true}).click();
 await expect.poll(()=>fs.readFile(kit.chapter,'utf8')).toContain('نوشته تازه');
});

test('real PDF preview overlays multiple buffers, renders, and maps SyncTeX',async({page,kit},info)=>{
 test.skip(info.project.name!=='chromium','One real compiler run; editing is tested in all engines.');
 test.setTimeout(180000);
 await open(page,kit);const editor=await source(page);
 const before=await fs.readFile(kit.chapter,'utf8');
 await replace(page,editor,'\\chapter{آزمون پیش‌نمایش}\nمتن نمونه برای نمایش. \\gls{dataset}\n');
 await page.locator('[title="chapters/02-literature-review.tex"]').click();
 const second=path.join(kit.temp,'thesis-latex/chapters/02-literature-review.tex');
 const beforeSecond=await fs.readFile(second,'utf8');
 await replace(page,editor,'\\chapter{فصل دوم نمونه}\nدومین بافر ذخیره‌نشده.\n');
 const request = page.waitForResponse(response => response.url().endsWith('/api/preview') && response.request().method() === 'POST');
 await page.getByRole('button',{name:'تازه‌سازی PDF'}).click();
 const accepted = await request; expect(accepted.status(), await accepted.text()).toBe(202);
 await expect.poll(async()=> (await (await fetch(kit.url+'/api/preview/status')).json()).phase,{timeout:150000,intervals:[1000]}).toBe('succeeded');
 expect(await fs.readFile(kit.chapter,'utf8')).toBe(before);
 expect(await fs.readFile(second,'utf8')).toBe(beforeSecond);
 const status=await (await fetch(kit.url+'/api/preview/status')).json();
 const sync=await fetch(kit.url+'/api/sync?path=chapters%2F02-literature-review.tex&line=2&column=1&revision='+status.revision);
 expect(sync.status).toBe(200);
 await expect(page.locator('canvas').first()).toBeVisible({timeout:20000});
 await page.screenshot({path:info.outputPath('pdf-preview.png'),fullPage:true});
});

test('keyboard selection and copy/paste preserve Persian and LaTeX bytes',async({page,kit})=>{
 await open(page,kit);const editor=await source(page);
 const text='متن فارسی با نیم‌فاصله و \\lr{ABC-123}';
 await replace(page,editor,text);
 await expect(editor).toContainText('ABC-123');
 await page.keyboard.press(mod+'+a');await page.keyboard.press(mod+'+c');
 await page.keyboard.press('ArrowRight');await page.keyboard.press(mod+'+End');
 await page.keyboard.press('Enter');await page.keyboard.press(mod+'+v');
 await expect(editor.locator('.cm-line')).toHaveCount(2);
 await page.getByRole('button',{name:'ذخیره',exact:true}).click();
 await expect.poll(()=>fs.readFile(kit.chapter,'utf8')).toBe(text+'\n'+text);
});
