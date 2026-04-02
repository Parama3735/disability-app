/* ═══════════════ AbilityBridge – app.js ═══════════════ */
'use strict';

// ─── State ───
const state = {
  disabilityType: 'all',
  userName: 'User',
  ttsEnabled: false,
  highContrast: false,
  dyslexicFont: false,
  reduceMotion: false,
  fontSize: 16,
  checklist: [],
  reminders: [],
  routineSteps: [],
  memoryCards: [],
  moodLog: [],
  emergencyContacts: [],
  medicalID: { name:'—', condition:'—', contact:'—', medications:'—', blood:'—' },
  typeSpeakHistory: [],
  quickPhrases: ['I need help', 'Thank you', 'Yes please', 'No thank you', 'Excuse me', 'Water please', 'Call a doctor', 'I feel pain'],
  aacSentence: [],
  aacCategory: 'basic',
  timerInterval: null,
  timerRunning: false,
  timerSeconds: 25 * 60,
  captionRecognition: null,
  voiceRecognition: null,
  alertInterval: null,
  currentTheme: 'theme-default',
  sosHoldTimer: null,
  sosCountdown: null,
};

// ─── AAC Data ───
const aacData = {
  basic: [
    { emoji:'👋', label:'Hello' },     { emoji:'✅', label:'Yes' },
    { emoji:'❌', label:'No' },        { emoji:'🙏', label:'Please' },
    { emoji:'❤️', label:'Thank you' }, { emoji:'😢', label:'Sorry' },
    { emoji:'🆘', label:'Help' },      { emoji:'⏳', label:'Wait' },
    { emoji:'💬', label:'Repeat' },    { emoji:'🤔', label:'I don\'t know' },
    { emoji:'😊', label:'Happy' },     { emoji:'😔', label:'Sad' },
  ],
  needs: [
    { emoji:'💧', label:'Water' },    { emoji:'🍽️', label:'Food' },
    { emoji:'🚽', label:'Toilet' },   { emoji:'😴', label:'Sleep/Rest' },
    { emoji:'💊', label:'Medicine' }, { emoji:'📞', label:'Phone' },
    { emoji:'🩺', label:'Doctor' },   { emoji:'🏠', label:'Home' },
    { emoji:'🚗', label:'Car/Ride' }, { emoji:'🌡️', label:'Sick' },
    { emoji:'🥵', label:'Hot' },      { emoji:'🥶', label:'Cold' },
  ],
  places: [
    { emoji:'🏥', label:'Hospital' }, { emoji:'🏫', label:'School' },
    { emoji:'🛒', label:'Shop' },     { emoji:'🏦', label:'Bank' },
    { emoji:'🅿️', label:'Parking' }, { emoji:'🚌', label:'Bus Stop' },
    { emoji:'✈️', label:'Airport' },  { emoji:'🏨', label:'Hotel' },
    { emoji:'⛽', label:'Gas Station'},{ emoji:'🦮', label:'Guide Dog' },
  ],
  feelings: [
    { emoji:'😄', label:'Great' },    { emoji:'🙂', label:'Good' },
    { emoji:'😐', label:'Okay' },     { emoji:'😣', label:'Pain' },
    { emoji:'😰', label:'Anxious' },  { emoji:'😡', label:'Angry' },
    { emoji:'😯', label:'Surprised' },{ emoji:'🤢', label:'Nauseous' },
    { emoji:'😴', label:'Tired' },    { emoji:'🤩', label:'Excited' },
  ]
};

// ─── Sign Language Data ───
const signData = [
  { emoji:'👋', label:'Hello' },  { emoji:'🤟', label:'I love you' },
  { emoji:'🤙', label:'Call me' },{ emoji:'👍', label:'Good/OK' },
  { emoji:'👎', label:'Bad/No' }, { emoji:'🙏', label:'Thank you / Please' },
  { emoji:'✌️', label:'Peace / 2' }, { emoji:'☝️', label:'Number 1' },
  { emoji:'✋', label:'Stop/5' }, { emoji:'🤚', label:'High five' },
  { emoji:'👊', label:'Hello (informal)' }, { emoji:'🤞', label:'Hope/Wish' },
  { emoji:'👌', label:'OK / Perfect' }, { emoji:'🤏', label:'A little' },
  { emoji:'🖐️', label:'Open hand' }, { emoji:'🫶', label:'Love' },
  { emoji:'💪', label:'Strong / You can' }, { emoji:'🫂', label:'Hug' },
  { emoji:'👆', label:'Up / This' }, { emoji:'👇', label:'Down / That' },
  { emoji:'👈', label:'There / Left' }, { emoji:'👉', label:'Here / Right' },
];

// ─── Object descriptions ───
const descriptions = [
  "A wooden chair with a cushioned seat, placed near a table.",
  "A white coffee mug on a flat surface.",
  "An open door leading to a brightly lit room.",
  "A large window with sunlight streaming in.",
  "A potted plant in the corner of the room.",
  "A person walking towards you from approximately 3 metres away.",
  "A staircase with 12 steps, rail on the right side.",
  "A pedestrian crossing with tactile paving.",
  "A red fire exit door on your left.",
  "A desk with a laptop computer and some papers.",
];

// ─── Navigation direction templates ───
const routeSteps = (from, to) => [
  `Starting from ${from}`,
  `Head north-east on the main road for 200 metres.`,
  `Turn left at the accessible intersection (audio beacon active).`,
  `Continue 150 metres — there is a ramp on your right.`,
  `Take the ramp up to the elevated walkway.`,
  `Cross the accessible pedestrian bridge.`,
  `Turn right and continue 80 metres.`,
  `Arriving at ${to}. Accessible entrance on your left.`,
];

// ─── TTS utility ───
let synth = window.speechSynthesis;
let voices = [];
function loadVoices() {
  voices = synth.getVoices();
  const sel = document.getElementById('voice-select');
  if (!sel) return;
  sel.innerHTML = '';
  if (!voices.length) { sel.innerHTML = '<option>Default</option>'; return; }
  voices.forEach((v, i) => {
    const opt = new Option(`${v.name} (${v.lang})`, i);
    sel.appendChild(opt);
  });
}
synth.onvoiceschanged = loadVoices;
window.addEventListener('load', () => setTimeout(loadVoices, 400));

function speak(text, rate = 1, pitch = 1) {
  if (!text) return;
  synth.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = rate;
  utt.pitch = pitch;
  const sel = document.getElementById('voice-select');
  if (sel && voices[sel.value]) utt.voice = voices[sel.value];
  synth.speak(utt);
}

function ttsSpeak(text) {
  if (state.ttsEnabled) speak(text);
}

// ─── Toast ───
function showToast(msg, duration = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

// ─── Panel switching ───
function switchPanel(name) {
  document.querySelectorAll('.panel').forEach(p => {
    p.classList.remove('active');
    p.classList.add('hidden');
  });
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const panel = document.getElementById(`panel-${name}`);
  const link = document.querySelector(`[data-panel="${name}"]`);
  if (panel) { panel.classList.remove('hidden'); panel.classList.add('active'); }
  if (link) { link.classList.add('active'); link.setAttribute('aria-current','page'); }
  closeMobileNav();
  window.scrollTo(0, 0);
  ttsSpeak(`${name} panel opened`);
}

// ─── Mobile nav ───
function openMobileNav() {
  document.getElementById('side-nav').classList.add('open');
  document.getElementById('btn-hamburger').setAttribute('aria-expanded','true');
}
function closeMobileNav() {
  document.getElementById('side-nav').classList.remove('open');
  document.getElementById('btn-hamburger').setAttribute('aria-expanded','false');
}

// ─── Live clock ───
function startClock() {
  function tick() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    document.getElementById('live-clock').textContent = `${h}:${m}`;
    document.getElementById('info-time').textContent = `${h}:${m}`;
    document.getElementById('info-date').textContent = now.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
  }
  tick();
  setInterval(tick, 1000);
}

// ─── Greeting ───
function updateGreeting() {
  const h = new Date().getHours();
  let greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('home-greeting').textContent = `${greet}, ${state.userName}! Your accessibility tools are ready.`;
}

// ─── Checklist ───
function renderChecklist() {
  const container = document.getElementById('today-checklist');
  container.innerHTML = '';
  if (!state.checklist.length) {
    container.innerHTML = '<p style="font-size:0.8rem;color:var(--text-3);padding:4px 0;">No tasks yet. Add one below!</p>';
    return;
  }
  state.checklist.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = `checklist-item${item.done ? ' done' : ''}`;
    div.innerHTML = `
      <input type="checkbox" id="cl-${i}" ${item.done ? 'checked' : ''} aria-label="${item.text}">
      <label for="cl-${i}">${item.text}</label>
      <button onclick="deleteTask(${i})" style="margin-left:auto;background:none;border:none;color:var(--text-3);cursor:pointer;font-size:0.8rem;">✕</button>
    `;
    div.querySelector('input').addEventListener('change', () => {
      state.checklist[i].done = !state.checklist[i].done;
      saveState();
      renderChecklist();
    });
    container.appendChild(div);
  });
}
function deleteTask(i) { state.checklist.splice(i, 1); saveState(); renderChecklist(); }
function addTask() {
  const inp = document.getElementById('checklist-input');
  const val = inp.value.trim();
  if (!val) return;
  state.checklist.push({ text: val, done: false });
  inp.value = '';
  saveState();
  renderChecklist();
  showToast('Task added!');
}

// ─── Reminders ───
function renderReminders() {
  const container = document.getElementById('reminders-list');
  container.innerHTML = '';
  if (!state.reminders.length) {
    container.innerHTML = '<p style="font-size:0.8rem;color:var(--text-3);padding:4px 0;">No reminders set.</p>';
    return;
  }
  state.reminders.forEach((rem, i) => {
    const div = document.createElement('div');
    div.className = 'reminder-item';
    div.innerHTML = `<span>⏰ ${rem.time} — ${rem.text}</span><button onclick="deleteReminder(${i})" style="background:none;border:none;color:var(--text-3);cursor:pointer;">✕</button>`;
    container.appendChild(div);
  });
}
function deleteReminder(i) { state.reminders.splice(i, 1); saveState(); renderReminders(); }
function addReminder() {
  const text = document.getElementById('reminder-text').value.trim();
  const time = document.getElementById('reminder-time').value;
  if (!text || !time) { showToast('Please enter reminder text and time.'); return; }
  state.reminders.push({ text, time });
  document.getElementById('reminder-text').value = '';
  document.getElementById('reminder-time').value = '';
  saveState();
  renderReminders();
  showToast(`Reminder set for ${time}`);
}

// Reminder checker
function checkReminders() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  const cur = `${h}:${m}`;
  state.reminders.forEach(rem => {
    if (rem.time === cur && !rem.triggered) {
      rem.triggered = true;
      showToast(`⏰ Reminder: ${rem.text}`, 5000);
      speak(`Reminder: ${rem.text}`);
    }
  });
}
setInterval(checkReminders, 30000);

// ─── TTS Tool ───
function initTTSTool() {
  document.getElementById('btn-speak').addEventListener('click', () => {
    const text = document.getElementById('tts-text').value;
    const rate = parseFloat(document.getElementById('tts-rate').value);
    if (!text.trim()) { showToast('Please enter some text first.'); return; }
    speak(text, rate);
    showToast('Speaking…');
  });
  document.getElementById('btn-stop-speak').addEventListener('click', () => {
    synth.cancel();
    showToast('Stopped.');
  });
  document.getElementById('tts-rate').addEventListener('input', e => {
    document.getElementById('rate-val').textContent = parseFloat(e.target.value).toFixed(1);
  });
}

// ─── Magnifier ───
function initMagnifier() {
  const input = document.getElementById('magnifier-input');
  const preview = document.getElementById('magnifier-preview');
  const range = document.getElementById('zoom-range');
  const val = document.getElementById('zoom-val');
  function update() {
    const size = parseFloat(range.value) * 14;
    preview.style.fontSize = `${size}px`;
    preview.textContent = input.value || 'Type text below to magnify…';
    val.textContent = `${range.value}x`;
  }
  input.addEventListener('input', update);
  range.addEventListener('input', update);
}

// ─── High Contrast ───
function setTheme(theme) {
  document.getElementById('app-body').className = theme + (state.dyslexicFont ? ' dyslexic-font' : '') + (state.reduceMotion ? ' reduce-motion' : '');
  state.currentTheme = theme;
  document.querySelectorAll('.contrast-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
  const sel = document.getElementById('set-theme');
  if (sel) sel.value = theme;
  saveState();
  showToast('Theme applied!');
}

// ─── Object Describer ───
function initDescriber() {
  document.getElementById('btn-describe').addEventListener('click', () => {
    const desc = descriptions[Math.floor(Math.random() * descriptions.length)];
    document.getElementById('cam-result').textContent = desc;
    speak(desc);
    showToast('Describing surroundings…');
  });
}

// ─── Voice Navigation ───
function initNavigation() {
  document.getElementById('btn-navigate').addEventListener('click', () => {
    const from = document.getElementById('nav-from').value || 'current location';
    const to = document.getElementById('nav-to').value;
    if (!to.trim()) { showToast('Please enter a destination.'); return; }
    const steps = routeSteps(from, to);
    const output = document.getElementById('nav-output');
    output.innerHTML = steps.map((s,i) => `<div style="margin:4px 0;"><strong>${i+1}.</strong> ${s}</div>`).join('');
    let i = 0;
    function sayNext() {
      if (i < steps.length) { speak(steps[i]); i++; setTimeout(sayNext, 3000); }
    }
    sayNext();
    showToast('Starting voice navigation…');
  });
}

// ─── Live Captions ───
function initCaptions() {
  const display = document.getElementById('caption-display');
  let recognition = null;

  document.getElementById('btn-start-caption').addEventListener('click', () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      display.textContent = '⚠️ Speech recognition not supported in this browser. Try Chrome or Edge.';
      return;
    }
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (e) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + ' ';
        else interim += t;
      }
      display.innerHTML = `<span style="color:var(--text-1)">${display.dataset.text||''} ${final}</span><span style="color:var(--text-3);font-style:italic">${interim}</span>`;
      display.dataset.text = (display.dataset.text || '') + final;
    };
    recognition.onerror = (e) => { display.textContent = `Error: ${e.error}`; };
    recognition.start();
    state.captionRecognition = recognition;
    showToast('Captioning started. Speak now!');
  });

  document.getElementById('btn-stop-caption').addEventListener('click', () => {
    if (state.captionRecognition) { state.captionRecognition.stop(); state.captionRecognition = null; }
    showToast('Captioning stopped.');
  });

  document.getElementById('btn-copy-captions').addEventListener('click', () => {
    const text = display.textContent;
    navigator.clipboard.writeText(text).then(() => showToast('Transcript copied!')).catch(() => showToast('Copy failed.'));
  });
}

// ─── Visual Alerts ───
function initVisualAlerts() {
  const display = document.getElementById('alert-display');
  const alerts = ['Doorbell detected!', 'Fire alarm detected!', 'Phone ringing!', 'Your name was called!'];
  let alertInterval = null;

  document.getElementById('btn-start-alert').addEventListener('click', () => {
    showToast('Monitoring for sounds…');
    display.textContent = '👂 Listening for sounds…';
    alertInterval = setInterval(() => {
      if (Math.random() > 0.85) {
        const alert = alerts[Math.floor(Math.random() * alerts.length)];
        display.textContent = `🚨 ${alert}`;
        display.classList.add('alert-trigger');
        setTimeout(() => {
          display.classList.remove('alert-trigger');
          display.textContent = '👂 Listening…';
        }, 2500);
        if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
        showToast(`Alert: ${alert}`, 3000);
      }
    }, 4000);
    state.alertInterval = alertInterval;
  });

  document.getElementById('btn-stop-alert').addEventListener('click', () => {
    clearInterval(state.alertInterval);
    display.textContent = ' ';
    showToast('Monitoring stopped.');
  });
}

// ─── Sign Language ───
function initSignGuide() {
  const grid = document.getElementById('sign-grid');
  const searchInput = document.getElementById('sign-search');

  function renderSigns(filter = '') {
    const filtered = signData.filter(s => s.label.toLowerCase().includes(filter.toLowerCase()));
    grid.innerHTML = filtered.map(s => `
      <div class="sign-item" onclick="speak('${s.label}')" tabindex="0" role="button" aria-label="Show ${s.label} sign">
        <span class="sign-emoji">${s.emoji}</span>
        <span class="sign-label">${s.label}</span>
      </div>
    `).join('');
    grid.querySelectorAll('.sign-item').forEach(el => {
      el.addEventListener('keydown', e => { if (e.key === 'Enter') el.click(); });
    });
  }

  renderSigns();
  searchInput.addEventListener('input', e => renderSigns(e.target.value));
}

// ─── Vibration Communicator ───
function initVibration() {
  const patterns = { Yes:[200], No:[100,100,100], Help:[300,100,300,100,300], Wait:[400,200,400], OK:[200,100,200], Goodbye:[100,100,100,100,300] };
  document.querySelectorAll('.vib-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const msg = btn.dataset.msg;
      if (navigator.vibrate) { navigator.vibrate(patterns[msg] || [200]); }
      document.getElementById('vib-feedback').textContent = `Vibrating: "${msg}"`;
      btn.classList.add('triggered');
      setTimeout(() => { btn.classList.remove('triggered'); document.getElementById('vib-feedback').textContent = ''; }, 1500);
      speak(msg);
    });
  });
}

// ─── Show-and-Share Board ───
function initShowBoard() {
  document.getElementById('btn-show-text').addEventListener('click', () => {
    const text = document.getElementById('show-text-input').value.trim();
    if (!text) { showToast('Please enter a message.'); return; }
    document.getElementById('show-text-display').textContent = text;
    // Also show in big-text overlay
    document.getElementById('big-text-content').textContent = text;
    document.getElementById('big-text-overlay').classList.remove('hidden');
    speak(text);
  });
}

// ─── Accessible Route ───
function initRoute() {
  document.getElementById('btn-find-route').addEventListener('click', () => {
    const from = document.getElementById('route-from').value || 'your location';
    const to = document.getElementById('route-to').value;
    if (!to.trim()) { showToast('Please enter a destination.'); return; }
    const elevator = document.getElementById('pref-elevator').checked;
    const ramp = document.getElementById('pref-ramp').checked;
    const steps = routeSteps(from, to);
    const notes = [];
    if (elevator) notes.push('✅ Elevator priority enabled.');
    if (ramp) notes.push('✅ Ramp preference active.');
    document.getElementById('route-result').innerHTML =
      notes.join('<br>') + '<br>' + steps.map((s,i)=>`<strong>${i+1}.</strong> ${s}`).join('<br>');
    showToast('Accessible route found!');
  });
}

// ─── Parking ───
const parkingSpots = [
  { name: 'Main Street Car Park - Bay 3A', dist: '120m', accessible: true },
  { name: 'Central Mall – Level B1 Section P', dist: '240m', accessible: true },
  { name: 'East Side Surface Lot – Row 1', dist: '350m', accessible: true },
  { name: 'Railway Station – Bay 7', dist: '480m', accessible: false },
];
function initParking() {
  document.getElementById('btn-find-parking').addEventListener('click', () => {
    const el = document.getElementById('parking-results');
    el.innerHTML = parkingSpots.filter(p=>p.accessible).map(p =>
      `<div class="ec-item"><span>🅿️ ${p.name} — <strong>${p.dist}</strong></span></div>`
    ).join('') || 'No accessible spots found nearby.';
    showToast('Accessible parking spots found!');
  });
}

// ─── Voice Control ───
function initVoiceControl() {
  const display = document.getElementById('voice-cmd-display');
  let rec = null;
  const commands = {
    'go to vision tools': () => switchPanel('visual'),
    'vision tools': () => switchPanel('visual'),
    'go to hearing tools': () => switchPanel('hearing'),
    'hearing tools': () => switchPanel('hearing'),
    'go to mobility tools': () => switchPanel('mobility'),
    'mobility tools': () => switchPanel('mobility'),
    'go to cognitive': () => switchPanel('cognitive'),
    'cognitive tools': () => switchPanel('cognitive'),
    'go to speech': () => switchPanel('speech'),
    'speech tools': () => switchPanel('speech'),
    'open emergency': () => switchPanel('emergency'),
    'emergency': () => switchPanel('emergency'),
    'open settings': () => switchPanel('settings'),
    'settings': () => switchPanel('settings'),
    'go home': () => switchPanel('home'),
    'dashboard': () => switchPanel('home'),
    'increase text': () => { state.fontSize = Math.min(28, state.fontSize + 2); applyFontSize(); showToast('Text larger'); },
    'decrease text': () => { state.fontSize = Math.max(12, state.fontSize - 2); applyFontSize(); showToast('Text smaller'); },
    'high contrast': () => setTheme('theme-high-contrast'),
    'dark mode': () => setTheme('theme-default'),
    'light mode': () => setTheme('theme-light'),
    'read page': () => {
      const text = document.querySelector('.panel.active')?.textContent?.slice(0,500);
      if(text) speak(text);
    }
  };

  document.getElementById('btn-voice-cmd').addEventListener('click', () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      display.textContent = '⚠️ Speech recognition not supported. Try Chrome or Edge.';
      return;
    }
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    rec = new SpeechRec();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.onstart = () => { display.classList.add('listening'); display.textContent = '🎤 Listening…'; };
    rec.onresult = (e) => {
      const cmd = e.results[0][0].transcript.toLowerCase().trim();
      display.textContent = `"${cmd}"`;
      let matched = false;
      for (const [key, action] of Object.entries(commands)) {
        if (cmd.includes(key)) { action(); matched = true; break; }
      }
      if (!matched) showToast(`Command not recognized: "${cmd}"`);
      display.classList.remove('listening');
    };
    rec.onerror = (e) => { display.textContent = `Error: ${e.error}`; display.classList.remove('listening'); };
    rec.onend = () => display.classList.remove('listening');
    rec.start();
  });
}

// ─── Switch Access ───
function initSwitchAccess() {
  let switchEnabled = false;
  document.getElementById('btn-switch-mode').addEventListener('click', () => {
    switchEnabled = !switchEnabled;
    document.getElementById('switch-status').textContent = `Switch mode: ${switchEnabled ? 'ON ✅' : 'OFF'}`;
    if (switchEnabled) {
      document.body.style.outline = '3px solid var(--accent-1)';
      showToast('Switch access mode ON. Use Tab/Enter/Space to navigate.');
    } else {
      document.body.style.outline = 'none';
      showToast('Switch access mode OFF.');
    }
  });
}

// ─── Medical ID ───
function initMedicalID() {
  renderMedicalCard();
  document.getElementById('btn-edit-medical').addEventListener('click', () => {
    document.getElementById('modal-name').value = state.medicalID.name === '—' ? '' : state.medicalID.name;
    document.getElementById('modal-cond').value = state.medicalID.condition === '—' ? '' : state.medicalID.condition;
    document.getElementById('modal-contact').value = state.medicalID.contact === '—' ? '' : state.medicalID.contact;
    document.getElementById('modal-meds').value = state.medicalID.medications === '—' ? '' : state.medicalID.medications;
    document.getElementById('modal-blood').value = state.medicalID.blood === '—' ? '' : state.medicalID.blood;
    document.getElementById('medical-modal').classList.remove('hidden');
  });
  document.getElementById('btn-save-medical').addEventListener('click', () => {
    state.medicalID = {
      name: document.getElementById('modal-name').value || '—',
      condition: document.getElementById('modal-cond').value || '—',
      contact: document.getElementById('modal-contact').value || '—',
      medications: document.getElementById('modal-meds').value || '—',
      blood: document.getElementById('modal-blood').value || '—',
    };
    saveState();
    renderMedicalCard();
    document.getElementById('medical-modal').classList.add('hidden');
    showToast('Medical ID saved!');
  });
  document.getElementById('btn-close-modal').addEventListener('click', () => {
    document.getElementById('medical-modal').classList.add('hidden');
  });
}
function renderMedicalCard() {
  document.getElementById('med-name').textContent = state.medicalID.name;
  document.getElementById('med-cond').textContent = state.medicalID.condition;
  document.getElementById('med-contact').textContent = state.medicalID.contact;
  document.getElementById('med-meds').textContent = state.medicalID.medications;
  document.getElementById('med-blood').textContent = state.medicalID.blood;
}

// ─── Routine Manager ───
function initRoutine() {
  renderRoutine();
  document.getElementById('btn-add-routine').addEventListener('click', () => {
    const inp = document.getElementById('routine-step-input');
    const val = inp.value.trim();
    if (!val) return;
    state.routineSteps.push({ text: val, done: false });
    inp.value = '';
    saveState();
    renderRoutine();
  });
  document.getElementById('btn-reset-routine').addEventListener('click', () => {
    state.routineSteps.forEach(s => s.done = false);
    saveState();
    renderRoutine();
    showToast('Routine reset for new day!');
  });
}
function renderRoutine() {
  const el = document.getElementById('routine-list');
  el.innerHTML = '';
  if (!state.routineSteps.length) {
    el.innerHTML = '<p style="font-size:0.8rem;color:var(--text-3);padding:8px 0;">No steps yet. Add your daily routine below.</p>';
    return;
  }
  state.routineSteps.forEach((step, i) => {
    const div = document.createElement('div');
    div.className = `routine-step${step.done ? ' done' : ''}`;
    div.innerHTML = `
      <span class="routine-step-icon">${step.done ? '✅' : '⭕'}</span>
      <span>${step.text}</span>
      <button class="routine-step-del" onclick="deleteRoutineStep(${i})" aria-label="Delete step">✕</button>
    `;
    div.addEventListener('click', (e) => {
      if (e.target.classList.contains('routine-step-del')) return;
      step.done = !step.done;
      saveState();
      renderRoutine();
      if (step.done) { speak(`${step.text} completed!`); showToast(`✅ ${step.text}`); }
    });
    el.appendChild(div);
  });
}
function deleteRoutineStep(i) { state.routineSteps.splice(i, 1); saveState(); renderRoutine(); }

// ─── Memory Cards ───
function initMemoryCards() {
  renderMemoryCards();
  document.getElementById('btn-add-mem').addEventListener('click', () => {
    const title = document.getElementById('mem-title').value.trim();
    const content = document.getElementById('mem-content').value.trim();
    if (!title) { showToast('Please enter a card title.'); return; }
    state.memoryCards.push({ title, content });
    document.getElementById('mem-title').value = '';
    document.getElementById('mem-content').value = '';
    saveState();
    renderMemoryCards();
    showToast('Memory card added!');
  });
}
function renderMemoryCards() {
  const el = document.getElementById('memory-cards');
  el.innerHTML = '';
  if (!state.memoryCards.length) {
    el.innerHTML = '<p style="font-size:0.8rem;color:var(--text-3);padding:8px 0;">No cards yet.</p>';
    return;
  }
  state.memoryCards.forEach((card, i) => {
    const div = document.createElement('div');
    div.className = 'mem-card';
    div.innerHTML = `<strong>${card.title}</strong>${card.content}<button class="mem-card-del" onclick="deleteMemCard(${i})" aria-label="Delete card">✕</button>`;
    el.appendChild(div);
  });
}
function deleteMemCard(i) { state.memoryCards.splice(i, 1); saveState(); renderMemoryCards(); }

// ─── Text Simplifier ───
function initSimplifier() {
  document.getElementById('btn-simplify').addEventListener('click', () => {
    const text = document.getElementById('complex-text').value.trim();
    if (!text) { showToast('Please enter some text.'); return; }
    const simplified = simplifyText(text);
    document.getElementById('simplified-output').textContent = simplified;
    speak(simplified);
  });
}
function simplifyText(text) {
  const replacements = [
    [/\butilize\b/gi, 'use'], [/\bcommence\b/gi, 'start'], [/\bterminate\b/gi, 'end'],
    [/\bassist\b/gi, 'help'], [/\bpurchase\b/gi, 'buy'], [/\bnumerous\b/gi, 'many'],
    [/\bsubsequently\b/gi, 'then'], [/\bindividuals\b/gi, 'people'], [/\brequire\b/gi, 'need'],
    [/\bprovide\b/gi, 'give'], [/\bfacilitate\b/gi, 'help with'], [/\binitiate\b/gi, 'start'],
  ];
  let out = text;
  replacements.forEach(([pat, rep]) => { out = out.replace(pat, rep); });
  // Break into short sentences
  const sentences = out.split(/(?<=[.!?])\s+/);
  return sentences.map(s => s.trim()).filter(Boolean).join('\n\n');
}

// ─── Focus Timer ───
function initFocusTimer() {
  let timeLeft = state.timerSeconds;
  let running = false;
  let interval = null;

  function updateDisplay() {
    const m = String(Math.floor(timeLeft / 60)).padStart(2,'0');
    const s = String(timeLeft % 60).padStart(2,'0');
    document.getElementById('timer-display').textContent = `${m}:${s}`;
  }

  document.getElementById('btn-timer-start').addEventListener('click', () => {
    if (running) return;
    running = true;
    interval = setInterval(() => {
      if (timeLeft > 0) { timeLeft--; updateDisplay(); }
      else {
        clearInterval(interval);
        running = false;
        speak('Focus session complete! Time for a break.');
        showToast('⏰ Session complete!', 4000);
        if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
      }
    }, 1000);
    showToast('Focus timer started!');
  });

  document.getElementById('btn-timer-pause').addEventListener('click', () => {
    if (!running) return;
    clearInterval(interval);
    running = false;
    showToast('Timer paused.');
  });

  document.getElementById('btn-timer-reset').addEventListener('click', () => {
    clearInterval(interval);
    running = false;
    timeLeft = state.timerSeconds;
    updateDisplay();
    showToast('Timer reset.');
  });

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      clearInterval(interval);
      running = false;
      const mins = parseInt(btn.dataset.time);
      timeLeft = mins * 60;
      state.timerSeconds = timeLeft;
      document.getElementById('timer-label').textContent = mins === 5 ? 'Break Session' : 'Focus Session';
      updateDisplay();
      showToast(`Timer set to ${mins} minutes.`);
    });
  });

  updateDisplay();
}

// ─── Mood Tracker ───
function initMoodTracker() {
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mood = btn.dataset.mood;
      const now = new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
      state.moodLog.unshift({ mood, time: now });
      saveState();
      renderMoodLog();
      document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      showToast(`Mood logged: ${btn.textContent}`);
    });
  });
  renderMoodLog();
}
function renderMoodLog() {
  const el = document.getElementById('mood-log');
  if (!state.moodLog.length) { el.textContent = 'No mood entries yet.'; return; }
  el.innerHTML = state.moodLog.slice(0,5).map(m => `${m.time}: <strong>${m.mood}</strong>`).join('<br>');
}

// ─── AAC Board ───
function initAAC() {
  const catSel = document.getElementById('aac-category');
  ['basic','needs','places','feelings'].forEach(c => {
    const opt = new Option(c.charAt(0).toUpperCase() + c.slice(1), c);
    catSel.appendChild(opt);
  });

  function renderAAC() {
    const board = document.getElementById('aac-board');
    const items = aacData[state.aacCategory] || aacData.basic;
    board.innerHTML = items.map(item => `
      <div class="aac-item" data-word="${item.label}" role="button" tabindex="0" aria-label="${item.label}">
        <span class="aac-emoji">${item.emoji}</span>
        <span class="aac-label">${item.label}</span>
      </div>
    `).join('');
    board.querySelectorAll('.aac-item').forEach(el => {
      el.addEventListener('click', () => aacTap(el.dataset.word));
      el.addEventListener('keydown', e => { if (e.key === 'Enter') aacTap(el.dataset.word); });
    });
  }

  catSel.addEventListener('change', () => { state.aacCategory = catSel.value; renderAAC(); });

  document.getElementById('btn-speak-aac').addEventListener('click', () => {
    const text = state.aacSentence.join(' ');
    if (!text) { showToast('Tap symbols to compose a message first.'); return; }
    speak(text);
  });

  document.getElementById('btn-clear-aac').addEventListener('click', () => {
    state.aacSentence = [];
    document.getElementById('aac-sentence').textContent = 'Tap symbols below to compose a message…';
  });

  renderAAC();
}

function aacTap(word) {
  state.aacSentence.push(word);
  const disp = document.getElementById('aac-sentence');
  disp.textContent = state.aacSentence.join(' ');
  speak(word, 1.1);
}

// ─── Quick Phrases ───
function initQuickPhrases() {
  renderQuickPhrases();
  document.getElementById('btn-add-phrase').addEventListener('click', () => {
    const val = document.getElementById('custom-phrase-input').value.trim();
    if (!val) return;
    state.quickPhrases.push(val);
    document.getElementById('custom-phrase-input').value = '';
    saveState();
    renderQuickPhrases();
    showToast('Phrase added!');
  });
}
function renderQuickPhrases() {
  const el = document.getElementById('quick-phrases-list');
  el.innerHTML = state.quickPhrases.map((p, i) => `
    <div class="phrase-btn">
      <span onclick="speak('${p.replace(/'/g,"\\'")}');showToast('Speaking: ${p.replace(/'/g,"\\'").slice(0,20)}…')" style="cursor:pointer;flex:1">${p}</span>
      <button class="phrase-speak" onclick="speak('${p.replace(/'/g,"\\'")}')">▶ Speak</button>
      <button style="background:none;border:none;color:var(--text-3);cursor:pointer;margin-left:4px;" onclick="deletePhrase(${i})">✕</button>
    </div>
  `).join('');
}
function deletePhrase(i) { state.quickPhrases.splice(i, 1); saveState(); renderQuickPhrases(); }

// ─── Type & Speak ───
function initTypeSpeak() {
  document.getElementById('btn-type-speak').addEventListener('click', () => {
    const text = document.getElementById('type-speak-text').value.trim();
    if (!text) { showToast('Please type something first.'); return; }
    speak(text);
    state.typeSpeakHistory.unshift(text);
    if (state.typeSpeakHistory.length > 5) state.typeSpeakHistory.pop();
    saveState();
    renderTypeSpeakHistory();
    showToast('Speaking…');
  });
  document.getElementById('btn-clear-type-speak').addEventListener('click', () => {
    document.getElementById('type-speak-text').value = '';
  });
  renderTypeSpeakHistory();
}
function renderTypeSpeakHistory() {
  const el = document.getElementById('type-speak-history');
  el.innerHTML = state.typeSpeakHistory.length
    ? '<strong style="color:var(--text-3)">Recent:</strong><br>' + state.typeSpeakHistory.map(t => `• ${t}`).join('<br>')
    : '';
}

// ─── Word Prediction ───
const wordBank = {
  i: ['am','need','want','feel','have','like','can','will','love','hate'],
  need: ['help','water','food','medicine','rest','a break','to go','a doctor'],
  want: ['to go home','to eat','to drink','to sleep','help','a break'],
  i_am: ['okay','not okay','in pain','happy','tired','hungry','thirsty','lost'],
  please: ['help me','call someone','wait','repeat that','speak slowly'],
  can: ['you help','you repeat','we go','I use','I sit'],
  feel: ['sick','okay','happy','sad','tired','hot','cold','pain'],
  the: ['door','bathroom','phone','doctor','exit','lift','ramp'],
  call: ['an ambulance','the police','my family','a doctor','for help'],
};

function initWordPredict() {
  const input = document.getElementById('word-predict-input');
  const sugg = document.getElementById('word-suggestions');
  const sentence = document.getElementById('predicted-sentence');
  let predictedWords = [];

  input.addEventListener('input', () => {
    const val = input.value.trim().toLowerCase();
    const words = val.split(' ');
    const lastWord = words[words.length - 1];
    predictedWords = words.slice(0,-1);

    let suggestions = [];
    const key = words.slice(-2).join('_');
    if (wordBank[key]) suggestions = wordBank[key];
    else if (wordBank[lastWord]) suggestions = wordBank[lastWord];
    else {
      suggestions = Object.keys(wordBank).filter(k => k.startsWith(lastWord) && !k.includes('_'));
    }

    sugg.innerHTML = suggestions.slice(0,8).map(w =>
      `<button class="word-chip" onclick="selectWord('${w}')" aria-label="Suggest ${w}">${w}</button>`
    ).join('');
  });

  document.getElementById('btn-speak-predicted').addEventListener('click', () => {
    const text = sentence.textContent;
    if (!text || text==='Start building your sentence…') { showToast('Build a sentence first.'); return; }
    speak(text);
    showToast('Speaking sentence…');
  });
}
function selectWord(word) {
  const input = document.getElementById('word-predict-input');
  const sentence = document.getElementById('predicted-sentence');
  const words = input.value.trim().split(' ');
  words[words.length-1] = word;
  words.push('');
  input.value = words.join(' ');
  sentence.textContent = input.value.trim() || 'Start building your sentence…';
  input.dispatchEvent(new Event('input'));
  input.focus();
}

// ─── Emergency ───
function initEmergency() {
  renderEmergencyContacts();
  document.getElementById('btn-add-ec').addEventListener('click', () => {
    const name = document.getElementById('ec-name').value.trim();
    const phone = document.getElementById('ec-phone').value.trim();
    if (!name || !phone) { showToast('Please enter name and phone number.'); return; }
    state.emergencyContacts.push({ name, phone });
    document.getElementById('ec-name').value = '';
    document.getElementById('ec-phone').value = '';
    saveState();
    renderEmergencyContacts();
    showToast('Contact added!');
  });

  // SOS Button hold
  const sosBtn = document.getElementById('btn-sos-main');
  const countEl = document.getElementById('sos-countdown');
  let holdTimer = null;
  let count = 3;

  sosBtn.addEventListener('mousedown', startSOS);
  sosBtn.addEventListener('touchstart', startSOS, { passive: true });
  sosBtn.addEventListener('mouseup', cancelSOS);
  sosBtn.addEventListener('mouseleave', cancelSOS);
  sosBtn.addEventListener('touchend', cancelSOS);

  function startSOS() {
    count = 3;
    countEl.textContent = count;
    holdTimer = setInterval(() => {
      count--;
      countEl.textContent = count || '🆘';
      if (navigator.vibrate) navigator.vibrate(200);
      if (count <= 0) {
        clearInterval(holdTimer);
        triggerSOS();
      }
    }, 1000);
  }
  function cancelSOS() {
    clearInterval(holdTimer);
    if (count > 0) countEl.textContent = '';
  }
  function triggerSOS() {
    countEl.textContent = '🆘 ACTIVATED';
    showToast('🆘 SOS ACTIVATED! Alerting emergency contacts…', 5000);
    speak('SOS activated. Sending emergency alert.');
    if (navigator.vibrate) navigator.vibrate([500,200,500,200,500,200,500]);
    // Simulated alert
    setTimeout(() => { countEl.textContent = '✅ Contacts notified (simulated)'; }, 2500);
    setTimeout(() => { countEl.textContent = ''; }, 6000);
  }

  document.querySelectorAll('.emg-num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const num = btn.dataset.number;
      showToast(`Calling ${num}… (simulated)`);
      speak(`Calling emergency number ${num.split('').join(' ')}`);
    });
  });
}
function renderEmergencyContacts() {
  const el = document.getElementById('emergency-contacts');
  if (!state.emergencyContacts.length) {
    el.innerHTML = '<p style="font-size:0.8rem;color:var(--text-3)">No contacts added yet.</p>';
    return;
  }
  el.innerHTML = state.emergencyContacts.map((c,i) => `
    <div class="ec-item">
      <span>👤 ${c.name} — ${c.phone}</span>
      <button class="ec-call" onclick="speak('Calling ${c.name}');showToast('📞 Calling ${c.name}… (simulated)')">📞 Call</button>
      <button class="ec-del" onclick="deleteContact(${i})">✕</button>
    </div>
  `).join('');
}
function deleteContact(i) { state.emergencyContacts.splice(i, 1); saveState(); renderEmergencyContacts(); }

// ─── Settings ───
function initSettings() {
  document.getElementById('set-font-size').addEventListener('change', e => {
    state.fontSize = parseInt(e.target.value);
    applyFontSize();
  });
  document.getElementById('set-theme').addEventListener('change', e => setTheme(e.target.value));
  document.getElementById('set-tts').addEventListener('change', e => {
    state.ttsEnabled = e.target.checked;
    document.getElementById('info-tts').textContent = state.ttsEnabled ? 'On' : 'Off';
    if (state.ttsEnabled) speak('Text to speech enabled');
    saveState();
  });
  document.getElementById('set-motion').addEventListener('change', e => {
    state.reduceMotion = e.target.checked;
    applyBodyClasses();
  });
  document.getElementById('set-dyslexic').addEventListener('change', e => {
    state.dyslexicFont = e.target.checked;
    applyBodyClasses();
  });
  document.getElementById('set-name').addEventListener('change', e => {
    state.userName = e.target.value || 'User';
    updateGreeting();
    updateProfile();
  });
  document.getElementById('btn-save-settings').addEventListener('click', () => {
    state.userName = document.getElementById('set-name').value || 'User';
    state.disabilityType = document.getElementById('set-disability').value;
    saveState();
    updateGreeting();
    updateProfile();
    showToast('Settings saved!');
  });
  document.getElementById('btn-clear-data').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all saved data?')) {
      localStorage.clear();
      location.reload();
    }
  });
}

function applyFontSize() {
  document.documentElement.style.setProperty('--font-size', `${state.fontSize}px`);
}
function applyBodyClasses() {
  const body = document.getElementById('app-body');
  body.className = state.currentTheme;
  if (state.dyslexicFont) body.classList.add('dyslexic-font');
  if (state.reduceMotion) body.classList.add('reduce-motion');
}

// ─── A11y Toolbar ───
function initA11yToolbar() {
  document.getElementById('btn-text-size').addEventListener('click', () => {
    state.fontSize = Math.min(28, state.fontSize + 2); applyFontSize();
    showToast(`Text size: ${state.fontSize}px`);
  });
  document.getElementById('btn-text-size-dec').addEventListener('click', () => {
    state.fontSize = Math.max(12, state.fontSize - 2); applyFontSize();
    showToast(`Text size: ${state.fontSize}px`);
  });
  document.getElementById('btn-contrast').addEventListener('click', () => {
    const isHigh = state.currentTheme === 'theme-high-contrast';
    setTheme(isHigh ? 'theme-default' : 'theme-high-contrast');
    document.getElementById('info-contrast').textContent = isHigh ? 'Normal' : 'High';
  });
  document.getElementById('btn-dyslexic').addEventListener('click', () => {
    state.dyslexicFont = !state.dyslexicFont;
    applyBodyClasses();
    document.getElementById('btn-dyslexic').classList.toggle('active', state.dyslexicFont);
    showToast(`Dyslexia font: ${state.dyslexicFont ? 'ON' : 'OFF'}`);
    saveState();
  });
  document.getElementById('btn-tts-toggle').addEventListener('click', () => {
    state.ttsEnabled = !state.ttsEnabled;
    document.getElementById('btn-tts-toggle').classList.toggle('active', state.ttsEnabled);
    document.getElementById('info-tts').textContent = state.ttsEnabled ? 'On' : 'Off';
    if (state.ttsEnabled) speak('Text to speech enabled');
    showToast(`TTS: ${state.ttsEnabled ? 'ON' : 'OFF'}`);
    saveState();
  });
  document.getElementById('btn-reduce-motion').addEventListener('click', () => {
    state.reduceMotion = !state.reduceMotion;
    applyBodyClasses();
    document.getElementById('btn-reduce-motion').classList.toggle('active', state.reduceMotion);
    showToast(`Reduce motion: ${state.reduceMotion ? 'ON' : 'OFF'}`);
    saveState();
  });
}

// ─── Profile ───
function updateProfile() {
  const labels = {
    visual: '👁️ Visual Impairment', hearing: '👂 Hearing Impairment',
    mobility: '♿ Mobility Impairment', cognitive: '🧠 Cognitive Support',
    speech: '🗣️ Speech Impairment', all: '⭐ All Features'
  };
  const avatars = { visual:'👁️', hearing:'👂', mobility:'♿', cognitive:'🧠', speech:'🗣️', all:'⭐' };
  document.getElementById('profile-name-text').textContent = state.userName;
  document.getElementById('profile-type-text').textContent = labels[state.disabilityType] || 'Full Access';
  document.getElementById('profile-avatar').textContent = avatars[state.disabilityType] || '⭐';
}

// ─── Splash → Dashboard ───
function enterDashboard(type) {
  state.disabilityType = type;
  const splash = document.getElementById('splash-screen');
  const dash = document.getElementById('dashboard');
  splash.style.opacity = '0';
  splash.style.transform = 'scale(0.97)';
  splash.style.transition = 'all 0.4s ease';
  setTimeout(() => {
    splash.classList.add('hidden');
    dash.classList.remove('hidden');
  }, 400);

  updateProfile();
  updateGreeting();
  document.getElementById('info-mode').textContent = state.disabilityType;
  document.getElementById('set-disability').value = type;

  // Auto-open relevant panel
  if (type !== 'all') {
    setTimeout(() => switchPanel(type), 100);
  }
  ttsSpeak(`Welcome to AbilityBridge. ${type} tools loaded.`);
}

// ─── Big Text Overlay close ───
document.getElementById('btn-close-big-text').addEventListener('click', () => {
  document.getElementById('big-text-overlay').classList.add('hidden');
});

// ─── Nav Links ───
document.querySelectorAll('.nav-link').forEach(btn => {
  btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
});

document.getElementById('btn-back-home').addEventListener('click', () => {
  const dash = document.getElementById('dashboard');
  const splash = document.getElementById('splash-screen');
  dash.classList.add('hidden');
  splash.classList.remove('hidden');
  splash.style.opacity = '1';
  splash.style.transform = 'scale(1)';
  closeMobileNav();
});

document.getElementById('btn-hamburger').addEventListener('click', openMobileNav);
document.getElementById('btn-sos-mobile').addEventListener('click', () => switchPanel('emergency'));

// Close nav when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('#side-nav') && !e.target.closest('#btn-hamburger')) closeMobileNav();
});

// ─── Disability Card selection ───
document.querySelectorAll('.disability-card').forEach(card => {
  card.addEventListener('click', () => enterDashboard(card.dataset.type));
  card.addEventListener('keydown', e => { if (e.key === 'Enter') enterDashboard(card.dataset.type); });
});

// Contrast theme buttons
document.querySelectorAll('.contrast-btn').forEach(btn => {
  btn.addEventListener('click', () => setTheme(btn.dataset.theme));
});

// ─── Save/Load State ───
function saveState() {
  try {
    localStorage.setItem('abilitybridge_state', JSON.stringify({
      userName: state.userName,
      disabilityType: state.disabilityType,
      ttsEnabled: state.ttsEnabled,
      dyslexicFont: state.dyslexicFont,
      reduceMotion: state.reduceMotion,
      fontSize: state.fontSize,
      currentTheme: state.currentTheme,
      checklist: state.checklist,
      reminders: state.reminders,
      routineSteps: state.routineSteps,
      memoryCards: state.memoryCards,
      moodLog: state.moodLog,
      emergencyContacts: state.emergencyContacts,
      medicalID: state.medicalID,
      typeSpeakHistory: state.typeSpeakHistory,
      quickPhrases: state.quickPhrases,
    }));
  } catch(e) { console.warn('Could not save state:', e); }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem('abilitybridge_state') || '{}');
    Object.assign(state, saved);
  } catch(e) { console.warn('Could not load state:', e); }
}

// ─── INIT ───
function init() {
  loadState();
  applyFontSize();
  applyBodyClasses();
  setTheme(state.currentTheme);
  startClock();
  initA11yToolbar();
  initTTSTool();
  initMagnifier();
  initDescriber();
  initNavigation();
  initCaptions();
  initVisualAlerts();
  initSignGuide();
  initVibration();
  initShowBoard();
  initRoute();
  initParking();
  initVoiceControl();
  initSwitchAccess();
  initMedicalID();
  initRoutine();
  initMemoryCards();
  initSimplifier();
  initFocusTimer();
  initMoodTracker();
  initAAC();
  initQuickPhrases();
  initTypeSpeak();
  initWordPredict();
  initEmergency();
  initSettings();
  renderChecklist();
  renderReminders();
  updateGreeting();

  // Populate settings form
  if (state.userName !== 'User') document.getElementById('set-name').value = state.userName;
  document.getElementById('set-tts').checked = state.ttsEnabled;
  document.getElementById('set-motion').checked = state.reduceMotion;
  document.getElementById('set-dyslexic').checked = state.dyslexicFont;
  document.getElementById('info-tts').textContent = state.ttsEnabled ? 'On' : 'Off';
  document.getElementById('info-contrast').textContent = state.currentTheme === 'theme-high-contrast' ? 'High' : 'Normal';
  document.getElementById('btn-tts-toggle').classList.toggle('active', state.ttsEnabled);
  document.getElementById('btn-dyslexic').classList.toggle('active', state.dyslexicFont);
  document.getElementById('btn-reduce-motion').classList.toggle('active', state.reduceMotion);

  // If returning user, enter dashboard directly
  if (state.disabilityType && state.userName !== 'User') {
    enterDashboard(state.disabilityType);
  }
}

document.addEventListener('DOMContentLoaded', init);
