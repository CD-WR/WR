'use strict';

/* ═══ AUDIO ═══ */
const Sound = (() => {
  let ctx = null;
  const init = () => {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  };
  const tone = (type, freq, dur, vol = 0.14, when = 0) => {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur);
  };
  return {
    correct(streak = 0) { init(); tone('sine', Math.min(880 + streak * 55, 1320), 0.09); },
    wrong() { init(); tone('sine', 196, 0.12, 0.16); },
    complete() { init(); tone('sine', 660, 0.14); tone('sine', 880, 0.18, 0.14, 0.16); },
    nav() { init(); tone('triangle', 1200, 0.04, 0.06); },
    reveal() { init(); tone('sine', 523, 0.08, 0.12); tone('sine', 784, 0.12, 0.12, 0.1); },
    unlock() { init(); [392,523,659,784,1047].forEach((f,i) => tone('sine', f, 0.16, 0.13, i*0.11)); tone('sawtooth', 90, 0.3, 0.05, 0); },
    tick() { init(); tone('square', 440, 0.03, 0.04); }
  };
})();

/* ═══ STATE ═══ */
const State = {
  current: 0, score: 0, total: 0, streak: 0, bestStreak: 0,
  grundlagenDone: false, unterrichtDone: false, pflichtenDone: 0,
  escapeDigits: [null, null, null], s1Correct: new Set(),
  cdTimer: null, cdLeft: 300,
  reset() {
    this.current=0; this.score=0; this.total=0; this.streak=0; this.bestStreak=0;
    this.grundlagenDone=false; this.unterrichtDone=false; this.pflichtenDone=0;
    this.escapeDigits=[null,null,null]; this.s1Correct=new Set();
    this.stopCountdown(); this.cdLeft=300;
  },
  stopCountdown() { if (this.cdTimer) { clearInterval(this.cdTimer); this.cdTimer = null; } }
};

/* ═══ SCORING + STREAK ═══ */
function recordAnswer(isCorrect) {
  State.total++;
  if (isCorrect) {
    State.score++; State.streak++;
    State.bestStreak = Math.max(State.bestStreak, State.streak);
    Sound.correct(State.streak);
  } else {
    State.streak = 0;
    Sound.wrong();
  }
  updateScoreBadge();
}
function updateScoreBadge() {
  document.getElementById('score-live').textContent = State.score;
  document.getElementById('score-total').textContent = State.total;
  const combo = document.getElementById('combo');
  if (State.streak >= 2) {
    combo.hidden = false;
    document.getElementById('combo-n').textContent = State.streak;
    combo.style.animation = 'none'; void combo.offsetWidth; combo.style.animation = '';
  } else { combo.hidden = true; }
}

/* ═══ PARTICLES ═══ */
function initParticles() {
  const el = document.getElementById('particles'); if (!el) return;
  el.innerHTML = '';
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div'); p.className = 'particle';
    const s = 4 + Math.random() * 38;
    p.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}%;top:${Math.random()*100}%;--dur:${6+Math.random()*10}s;--delay:${-Math.random()*10}s;`;
    el.appendChild(p);
  }
}

/* ═══ TYPEWRITER ═══ */
const Typewriter = (() => {
  const lines = ['Zugriff auf Hausordnung … gewährt.', '11 Paragraphen. 1000 Schüler. 1 Regelwerk.', 'Dein Wissen entscheidet.'];
  let li = 0, ci = 0, deleting = false, timer = null;
  const el = () => document.getElementById('typewriter');
  function step() {
    const node = el(); if (!node) return;
    const full = lines[li];
    if (!deleting) {
      ci++; node.textContent = full.slice(0, ci);
      if (ci === full.length) { deleting = true; timer = setTimeout(step, 1700); return; }
      timer = setTimeout(step, 42);
    } else {
      ci--; node.textContent = full.slice(0, ci);
      if (ci === 0) { deleting = false; li = (li + 1) % lines.length; timer = setTimeout(step, 350); return; }
      timer = setTimeout(step, 22);
    }
  }
  return { start() { if (!timer) step(); }, stop() { clearTimeout(timer); timer = null; } };
})();

/* ═══ APP ═══ */
const App = {
  start() { Sound.nav(); Typewriter.stop(); this.goTo(1); },

  goTo(idx) {
    if (idx < 0 || idx > 5) return;
    Sound.nav();
    const prev = document.getElementById(`sec-${State.current}`);
    if (prev) { prev.classList.remove('visible'); setTimeout(() => prev.classList.remove('active'), 280); }
    State.current = idx;
    const next = document.getElementById(`sec-${idx}`);
    if (next) { next.classList.add('active'); requestAnimationFrame(() => requestAnimationFrame(() => next.classList.add('visible'))); }
    next && next.scrollTo && window.scrollTo(0, 0);
    updateUI();
    State.stopCountdown();
    if (idx === 4) { resetEscape(); startCountdown(); }
    if (idx === 5) showFinal();
  },

  /* single choice */
  answer(btn) {
    const qid = btn.dataset.q, qEl = document.getElementById(qid);
    if (qEl.dataset.answered === 'true') return;
    qEl.dataset.answered = 'true';
    const ok = btn.dataset.correct === 'true';
    recordAnswer(ok);
    qEl.querySelectorAll('.opt-btn').forEach(b => {
      b.disabled = true;
      if (b.dataset.correct === 'true') b.classList.add('correct');
      else if (b === btn) b.classList.add('wrong');
    });
    const fb = document.getElementById(`fb-${qid}`);
    fb.classList.add('show', ok ? 'correct-fb' : 'wrong-fb');
    fb.textContent = (ok ? '✓ Richtig. ' : '✗ Falsch. ') + QFEEDBACK[qid];
    checkGrundlagen();
  },

  /* multi-select */
  msToggle(btn) {
    if (btn.disabled) return;
    btn.classList.toggle('sel');
    btn.querySelector('.ms-box').textContent = btn.classList.contains('sel') ? '▣' : '▢';
    Sound.tick();
  },
  msSubmit(qid) {
    const qEl = document.getElementById(qid);
    if (qEl.dataset.answered === 'true') return;
    qEl.dataset.answered = 'true';
    const opts = [...qEl.querySelectorAll('.ms-opt')];
    let ok = true;
    opts.forEach(o => {
      const shouldBe = o.dataset.correct === 'true';
      const picked = o.classList.contains('sel');
      if (shouldBe !== picked) ok = false;
    });
    opts.forEach(o => {
      o.disabled = true;
      const shouldBe = o.dataset.correct === 'true', picked = o.classList.contains('sel');
      if (shouldBe && picked) o.classList.add('right');
      else if (shouldBe && !picked) o.classList.add('miss');
      else if (!shouldBe && picked) o.classList.add('bad');
    });
    qEl.querySelector('.ms-submit').disabled = true;
    recordAnswer(ok);
    const fb = document.getElementById(`fb-${qid}`);
    fb.classList.add('show', ok ? 'correct-fb' : 'wrong-fb');
    fb.textContent = (ok ? '✓ Komplett richtig. ' : '✗ Nicht ganz. ') + QFEEDBACK[qid];
    checkGrundlagen();
  },

  /* assign */
  assign(btn, choice) {
    const item = btn.closest('.assign-item');
    if (item.dataset.done === 'true') return;
    item.dataset.done = 'true';
    const correctAnswer = item.dataset.answer === 'true';
    const ok = choice === correctAnswer;
    recordAnswer(ok);
    item.querySelectorAll('.assign-btn').forEach(b => b.disabled = true);
    btn.classList.add(ok ? 'selected-correct' : 'selected-wrong');
    const fb = item.querySelector('.assign-feedback');
    fb.classList.add('show');
    fb.textContent = (ok ? '✓ Richtig. ' : '✗ Falsch. ') + ASSIGN_FB[item.dataset.id];
    checkUnterricht();
  },

  /* scenarios */
  scenario(btn, num) {
    const scen = document.getElementById(`scen-${num}`);
    if (scen.dataset.answered === 'true') return;
    scen.dataset.answered = 'true';
    const ok = btn.dataset.correct === 'true';
    recordAnswer(ok);
    scen.querySelectorAll('.choice-btn').forEach(b => {
      b.disabled = true;
      if (b.dataset.correct === 'true') b.classList.add('chosen-correct');
      else if (b === btn) b.classList.add('chosen-wrong');
    });
    const res = document.getElementById(`scen-${num}-result`);
    res.classList.add('show', ok ? 'res-good' : 'res-bad');
    res.textContent = SCEN_FB[num][ok ? 'true' : 'false'];
    State.pflichtenDone++;
    if (State.pflichtenDone < 4) {
      setTimeout(() => {
        const n = document.getElementById(`scen-${num+1}`);
        if (n) { n.style.display = 'block'; n.style.opacity = 0; setTimeout(() => { n.style.transition = 'opacity 0.5s'; n.style.opacity = 1; }, 40); }
      }, 1100);
    } else {
      setTimeout(() => { document.getElementById('next-pflichten').style.display = 'inline-block'; Sound.complete(); }, 1100);
    }
  },

  /* ═══ ESCAPE ═══ */
  escGoTo(station) {
    document.querySelectorAll('.escape-room').forEach(r => r.style.display = 'none');
    const room = document.getElementById(`escape-room-${station}`);
    if (room) room.style.display = 'block';
    document.querySelectorAll('.escape-room-btn').forEach((b,i) => {
      if (i === station && !b.classList.contains('locked')) b.classList.add('active');
      else if (i !== station) b.classList.remove('active');
    });
    Sound.nav();
  },

  escClick(btn, station) {
    if (station === 0) {
      if (btn.dataset.correct !== 'true') { flashWrong(btn); return; }
      document.querySelectorAll('#escape-room-0 .room-obj').forEach(b => b.disabled = true);
      document.getElementById('esc-popup-0').style.display = 'block';
    }
    if (station === 1) {
      if (btn.dataset.correct !== 'true') { flashWrong(btn, '§3.5 verlangt das nicht'); return; }
      if (State.s1Correct.has(btn.dataset.name)) return;
      State.s1Correct.add(btn.dataset.name);
      btn.classList.add('selected-obj'); btn.disabled = true; Sound.correct(0);
      document.getElementById('esc-s1-counter').textContent = `${State.s1Correct.size} / 3 korrekt`;
      if (State.s1Correct.size === 3) {
        setTimeout(() => { setDigit(1, '3', 'esc-digit-1'); unlockNav(2); Sound.reveal(); setTimeout(() => App.escGoTo(2), 1400); }, 450);
      }
    }
    if (station === 2) {
      if (btn.dataset.correct !== 'true') { flashWrong(btn); return; }
      document.querySelectorAll('#escape-room-2 .room-obj').forEach(b => b.disabled = true);
      document.getElementById('esc-popup-2').style.display = 'block';
    }
  },

  escAnswer(station) {
    if (station === 0) {
      const inp = document.getElementById('esc-ans-0'), fb = document.getElementById('esc-feedback-0');
      if (parseInt(inp.value, 10) === 8) {
        fb.className = 'esc-feedback ok'; fb.textContent = '✓ Bis 8:00 Uhr hätte die Meldung vorliegen müssen (§9.1).';
        Sound.reveal();
        setTimeout(() => { setDigit(0, '8', 'esc-digit-0'); markDone(0); unlockNav(1); setTimeout(() => App.escGoTo(1), 1400); }, 700);
      } else {
        fb.className = 'esc-feedback fail'; fb.textContent = '✗ Denk an §9.1 — an jedem versäumten Schultag bis zu einer vollen Uhrzeit.';
        Sound.wrong(); inp.classList.add('shake'); setTimeout(() => inp.classList.remove('shake'), 350);
      }
    }
    if (station === 2) {
      const mebis = cb('cb-mebis'), mathe = cb('cb-mathe');
      const bad = cb('cb-instagram') || cb('cb-youtube') || cb('cb-spotify');
      const fb = document.getElementById('esc-feedback-2');
      if (mebis && mathe && !bad) {
        fb.className = 'esc-feedback ok'; fb.textContent = '✓ Nur Mebis und Mathe-Gym sind ohne Anmeldung nutzbar (§10.1).';
        Sound.reveal();
        setTimeout(() => { setDigit(2, '2', 'esc-digit-2'); markDone(2); unlockNav(3); setTimeout(() => App.escGoTo(3), 1400); }, 700);
      } else {
        fb.className = 'esc-feedback fail'; fb.textContent = '✗ §10.1: Im MWGstudy sind nur Mebis und Mathe-Gym ohne Anmeldung erreichbar.';
        Sound.wrong();
      }
    }
  },

  escFinal() {
    const code = document.getElementById('escape-code').value.trim();
    const fb = document.getElementById('esc-final-feedback');
    if (code === '832') {
      document.getElementById('padlock').classList.add('open');
      Sound.unlock(); State.stopCountdown();
      fb.className = 'esc-feedback ok'; fb.textContent = '✓ Das Schloss springt auf. Die Tür quietscht. Du bist frei!';
      markDone(3);
      setTimeout(() => { document.getElementById('next-escape').style.display = 'inline-block'; Sound.complete(); }, 1300);
    } else {
      fb.className = 'esc-feedback fail'; fb.textContent = `✗ "${code || '___'}" passt nicht. Sieh in den drei Räumen nach.`;
      Sound.wrong();
      const inp = document.getElementById('escape-code'); inp.classList.add('shake'); setTimeout(() => inp.classList.remove('shake'), 350);
    }
  },

  toggleQuellen() {
    const c = document.getElementById('quellen-content'), b = document.querySelector('.quellen-toggle');
    const hidden = c.hidden; c.hidden = !hidden;
    b.setAttribute('aria-expanded', hidden ? 'true' : 'false');
    b.textContent = hidden ? 'Quellen & Grundlagen ▲' : 'Quellen & Grundlagen ▼';
  },

  reset() {
    State.reset();
    document.querySelectorAll('.opt-btn').forEach(b => { b.disabled = false; b.classList.remove('correct','wrong'); });
    document.querySelectorAll('.ms-opt').forEach(b => { b.disabled = false; b.classList.remove('sel','right','miss','bad'); b.querySelector('.ms-box').textContent = '▢'; });
    document.querySelectorAll('.ms-submit').forEach(b => b.disabled = false);
    document.querySelectorAll('.feedback').forEach(f => { f.className = 'feedback'; f.textContent = ''; });
    document.querySelectorAll('.quiz-question').forEach(q => q.dataset.answered = 'false');
    document.getElementById('q-grundlagen-progress').textContent = '0 / 4 gelöst';
    document.querySelectorAll('.assign-item').forEach(it => {
      it.dataset.done = 'false';
      it.querySelectorAll('.assign-btn').forEach(b => { b.disabled = false; b.classList.remove('selected-correct','selected-wrong'); });
      const af = it.querySelector('.assign-feedback'); af.className = 'assign-feedback'; af.textContent = '';
    });
    document.querySelectorAll('.scenario-block').forEach((s,i) => {
      s.dataset.answered = 'false'; s.style.display = i === 0 ? 'block' : 'none'; s.style.opacity = 1;
      s.querySelectorAll('.choice-btn').forEach(b => { b.disabled = false; b.classList.remove('chosen-correct','chosen-wrong'); });
      const r = s.querySelector('.scenario-result'); r.className = 'scenario-result';
    });
    resetEscape();
    ['next-grundlagen','next-unterricht','next-pflichten','next-escape'].forEach(id => document.getElementById(id).style.display = 'none');
    document.getElementById('skip-grundlagen').style.display = 'block';
    document.getElementById('skip-unterricht').style.display = 'block';
    document.querySelectorAll('.takeaway-card').forEach(c => c.classList.remove('visible'));
    document.querySelectorAll('.gallery-item').forEach(g => g.classList.remove('revealed'));
    const qc = document.getElementById('quellen-content'); if (qc) qc.hidden = true;
    const qt = document.querySelector('.quellen-toggle'); if (qt) qt.textContent = 'Quellen & Grundlagen ▼';
    updateScoreBadge();
    Typewriter.start();
    App.goTo(0);
  }
};

/* ═══ FEEDBACK DATA ═══ */
const QFEEDBACK = {
  qq1: 'Die Geräte müssen von 7:00–16:35 Uhr aus sein (§10) — auch wenn das Schulhaus noch bis 17:00 offen ist.',
  qq2: 'Erlaubt sind nur: Anruf mit Lehrerlaubnis, Lehrereinsatz im Unterricht und Freistunden/Mittagspause an erlaubten Orten ohne Störung. Pausen, Gänge und Zwischenzeiten bleiben tabu (§10).',
  qq3: 'Nur B stimmt: In der Mittagspause dürfen alle das Gelände verlassen (§2.8). Während des Unterrichts brauchen Jgst. 5–10 eine ausdrückliche Genehmigung (§2.7).',
  qq4: 'Das Café blu gilt nur für Freistunden und die Mittagspause. 9:20–9:35 Uhr ist die große Pause — Handynutzung also verboten (§10 + §2.5).'
};
const ASSIGN_FB = {
  a1: 'Handynutzung auf den Gängen ist auch in Pausen verboten (§10).',
  a3: 'Während der Unterrichtszeit brauchen Jgst. 5–10 eine ausdrückliche Genehmigung (§2.7).',
  a4: 'In Freistunden/Mittagspause im Café blu erlaubt, solange niemand gestört wird (§10).',
  a5: 'Schneeballwerfen ist aus Sicherheitsgründen verboten (§6.2).',
  a6: 'Falle erkannt? In der Mittagspause dürfen ALLE raus, auch die Unterstufe (§2.8). Die Genehmigungspflicht (§2.7) gilt nur in der Unterrichtszeit.',
  a7: 'An den Schulcomputern sind Essen und Trinken untersagt (§10.4).',
  a8: 'In die Bibliothek dürfen Esswaren und Getränke nicht mitgenommen werden (§4.2).'
};
const SCEN_FB = {
  1: { true: '✓ Genau. Die Meldung muss bis 8:00 Uhr vorliegen (§9.1). Verspätet ist sie regelwidrig — sofort melden und nachreichen ist trotzdem richtig.', false: '✗ 8:15 Uhr ist zu spät: §9.1 verlangt die telefonische Meldung bis 8:00 Uhr, an jedem versäumten Schultag.' },
  2: { true: '✓ §3.5: Stuhl auf den Tisch, Fenster schließen, Licht aus. Tafel und Müll sind Sache des Tafeldienstes (§3.4), nicht deine Abgehpflicht.', false: '✗ Tafel und Müll regelt der Tafeldienst (§3.4). Beim Verlassen gilt §3.5: Stuhl hoch, Fenster zu, Licht aus.' },
  3: { true: '✓ §5 nennt E-Zigaretten und E-Shishas ausdrücklich. Das Verbot gilt für alle, überall auf dem Gelände.', false: '✗ Falsch. §5 verbietet ausdrücklich auch E-Zigaretten und E-Shishas — auf dem gesamten Gelände.' },
  4: { true: '✓ §9.4: Befreiungen (kein Urlaub) werden rechtzeitig, bis zu drei Tage vorher, über das Elternportal bei der Schulleitung beantragt.', false: '✗ Spontan bei der Lehrkraft reicht nicht. §9.4: bis zu drei Tage vorher über das Elternportal bei der Schulleitung.' }
};

/* ═══ ESCAPE HELPERS ═══ */
function cb(id) { return document.getElementById(id).checked; }
function flashWrong(btn, msg) {
  btn.disabled = true; btn.classList.add('wrong-obj', 'shake'); Sound.wrong();
  if (msg) {
    const t = document.createElement('small');
    t.style.cssText = 'position:absolute;bottom:-20px;left:0;right:0;text-align:center;font-size:0.58rem;color:var(--error)';
    t.textContent = msg; btn.appendChild(t);
  }
  setTimeout(() => { btn.classList.remove('shake'); if (!msg) { btn.classList.remove('wrong-obj'); btn.disabled = false; } }, 700);
}
function setDigit(idx, val, revealId) {
  State.escapeDigits[idx] = val;
  document.getElementById(revealId).style.display = 'flex';
  const slot = document.getElementById(`slot${idx}`); slot.textContent = val; slot.classList.add('filled');
  const labels = ['Raum I','Raum II','Raum III'];
  const h = document.getElementById(`hint-d${idx}`); h.textContent = `${labels[idx]}: ${val}`; h.classList.add('known');
}
function markDone(navIdx) { const b = document.getElementById(`esc-nav-${navIdx}`); if (b) { b.classList.add('done'); } }
function unlockNav(navIdx) { const b = document.getElementById(`esc-nav-${navIdx}`); if (b) b.classList.remove('locked'); }

function startCountdown() {
  State.stopCountdown();
  State.cdLeft = 300;
  const timeEl = document.getElementById('cd-time'), wrap = document.getElementById('countdown');
  renderCd(timeEl); wrap.classList.remove('urgent');
  State.cdTimer = setInterval(() => {
    State.cdLeft--;
    if (State.cdLeft <= 60) wrap.classList.add('urgent');
    if (State.cdLeft <= 0) {
      State.cdLeft = 0; renderCd(timeEl); State.stopCountdown();
      document.querySelector('#countdown .cd-label').textContent = 'Schritte im Flur … bleib ruhig:';
      return;
    }
    renderCd(timeEl);
  }, 1000);
}
function renderCd(el) {
  const m = String(Math.floor(State.cdLeft / 60)).padStart(2,'0');
  const s = String(State.cdLeft % 60).padStart(2,'0');
  el.textContent = `${m}:${s}`;
}

function resetEscape() {
  State.escapeDigits = [null,null,null]; State.s1Correct = new Set();
  document.querySelectorAll('.room-obj').forEach(b => { b.disabled = false; b.classList.remove('selected-obj','wrong-obj','shake'); const s = b.querySelector('small'); if (s) s.remove(); });
  ['esc-popup-0','esc-popup-2'].forEach(id => document.getElementById(id).style.display = 'none');
  ['esc-feedback-0','esc-feedback-2','esc-final-feedback'].forEach(id => { const e = document.getElementById(id); e.className = 'esc-feedback'; e.textContent = ''; });
  ['esc-digit-0','esc-digit-1','esc-digit-2'].forEach(id => document.getElementById(id).style.display = 'none');
  document.querySelectorAll('.escape-room-btn').forEach((b,i) => { b.classList.remove('active','done','locked'); if (i===0) b.classList.add('active'); else b.classList.add('locked'); });
  document.querySelectorAll('.escape-room').forEach((r,i) => r.style.display = i===0 ? 'block' : 'none');
  document.getElementById('esc-s1-counter').textContent = '0 / 3 korrekt';
  ['cb-instagram','cb-mebis','cb-youtube','cb-mathe','cb-spotify'].forEach(id => { const e = document.getElementById(id); if (e) e.checked = false; });
  document.querySelectorAll('.hint-digit').forEach((e,i) => { e.textContent = `Raum ${['I','II','III'][i]}: ?`; e.classList.remove('known'); });
  document.querySelectorAll('.cd-slot').forEach((e,i) => { e.textContent = '_'; e.classList.remove('filled'); });
  document.getElementById('padlock').classList.remove('open');
  document.getElementById('escape-code').value = '';
  document.getElementById('esc-ans-0').value = '';
  document.querySelector('#countdown .cd-label').textContent = 'Hausmeister-Rundgang in';
  document.getElementById('countdown').classList.remove('urgent');
}

/* ═══ COMPLETION CHECKS ═══ */
function checkGrundlagen() {
  const ids = ['qq1','qq2','qq3','qq4'];
  const done = ids.map(id => document.getElementById(id).dataset.answered === 'true');
  document.getElementById('q-grundlagen-progress').textContent = `${done.filter(Boolean).length} / 4 gelöst`;
  if (done.every(Boolean) && !State.grundlagenDone) {
    State.grundlagenDone = true;
    document.getElementById('next-grundlagen').style.display = 'inline-block';
    document.getElementById('skip-grundlagen').style.display = 'none';
    Sound.complete();
  }
}
function checkUnterricht() {
  const all = [...document.querySelectorAll('.assign-item')].every(i => i.dataset.done === 'true');
  if (all && !State.unterrichtDone) {
    State.unterrichtDone = true;
    document.getElementById('next-unterricht').style.display = 'inline-block';
    document.getElementById('skip-unterricht').style.display = 'none';
    Sound.complete();
  }
}

/* ═══ FINAL ═══ */
function showFinal() {
  const total = State.total || 1, pct = State.score / total;
  let rank, extra;
  if (pct >= 0.9) rank = 'Schulrechts-Meister:in';
  else if (pct >= 0.7) rank = 'Paragraphen-Profi';
  else if (pct >= 0.5) rank = 'Hausordnungs-Kenner:in';
  else rank = 'Frischling';
  document.getElementById('final-rank').textContent = rank;
  document.getElementById('final-score-display').textContent = `${State.score} / ${State.total}`;
  document.getElementById('final-score-sub').textContent = 'Punkte';
  extra = `Längste Serie: ${State.bestStreak} richtig in Folge`;
  if (pct < 0.5) extra += ' · Tipp: §3.5, §9 und §10 nochmal ansehen';
  document.getElementById('final-extra').textContent = extra;
  document.querySelectorAll('.takeaway-card').forEach((c,i) => setTimeout(() => c.classList.add('visible'), 300 + i*180));
  document.querySelectorAll('.gallery-item').forEach((g,i) => setTimeout(() => g.classList.add('revealed'), 700 + i*160));
  Sound.complete();
}

/* ═══ UI ═══ */
function updateUI() {
  const idx = State.current, pct = (idx / 5) * 100;
  document.getElementById('progress-bar').style.setProperty('--progress', `${pct}%`);
  document.querySelectorAll('.sec-dot').forEach((d,i) => { d.classList.remove('active','done'); if (i===idx) d.classList.add('active'); else if (i<idx) d.classList.add('done'); });
  document.getElementById('back-btn').style.display = idx > 0 ? 'flex' : 'none';
  document.getElementById('score-badge').style.display = idx > 0 ? 'flex' : 'none';
}

/* ═══ FLIP CARDS ═══ */
function initFlipCards() {
  document.querySelectorAll('.flip-card').forEach(card => {
    const toggle = () => { card.classList.toggle('flipped'); Sound.nav(); };
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
}

/* ═══ EVENTS ═══ */
document.getElementById('back-btn').addEventListener('click', () => { if (State.current > 0) App.goTo(State.current - 1); });
document.querySelectorAll('.sec-dot').forEach(dot => dot.addEventListener('click', () => { const t = +dot.dataset.sec; if (t <= State.current) App.goTo(t); }));
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' && State.current > 0) App.goTo(State.current - 1);
  if (e.key === 'ArrowRight' && State.current < 5) {
    const nb = document.querySelector(`#sec-${State.current} .btn-next`);
    if (nb && nb.style.display !== 'none') nb.click();
  }
});
document.getElementById('escape-code').addEventListener('keydown', e => { if (e.key === 'Enter') App.escFinal(); });
document.getElementById('esc-ans-0').addEventListener('keydown', e => { if (e.key === 'Enter') App.escAnswer(0); });

/* ═══ INIT ═══ */
window.addEventListener('DOMContentLoaded', () => {
  initParticles(); initFlipCards(); updateUI(); updateScoreBadge();
  Typewriter.start();
  const sec0 = document.getElementById('sec-0');
  requestAnimationFrame(() => requestAnimationFrame(() => sec0.classList.add('visible')));
});
