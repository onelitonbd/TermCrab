// v0.27.0 visual verification: session source icons + per-tool icons in a real DOM.
// Usage: node .test-icons.mjs   (gateway must be up on 127.0.0.1:7799 with seeded sessions)
import { JSDOM } from 'jsdom';

const BASE = 'http://127.0.0.1:7799';
const TOKEN = 'taste-crab';
const html = await (await fetch(BASE + '/')).text();

const errors = [];
const esInstances = [];

const dom = new JSDOM(html, {
  url: BASE + '/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    try { window.localStorage.setItem('tc_token', TOKEN); } catch { /* ignore */ }
    window.fetch = (input, init) => globalThis.fetch(new URL(String(input), BASE), init);
    window.EventSource = class EventSourceStub {
      constructor(url) { this.url = String(url); this.listeners = {}; esInstances.push(this); }
      addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
      close() {}
      emit(type, data) { for (const fn of this.listeners[type] || []) fn({ data: JSON.stringify(data) }); }
    };
    window.AbortController = globalThis.AbortController;
    window.requestAnimationFrame = window.requestAnimationFrame || ((cb) => setTimeout(() => cb(Date.now()), 16));
    window.scrollTo = () => {};
    window.addEventListener('error', (e) => errors.push(String(e.message)));
    const origError = window.console.error;
    window.console.error = (...a) => { errors.push(a.map(String).join(' ')); origError.apply(window.console, a); };
  },
});

const win = dom.window;
const doc = win.document;
const $ = (id) => doc.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, detail ?? ''); }
}

// let init() run (status, sessions, first loadSession)
await sleep(1500);

// 1. zero JS errors so far
check('no JS errors', errors.length === 0, errors.slice(0, 3).join(' | '));

// 2. chat header: web icon + friendly label, no raw web: prefix
const health = $('health');
const healthText = (health?.textContent || '').trim();
check('health label shows Web', healthText.startsWith('Web'), JSON.stringify(healthText));
check('health has session icon svg', !!health?.querySelector('.sessIc svg'));
check('health has no raw prefix', !healthText.includes('web:'));

// 3. sidebar history: telegram row icon + label, no raw prefix anywhere
const histHtml = $('histList')?.innerHTML || '';
const histText = $('histList')?.textContent || '';
check('sidebar shows Telegram row label', histText.includes('Telegram · 998877'), histText.slice(0, 200));
check('sidebar has svg icons', ($('histList')?.querySelectorAll('.sessIc svg').length || 0) >= 2);
check('sidebar has no raw telegram: prefix', !histText.includes('telegram:'));
const tgRow = [...doc.querySelectorAll('#histList .histRow')].find((r) => r.textContent.includes('998877'));
check('telegram row icon color', !!tgRow?.querySelector('.sessIc svg'));

// 4. hidden picker keeps raw value, friendly option text
const sel = $('session');
const tgOpt = [...sel.options].find((o) => o.value === 'telegram:998877');
check('picker option keeps raw value', !!tgOpt);
check('picker option text is friendly', tgOpt && tgOpt.textContent === 'Telegram · 998877', tgOpt?.textContent);

// 5. Tools > Chats panel rows: icon + label, dataset keeps raw id
doc.querySelector('[data-goto="tools"]')?.click();
await sleep(200);
doc.querySelector('[data-ttab="chats"]')?.click();
await sleep(500);
const sessRow = [...doc.querySelectorAll('.sessRow')].find((r) => r.dataset.id === 'telegram:998877');
check('session panel row exists', !!sessRow);
check('session panel row shows friendly label', sessRow && sessRow.querySelector('.id').textContent.includes('Telegram · 998877'), sessRow?.querySelector('.id')?.textContent);
check('session panel row has icon svg', !!sessRow?.querySelector('.id .sessIc svg'));
check('session panel row no raw prefix', sessRow && !sessRow.querySelector('.id').textContent.includes('telegram:'));

// 6. live tool line: icon + name, then status appended as span (name not wiped)
const es = esInstances[esInstances.length - 1];
check('EventSource stub captured', !!es);
if (es) {
  es.emit('tool:start', { name: 'web_search', args: { query: 'dhaka weather' } });
  await sleep(50);
  let line = [...doc.querySelectorAll('#log .tools')].pop();
  check('live tool line rendered', !!line);
  check('live tool line has icon', !!line?.querySelector('.toolIc svg'));
  check('live tool line shows name', line?.querySelector('.toolNm')?.textContent === 'web_search', line?.textContent);
  check('live tool line shows arg preview', line?.textContent.includes('dhaka weather'), line?.textContent);
  es.emit('tool:end', { name: 'web_search', ok: true, preview: 'sunny' });
  await sleep(50);
  line = [...doc.querySelectorAll('#log .tools')].pop();
  check('status appended as span', line?.querySelector('.toolSt')?.textContent.includes('done'), line?.textContent);
  check('name survives tool:end (no innerHTML wipe)', line?.querySelector('.toolNm')?.textContent === 'web_search');
  check('status span not bad-class on success', !line?.querySelector('.toolSt')?.classList.contains('bad'));
  // unknown tool falls back to an icon
  es.emit('tool:start', { name: 'brand_new_tool', args: {} });
  await sleep(50);
  line = [...doc.querySelectorAll('#log .tools')].pop();
  check('unknown tool still gets an icon', !!line?.querySelector('.toolIc svg'));
  es.emit('tool:end', { name: 'brand_new_tool', ok: false, preview: 'boom' });
  await sleep(50);
  line = [...doc.querySelectorAll('#log .tools')].pop();
  check('failed status styled bad', !!line?.querySelector('.toolSt.bad'));
}

// 7. switch to the telegram session: history reload re-renders stored tool line + done status
sel.value = 'telegram:998877';
sel.dispatchEvent(new win.Event('change'));
await sleep(800);
const tgLines = [...doc.querySelectorAll('#log .tools')];
const tgToolLine = tgLines.find((l) => l.querySelector('.toolNm')?.textContent === 'web_search');
check('reloaded history shows stored tool call', !!tgToolLine, JSON.stringify(tgLines.map((l) => l.textContent)));
check('reloaded tool line has icon', !!tgToolLine?.querySelector('.toolIc svg'));
check('reloaded tool line marked done from role:tool', tgToolLine?.querySelector('.toolSt')?.textContent.includes('done'), tgToolLine?.textContent);
check('chat header switched to Telegram', ($('health')?.textContent || '').includes('Telegram · 998877'), $('health')?.textContent);
check('health still has icon after switch', !!$('health')?.querySelector('.sessIc svg'));

// 8. messages from stored JSONL still render (nothing else broke)
check('user message reloaded', doc.getElementById('log').textContent.includes('check dhaka weather'));
check('assistant answer reloaded', doc.getElementById('log').textContent.includes('sunny in Dhaka'));

// 9. zero JS errors overall
check('no JS errors (end)', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log(`\n${fail === 0 ? 'ALL' : fail + ' FAILED /'} ${pass} CHECKS PASSED`);
process.exit(fail === 0 ? 0 : 1);
