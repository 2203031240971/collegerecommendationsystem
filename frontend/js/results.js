/* ═══════════════════════════════════════════════════════════════
   EDUMATCH — RESULTS PAGE JAVASCRIPT
   Professional college results engine with filtering, sorting,
   compare mode, AI insights, and expandable cards.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────
// Backend API endpoint (running on port 8000)
const API_BASE    = 'http://localhost:8000';
const STORAGE_KEY = 'edumatch_results';
const COMPARE_MAX = 3;

// ── App state ─────────────────────────────────────────────────────────────────
const state = {
  raw:         [],    // full results from API
  filtered:    [],    // results after filter/sort
  filter:      'all',
  sort:        'match_score',
  compareSet:  new Set(),   // college ids selected for compare
  studentData: null,
};

// ── Hardcoded demo results (when backend offline) ──────────────────────────────
const DEMO_RESULTS = {
  student_name: 'Demo Student',
  total_eligible: 8,
  results: [
    {id:1,name:'JNTU Hyderabad',location:'Hyderabad',courses:['B.Tech CSE','B.Tech ECE','B.Tech Mech','B.Tech AI & ML'],fee_per_year:80000,placement_avg:6.5,rating:4.2,college_type:'government',accreditation:'NAAC A+',match_score:84.5,admission_chance:'89%',marks_buffer:12,category:'Safe',cutoff_marks:75},
    {id:8,name:'Mahindra University',location:'Hyderabad',courses:['B.Tech CSE','B.Tech AI & ML','B.Tech Data Science'],fee_per_year:350000,placement_avg:12.0,rating:4.6,college_type:'private',accreditation:'NAAC A+',match_score:78.2,admission_chance:'75%',marks_buffer:7,category:'Match',cutoff_marks:80},
    {id:5,name:'Vasavi College of Engineering',location:'Hyderabad',courses:['B.Tech CSE','B.Tech ECE','B.Tech IT'],fee_per_year:110000,placement_avg:7.2,rating:4.3,college_type:'private',accreditation:'NAAC A',match_score:74.0,admission_chance:'82%',marks_buffer:10,category:'Safe',cutoff_marks:72},
    {id:18,name:'Anurag University',location:'Hyderabad',courses:['B.Tech CSE','B.Tech AI & ML','B.Tech Data Science'],fee_per_year:130000,placement_avg:5.5,rating:4.0,college_type:'private',accreditation:'NAAC A',match_score:68.5,admission_chance:'78%',marks_buffer:7,category:'Match',cutoff_marks:60},
    {id:3,name:'BITS Pilani Hyderabad',location:'Hyderabad',courses:['B.Tech CSE','B.Tech ECE','B.Pharm'],fee_per_year:430000,placement_avg:14.0,rating:4.8,college_type:'private',accreditation:'NAAC A+',match_score:62.0,admission_chance:'45%',marks_buffer:2,category:'Reach',cutoff_marks:90},
  ],
  filters_applied:{stream:'MPC',marks:87,budget:500000,location:'Hyderabad'},
};

// ── DOM Ready ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadResults();
  initBackTop();
  initNavbarScroll();
});

// ── Load & initialise ──────────────────────────────────────────────────────────
function loadResults() {
  // Try localStorage first (set by the form page on submit)
  const stored = localStorage.getItem(STORAGE_KEY);
  let payload = null;

  if (stored) {
    try { payload = JSON.parse(stored); } catch (_) {}
  }

  if (!payload) {
    // Fallback: demo mode so the page always works
    payload = DEMO_RESULTS;
    showToast('ℹ️ Showing demo results — fill the form to get real matches', 'info', 6000);
  }

  state.raw         = payload.results || [];
  state.studentData = payload;

  renderHeader(payload);
  renderProfilePill(payload.filters_applied || {});
  renderSummaryStats();
  renderAITip();

  // Show AI-powered toast
  if (payload.ai_powered) {
    showToast('🤖 AI searched the internet for your matched colleges!', 'success', 5000);
  }

  // Show any backend message (e.g. budget relaxed notice)
  if (payload.message && !payload.ai_powered) {
    showToast(payload.message, 'info', 6000);
  }

  // Skeleton → cards transition
  setTimeout(() => {
    document.getElementById('skeletonWrap').style.display = 'none';
    applyFilterAndSort();
  }, 600);
}

// ── Header ─────────────────────────────────────────────────────────────────────
function renderHeader(payload) {
  const name = payload.student_name || 'Student';

  // Avatar initial
  document.getElementById('greetingAvatar').textContent = name[0].toUpperCase();

  // Name
  document.getElementById('greetingName').textContent = name + '\'s Matches';

  // Page title
  document.title = `${name}'s College Matches — EduMatch`;
}

function renderProfilePill(filters) {
  const marks = filters.marks ? `📊 ${filters.marks}%` : null;
  const stream = filters.stream ? `📚 ${filters.stream}` : null;
  const loc   = filters.location && filters.location.toLowerCase() !== 'any' ? `📍 ${filters.location}` : null;
  const budget = filters.budget ? `💰 ₹${(filters.budget/1000).toFixed(0)}K budget` : null;

  const chips = [marks, stream, loc, budget].filter(Boolean);
  const ids   = ['chipMarks','chipStream','chipLocation','chipBudget'];
  ids.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el && chips[i]) el.textContent = chips[i];
    else if (el) el.style.display = 'none';
  });
}

// ── Summary stats ─────────────────────────────────────────────────────────────
function renderSummaryStats() {
  const results = state.raw;
  const safe     = results.filter(r => r.category === 'Safe').length;
  const match    = results.filter(r => r.category === 'Match').length;
  const topScore = results.length ? Math.max(...results.map(r => r.match_score)) : 0;
  const avgFee   = results.length
    ? Math.round(results.reduce((s,r) => s + r.fee_per_year, 0) / results.length)
    : 0;

  setStatVal('statTotal',  results.length, '');
  setStatVal('statSafe',   safe,  '');
  setStatVal('statMatch',  match, '');
  setStatVal('statTop',    topScore.toFixed(1) + '%', '');
  setStatVal('statBudget', '₹' + fmtLakh(avgFee), '');

  // Apply colour classes
  document.querySelector('#statSafe  .stat-val').className  = 'stat-val safe';
  document.querySelector('#statMatch .stat-val').className  = 'stat-val match';
  document.querySelector('#statTop   .stat-val').className  = 'stat-val top';
  document.querySelector('#statBudget .stat-val').className = 'stat-val budget';
}

function setStatVal(id, val, suffix) {
  const el = document.querySelector(`#${id} .stat-val`);
  if (el) el.textContent = val + suffix;
}

// ── AI banner tip ─────────────────────────────────────────────────────────────
function renderAITip() {
  const results = state.raw;
  const filters  = state.studentData?.filters_applied || {};
  const safe     = results.filter(r => r.category === 'Safe').length;
  const topScore = results.length ? Math.max(...results.map(r => r.match_score)) : 0;
  const topCollege = results[0]?.name || 'your top match';

  let tip = '';

  if (!results.length) {
    tip = '⚠️ No colleges matched your criteria. Try increasing your budget or checking your stream selection.';
  } else if (safe >= 3) {
    tip = `🎯 Great news! You have <strong>${safe} safe options</strong> — colleges where your marks comfortably clear the cutoff. Start your applications with ${topCollege} (${topScore.toFixed(0)}% match score) and explore the reach colleges for ambitious slots.`;
  } else if (safe >= 1) {
    tip = `✅ You have <strong>${safe} safe pick${safe>1?'s':''}</strong> to anchor your list. Apply early to ${topCollege} (${topScore.toFixed(0)}% match) while also shortlisting 1–2 reach colleges for higher-placement campuses.`;
  } else if (results.length > 0) {
    tip = `📈 These colleges require strong performance — your marks are close to the cutoff. Focus on <strong>${topCollege}</strong> and prepare well for entrance exams where applicable.`;
  } else {
    tip = `🔍 Widen your search by relaxing the budget filter or exploring colleges in nearby cities.`;
  }

  document.getElementById('aiTipText').innerHTML = tip;
}

// ── Filter & Sort ─────────────────────────────────────────────────────────────
function setFilter(f) {
  state.filter = f;

  // Update chip aria-pressed
  document.querySelectorAll('.chip').forEach(c => {
    c.classList.remove('active');
    c.setAttribute('aria-pressed', 'false');
  });

  const chipMap = {
    all:'chip-all', safe:'chip-safe', match:'chip-match',
    reach:'chip-reach', government:'chip-govt', private:'chip-priv'
  };
  const activeChip = document.getElementById(chipMap[f]);
  if (activeChip) {
    activeChip.classList.add('active');
    activeChip.setAttribute('aria-pressed', 'true');
  }

  applyFilterAndSort();
}

function applySort() {
  state.sort = document.getElementById('sortSelect').value;
  applyFilterAndSort();
}

function applyFilterAndSort() {
  let data = [...state.raw];

  // Filter
  if (state.filter !== 'all') {
    if (['safe','match','reach'].includes(state.filter)) {
      data = data.filter(r => r.category.toLowerCase() === state.filter);
    } else {
      data = data.filter(r => r.college_type === state.filter);
    }
  }

  // Sort
  const sort = state.sort;
  data.sort((a, b) => {
    if (sort === 'fee_per_year') return a.fee_per_year - b.fee_per_year;
    if (sort === 'admission_chance') return parseAdmit(b.admission_chance) - parseAdmit(a.admission_chance);
    if (sort === 'placement_avg')    return b.placement_avg - a.placement_avg;
    if (sort === 'rating')           return b.rating - a.rating;
    return b.match_score - a.match_score;
  });

  state.filtered = data;
  renderCards(data);
}

function parseAdmit(str) { return parseInt(str) || 0; }

// ── Render cards ──────────────────────────────────────────────────────────────
function renderCards(data) {
  const grid = document.getElementById('cardsGrid');
  const empty = document.getElementById('emptyState');

  if (!data.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  grid.innerHTML = data.map((c, i) => buildCard(c, i + 1)).join('');

  // Double-rAF: first frame schedules layout, second fires after paint
  // so width transitions actually animate instead of snapping.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      grid.querySelectorAll('.score-fill').forEach(el => {
        const w = el.dataset.width || '0';
        el.style.width = w + '%';
      });
    });
  });
}

// ── Build individual card ─────────────────────────────────────────────────────
function buildCard(c, rank) {
  const catClass  = c.category.toLowerCase();  // safe/match/reach
  const catColors = { Safe:'#10b981', Match:'#6366f1', Reach:'#f59e0b' };
  const catColor  = catColors[c.category] || '#6366f1';
  const admitPct  = parseAdmit(c.admission_chance);

  const icon = { government:'🏛️', private:'🏫', central:'🎓' }[c.college_type] || '🏫';

  const tags = buildTags(c);
  const insight = buildInsight(c);
  const aiCardTip = buildAICardTip(c);
  const courses = (c.courses || []).map(cr =>
    `<span class="course-pill">${cr}</span>`
  ).join('');

  const compareAdded = state.compareSet.has(c.id);

  return `
  <article class="college-card ${catClass}-card${c.over_budget ? ' over-budget-card' : ''}" id="card-${c.id}" aria-label="${c.name}">

    <!-- Rank badge -->
    <div class="card-rank" style="background:${catColor}">#${rank}</div>
    ${ c.over_budget ? '<div class="over-budget-badge">⚠️ Slightly Over Budget</div>' : '' }

    <!-- ── MAIN ROW ── -->
    <div class="card-main">

      <!-- Left: College info -->
      <div class="card-info">
        <div class="card-top-row">
          <div class="card-icon">${icon}</div>
          <div class="card-name-block">
            <h2 class="card-name">${c.name}</h2>
            <span class="card-location">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${c.location}
            </span>
          </div>
        </div>
        <div class="card-tags">${tags}</div>
      </div>

      <!-- Right: Score panel -->
      <div class="card-scores">

        <div class="score-block">
          <div class="score-label-row">
            <span class="score-label">Match Score</span>
            <span class="score-value match-val">${c.match_score}%</span>
          </div>
          <div class="score-track">
            <div class="score-fill match" data-width="${c.match_score}" style="width:0%"></div>
          </div>
        </div>

        <div class="score-block">
          <div class="score-label-row">
            <span class="score-label">Admission Chance</span>
            <span class="score-value admit-val">${c.admission_chance}</span>
          </div>
          <div class="score-track">
            <div class="score-fill admit" data-width="${admitPct}" style="width:0%"></div>
          </div>
        </div>

        <span class="card-cat-chip cat-${catClass}">
          ${ catClass==='safe' ? '✅ Safe' : catClass==='match' ? '🎯 Match' : '🚀 Reach' }
        </span>

      </div>
    </div>

    <!-- ── STATS STRIP ── -->
    <div class="card-stats" role="list" aria-label="${c.name} key statistics">
      <div class="cstat" role="listitem">
        <span class="cstat-lbl">Cutoff Marks</span>
        <span class="cstat-val">${c.cutoff_marks}%</span>
      </div>
      <div class="cstat" role="listitem">
        <span class="cstat-lbl">Fee / Year</span>
        <span class="cstat-val amber">
          ₹${fmtLakh(c.fee_per_year)}
          ${ c.over_budget ? '<span class="over-budget-tag">Over Budget</span>' : '' }
        </span>
      </div>
      <div class="cstat" role="listitem">
        <span class="cstat-lbl">Avg Package</span>
        <span class="cstat-val green">${c.placement_avg} LPA</span>
      </div>
      <div class="cstat" role="listitem">
        <span class="cstat-lbl">Rating</span>
        <span class="cstat-val">⭐ ${c.rating}/5</span>
      </div>
    </div>

    <!-- ── AI INSIGHT ── -->
    <div class="card-insight" aria-label="AI insight for ${c.name}">
      <span class="insight-spark">${ c.ai_tip ? '🤖' : '✨' }</span>
      <p class="insight-text">${ c.ai_tip || insight }</p>
    </div>

    <!-- ── ACTION ROW ── -->
    <div class="card-actions">
      <button class="btn-know" onclick="knowMore(${c.id})" aria-label="Know more about ${c.name}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        Know More
      </button>

      <button
        class="btn-compare${compareAdded ? ' added' : ''}"
        id="cmp-btn-${c.id}"
        onclick="toggleCompare(${c.id})"
        aria-label="${compareAdded ? 'Remove from' : 'Add to'} compare list"
        aria-pressed="${compareAdded}"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="7" height="7"/><rect x="15" y="3" width="7" height="7"/><rect x="15" y="14" width="7" height="7"/><rect x="2" y="14" width="7" height="7"/></svg>
        ${compareAdded ? 'Added ✓' : 'Compare'}
      </button>

      <button
        class="btn-expand"
        id="exp-btn-${c.id}"
        onclick="toggleExpand(${c.id})"
        aria-expanded="false"
        aria-controls="expand-${c.id}"
      >
        Courses & Details
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>

    <!-- ── EXPANDED SECTION ── -->
    <div class="card-expanded" id="expand-${c.id}" role="region" aria-label="${c.name} additional details">
      <div class="expanded-grid">

        <div class="exp-block">
          <p class="exp-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            Courses Offered
          </p>
          <div class="course-list">${courses}</div>
        </div>

        <div class="exp-block">
          <p class="exp-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            College Details
          </p>
          <div class="detail-list">
            <div class="detail-row">
              <span class="detail-key">Type</span>
              <span class="detail-val">${capitalise(c.college_type)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-key">Accreditation</span>
              <span class="detail-val">${c.accreditation || '—'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-key">Your marks buffer</span>
              <span class="detail-val">${c.marks_buffer > 0 ? '+' : ''}${c.marks_buffer} marks above cutoff</span>
            </div>
            <div class="detail-row">
              <span class="detail-key">Annual fee</span>
              <span class="detail-val">₹${c.fee_per_year.toLocaleString('en-IN')}</span>
            </div>
            <div class="detail-row">
              <span class="detail-key">Average placement</span>
              <span class="detail-val">${c.placement_avg} LPA</span>
            </div>
          </div>
        </div>

      </div>

      <!-- AI card-level tip -->
      <div class="ai-card-tip" aria-label="Personalised AI tip for ${c.name}">
        <div class="ai-card-tip-icon">🤖</div>
        <p class="ai-card-tip-text">${aiCardTip}</p>
      </div>
    </div>

  </article>
  `;
}

// ── Tag builder ───────────────────────────────────────────────────────────────
function buildTags(c) {
  const tags = [];

  // Category
  tags.push(`<span class="tag tag-${c.category.toLowerCase()}">${c.category}</span>`);

  // College type
  if (c.college_type === 'government' || c.college_type === 'central') {
    tags.push(`<span class="tag tag-govt">${c.college_type === 'central' ? 'Central Univ.' : 'Government'}</span>`);
  } else {
    tags.push(`<span class="tag tag-priv">Private</span>`);
  }

  // Accreditation
  if (c.accreditation && c.accreditation.includes('NAAC')) {
    tags.push(`<span class="tag tag-naac">${c.accreditation}</span>`);
  }

  // Low fee signal
  if (c.fee_per_year <= 60000) {
    tags.push(`<span class="tag tag-lowfee">Low Fees</span>`);
  }

  // High placement signal
  if (c.placement_avg >= 10) {
    tags.push(`<span class="tag tag-highplace">High Placements</span>`);
  }

  return tags.join('');
}

// ── Inline AI insight ─────────────────────────────────────────────────────────
function buildInsight(c) {
  const buf = c.marks_buffer;
  const name = c.name.split(' ')[0]; // short name e.g. "JNTU"

  if (c.category === 'Safe' && buf >= 15) {
    return `Your marks are <strong>${buf} points above</strong> ${name}'s cutoff — you have a very high admission probability. <strong>Apply confidently</strong> and submit early for merit seat priority.`;
  }
  if (c.category === 'Safe') {
    return `You're <strong>${buf} marks above</strong> the cutoff — a safe choice. ${c.college_type === 'government' ? 'Being a <strong>government college</strong>, fees are very affordable.' : `With a <strong>₹${fmtLakh(c.fee_per_year)} annual fee</strong>, confirm your budget fits.`}`;
  }
  if (c.category === 'Match') {
    return `Close match — you're <strong>${buf} marks above cutoff</strong>. Admission is likely but not guaranteed. Prepare strong documents and apply in the <strong>first counselling round</strong>.`;
  }
  if (c.category === 'Reach' && c.placement_avg >= 12) {
    return `This is a reach college, but the <strong>₹${c.placement_avg} LPA average package</strong> makes it worth trying. Your marks are ${Math.abs(buf)} points below cutoff — check if they offer entrance-exam based seats.`;
  }
  return `Your marks are <strong>${buf < 0 ? Math.abs(buf) + ' below' : buf + ' above'}</strong> the cutoff. ${c.category === 'Reach' ? 'Treat this as a stretch goal — apply alongside safer options.' : 'A solid application could get you a seat.'}`;
}

// ── Deep AI tip inside expanded card ─────────────────────────────────────────
function buildAICardTip(c) {
  const tips = {
    government: `As a <strong>government college</strong>, ${c.name} offers heavily subsidised education. Seat allocation is through official counselling (EAPCET/OSEAP) — register as soon as results are announced.`,
    private:    `Apply directly through ${c.name}'s official website. <strong>Shortlist 2–3 private colleges</strong> at the same time so you can compare scholarship offers and choose the best financial package.`,
    central:    `Central university admissions are often competitive. Check if they conduct a separate entrance test or use board marks directly — <strong>read the official prospectus</strong> before applying.`,
  };
  return tips[c.college_type] || `Research the specific admission process for ${c.name} on their official website. Apply in the earliest round to maximise merit seat chances.`;
}

// ── Toggle expand card ────────────────────────────────────────────────────────
function toggleExpand(id) {
  const section = document.getElementById(`expand-${id}`);
  const btn     = document.getElementById(`exp-btn-${id}`);
  if (!section) return;

  const isOpen = section.classList.contains('open');
  section.classList.toggle('open', !isOpen);
  btn.classList.toggle('open', !isOpen);
  btn.setAttribute('aria-expanded', String(!isOpen));
}

// ── Compare logic ─────────────────────────────────────────────────────────────
function toggleCompare(id) {
  if (state.compareSet.has(id)) {
    state.compareSet.delete(id);
    updateCompareBtnState(id, false);
    showToast('Removed from compare list', 'info');
  } else {
    if (state.compareSet.size >= COMPARE_MAX) {
      showToast(`⛔ Max ${COMPARE_MAX} colleges can be compared at once`, 'info');
      return;
    }
    state.compareSet.add(id);
    updateCompareBtnState(id, true);
    showToast(`✅ Added to compare (${state.compareSet.size}/${COMPARE_MAX})`, 'success');
  }
  updateCompareNavBadge();
}

function updateCompareBtnState(id, added) {
  const btn = document.getElementById(`cmp-btn-${id}`);
  if (!btn) return;
  btn.classList.toggle('added', added);
  btn.textContent = added ? 'Added ✓' : 'Compare';
  btn.setAttribute('aria-pressed', String(added));
  // Re-insert SVG icon
  const svg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="7" height="7"/><rect x="15" y="3" width="7" height="7"/><rect x="15" y="14" width="7" height="7"/><rect x="2" y="14" width="7" height="7"/></svg>`;
  btn.innerHTML = svg + (added ? ' Added ✓' : ' Compare');
}

function updateCompareNavBadge() {
  const el = document.getElementById('compareCount');
  if (el) el.textContent = state.compareSet.size;
}

function openComparePanel() {
  if (!state.compareSet.size) {
    showToast('Select colleges to compare using the Compare button on each card', 'info');
    return;
  }
  buildCompareTable();
  document.getElementById('comparePanel').style.display = 'block';
}

function closeComparePanel() {
  document.getElementById('comparePanel').style.display = 'none';
}

function buildCompareTable() {
  const ids = [...state.compareSet];
  const colleges = ids.map(id => state.raw.find(r => r.id === id)).filter(Boolean);

  if (!colleges.length) return;

  const rows = [
    { key: 'Location',    fn: c => c.location },
    { key: 'Type',        fn: c => capitalise(c.college_type) },
    { key: 'Accreditation', fn: c => c.accreditation || '—' },
    { key: 'Match Score', fn: c => c.match_score + '%' },
    { key: 'Admission Chance', fn: c => c.admission_chance },
    { key: 'Cutoff Marks', fn: c => c.cutoff_marks + '%' },
    { key: 'Fee / Year',  fn: c => '₹' + c.fee_per_year.toLocaleString('en-IN') },
    { key: 'Avg Package', fn: c => c.placement_avg + ' LPA' },
    { key: 'Rating',      fn: c => '⭐ ' + c.rating + '/5' },
    { key: 'Category',    fn: c => c.category },
  ];

  const headerRow = `<tr><th class="ct-label">Criteria</th>${colleges.map(c => `<th>${c.name}</th>`).join('')}</tr>`;
  const bodyRows  = rows.map(r =>
    `<tr><td class="ct-label">${r.key}</td>${colleges.map(c => `<td>${r.fn(c)}</td>`).join('')}</tr>`
  ).join('');

  document.getElementById('compareTable').innerHTML = headerRow + bodyRows;
}

// ── Know more action ──────────────────────────────────────────────────────────
function knowMore(id) {
  const college = state.raw.find(r => r.id === id);
  if (!college) return;
  showToast(`🔗 Deep-dive for ${college.name.split(' ')[0]} — coming soon!`, 'info', 3500);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtLakh(n) {
  if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
  if (n >= 1000)   return (n / 1000).toFixed(0) + 'K';
  return n.toString();
}

function capitalise(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '—';
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info', duration = 3000) {
  const shelf = document.getElementById('toastShelf');
  const t     = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  shelf.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 300);
  }, duration);
}

// ── Back to top ───────────────────────────────────────────────────────────────
function initBackTop() {
  const btn = document.getElementById('backTop');
  window.addEventListener('scroll', () => {
    btn.style.display = window.scrollY > 400 ? 'flex' : 'none';
  }, { passive: true });
}

// ── Navbar shadow on scroll ────────────────────────────────────────────────────
function initNavbarScroll() {
  const nav = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    nav.style.boxShadow = window.scrollY > 20
      ? '0 4px 32px rgba(0,0,0,0.5)'
      : 'none';
  }, { passive: true });
}
