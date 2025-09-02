const state = {
  scenes: null,
  currentId: null,
  history: [],
  vibe: 70,
  vibeAnimated: 70,
  fillCurrent: 30,
  fillTarget: 30,
  emojiByBand: {
    hot: 'assets/angry_meme.png',
    warm: 'assets/annoyed_meme.png',
    ok: 'assets/neutral_meme.png',
    calm: 'assets/soft_meme.png',
    party: 'assets/party_meme.png'
  },
  interceptLines: [
    "Man, really? So… no more Roblox with me?",
    "Hold up… no more momo chicken Uber Eats?",
    "Dang. Not even a quick library hi while I’m stuck there?"
  ]
};

const el = {
  content: document.getElementById('content'),
  actions: document.getElementById('actions'),
  back: document.getElementById('backBtn'),
  popup: document.getElementById('popup'),
  vibeFill: document.getElementById('vibeFill'),
  vibeEmoji: document.getElementById('vibeEmoji'),
  toasts: document.getElementById('toasts'),
  startBtn: document.getElementById('startBtn'),
  splash: document.getElementById('splash')
};

window.addEventListener('DOMContentLoaded', async () => {
  state.scenes = await loadScenes();
  el.startBtn.addEventListener('click', () => {
    el.startBtn.remove();
    el.splash.remove();
    goTo('S0_SMALLTALK', { eraseBefore: false });
  });
  el.back.addEventListener('click', onBack);
  requestAnimationFrame(tick);
});

async function loadScenes() {
  const inline = document.getElementById('scenes-data');
  if (inline && inline.textContent.trim()) {
    try { return JSON.parse(inline.textContent); } catch {}
  }
  try {
    const res = await fetch('scenes.expanded.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (err) {
    alert('Scenes failed to load.\nRun a local server (e.g., python -m http.server) or paste JSON into <script id="scenes-data"> in index.html.');
    return { scenes: [] };
  }
}

function goTo(id, opts = {}) {
  const scene = findScene(id);
  if (!scene) return;
  if (state.currentId) {
    state.history.push({ id: state.currentId, vibe: state.vibe });
  }
  state.currentId = id;
  if ('vibe' in scene) state.vibe = clamp(scene.vibe, 0, 100);
  if ('vibeDelta' in scene) state.vibe = clamp(state.vibe + scene.vibeDelta, 0, 100);
  renderScene(scene, opts);
  updateBackVisibility();
  updateVibeTargets();
}

function onBack() {
  const prev = state.history.pop();
  if (!prev) return;
  state.currentId = prev.id;
  state.vibe = prev.vibe;
  const scene = findScene(prev.id);
  renderScene(scene, { eraseBefore: false });
  updateBackVisibility();
  updateVibeTargets();
}

function updateBackVisibility() {
  document.getElementById('backBtn').style.visibility = state.history.length ? 'visible' : 'hidden';
}

function findScene(id) {
  return state.scenes.scenes.find(s => s.id === id);
}

async function renderScene(scene, { eraseBefore = true } = {}) {
  el.back.disabled = true;
  el.actions.innerHTML = '';
  const text = scene.prompt || '';
  const textWrap = document.createElement('div');
  textWrap.className = 'text fit-down';
  el.content.innerHTML = '';
  el.content.appendChild(textWrap);
  if (eraseBefore) { await typeErase(textWrap); }
  await typeText(textWrap, text);
  fitTextDown(textWrap, el.content);
  if (scene.type === 'single') {
    const btn = makeButton('...', 'btn fancy more');
    btn.addEventListener('click', async () => {
      await eraseThenNext(scene.next);
    });
    el.actions.appendChild(btn);
  } else if (scene.type === 'choices') {
    for (const c of scene.choices) {
      const btn = makeChoice(c);
      el.actions.appendChild(btn);
      if (c.gimmick === 'dodge') attachDodge(btn);
      if (c.gimmick === 'shake') { btn.classList.add('shake'); setTimeout(()=>btn.classList.remove('shake'),180); }
      if (c.gimmick === 'soften') btn.classList.add('soften');
    }
  } else if (scene.type === 'collect') {
    renderCollect(scene);
  }
  if (scene.type === 'single' || scene.type === 'choices') {
    fitActionButtons(el.actions);
  }
  if (scene.id?.startsWith('E_') || scene.type === 'ending') {
    renderEnding(scene.id);
  }
  el.back.disabled = false;
}

if (scene.id?.startsWith('E_') || scene.type === 'ending') {
  renderEnding(scene.id);
}

async function eraseThenNext(nextId) {
  const next = findScene(nextId);
  const currentTextEl = el.content.querySelector('.text');
  if (currentTextEl) await typeErase(currentTextEl);
  await renderScene(next, { eraseBefore: false });
}

function makeButton(label, classNames = 'btn fancy') {
  const b = document.createElement('button');
  b.className = classNames;
  b.textContent = label;
  return b;
}

function makeChoice(choice) {
  const b = document.createElement('button');
  b.className = 'btn fancy choice';
  b.innerHTML = `<span>${escapeHtml(choice.label)}</span>` + (choice.micro ? `<span class="micro">${escapeHtml(choice.micro)}</span>` : '');
  b.addEventListener('click', async (ev) => {
    if ('vibe' in choice) state.vibe = clamp(choice.vibe, 0, 100);
    if ('vibeDelta' in choice) state.vibe = clamp(state.vibe + choice.vibeDelta, 0, 100);
    updateVibeTargets();
    if (choice.intercept) {
      showPopupOverButton(ev.currentTarget, randomLine(state.interceptLines));
      await sleep(900);
    }
    await typeErase(el.content.querySelector('.text'));
    goTo(choice.to, { eraseBefore: false });
  });
  return b;
}

async function typeText(elText, full) {
  elText.textContent = '';
  const cursor = document.createElement('span');
  cursor.className = 'cursor';
  cursor.textContent = '|';
  elText.appendChild(cursor);
  const base = 22;
  let stumbleCounter = 0;
  for (let i = 0; i < full.length; i++) {
    const ch = full[i];
    cursor.before(ch);
    let delay = base + Math.random() * 18;
    if (/[.,!?]/.test(ch) && Math.random() < 0.35) delay += 160 + Math.random() * 220;
    if (ch === '\n') delay += 140;
    if (Math.random() < 0.035 && stumbleCounter < 2) {
      delay += 220 + Math.random() * 300;
      stumbleCounter++;
    }
    await sleep(delay);
  }
}

async function typeErase(elText) {
  if (!elText) return;
  const full = elText.textContent.replace('|','');
  if (!full) return;
  let cursor = elText.querySelector('.cursor');
  if (!cursor) {
    cursor = document.createElement('span');
    cursor.className = 'cursor';
    cursor.textContent = '|';
    elText.appendChild(cursor);
  }
  elText.innerHTML = '';
  const textNode = document.createTextNode(full);
  elText.append(textNode, cursor);
  for (let i = full.length; i > 0; i--) {
    textNode.textContent = full.slice(0, i - 1);
    await sleep(6 + Math.random() * 15);
  }
}

function fitTextDown(textEl, containerEl) {
  let size = 18;
  const min = 14;
  textEl.style.fontSize = size + 'px';
  while (textEl.scrollHeight > containerEl.clientHeight && size > min) {
    size -= 1;
    textEl.style.fontSize = size + 'px';
  }
}

function renderCollect(scene) {
  el.actions.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '10px';
  wrap.style.alignItems = 'center';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = scene.collect?.placeholder || 'Add a step…';
  input.className = 'btn fancy';
  input.style.textAlign = 'left';
  input.style.width = '100%';
  const chips = document.createElement('div');
  chips.style.display = 'flex';
  chips.style.flexWrap = 'wrap';
  chips.style.gap = '8px';
  chips.style.width = '100%';
  const continueBtn = makeButton('Continue', 'btn fancy');
  continueBtn.disabled = true;
  continueBtn.style.opacity = '0.8';
  const notNowBtn = makeButton('Not now', 'btn fancy');
  wrap.append(input, chips, continueBtn, notNowBtn);
  el.actions.appendChild(wrap);
  let count = 0;
  const reactions = scene.collect?.reactions || [];
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      count++;
      const chip = document.createElement('div');
      chip.className = 'btn fancy';
      chip.textContent = `${count}. ${input.value.trim()}`;
      chips.appendChild(chip);
      pushToastNear(chips, randomLine(reactions));
      input.value = '';
      continueBtn.disabled = count < (scene.collect?.min || 1);
      continueBtn.style.opacity = continueBtn.disabled ? '0.8' : '1';
    } else if (e.key === 'Backspace' && !input.value && chips.lastChild) {
      chips.removeChild(chips.lastChild);
      count = Math.max(0, count - 1);
      continueBtn.disabled = count < (scene.collect?.min || 1);
      continueBtn.style.opacity = continueBtn.disabled ? '0.8' : '1';
    }
  });
  continueBtn.addEventListener('click', async () => {
    await typeErase(el.content.querySelector('.text'));
    goTo(scene.choices.find(c => c.label.toLowerCase().includes('continue')).to, { eraseBefore: false });
  });
  notNowBtn.addEventListener('click', async () => {
    await typeErase(el.content.querySelector('.text'));
    goTo(scene.choices.find(c => c.label.toLowerCase().includes('not now')).to, { eraseBefore: false });
  });
}

function showPopupOverButton(btn, text) {
  const r = btn.getBoundingClientRect();
  const cardR = document.getElementById('card').getBoundingClientRect();
  const popup = el.popup;
  popup.textContent = text;
  popup.hidden = false;
  popup.style.left = (r.left - cardR.left + r.width/2) + 'px';
  popup.style.top = (r.top - cardR.top) + 'px';
  setTimeout(() => { popup.hidden = true; }, 1800);
}

function pushToastNear(anchorEl, text) {
  if (!text) return;
  const r = anchorEl.getBoundingClientRect();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  document.body.appendChild(t);
  t.style.left = (r.right + 8) + 'px';
  t.style.top = (r.top + window.scrollY + 6) + 'px';
  setTimeout(() => t.remove(), 3000);
}

function updateVibeTargets() {
  state.fillTarget = clamp(100 - state.vibe, 0, 100);
  document.getElementById('vibeEmoji').src = emojiSrc(getBand(state.vibe));
}
function emojiSrc(band){ return state.emojiByBand[band] }
function tick() {
  state.fillCurrent += (state.fillTarget - state.fillCurrent) * 0.12;
  state.vibeAnimated += (state.vibe - state.vibeAnimated) * 0.1;
  const color = vibeColor(Math.max(0, Math.min(100, state.vibeAnimated)));
  document.getElementById('vibeFill').style.width = state.fillCurrent.toFixed(2) + '%';
  document.getElementById('vibeFill').style.backgroundColor = color;
  requestAnimationFrame(tick);
}

function getBand(v) {
  if (v > 70) return 'hot';
  if (v > 40) return 'warm';
  if (v > 20) return 'ok';
  if (v > 0) return 'calm';
  return 'party';
}
function vibeColor(v) {
  const green = [52, 211, 153];
  const amber = [245, 158, 11];
  const red   = [239, 68, 68];
  let c;
  if (v <= 40) {
    const t = v / 40;
    c = lerpColor(green, amber, t);
  } else {
    const t = (v - 40) / 60;
    c = lerpColor(amber, red, t);
  }
  return `rgb(${c[0]|0}, ${c[1]|0}, ${c[2]|0})`;
}
function lerpColor(a, b, t) {
  return [
    a[0] + (b[0]-a[0]) * t,
    a[1] + (b[1]-a[1]) * t,
    a[2] + (b[2]-a[2]) * t
  ];
}

function attachDodge(btn) {
  let dodges = 0;
  let cooling = false;
  btn.classList.add('dodge');
  btn.addEventListener('mousemove', (e) => {
    if (cooling) return;
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width/2;
    const cy = r.top + r.height/2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < 120) {
      const mx = clamp(-dx, -140, 140);
      const my = clamp(-dy, -80, 80);
      btn.style.transform = `translate(${mx}px, ${my}px)`;
      dodges++;
      if (dodges % 3 === 0) {
        btn.classList.add('shake');
        setTimeout(() => btn.classList.remove('shake'), 180);
        cooling = true;
        setTimeout(() => {
          btn.style.transform = 'translate(0,0)';
          cooling = false;
        }, 900);
      }
    }
  });
}

function renderEnding(id) {
  if (id === 'E_SPACE') {
    const overlay = document.createElement('div');
    overlay.className = 'blackout';
    overlay.innerHTML = `<div class="center">Thanks for hearing me out at all. Door's always open.</div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    setTimeout(() => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 800);
    }, 2800);
  }
}

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function escapeHtml(s){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])) }
function randomLine(arr){ return arr[Math.floor(Math.random()*arr.length)] }