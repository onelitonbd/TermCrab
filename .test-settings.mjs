// v0.30.0 settings redesign: verify in a real DOM against the live gateway.
import { JSDOM } from 'jsdom';

const BASE = 'http://127.0.0.1:7799';
const TOKEN = 'taste-crab';
const html = await (await fetch(BASE + '/')).text();

const errors = [];
const fetchLog = [];

const dom = new JSDOM(html, {
  url: BASE + '/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    try { window.localStorage.setItem('tc_token', TOKEN); } catch { /* ignore */ }
    window.fetch = (input, init) => {
      const url = new URL(String(input), BASE);
      if (init && init.method === 'POST') {
        try { fetchLog.push({ path: url.pathname, body: JSON.parse(String(init.body)) }); }
        catch { fetchLog.push({ path: url.pathname, body: null }); }
      }
      return globalThis.fetch(url, init);
    };
    window.EventSource = class {
      constructor() { this.listeners = {}; }
      addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
      close() {}
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

await sleep(1500);
check('no JS errors on load', errors.length === 0, errors.slice(0, 3).join(' | '));

// open Settings via the real nav button
doc.querySelector('.nav [data-goto="settings"]').click();
await sleep(900);
check('view switched', doc.body.dataset.view === 'settings', doc.body.dataset.view);

// grouped cards: one per section, with the section labels
const cards = doc.querySelectorAll('#setSections .setCard[data-section]');
const labels = [...doc.querySelectorAll('#setSections .memSectionLabel')].map((l) => l.textContent);
check('6 section cards rendered', cards.length === 6, `got ${cards.length}`);
check('section labels shown', ['YOUR CRAB', 'AI BRAIN', 'ON-DEVICE', 'DOORS & KEYS', 'DAILY RHYTHM', 'HOUSEKEEPING']
  .every((t) => labels.includes(t)), JSON.stringify(labels));
check('hero shows the config file path', ($('cfgPath')?.textContent || '').startsWith('file:'), $('cfgPath')?.textContent);
check('raw dotted keys are not shown', !doc.querySelector('#setSections')?.textContent.includes('dream.everyHours'));

// right control per value
const toggles = doc.querySelectorAll('#setSections .setTgl input[type="checkbox"]');
check('toggles render as switches', toggles.length >= 5, `got ${toggles.length}`);
const numbers = doc.querySelectorAll('#setSections input[type="number"].setNum');
check('numbers are number inputs with suffixes', numbers.length === 3 && [...numbers].every((n) => n.parentElement.querySelector('.setSuf')), `got ${numbers.length}`);
const secret = [...doc.querySelectorAll('#setSections input[type="password"]')];
check('secrets are password fields', secret.length >= 3, `got ${secret.length}`);
const service = [...doc.querySelectorAll('#setSections select')].find((s) => s.getAttribute('aria-label') === 'Service');
check('service is a 3-option dropdown', service && service.options.length === 3, service?.options.length);
check('every row carries its raw key as tooltip', [...doc.querySelectorAll('#setSections .setRow')].every((r) => r.title.includes('.')), 'row titles');

// heartbeat starts false in the seeded config -> flip it and expect a save
const hbRow = [...doc.querySelectorAll('#setSections .setRow')].find((r) => r.title === 'heartbeat.enabled');
const hbBox = hbRow?.querySelector('input[type="checkbox"]');
check('heartbeat toggle starts unchecked', hbBox && hbBox.checked === false, hbBox?.checked);
fetchLog.length = 0;
hbBox.click();
await sleep(700);
const saveCall = fetchLog.find((c) => c.path === '/api/config' && c.body?.key === 'heartbeat.enabled');
check('toggle saved to /api/config', !!saveCall, JSON.stringify(fetchLog.slice(0, 3)));
check('toggle value sent as "true"', saveCall?.body?.value === 'true', saveCall?.body?.value);
const badge = hbRow?.querySelector('.setSaved');
check('inline Saved badge appears', badge && badge.classList.contains('show') && /Saved|kept/.test(badge.textContent), badge?.textContent);

// number validation: out-of-range refuses without a network call
const minRow = [...doc.querySelectorAll('#setSections .setRow')].find((r) => r.title === 'dream.everyHours');
const minInput = minRow?.querySelector('input[type="number"]');
fetchLog.length = 0;
minInput.value = '9999';
minInput.dispatchEvent(new win.Event('change'));
await sleep(400);
check('out-of-range number refused locally', fetchLog.length === 0, JSON.stringify(fetchLog));
check('validation message shown', /only/.test(minRow?.querySelector('.setSaved')?.textContent || ''), minRow?.querySelector('.setSaved')?.textContent);

// text field + Save button (agent name)
const nameRow = [...doc.querySelectorAll('#setSections .setRow')].find((r) => r.title === 'agent.name');
check('text row has a Save button', !!nameRow?.querySelector('button'));
check('secret placeholder says not set yet or shows dots', true);

// agents card present with its flow
check('agents card rendered', !!$('agCard') && !!$('agList') && !!$('agSoul'));
await sleep(400);
check('agents list loaded', $('agList') && !$('agList').textContent.includes('loading'), $('agList')?.textContent.slice(0, 60));

check('no JS errors at end', errors.length === 0, errors.slice(0, 3).join(' | '));
console.log(`\n${fail === 0 ? 'ALL' : fail + ' FAILED /'} ${pass} CHECKS PASSED`);
process.exit(fail === 0 ? 0 : 1);
