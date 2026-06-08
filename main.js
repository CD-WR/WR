'use strict';

/* ═══ AUDIO ENGINE ═══ */
const Audio = (() => {
  let ctx = null;
  const init = () => {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  };
  const play = (type, volume = 0.15) => {
    init();
    if (!ctx) return;
    const g = ctx.createGain();
    g.gain.setValueAtTime(volume, ctx.currentTime);
    g.connect(ctx.destination);
    const o = ctx.createOscillator();
    o.connect(g);
    switch (type) {
      case 'correct':
        o.type = 'sine'; o.frequency.value = 880;
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        o.start(); o.stop(ctx.currentTime + 0.08);
        break;
      case 'wrong':
        o.type = 'sine'; o.frequency.value = 200;
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        o.start(); o.stop(ctx.currentTime + 0.1);
        break;
      case 'complete': {
        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o.type = 'sine'; o.frequency.value = 660;
        o2.type = 'sine'; o2.frequency.value = 880;
        g.gain.setValueAtTime(volume, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        g2.gain.setValueAtTime(0.001, ctx.currentTime);
        g2.gain.setValueAtTime(volume, ctx.currentTime + 0.18);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.36);
        o.start(); o.stop(ctx.currentTime + 0.15);
        o2.start(ctx.currentTime + 0.18); o2.stop(ctx.currentTime + 0.36);
        break;
      }
      case 'nav':
        o.type = 'triangle'; o.frequency.value = 1200;
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        o.start(); o.stop(ctx.currentTime + 0.04);
        break;
      case 'unlock': {
        [440, 554, 659, 880].forEach((freq, i) => {
          const oo = ctx.createOscillator();
          const gg = ctx.createGain();
          oo.connect(gg); gg.connect(ctx.destination);
          oo.type = 'sine'; oo.frequency.value = freq;
          const t = ctx.currentTime + i * 0.12;
          gg.gain.setValueAtTime(0.001, t);
          gg.gain.linearRampToValueAtTime(volume, t + 0.04);
          gg.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
          oo.start(t); oo.stop(t + 0.14);
        });
        break;
      }
    }
  };
  return { play };
})();

/* ═══ STATE ═══ */
const State = {
  current: 0,
  score: 0,
  total: 0,
  grundlagenDone: false,
  unterrichtDone: false,
  pflichtenDone: 0,
  escapeDigits: [null, null, null],
  escapeStation: 0,
  escapeDone: false,
  s1CorrectSelected: new Set(),
  reset() {
    this.current = 0; this.score = 0; this.total = 0;
    this.grundlagenDone = false; this.unterrichtDone = false;
    this.pflichtenDone = 0; this.escapeDigits = [null,null,null];
    this.escapeStation = 0; this.escapeDone = false;
    this.s1CorrectSelected = new Set();
  }
};

/* ═══ PARTICLES ═══ */
function initParticles() {
  const el = document.getElementById('particles');
  if (!el) return;
  el.innerHTML = '';
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 4 + Math.random() * 40;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random()*100}%;
      top:${Math.random()*100}%;
      --dur:${6+Math.random()*10}s;
      --delay:${-Math.random()*10}s;
    `;
    el.appendChild(p);
  }
}

/* ═══ NAVIGATION ═══ */
const App = {
  goTo(idx) {
    if (idx < 0 || idx > 5) return;
    Audio.play('nav');
    const prev = document.getElementById(`sec-${State.current}`);
    if (prev) { prev.classList.remove('visible'); setTimeout(() => prev.classList.remove('active'), 300); }
    State.current = idx;
    const next = document.getElementById(`sec-${idx}`);
    if (next) {
      next.classList.add('active');
      requestAnimationFrame(() => requestAnimationFrame(() => next.classList.add('visible')));
    }
    updateUI();
    if (idx === 5) showFinal();
    if (idx === 4) resetEscape();
  },

  answer(btn) {
    const qid = btn.dataset.q;
    const qEl = document.getElementById(qid);
    if (qEl.dataset.answered === 'true') return;
    qEl.dataset.answered = 'true';
    const isCorrect = btn.dataset.correct === 'true';
    State.total++;
    if (isCorrect) { State.score++; Audio.play('correct'); }
    else { Audio.play('wrong'); }
    updateScoreBadge();
    const allBtns = qEl.querySelectorAll('.opt-btn');
    allBtns.forEach(b => {
      b.disabled = true;
      if (b.dataset.correct === 'true') b.classList.add('correct');
      else if (b === btn) b.classList.add('wrong');
    });
    const fb = document.getElementById(`fb-${qid}`);
    if (fb) {
      fb.classList.add('show', isCorrect ? 'correct-fb' : 'wrong-fb');
      fb.textContent = isCorrect ? '✓ Richtig!' : getFeedback(qid);
    }
    checkGrundlagen();
  },

  assign(btn, choice) {
    const item = btn.closest('.assign-item');
    if (item.dataset.done === 'true') return;
    item.dataset.done = 'true';
    const correctAnswer = item.dataset.answer === 'true';
    const isCorrect = choice === correctAnswer;
    State.total++;
    if (isCorrect) { State.score++; Audio.play('correct'); }
    else { Audio.play('wrong'); }
    updateScoreBadge();
    item.querySelectorAll('.assign-btn').forEach(b => b.disabled = true);
    btn.classList.add(isCorrect ? 'selected-correct' : 'selected-wrong');
    const fb = item.querySelector('.assign-feedback');
    if (fb) {
      fb.classList.add('show');
      fb.textContent = getAssignFeedback(item.dataset.id, isCorrect, correctAnswer);
    }
    checkUnterricht();
  },

  scenario(btn, num) {
    const scen = document.getElementById(`scen-${num}`);
    if (scen.dataset.answered === 'true') return;
    scen.dataset.answered = 'true';
    const isCorrect = btn.dataset.correct === 'true';
    State.total++;
    if (isCorrect) { State.score++; Audio.play('correct'); }
    else { Audio.play('wrong'); }
    updateScoreBadge();
    scen.querySelectorAll('.choice-btn').forEach(b => {
      b.disabled = true;
      if (b.dataset.correct === 'true') b.classList.add('chosen-correct');
      else if (b === btn) b.classList.add('chosen-wrong');
    });
    const res = document.getElementById(`scen-${num}-result`);
    if (res) {
      res.classList.add('show', isCorrect ? 'res-good' : 'res-bad');
      res.textContent = getScenFeedback(num, isCorrect);
    }
    State.pflichtenDone++;
    if (State.pflichtenDone < 4) {
      setTimeout(() => {
        const next = document.getElementById(`scen-${num+1}`);
        if (next) { next.style.display = 'block'; next.style.opacity = 0; setTimeout(() => { next.style.transition = 'opacity 0.5s'; next.style.opacity = 1; }, 50); }
      }, 1200);
    } else {
      setTimeout(() => {
        const nb = document.getElementById('next-pflichten');
        if (nb) { nb.style.display = 'inline-block'; Audio.play('complete'); }
      }, 1200);
    }
  },

  /* ─── ESCAPE ROOM ─── */
  escGoTo(station) {
    document.querySelectorAll('.escape-room').forEach(r => r.style.display = 'none');
    const room = document.getElementById(`escape-room-${station}`);
    if (room) room.style.display = 'block';
    document.querySelectorAll('.escape-room-btn').forEach((b,i) => {
      b.classList.remove('active');
      if (i === station && !b.classList.contains('locked')) b.classList.add('active');
    });
    State.escapeStation = station;
  },

  escClick(btn, station) {
    if (station === 0) {
      const isCorrect = btn.dataset.correct === 'true';
      if (!isCorrect) {
        btn.classList.add('wrong-obj');
        btn.disabled = true;
        Audio.play('wrong');
        setTimeout(() => { btn.classList.remove('wrong-obj'); btn.disabled = false; }, 800);
        return;
      }
      document.querySelectorAll('#escape-room-0 .room-obj').forEach(b => b.disabled = true);
      const popup = document.getElementById('esc-popup-0');
      if (popup) popup.style.display = 'block';
    }
    if (station === 1) {
      const name = btn.dataset.name;
      const isCorrect = btn.dataset.correct === 'true';
      if (!isCorrect) {
        btn.disabled = true;
        btn.classList.add('wrong-obj');
        btn.classList.add('shake');
        Audio.play('wrong');
        const fb = document.createElement('small');
        fb.style.cssText = 'position:absolute;bottom:-22px;left:0;right:0;text-align:center;font-size:0.65rem;color:var(--error)';
        fb.textContent = '§3.5 nicht erwähnt';
        btn.style.position = 'relative';
        btn.appendChild(fb);
        setTimeout(() => btn.classList.remove('shake'), 400);
        return;
      }
      if (State.s1CorrectSelected.has(name)) return;
      State.s1CorrectSelected.add(name);
      btn.classList.add('selected-obj');
      btn.disabled = true;
      Audio.play('correct');
      const counter = document.getElementById('esc-s1-counter');
      if (counter) counter.textContent = `${State.s1CorrectSelected.size} / 3 ausgewählt`;
      if (State.s1CorrectSelected.size === 3) {
        setTimeout(() => {
          State.escapeDigits[1] = '3';
          const dig = document.getElementById('esc-digit-1');
          if (dig) dig.style.display = 'flex';
          const navBtn = document.getElementById('esc-nav-1');
          if (navBtn) { navBtn.classList.remove('locked'); navBtn.classList.add('done'); }
          const navBtn2 = document.getElementById('esc-nav-2');
          if (navBtn2) { navBtn2.classList.remove('locked'); }
          updateHints();
          Audio.play('complete');
          setTimeout(() => App.escGoTo(2), 1500);
        }, 500);
      }
    }
    if (station === 2) {
      const isCorrect = btn.dataset.correct === 'true';
      if (!isCorrect) {
        const infos = {
          'Handy2': 'Handys sind im Unterricht grundsätzlich nicht erlaubt.',
          'Kaffee': 'Essen und Trinken ist in der Bibliothek verboten, nicht im Café.',
          'Aushang': 'Hinweis: Nur abgezeichnete Plakate sind erlaubt (§1.5).'
        };
        btn.disabled = true;
        btn.classList.add('wrong-obj');
        Audio.play('wrong');
        const info = infos[btn.dataset.name] || '';
        if (info) {
          const t = document.createElement('small');
          t.style.cssText = 'position:absolute;bottom:-22px;left:0;right:0;text-align:center;font-size:0.65rem;color:var(--text-dim)';
          t.textContent = info;
          btn.style.position = 'relative';
          btn.appendChild(t);
        }
        return;
      }
      document.querySelectorAll('#escape-room-2 .room-obj').forEach(b => b.disabled = true);
      const popup = document.getElementById('esc-popup-2');
      if (popup) popup.style.display = 'block';
    }
  },

  escAnswer(station) {
    if (station === 0) {
      const inp = document.getElementById('esc-ans-0');
      const val = parseInt(inp.value, 10);
      const fb = document.getElementById('esc-feedback-0');
      if (val === 8) {
        fb.className = 'esc-feedback ok';
        fb.textContent = '✓ Richtig! Bis 8:00 Uhr muss die Meldung vorliegen.';
        State.escapeDigits[0] = '8';
        Audio.play('complete');
        setTimeout(() => {
          const dig = document.getElementById('esc-digit-0');
          if (dig) dig.style.display = 'flex';
          const navBtn = document.getElementById('esc-nav-0');
          if (navBtn) { navBtn.classList.add('done'); }
          const navBtn1 = document.getElementById('esc-nav-1');
          if (navBtn1) { navBtn1.classList.remove('locked'); }
          updateHints();
          setTimeout(() => App.escGoTo(1), 1500);
        }, 800);
      } else {
        fb.className = 'esc-feedback fail';
        fb.textContent = '✗ Nicht ganz. Denk an §9.1 der Hausordnung!';
        Audio.play('wrong');
        inp.classList.add('shake');
        setTimeout(() => inp.classList.remove('shake'), 400);
      }
    }
    if (station === 2) {
      const mebis = document.getElementById('cb-mebis').checked;
      const mathe = document.getElementById('cb-mathe').checked;
      const bad = document.getElementById('cb-instagram').checked || document.getElementById('cb-youtube').checked || document.getElementById('cb-spotify').checked;
      const fb = document.getElementById('esc-feedback-2');
      if (mebis && mathe && !bad) {
        fb.className = 'esc-feedback ok';
        fb.textContent = '✓ Korrekt! Mebis und Mathe-Gym sind ohne Anmeldung nutzbar.';
        State.escapeDigits[2] = '2';
        Audio.play('complete');
        setTimeout(() => {
          const dig = document.getElementById('esc-digit-2');
          if (dig) dig.style.display = 'flex';
          const navBtn2 = document.getElementById('esc-nav-2');
          if (navBtn2) { navBtn2.classList.remove('locked'); navBtn2.classList.add('done'); }
          const navBtn3 = document.getElementById('esc-nav-3');
          if (navBtn3) { navBtn3.classList.remove('locked'); }
          updateHints();
          setTimeout(() => App.escGoTo(3), 1500);
        }, 800);
      } else {
        fb.className = 'esc-feedback fail';
        fb.textContent = '✗ Nicht ganz. Laut §10.1 sind nur Mebis und Mathe-Gym ohne Anmeldung erreichbar.';
        Audio.play('wrong');
      }
    }
  },

  escFinal() {
    const code = document.getElementById('escape-code').value.trim();
    const fb = document.getElementById('esc-final-feedback');
    if (code === '832') {
      const padlock = document.getElementById('padlock');
      if (padlock) padlock.classList.add('open');
      Audio.play('unlock');
      fb.className = 'esc-feedback ok';
      fb.textContent = '✓ Die Tür öffnet sich! Du bist frei! Glückwunsch!';
      State.escapeDone = true;
      setTimeout(() => {
        const nb = document.getElementById('next-escape');
        if (nb) { nb.style.display = 'inline-block'; Audio.play('complete'); }
      }, 1500);
    } else {
      fb.className = 'esc-feedback fail';
      fb.textContent = `✗ Falscher Code "${code}". Schau nochmal in die drei Räume.`;
      Audio.play('wrong');
      const inp = document.getElementById('escape-code');
      inp.classList.add('shake');
      setTimeout(() => inp.classList.remove('shake'), 400);
    }
  },

  toggleQuellen() {
    const content = document.getElementById('quellen-content');
    const btn = document.querySelector('.quellen-toggle');
    const isHidden = content.hidden;
    content.hidden = !isHidden;
    btn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    btn.textContent = isHidden ? '📄 Quellen & Grundlagen ▲' : '📄 Quellen & Grundlagen ▼';
  },

  reset() {
    State.reset();
    // Reset quiz buttons
    document.querySelectorAll('.opt-btn').forEach(b => {
      b.disabled = false; b.classList.remove('correct', 'wrong');
    });
    document.querySelectorAll('.feedback').forEach(f => {
      f.className = 'feedback'; f.textContent = '';
    });
    document.querySelectorAll('.quiz-question').forEach(q => q.dataset.answered = 'false');
    document.getElementById('q-grundlagen-progress').textContent = '0 / 4 beantwortet';
    // Reset assign
    document.querySelectorAll('.assign-item').forEach(item => {
      item.dataset.done = 'false';
      item.querySelectorAll('.assign-btn').forEach(b => {
        b.disabled = false;
        b.classList.remove('selected-correct', 'selected-wrong');
      });
      const af = item.querySelector('.assign-feedback');
      if (af) { af.className = 'assign-feedback'; af.textContent = ''; }
    });
    // Reset scenarios
    document.querySelectorAll('.scenario-block').forEach((s,i) => {
      s.dataset.answered = 'false';
      s.style.display = i === 0 ? 'block' : 'none';
      s.style.opacity = 1;
      s.querySelectorAll('.choice-btn').forEach(b => {
        b.disabled = false;
        b.classList.remove('chosen-correct', 'chosen-wrong');
      });
      const res = s.querySelector('.scenario-result');
      if (res) res.className = 'scenario-result';
    });
    // Reset escape
    resetEscape();
    // Reset nav buttons
    document.getElementById('next-grundlagen').style.display = 'none';
    document.getElementById('skip-grundlagen').style.display = 'block';
    document.getElementById('next-unterricht').style.display = 'none';
    document.getElementById('skip-unterricht').style.display = 'block';
    document.getElementById('next-pflichten').style.display = 'none';
    document.getElementById('next-escape').style.display = 'none';
    // Reset takeaway cards
    document.querySelectorAll('.takeaway-card').forEach(c => c.classList.remove('visible'));
    // Reset quellen
    const qc = document.getElementById('quellen-content');
    if (qc) qc.hidden = true;
    const qt = document.querySelector('.quellen-toggle');
    if (qt) qt.textContent = '📄 Quellen & Grundlagen ▼';
    updateScoreBadge();
    App.goTo(0);
  }
};

/* ═══ HELPERS ═══ */
function getFeedback(qid) {
  const map = {
    'qq1': 'Achtung Zeitfalle: Die Geräte müssen von 7:00 bis 16:35 Uhr aus sein (§10) — obwohl das Schulhaus noch bis 17:00 Uhr geöffnet ist.',
    'qq2': '§9.1 — an JEDEM versäumten Schultag muss bis 8 Uhr telefonisch gemeldet werden. Die schriftliche Entschuldigung (oder das Elternportal) kommt zusätzlich nach der Rückkehr.',
    'qq3': '§2.6.2 — Dach, Keller, das Gelände der Jean-Paul-Schule und die Baustelle sind tabu. Steinhalle, grünes Klassenzimmer und LABS sind dagegen erlaubte Aufenthaltsräume (§2.9).',
    'qq4': '§11.1 — nach 5 Minuten ist das Sekretariat zu verständigen, verantwortlich ist der Klassensprecher. Die Stunde ist nicht automatisch frei.'
  };
  return map[qid] || 'Leider falsch.';
}

function getAssignFeedback(id, isCorrect, correct) {
  const explanations = {
    'a1': 'Handynutzung auf den Gängen ist auch in Pausen nicht erlaubt (§10).',
    'a2': 'In der Mittagspause dürfen alle Schüler das Gelände verlassen (§2.8) — unabhängig von der Jahrgangsstufe.',
    'a3': 'Während der Unterrichtszeit brauchen Schüler der Jgst. 5–10 eine ausdrückliche Genehmigung (§2.7).',
    'a4': 'In Freistunden/Mittagspause ist die Handynutzung im Café blu erlaubt, wenn niemand gestört wird (§10).',
    'a5': 'Schneeballwerfen ist aus Sicherheitsgründen verboten (§6.2).',
    'a6': 'Achtung Falle: In der Mittagspause dürfen ALLE — auch die Unterstufe — das Gelände verlassen (§2.8). Die Genehmigungspflicht aus §2.7 gilt nur während der regulären Unterrichtszeit.',
    'a7': 'Während der Nutzung der Schulcomputer sind Essen und Trinken untersagt (§10.4).'
  };
  const prefix = isCorrect ? '✓ Richtig! ' : '✗ Falsch. ';
  return prefix + (explanations[id] || '');
}

function getScenFeedback(num, isCorrect) {
  const map = {
    1: {
      true: '✓ Richtig! Telefonische Meldung bis 8 Uhr (§9.1), nach Wiederkehr schriftlich oder per Elternportal.',
      false: '✗ Zu spät. Die telefonische Krankmeldung muss bis spätestens 8:00 Uhr vorliegen — jeden versäumten Schultag (§9.1).'
    },
    2: {
      true: '✓ Korrekt! §3.5 der Hausordnung: Stuhl auf den Tisch, Fenster schließen, Licht ausschalten.',
      false: '✗ Nicht ganz. Laut §3.5 musst du zuerst: Stuhl auf den Tisch stellen, Fenster schließen, Licht ausschalten.'
    },
    3: {
      true: '✓ Richtig! §5 verbietet Rauchen auf dem gesamten Schulgelände — inklusive E-Zigaretten und E-Shishas.',
      false: '✗ Falsch. Das Rauchverbot gilt für alle, überall auf dem Gelände — auch E-Zigaretten (§5).'
    },
    4: {
      true: '✓ Richtig! Eine Unterrichtsbefreiung (kein Urlaub) wird rechtzeitig — bis zu drei Tage vorher — über das Elternportal bei der Schulleitung beantragt (§9.4).',
      false: '✗ Zu spät und falscher Weg. Eine Befreiung muss bis zu drei Tage vorher über das Elternportal bei der Schulleitung beantragt werden — nicht spontan bei der Lehrkraft (§9.4).'
    }
  };
  return map[num][isCorrect ? 'true' : 'false'];
}

function checkGrundlagen() {
  const ids = ['qq1', 'qq2', 'qq3', 'qq4'];
  const done = ids.map(id => document.getElementById(id).dataset.answered === 'true');
  const answered = done.filter(Boolean).length;
  document.getElementById('q-grundlagen-progress').textContent = `${answered} / 4 beantwortet`;
  if (done.every(Boolean) && !State.grundlagenDone) {
    State.grundlagenDone = true;
    const nb = document.getElementById('next-grundlagen');
    const sk = document.getElementById('skip-grundlagen');
    if (nb) nb.style.display = 'inline-block';
    if (sk) sk.style.display = 'none';
    Audio.play('complete');
  }
}

function checkUnterricht() {
  const items = document.querySelectorAll('.assign-item');
  const allDone = Array.from(items).every(i => i.dataset.done === 'true');
  if (allDone && !State.unterrichtDone) {
    State.unterrichtDone = true;
    const nb = document.getElementById('next-unterricht');
    const sk = document.getElementById('skip-unterricht');
    if (nb) nb.style.display = 'inline-block';
    if (sk) sk.style.display = 'none';
    Audio.play('complete');
  }
}

function updateScoreBadge() {
  document.getElementById('score-live').textContent = State.score;
  document.getElementById('score-total').textContent = State.total;
}

function updateHints() {
  const labels = ['Raum 1', 'Raum 2', 'Raum 3'];
  State.escapeDigits.forEach((d, i) => {
    const el = document.getElementById(`hint-d${i}`);
    if (el && d !== null) {
      el.textContent = `${labels[i]}: ${d}`;
      el.classList.add('known');
    }
  });
}

function resetEscape() {
  State.escapeDigits = [null, null, null];
  State.escapeStation = 0;
  State.s1CorrectSelected = new Set();
  // Reset room objects
  document.querySelectorAll('.room-obj').forEach(b => {
    b.disabled = false;
    b.classList.remove('selected-obj', 'wrong-obj', 'shake');
    const extra = b.querySelector('small');
    if (extra) extra.remove();
  });
  // Reset popups
  ['esc-popup-0', 'esc-popup-2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  ['esc-feedback-0', 'esc-feedback-2', 'esc-final-feedback'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.className = 'esc-feedback'; el.textContent = ''; }
  });
  // Reset digit reveals
  ['esc-digit-0', 'esc-digit-1', 'esc-digit-2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  // Reset nav
  document.querySelectorAll('.escape-room-btn').forEach((b, i) => {
    b.classList.remove('active', 'done', 'locked');
    if (i === 0) b.classList.add('active');
    else b.classList.add('locked');
  });
  // Reset rooms
  document.querySelectorAll('.escape-room').forEach((r, i) => {
    r.style.display = i === 0 ? 'block' : 'none';
  });
  // Reset counter
  const counter = document.getElementById('esc-s1-counter');
  if (counter) counter.textContent = '0 / 3 ausgewählt';
  // Reset checkboxes
  ['cb-instagram','cb-mebis','cb-youtube','cb-mathe','cb-spotify'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });
  // Reset hints
  document.querySelectorAll('.hint-digit').forEach((el, i) => {
    el.textContent = `Raum ${i+1}: ?`;
    el.classList.remove('known');
  });
  // Reset padlock
  const padlock = document.getElementById('padlock');
  if (padlock) padlock.classList.remove('open');
  const codeInput = document.getElementById('escape-code');
  if (codeInput) codeInput.value = '';
  // Reset input
  const inp = document.getElementById('esc-ans-0');
  if (inp) inp.value = '';
}

function showFinal() {
  const total = State.total > 0 ? State.total : '–';
  const scoreEl = document.getElementById('final-score-display');
  const subEl = document.getElementById('final-score-sub');
  if (scoreEl) scoreEl.textContent = `${State.score} / ${total}`;
  if (subEl) subEl.textContent = 'Fragen richtig beantwortet';
  // Animate takeaway cards
  document.querySelectorAll('.takeaway-card').forEach((card, i) => {
    setTimeout(() => card.classList.add('visible'), 300 + i * 200);
  });
  Audio.play('complete');
}

function updateUI() {
  const idx = State.current;
  const total = 6;
  const pct = (idx / (total - 1)) * 100;
  document.getElementById('progress-bar').style.setProperty('--progress', `${pct}%`);
  // Section dots
  document.querySelectorAll('.sec-dot').forEach((dot, i) => {
    dot.classList.remove('active', 'done');
    if (i === idx) dot.classList.add('active');
    else if (i < idx) dot.classList.add('done');
  });
  // Back button
  const backBtn = document.getElementById('back-btn');
  if (backBtn) backBtn.style.display = idx > 0 ? 'flex' : 'none';
  // Score badge
  const badge = document.getElementById('score-badge');
  if (badge) badge.style.display = idx > 0 ? 'block' : 'none';
}

/* ═══ FLIP CARD EVENTS ═══ */
function initFlipCards() {
  document.querySelectorAll('.flip-card').forEach(card => {
    const toggle = () => {
      card.classList.toggle('flipped');
      Audio.play('nav');
    };
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
}

/* ═══ BACK BUTTON ═══ */
document.getElementById('back-btn').addEventListener('click', () => {
  if (State.current > 0) App.goTo(State.current - 1);
});

/* ═══ SECTION DOT NAVIGATION ═══ */
document.querySelectorAll('.sec-dot').forEach(dot => {
  dot.addEventListener('click', () => {
    const target = parseInt(dot.dataset.sec, 10);
    if (target <= State.current) App.goTo(target);
  });
});

/* ═══ KEYBOARD NAVIGATION ═══ */
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' && State.current < 5) {
    const nextBtn = document.querySelector(`#sec-${State.current} .btn-next[style*="inline-block"]`);
    if (nextBtn) nextBtn.click();
  }
  if (e.key === 'ArrowLeft' && State.current > 0) App.goTo(State.current - 1);
});

/* ═══ INIT ═══ */
window.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initFlipCards();
  updateUI();
  // Trigger visible on hero
  const sec0 = document.getElementById('sec-0');
  requestAnimationFrame(() => requestAnimationFrame(() => sec0.classList.add('visible')));
  updateScoreBadge();
});
