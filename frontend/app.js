let ARTS = [], picked = null;
const $ = s => document.querySelector(s);

// Art forms the trained model can currently recognize (must match model/labels.json, excluding "other")
const SUPPORTED = 'Gond, Kalamkari, Kerala Mural, Madhubani, Mandana, Pattachitra, Tanjore and Warli';

const HAS_PHOTO = new Set(['madhubani','warli','kalamkari','pattachitra','gond','tanjore','kerala-mural','mandana']);
const tile = a => HAS_PHOTO.has(a.id)
  ? `background-image:url('images/${a.id}.jpg');background-size:cover;background-position:center`
  : `background:radial-gradient(circle at 20% 30%,${a.colors[2]} 0 14%,transparent 15%),repeating-linear-gradient(45deg,${a.colors[1]}55 0 8px,transparent 8px 18px),${a.colors[0]}`;
const li = x => x.map(i => `<li>${i}</li>`).join('');

const card = a => `<div class="card" tabindex="0" data-id="${a.id}"><div class="tile" style="${tile(a)}"></div><div class="b"><h3>${a.name}</h3><small>${a.region}</small><p>${a.description}</p></div></div>`;

const info = a => `<div class="cols">
<div><h4>Origin</h4><p>${a.region}</p><h4>History</h4><p>${a.history}</p><h4>Cultural significance</h4><p>${a.significance}</p></div>
<div><h4>Characteristics</h4><ul class="t">${li(a.characteristics)}</ul><h4>Materials</h4><ul class="t">${li(a.materials)}</ul><h4>Traditional techniques</h4><ul class="t">${li(a.techniques)}</ul><h4>Interesting facts</h4><ul class="t">${li(a.facts)}</ul></div></div>`;

function route() {
  const raw = (location.hash || '#home').slice(1);
  let pageId = raw, navMatch = raw;

  if (raw.startsWith('dynasty/')) {
    pageId = 'dynastyPage';
    navMatch = 'dynasties';
    renderDynastyPage(raw.split('/')[1]);
  } else if (raw.startsWith('temple/')) {
    pageId = 'templePage';
    navMatch = 'dynasties';
    renderTemplePage(raw.split('/')[1]);
  }

  document.querySelectorAll('.page').forEach(p => p.classList.toggle('on', p.id === pageId));
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('on', a.hash === '#' + navMatch));
  scrollTo(0, 0);
}

function bindCards(root, fn) {
  root.querySelectorAll('.card').forEach(c => {
    const f = () => fn(ARTS.find(a => a.id === c.dataset.id));
    c.onclick = f;
    c.onkeydown = e => e.key === 'Enter' && f();
  });
}

function showDetail(a) {
  $('#detail').innerHTML = `<div class="res"><h3>${a.name}</h3>${info(a)}</div>`;
  $('#detail').scrollIntoView();
}

function renderCards() {
  const q = $('#q').value.toLowerCase(), r = $('#fr').value, t = $('#ft').value;
  const l = ARTS.filter(a => (!r || a.region === r) && (!t || a.technique === t) &&
    (a.name + a.region + a.technique + a.description).toLowerCase().includes(q));
  $('#cards').innerHTML = l.map(card).join('') || '<p>No art forms match. Clear a filter or try another word.</p>';
  bindCards($('#cards'), showDetail);
}

function history() {
  const h = JSON.parse(localStorage.getItem('hl_hist') || '[]');
  $('#history').innerHTML = h.length
    ? h.map(x => `<div class="card" tabindex="0" data-id="${x.id}"><div class="tile" style="${tile(ARTS.find(a => a.id === x.id))}"></div><div class="b"><h3>${x.name}</h3><small>${x.conf}%${x.mock ? ' (demo)' : ''}</small></div></div>`).join('')
    : '<p>Nothing yet. Analyze an image to start your history.</p>';
  bindCards($('#history'), a => { location.hash = '#explore'; showDetail(a); });
}

function pick(f) {
  $('#err').textContent = '';
  if (!f) return;
  if (!/\.(jpe?g|png)$/i.test(f.name)) return $('#err').textContent = 'Unsupported file. Upload a JPG, JPEG or PNG.';
  if (f.size > 5 * 1048576) return $('#err').textContent = 'Image is over 5 MB. Upload a smaller file.';
  picked = f;
  const p = $('#preview');
  p.src = URL.createObjectURL(f);
  p.hidden = false;
  $('#droptxt').textContent = f.name;
  $('#go').disabled = false;
}


function resetUpload() {
  picked = null;
  $('#file').value = '';
  $('#preview').hidden = true;
  $('#preview').src = '';
  $('#droptxt').textContent = 'Drop an image here or press to choose (JPG, JPEG, PNG, up to 5 MB)';
  $('#go').disabled = true;
  $('#err').textContent = '';
  $('#result').innerHTML = '';
  $('#progress').hidden = true;
  document.querySelectorAll('#progress li').forEach(s => s.className = '');
}

async function analyze() {
  const steps = [...document.querySelectorAll('#progress li')];
  $('#progress').hidden = false;
  $('#err').textContent = '';
  $('#result').innerHTML = '';
  $('#go').disabled = true;

  let i = 0;
  const tick = setInterval(() => {
    steps.forEach((s, k) => { s.className = k < i ? 'done' : k === i ? 'on' : ''; });
    i = Math.min(i + 1, 3);
  }, 450);

  const fd = new FormData();
  fd.append('image', picked);

  try {
    const r = await fetch('/api/predict', { method: 'POST', body: fd });
    const d = await r.json();
    await new Promise(r => setTimeout(r, 1500));
    if (!r.ok) throw Error(d.error || 'Something went wrong.');

    const c = d.top[0].confidence;

    if (!d.art) {
      $('#result').innerHTML = `<div class="res">
        ${d.mock ? '<span class="badge">DEMO / MOCK PREDICTION: not a real model result</span>' : ''}
        <p>This doesn't appear to be a traditional Indian art form.</p>
        <p class="note">Try uploading a clear photo of a painting, textile, sculpture or artwork in one of the styles HeritageLens recognizes: ${SUPPORTED}.</p>
      </div>`;
    } else {
      const a = d.art;
      const low = (!d.mock && c < 50)
        ? `<p class="note">Low confidence: the model is not sure. This may be an art form it has not learned yet. It currently recognizes ${SUPPORTED}.</p>`
        : '';
      const others = d.top.slice(1).filter(t => t.id !== 'other').map(t => ARTS.find(x => x.id === t.id).name + ' ' + t.confidence + '%');

      $('#result').innerHTML = `<div class="res">
        ${d.mock ? '<span class="badge">DEMO / MOCK PREDICTION: not a real model result</span>' : ''}
        <p>Detected art form</p><h3>${a.name}</h3><p>Confidence: ${c}%</p>
        <div class="bar"><i style="width:${c}%"></i></div>
        ${low}
        ${others.length ? `<p>Other candidates: ${others.join(', ')}</p>` : ''}
        ${info(a)}</div>`;

      const h = JSON.parse(localStorage.getItem('hl_hist') || '[]');
      h.unshift({ id: a.id, name: a.name, conf: c, mock: d.mock });
      localStorage.setItem('hl_hist', JSON.stringify(h.slice(0, 8)));
      history();
    }
  } catch (e) {
    $('#err').textContent = e.message;
  } finally {
    clearInterval(tick);
    steps.forEach(s => s.className = 'done');
    $('#go').disabled = false;
  }
}

(async () => {
  ARTS = await (await fetch('/api/arts')).json();
  const m = await (await fetch('/api/status')).json();
  if (m.mode === 'demo') $('#modebar').innerHTML = '<p class="note">Demo mode: no trained model found, so results are placeholders. See the README to train and plug in a real model.</p>';

  [['#fr', 'region'], ['#ft', 'technique']].forEach(([s, k]) =>
    [...new Set(ARTS.map(a => a[k]))].sort().forEach(v => $(s).add(new Option(v, v))));
  ['#q', '#fr', '#ft'].forEach(s => $(s).oninput = renderCards);
  renderCards();
  history();

  $('#learnGrid').innerHTML = ARTS.map(a => `<div class="res"><h3>${a.name}</h3><p>${a.facts[0]}</p><p><b>Technique:</b> ${a.techniques[0]}.</p><small>${a.region}</small></div>`).join('');

  const d = $('#drop'), f = $('#file');
  d.onclick = () => f.click();
  d.onkeydown = e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), f.click());
  f.onchange = () => pick(f.files[0]);
  d.ondragover = e => { e.preventDefault(); d.classList.add('over'); };
  d.ondragleave = () => d.classList.remove('over');
  d.ondrop = e => { e.preventDefault(); d.classList.remove('over'); pick(e.dataTransfer.files[0]); };
  $('#go').onclick = analyze;
    $('#reset').onclick = resetUpload;
  route();
})();

addEventListener('hashchange', route);

// ===== Dynasties & Heritage =====
let DYNASTIES = [], TEMPLES = [];

function bindListCards(root, list, fn) {
  root.querySelectorAll('.card').forEach(c => {
    const f = () => fn(list.find(x => x.id === c.dataset.id));
    c.onclick = f;
    c.onkeydown = e => e.key === 'Enter' && f();
  });
}

function dynImage(d) {
  if (d.image) return d.image;
  const linked = TEMPLES.find(t => t.dynasty === d.id && t.image);
  return linked ? linked.image : null;
}

function dynCard(d) {
  const img = dynImage(d);
  const t = img
    ? `background-image:url('${img}');background-size:cover;background-position:center`
    : `background:linear-gradient(135deg,var(--madder),var(--gold))`;
  return `<div class="card dyn-card" tabindex="0" data-id="${d.id}">
    <div class="tile" style="${t}"></div>
    <div class="b"><h3>${d.name}</h3><span class="period">${d.period}</span>
    <small>${d.region}</small></div></div>`;
}

function templeCard(t) {
  const tl = t.image
    ? `background-image:url('${t.image}');background-size:cover;background-position:center`
    : `background:linear-gradient(135deg,var(--teal),var(--gold))`;
  return `<div class="card temple-card" tabindex="0" data-id="${t.id}">
    <div class="tile" style="${tl}"></div>
    <div class="b"><h3>${t.name}</h3><span class="period">${t.period}</span>
    <small>${t.location}</small></div></div>`;
}

function sourcesBlock(sources) {
  return sources && sources.length ? `<div class="src"><b>Sources:</b> ${sources.join(', ')}</div>` : '';
}

function showTempleDetail(t) { location.hash = 'temple/' + t.id; }
function showDynastyDetail(d) { location.hash = 'dynasty/' + d.id; }

function renderDynastyPage(id) {
  if (!DYNASTIES.length || !TEMPLES.length) { setTimeout(() => renderDynastyPage(id), 150); return; }
  const d = DYNASTIES.find(x => x.id === id);
  if (!d) return;
  const img = dynImage(d);
  $('#dynastyHero').style.backgroundImage = img ? `url('${img}')` : 'linear-gradient(135deg,#9b2335,#e6a72b)';
  $('#dynTitle').textContent = d.name;
  $('#dynPeriod').textContent = d.period;
  const linkedTemples = TEMPLES.filter(t => t.dynasty === d.id);
  $('#dynastyPageBody').innerHTML = `
    <div class="cols">
      <div>
        <h4>Region</h4><p>${d.region}</p>
        <h4>Capital</h4><p>${d.capital}</p>
        <h4>Important rulers</h4><ul class="t">${li(d.rulers)}</ul>
      </div>
      <div>
        <h4>Cultural contributions</h4><ul class="t">${li(d.contributions)}</ul>
        <h4>Architecture style</h4><p>${d.architecture}</p>
        <h4>Art forms</h4><ul class="t">${li(d.artForms)}</ul>
      </div>
    </div>
    <p>${d.intro}</p>
    <h3>Major temples &amp; heritage sites</h3>
    <div class="grid small" id="linkedTemples">
      ${linkedTemples.length ? linkedTemples.map(templeCard).join('') : '<p>No linked temples in the database yet for this dynasty.</p>'}
    </div>`;
  bindListCards(document.getElementById('linkedTemples'), TEMPLES, t => location.hash = 'temple/' + t.id);
}

function renderTemplePage(id) {
  if (!TEMPLES.length || !DYNASTIES.length) { setTimeout(() => renderTemplePage(id), 150); return; }
  const t = TEMPLES.find(x => x.id === id);
  if (!t) return;
  const dyn = DYNASTIES.find(d => d.id === t.dynasty);
  $('#templeHero').style.backgroundImage = t.image ? `url('${t.image}')` : 'linear-gradient(135deg,#3fb7b0,#e6a72b)';
  $('#templeTitle').textContent = t.name;
  $('#templePeriod').textContent = t.period;
  $('#templePageBody').innerHTML = `
    <div class="cols">
      <div>
        <h4>Location</h4><p>${t.location}, ${t.state}</p>
        <h4>Associated dynasty</h4><p>${dyn ? dyn.name : t.dynasty}</p>
        <h4>Patron / builder</h4><p>${t.patron}</p>
        <h4>Architecture style</h4><p>${t.style}</p>
      </div>
      <div>
        <h4>Art forms</h4><ul class="t">${li(t.artForms)}</ul>
        <h4>Cultural traditions</h4><ul class="t">${li(t.traditions || [])}</ul>
        ${t.heritageStatus ? `<h4>Heritage status</h4><p>${t.heritageStatus}</p>` : ''}
      </div>
    </div>
    <h4>Story &amp; historical significance</h4><p>${t.story}</p>
    ${t.legend ? `<div class="legend-box"><b>Legend / local tradition (not confirmed historical fact):</b> ${t.legend}</div>` : ''}
    ${sourcesBlock(t.sources)}`;
  document.getElementById('templeBack').onclick = () => location.hash = dyn ? ('dynasty/' + dyn.id) : '#dynasties';
}

function renderTimeline() {
  const q = ($('#hq').value || '').toLowerCase();
  const era = $('#hera').value;

  const matchesTemple = (d) => TEMPLES.some(t => t.dynasty === d.id &&
    (t.name + t.location + t.state + t.patron + t.artForms.join(' ')).toLowerCase().includes(q));

  const list = DYNASTIES.filter(d => (!era || d.era === era) && (
    !q ||
    (d.name + d.period + d.region + d.capital + d.rulers.join(' ') + d.artForms.join(' ') + d.architecture).toLowerCase().includes(q) ||
    matchesTemple(d)
  ));

  $('#dynastyTimeline').innerHTML = list.map(dynCard).join('') || '<p>No dynasties, temples or rulers match. Try a different search.</p>';
  bindListCards($('#dynastyTimeline'), DYNASTIES, showDynastyDetail);
}

(async () => {
  DYNASTIES = await (await fetch('/api/dynasties')).json();
  TEMPLES = await (await fetch('/api/temples')).json();

  document.getElementById('dynBack').onclick = () => location.hash = '#dynasties';
  [...new Set(DYNASTIES.map(d => d.era))].forEach(e => $('#hera').add(new Option(e, e)));
  $('#hq').oninput = renderTimeline;
  $('#hera').onchange = renderTimeline;
  renderTimeline();
})();

// ===== Home page redesign =====
const HERO_SLIDES = [
  'images/heritage/brihadisvara.jpg',
  'images/heritage/kailasa.jpg',
  'images/heritage/vittala.jpg',
  'images/madhubani.jpg',
  'images/kalamkari.jpg'
];

function startHeroCarousel() {
  const el = $('#heroCarousel');
  if (!el) return;
  el.innerHTML = HERO_SLIDES.map(src => `<div class="slide" style="background-image:url('${src}')"></div>`).join('');
  const slides = [...el.querySelectorAll('.slide')];
  slides[0].classList.add('on');
  let i = 0;
  setInterval(() => {
    slides[i].classList.remove('on');
    i = (i + 1) % slides.length;
    slides[i].classList.add('on');
  }, 5000);
}

function dynastyStripItem(d) {
  return `<div class="dstrip-item" data-id="${d.id}">
    <h4>${d.name}</h4><span>${d.period}</span>
    <p>${(d.contributions && d.contributions[0]) || d.intro}</p></div>`;
}

function fillDynastyStrip() {
  const el = $('#dynastyStrip');
  if (!el || !DYNASTIES.length) return;
  el.innerHTML = DYNASTIES.map(dynastyStripItem).join('');
  el.querySelectorAll('.dstrip-item').forEach(c => {
    c.onclick = () => {
      const d = DYNASTIES.find(x => x.id === c.dataset.id);
      location.hash = 'dynasty/' + d.id;
    };
  });
}

function treasureCard(item) {
  return `<div class="tcard"><div class="tbg" style="background-image:url('${item.img}')"></div>
    <div class="tb"><h3>${item.name}</h3><small>${item.loc}</small>
    <div><a class="disc" href="${item.href}">Discover</a></div></div></div>`;
}

function fillTreasureCards() {
  const el = $('#treasureCards');
  if (!el) return;
  const brihad = TEMPLES.find(t => t.id === 'brihadisvara');
  const items = [
    { name: 'Madhubani Art', loc: 'Bihar · Traditional Painting', img: 'images/madhubani.jpg', href: '#explore' },
    { name: 'Warli Art', loc: 'Maharashtra · Tribal Art', img: 'images/warli.jpg', href: '#explore' },
    { name: 'Brihadisvara Temple', loc: 'Tamil Nadu · Chola Architecture', img: (brihad && brihad.image) || 'images/heritage/brihadisvara.jpg', href: '#dynasties' },
    { name: 'Chennakeshava Temple', loc: 'Karnataka · Hoysala Architecture', img: 'images/heritage/chennakeshava.jpg', href: '#dynasties' },
    { name: 'Pattachitra', loc: 'Odisha · Traditional Painting', img: 'images/pattachitra.jpg', href: '#explore' }
  ];
  el.innerHTML = items.map(treasureCard).join('');
}

function setupScrollFadeIns() {
  const els = document.querySelectorAll('.fade-in');
  if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('show')); return; }
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('show'); });
  }, { threshold: 0.15 });
  els.forEach(e => obs.observe(e));
}

(function initHome() {
  startHeroCarousel();
  setupScrollFadeIns();
  const tryFill = setInterval(() => {
    if (DYNASTIES.length && TEMPLES.length) {
      fillDynastyStrip();
      fillTreasureCards();
      clearInterval(tryFill);
    }
  }, 200);
})();