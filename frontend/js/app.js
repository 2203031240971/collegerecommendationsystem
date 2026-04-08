/* =============================================
   EDUMATCH — JavaScript Application Logic
   ============================================= */

'use strict';

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  currentStep: 1,
  totalSteps: 3,
  formData: {}
};

// ─── DOM Ready ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initValidation();
  initMarksMeter();
  initBudgetCards();
  initForm();
  initCourseByClass();
});

// ─── Step Navigation ──────────────────────────────────────────────────────────
function goToStep(step) {
  // Validate current step before moving forward
  if (step > state.currentStep) {
    const isValid = validateStep(state.currentStep);
    if (!isValid) return;
  }

  // Hide current step
  const currentEl = document.getElementById(`step${state.currentStep}`);
  if (currentEl) {
    currentEl.classList.remove('active');
  }

  // Show new step with animation
  state.currentStep = step;
  const newEl = document.getElementById(`step${step}`);
  if (newEl) {
    newEl.style.animation = 'none';
    newEl.offsetHeight; // reflow
    newEl.style.animation = '';
    newEl.classList.add('active');
  }

  updateProgressBar();
  updateNavSteps();
  scrollToForm();
}

function scrollToForm() {
  const shell = document.querySelector('.form-shell');
  if (shell) {
    const offset = shell.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: offset, behavior: 'smooth' });
  }
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function updateProgressBar() {
  const pct = Math.round((state.currentStep / state.totalSteps) * 100);
  const fill = document.getElementById('progressFill');
  const pctEl = document.getElementById('progressPercent');
  const textEl = document.getElementById('progressText');

  if (fill) fill.style.width = `${pct}%`;
  if (pctEl) pctEl.textContent = `${pct}%`;

  const labels = [
    'Step 1 of 3 — Personal Information',
    'Step 2 of 3 — Academic Details',
    'Step 3 of 3 — Budget & Preferences'
  ];
  if (textEl) textEl.textContent = labels[state.currentStep - 1] || '';
}

// ─── Navbar Step Indicators ───────────────────────────────────────────────────
function updateNavSteps() {
  for (let i = 1; i <= state.totalSteps; i++) {
    const el = document.getElementById(`step-nav-${i}`);
    if (!el) continue;
    el.classList.remove('active', 'done');
    if (i === state.currentStep) el.classList.add('active');
    if (i < state.currentStep) el.classList.add('done');
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validateName(nameEl) {
  const name = nameEl.value.trim();
  const fg = nameEl.closest('.field-group');
  
  // Check minimum length
  if (name.length < 3) {
    showError('studentName', 'Full name must be at least 3 characters long.');
    return false;
  }
  
  // Check if name has at least 2 parts (first + last name)
  const parts = name.split(/\s+/).filter(p => p.length > 0);
  if (parts.length < 2) {
    showError('studentName', 'Please enter both first and last name (e.g., John Doe).');
    return false;
  }
  
  // Check if name contains only letters, spaces, and hyphens
  if (!/^[a-zA-Z\s\-']+$/.test(name)) {
    showError('studentName', 'Name should contain only letters, spaces, hyphens, and apostrophes.');
    return false;
  }
  
  // Check for excessive numbers or special characters
  if (/\d{2,}/.test(name)) {
    showError('studentName', 'Name appears to contain invalid characters.');
    return false;
  }
  
  clearError('studentName');
  markValid(fg, nameEl);
  return true;
}

function validateStep(step) {
  const rules = {
    1: [
      { id: 'studentName',  msg: 'Please enter your full name.', extra: validateName },
      { id: 'studentClass', msg: 'Please select your current class.' },
      { id: 'studentGender',msg: 'Please select your gender.' },
      { id: 'studentCaste', msg: 'Please select your category.' }
    ],
    2: [
      { id: 'studentCourse', msg: 'Please select a course you want to pursue.' },
      { id: 'studentMarks',  msg: 'Please enter your marks (0–100).', extra: validateMarks }
    ],
    3: [
      { id: null, custom: validateBudget }
    ]
  };

  const stepRules = rules[step] || [];
  let allValid = true;

  stepRules.forEach(rule => {
    if (rule.custom) {
      if (!rule.custom()) allValid = false;
      return;
    }
    const el = document.getElementById(rule.id);
    if (!el) return;
    const val = el.value.trim();
    const fg = el.closest('.field-group');

    if (!val) {
      showError(rule.id, rule.msg);
      allValid = false;
    } else if (rule.extra) {
      const extraOk = rule.extra(el, fg, rule);
      if (!extraOk) allValid = false;
    } else {
      clearError(rule.id);
      markValid(fg, el);
    }
  });

  return allValid;
}

function validateMarks(el) {
  const val = parseFloat(el.value);
  const fg = el.closest('.field-group');
  if (isNaN(val) || val < 0 || val > 100) {
    showError('studentMarks', 'Marks must be between 0 and 100.');
    return false;
  }
  clearError('studentMarks');
  markValid(fg, el);
  return true;
}

function validateBudget() {
  const selected  = document.querySelector('input[name="budgetRange"]:checked');
  const customVal = document.getElementById('studentBudget')?.value?.trim();
  
  if (!selected && !customVal) {
    showToast('Please select or enter your annual budget.', 'error');
    return false;
  }
  
  // If custom budget entered, check minimum
  if (customVal) {
    const budget = parseInt(customVal, 10);
    if (isNaN(budget) || budget < 15000) {
      showToast('⚠️ Minimum annual budget is Rs 15,000. Most colleges charge at least this much.', 'warning');
      return false;
    }
  }
  
  return true;
}

function showError(fieldId, msg) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  const fg = el.closest('.field-group');
  const errEl = document.getElementById(`err-${fieldId.replace('student','').toLowerCase()}`);
  if (fg) { fg.classList.add('error'); fg.classList.remove('valid'); }
  if (errEl) errEl.textContent = '⚠ ' + msg;

  // Shake animation
  if (el) {
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = 'shake 0.4s ease';
  }
}

function clearError(fieldId) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  const fg = el.closest('.field-group');
  const key = fieldId.replace('student','').toLowerCase();
  const errEl = document.getElementById(`err-${key}`);
  if (fg) { fg.classList.remove('error'); }
  if (errEl) errEl.textContent = '';
}

function markValid(fg, el) {
  if (fg) { fg.classList.add('valid'); fg.classList.remove('error'); }
  const key = el.id.replace('student','').toLowerCase();
  const check = document.getElementById(`check-${key}`);
  if (check) check.classList.add('show-valid');
}

// ─── Real-time Validation ─────────────────────────────────────────────────────
function initValidation() {
  const fields = ['studentName', 'studentClass', 'studentGender', 'studentCaste', 'studentCourse', 'studentMarks'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener('input', () => {
      const val = el.value.trim();
      if (val) {
        const fg = el.closest('.field-group');
        if (id === 'studentName') {
          // For name, validate with full rules on blur only or when specific validation triggered
          clearError(id);
          markValid(fg, el);
        } else if (id === 'studentMarks') {
          validateMarks(el);
        } else {
          clearError(id);
          markValid(fg, el);
        }
      }
    });

    el.addEventListener('blur', () => {
      const val = el.value.trim();
      if (val && id === 'studentName') {
        // Full name validation on blur
        validateName(el);
      } else if (val && id === 'studentMarks') {
        validateMarks(el);
      }
    });

    el.addEventListener('change', () => {
      const val = el.value.trim();
      if (val) {
        clearError(id);
        markValid(el.closest('.field-group'), el);
      }
    });
  });

  // Add shake keyframe
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes shake {
      0%,100%{transform:translateX(0)}
      20%{transform:translateX(-6px)}
      40%{transform:translateX(6px)}
      60%{transform:translateX(-4px)}
      80%{transform:translateX(4px)}
    }
  `;
  document.head.appendChild(styleEl);
}

// ─── Dynamic Course Options Based on Class ────────────────────────────────────
/**
 * Course catalogue keyed by class group:
 *   'inter'  → for Class 9 & 10 (choosing next step)
 *   'stream' → for Class 11 (already in a stream)
 *   'degree' → for Class 12, Diploma, Other (choosing degree)
 */
const COURSE_CATALOGUE = {
  inter: [
    {
      group: 'Science Streams (Intermediate / +2)',
      options: [
        { val: 'mpc',        label: 'MPC — Maths, Physics, Chemistry' },
        { val: 'bipc',       label: 'BiPC — Biology, Physics, Chemistry' },
        { val: 'mbipc',      label: 'M BiPC — Maths, Biology, Physics, Chemistry' },
        { val: 'mpcs',       label: 'MPCS — Maths, Physics, Computer Science' },
        { val: 'mec',        label: 'MEC — Maths, Economics, Commerce' },
      ]
    },
    {
      group: 'Commerce Streams (Intermediate / +2)',
      options: [
        { val: 'cec',        label: 'CEC — Commerce, Economics, Civics' },
        { val: 'hec',        label: 'HEC — History, Economics, Civics' },
        { val: 'commerce-math', label: 'Commerce with Mathematics' },
      ]
    },
    {
      group: 'Arts / Humanities Streams (Intermediate / +2)',
      options: [
        { val: 'arts-general', label: 'Arts — General Humanities' },
        { val: 'arts-lang',    label: 'Arts with Languages (Telugu / Hindi / Urdu)' },
        { val: 'home-science', label: 'Home Science' },
        { val: 'fine-arts',    label: 'Fine Arts / Music / Dance' },
      ]
    },
    {
      group: 'Vocational / Other',
      options: [
        { val: 'voc-agri',  label: 'Vocational — Agriculture' },
        { val: 'voc-it',    label: 'Vocational — Information Technology' },
        { val: 'other',     label: 'Other / Not Listed' },
      ]
    }
  ],
  degree: [
    {
      group: 'Engineering & Technology',
      options: [
        { val: 'btech-cs',   label: 'B.Tech — Computer Science & Engineering' },
        { val: 'btech-it',   label: 'B.Tech — Information Technology' },
        { val: 'btech-mech', label: 'B.Tech — Mechanical Engineering' },
        { val: 'btech-civil',label: 'B.Tech — Civil Engineering' },
        { val: 'btech-eee',  label: 'B.Tech — Electrical & Electronics' },
        { val: 'btech-ai',   label: 'B.Tech — Artificial Intelligence & ML' },
        { val: 'btech-data', label: 'B.Tech — Data Science' },
      ]
    },
    {
      group: 'Medical & Health Sciences',
      options: [
        { val: 'mbbs',        label: 'MBBS — Bachelor of Medicine' },
        { val: 'bds',         label: 'BDS — Bachelor of Dental Surgery' },
        { val: 'bpharm',      label: 'B.Pharm — Bachelor of Pharmacy' },
        { val: 'bsc-nursing', label: 'B.Sc Nursing' },
      ]
    },
    {
      group: 'Management & Commerce',
      options: [
        { val: 'bba',  label: 'BBA — Bachelor of Business Administration' },
        { val: 'bcom', label: 'B.Com — Bachelor of Commerce' },
        { val: 'mba',  label: 'MBA — Master of Business Administration' },
      ]
    },
    {
      group: 'Science & Arts',
      options: [
        { val: 'bsc',    label: 'B.Sc — Bachelor of Science' },
        { val: 'ba',     label: 'BA — Bachelor of Arts' },
        { val: 'bca',    label: 'BCA — Bachelor of Computer Applications' },
        { val: 'bsc-it', label: 'B.Sc — Information Technology' },
      ]
    },
    {
      group: 'Law & Architecture',
      options: [
        { val: 'llb',   label: 'LLB — Bachelor of Laws' },
        { val: 'barch', label: 'B.Arch — Bachelor of Architecture' },
      ]
    },
    {
      group: 'Other',
      options: [
        { val: 'other', label: 'Other / Not Listed' },
      ]
    }
  ]
};

function initCourseByClass() {
  const classEl = document.getElementById('studentClass');
  if (!classEl) return;
  classEl.addEventListener('change', () => updateCourseOptions(classEl.value));
}

function updateCourseOptions(classVal) {
  const courseEl   = document.getElementById('studentCourse');
  const labelEl    = document.getElementById('courseLabelText');
  const hintEl     = document.getElementById('courseFieldHint');
  const bannerEl   = document.getElementById('courseContextBanner');
  const bannerText = document.getElementById('courseContextText');
  if (!courseEl) return;

  // Determine which catalogue to use
  const isInter  = (classVal === '9' || classVal === '10');
  const isStream = (classVal === '11');
  const catalogue = (isInter || isStream) ? COURSE_CATALOGUE.inter : COURSE_CATALOGUE.degree;

  // Update label & hint
  if (isInter) {
    if (labelEl) labelEl.textContent = 'Intermediate Stream You Want to Join';
    if (hintEl)  hintEl.textContent  = 'Choose the stream you plan to study in Class 11 & 12.';
    if (bannerEl) bannerEl.style.display = 'flex';
    if (bannerText) bannerText.textContent =
      `Since you're in Class ${classVal}, pick the Intermediate stream you'd like to join after your board exams.`;
  } else if (isStream) {
    if (labelEl) labelEl.textContent = 'Your Current Intermediate Stream';
    if (hintEl)  hintEl.textContent  = 'Select the stream you are currently studying in Class 11.';
    if (bannerEl) bannerEl.style.display = 'flex';
    if (bannerText) bannerText.textContent =
      'You are in Class 11 — select your current stream so we can recommend the right degree courses.';
  } else {
    if (labelEl) labelEl.textContent = 'Desired Degree Course';
    if (hintEl)  hintEl.textContent  = 'Choose the primary degree programme you want to pursue after Class 12.';
    if (bannerEl) bannerEl.style.display = 'none';
  }

  // Rebuild <select> options
  const prevVal = courseEl.value;
  courseEl.innerHTML = `<option value="" disabled selected>Select the ${isInter || isStream ? 'stream' : 'course'} you want</option>`;

  catalogue.forEach(section => {
    const grp = document.createElement('optgroup');
    grp.label = section.group;
    section.options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.val;
      o.textContent = opt.label;
      grp.appendChild(o);
    });
    courseEl.appendChild(grp);
  });

  // Restore selection if still valid
  if (prevVal && courseEl.querySelector(`option[value="${prevVal}"]`)) {
    courseEl.value = prevVal;
  }

  // Reset validation state on the field
  const fg = courseEl.closest('.field-group');
  if (fg) { fg.classList.remove('valid', 'error'); }
  const check = document.getElementById('check-course');
  if (check) check.classList.remove('show-valid');
  const errEl = document.getElementById('err-course');
  if (errEl) errEl.textContent = '';
}

// ─── Marks Meter ─────────────────────────────────────────────────────────────
function initMarksMeter() {
  const marksEl = document.getElementById('studentMarks');
  if (!marksEl) return;

  marksEl.addEventListener('input', () => {
    const val = parseFloat(marksEl.value);
    updateMeter(val);
  });
}

function updateMeter(val) {
  const fill   = document.getElementById('meterFill');
  const badge  = document.getElementById('meterBadge');
  const card   = document.getElementById('marksMeterCard');

  if (!fill || !badge) return;

  if (isNaN(val) || val === '') {
    fill.style.width = '0%';
    badge.textContent = 'Enter marks above';
    badge.style.cssText = '';
    card?.classList.remove('active');
    return;
  }

  const pct = Math.min(Math.max(val, 0), 100);
  fill.style.width = `${pct}%`;
  card?.classList.add('active');

  let label = '', color = '';
  if (pct < 35)      { label = '❌ Below Pass (< 35%)'; color = '#f43f5e'; }
  else if (pct < 50) { label = '⚠️ Pass Level (35–50%)'; color = '#f59e0b'; }
  else if (pct < 60) { label = '📘 Average (50–60%)'; color = '#f59e0b'; }
  else if (pct < 75) { label = '📗 Good (60–75%)'; color = '#10b981'; }
  else if (pct < 90) { label = '🌟 Very Good (75–90%)'; color = '#6366f1'; }
  else               { label = '🏆 Excellent (90–100%)'; color = '#8b5cf6'; }

  badge.textContent = label;
  badge.style.background = `${color}22`;
  badge.style.color = color;
  badge.style.border = `1px solid ${color}44`;

  // Update fill color dynamically based on score
  if (pct < 35)      fill.style.background = 'linear-gradient(90deg, #f43f5e, #fb7185)';
  else if (pct < 60) fill.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
  else if (pct < 75) fill.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
  else               fill.style.background = 'linear-gradient(90deg, #6366f1, #8b5cf6)';
}

// ─── Budget Card Interactions ─────────────────────────────────────────────────
function initBudgetCards() {
  const radios = document.querySelectorAll('input[name="budgetRange"]');
  const customInput = document.getElementById('studentBudget');

  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      // Map range to midpoint value
      const ranges = {
        '0-50000':       25000,
        '50000-150000':  100000,
        '150000-400000': 275000,
        '400000+':       600000
      };
      if (customInput) customInput.value = ranges[radio.value] || '';
    });
  });

  // Deselect radio if user manually types a custom budget
  if (customInput) {
    customInput.addEventListener('input', () => {
      radios.forEach(r => { r.checked = false; });
    });
  }
}

// ─── Form Submit ──────────────────────────────────────────────────────────────
function initForm() {
  const form = document.getElementById('studentForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    collectFormData();
    // Show profile review before submitting
    showProfileReviewModal();
  });
}

function collectFormData() {
  state.formData = {
    name:        document.getElementById('studentName')?.value?.trim() || '',
    class:       document.getElementById('studentClass')?.value || '',
    gender:      document.getElementById('studentGender')?.value || '',
    caste:       document.getElementById('studentCaste')?.value || '',
    course:      document.getElementById('studentCourse')?.value || '',
    marks:       document.getElementById('studentMarks')?.value || '',
    board:       document.getElementById('studentBoard')?.value || '',
    budgetRange: document.querySelector('input[name="budgetRange"]:checked')?.value || '',
    budgetCustom:document.getElementById('studentBudget')?.value || '',
    location:    document.getElementById('locationPref')?.value || '',
    collegeTypes: [...document.querySelectorAll('input[name="collegeType"]:checked')].map(c => c.value)
  };
}

// ─── Backend API ──────────────────────────────────────────────────────────────
// Backend API endpoint (running on port 8000)
const API_BASE    = 'http://localhost:8000';
const STORAGE_KEY = 'edumatch_results';

// Map location select values (state names) → city strings the engine knows
const LOCATION_MAP = {
  telangana: 'Hyderabad',
  andhra:    'Visakhapatnam',
  karnataka: 'Bangalore',
  tamilnadu: 'Chennai',
  kerala:    'Kochi',
  maharashtra:'Mumbai',
  gujarat:   'Ahmedabad',
  delhi:     'Delhi',
  rajasthan: 'Jaipur',
  up:        'Lucknow',
  haryana:   'Gurgaon',
  punjab:    'Chandigarh',
  wb:        'Kolkata',
  odisha:    'Bhubaneswar',
  bihar:     'Patna',
  mp:        'Bhopal',
  cg:        'Raipur',
  goa:       'Panaji',
  any:       '',
  '':        '',
};

async function submitForm() {
  const btn = document.getElementById('submitBtn');
  if (btn) {
    btn.classList.add('loading');
    btn.querySelector('svg')?.remove();
    btn.textContent = 'Finding colleges…';
  }

  const fd = state.formData;

  // Map state name → city the engine knows
  const rawLoc  = fd.location || '';
  const cityLoc = LOCATION_MAP[rawLoc.toLowerCase()] !== undefined
    ? LOCATION_MAP[rawLoc.toLowerCase()]
    : rawLoc || 'Hyderabad';

  // Parse budget safely (avoid NaN from empty string)
  const customBudget = fd.budgetCustom ? parseInt(fd.budgetCustom, 10) : null;

  const payload = {
    name:          fd.name,
    student_class: fd.class,
    gender:        fd.gender || null,
    course:        fd.course,
    marks:         parseFloat(fd.marks),
    board:         fd.board || null,
    caste:         fd.caste || null,
    budget_range:  fd.budgetRange  || null,
    budget_custom: (customBudget && !isNaN(customBudget)) ? String(customBudget) : null,
    location:      cityLoc || 'Hyderabad',
    college_types: fd.collegeTypes?.length ? fd.collegeTypes : null,
    interests:     []
  };

  try {
    const res  = await fetch(`${API_BASE}/recommend`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`Server error ${res.status}`);

    const data = await res.json();

    // ── Save to localStorage and redirect to results page ──
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.location.href = 'results.html';

  } catch (err) {
    console.warn('Backend unavailable — redirecting with form data only:', err.message);

    // Save minimal fallback so results page shows an offline notice
    const fallback = {
      student_name:    fd.name,
      total_eligible:  0,
      results:         [],
      filters_applied: {
        marks:    parseFloat(fd.marks),
        stream:   fd.course,
        location: fd.location || 'Hyderabad',
        budget:   parseInt(fd.budgetCustom || 200000)
      },
      _offline: true
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
    window.location.href = 'results.html';

  } finally {
    if (btn) btn.classList.remove('loading');
  }
}

// ─── Success Screen ───────────────────────────────────────────────────────────
function showSuccessScreen() {
  const screen = document.getElementById('successScreen');
  if (!screen) return;

  const fd = state.formData;

  // ── Student summary card ──────────────────────────────────────────────────
  const summaryCard = document.getElementById('summaryCard');
  if (summaryCard) {
    const budget = fd.budgetCustom
      ? `₹${parseInt(fd.budgetCustom).toLocaleString('en-IN')} / year`
      : (fd.budgetRange ? formatBudgetRange(fd.budgetRange) : 'Not specified');

    const rows = [
      { key: 'Name',     val: fd.name || '—' },
      { key: 'Class',    val: formatClass(fd.class) },
      { key: 'Category', val: formatCaste(fd.caste) },
      { key: 'Course',   val: formatCourse(fd.course) },
      { key: 'Marks',    val: fd.marks ? `${fd.marks}%` : '—' },
      { key: 'Budget',   val: budget },
      { key: 'Location', val: fd.location || 'All India' },
    ];

    summaryCard.innerHTML = rows.map(r => `
      <div class="summary-row">
        <span class="summary-key">${r.key}</span>
        <span class="summary-val">${r.val}</span>
      </div>
    `).join('');
  }

  // ── Render college cards from API result ──────────────────────────────────
  const resultsArea = document.getElementById('resultsArea');
  if (resultsArea) {
    const api = state.apiResult;

    if (api && api.results && api.results.length > 0) {
      // Show eligibility count
      const countBadge = api.total_eligible > api.results.length
        ? `<p class="results-count">✅ Showing top ${api.results.length} of <strong>${api.total_eligible}</strong> eligible colleges</p>`
        : `<p class="results-count">✅ <strong>${api.results.length}</strong> college${api.results.length > 1 ? 's' : ''} matched your profile</p>`;

      resultsArea.innerHTML = countBadge + api.results.map((c, i) => buildCollegeCard(c, i + 1)).join('');

    } else if (api && api.message) {
      resultsArea.innerHTML = `
        <div class="results-empty">
          <div class="empty-icon">🔍</div>
          <h3>No Colleges Found</h3>
          <p>${api.message}</p>
          <button class="btn-primary" onclick="restartForm()">← Try Again</button>
        </div>`;

    } else {
      // Offline / demo mode – show placeholder cards
      resultsArea.innerHTML = demoDraftCards();
    }
  }

  screen.classList.add('visible');
  showToast('🎉 Recommendations ready! Scroll to see your colleges.', 'success');

  const fill = document.getElementById('progressFill');
  const pct  = document.getElementById('progressPercent');
  if (fill) fill.style.width = '100%';
  if (pct)  pct.textContent = '100%';
}

// ─── College Card Builder ──────────────────────────────────────────────────────
function buildCollegeCard(c, rank) {
  const categoryColors = { Safe: '#10b981', Match: '#6366f1', Reach: '#f59e0b' };
  const catColor = categoryColors[c.category] || '#6366f1';
  const typeIcon = { government: '🏛️', private: '🏫', central: '🎓' };
  const icon = typeIcon[c.college_type] || '🏫';

  const courses = c.courses.slice(0, 3).join(' &bull; ') + (c.courses.length > 3 ? ` <em>+${c.courses.length - 3} more</em>` : '');

  return `
    <div class="college-card" style="--cat-color:${catColor}" aria-label="${c.name}">
      <div class="cc-rank">${rank}</div>

      <div class="cc-header">
        <div class="cc-icon">${icon}</div>
        <div class="cc-title-block">
          <h3 class="cc-name">${c.name}</h3>
          <span class="cc-location">📍 ${c.location}</span>
        </div>
        <div class="cc-badges">
          <span class="cc-badge cat" style="background:${catColor}22;color:${catColor};border-color:${catColor}44">${c.category}</span>
          <span class="cc-badge type">${c.college_type}</span>
          ${c.accreditation ? `<span class="cc-badge accred">${c.accreditation}</span>` : ''}
        </div>
      </div>

      <div class="cc-stat-row">
        <div class="cc-stat">
          <span class="cc-stat-label">Match Score</span>
          <span class="cc-stat-val score">${c.match_score}%</span>
        </div>
        <div class="cc-stat">
          <span class="cc-stat-label">Admission Chance</span>
          <span class="cc-stat-val">${c.admission_chance}</span>
        </div>
        <div class="cc-stat">
          <span class="cc-stat-label">Cutoff Marks</span>
          <span class="cc-stat-val">${c.cutoff_marks}%</span>
        </div>
        <div class="cc-stat">
          <span class="cc-stat-label">Fee / Year</span>
          <span class="cc-stat-val">₹${(c.fee_per_year).toLocaleString('en-IN')}</span>
        </div>
        <div class="cc-stat">
          <span class="cc-stat-label">Avg Package</span>
          <span class="cc-stat-val">${c.placement_avg} LPA</span>
        </div>
        <div class="cc-stat">
          <span class="cc-stat-label">Rating</span>
          <span class="cc-stat-val">⭐ ${c.rating}</span>
        </div>
      </div>

      <div class="cc-score-bar">
        <div class="cc-score-fill" style="width:${c.match_score}%;background:${catColor}"></div>
      </div>

      <p class="cc-courses">${courses}</p>
    </div>
  `;
}

function demoDraftCards() {
  return `
    <div class="results-offline">
      <div class="offline-banner">⚡ Backend is offline — start the server to see real recommendations.<br>
        <code>cd backend &amp;&amp; uvicorn main:app --reload</code>
      </div>
    </div>`;
}

// ─── Restart ──────────────────────────────────────────────────────────────────
function restartForm() {
  const screen = document.getElementById('successScreen');
  const form   = document.getElementById('studentForm');
  if (screen) {
    screen.classList.remove('visible');
    screen.style.display = '';
  }
  if (form) { form.style.display = ''; form.reset(); }

  document.querySelector('.progress-track').style.display = '';
  document.querySelector('.progress-meta').style.display = '';

  // Reset step
  document.querySelectorAll('.field-group').forEach(fg => fg.classList.remove('valid','error'));
  document.querySelectorAll('.input-check').forEach(c => c.classList.remove('show-valid'));

  state.currentStep = 1;
  state.formData = {};

  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  document.getElementById('step1')?.classList.add('active');

  updateProgressBar();
  updateNavSteps();
  updateMeter(NaN);

  // Restore submit button
  const btn = document.getElementById('submitBtn');
  if (btn) {
    btn.classList.remove('loading');
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> Find My Colleges`;
  }

  scrollToForm();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatClass(val) {
  const map = {
    '9':'Class 9', '10':'Class 10', '11':'Class 11', '12':'Class 12',
    'diploma':'Diploma', 'other':'Other'
  };
  return map[val] || val || '—';
}

function formatCaste(val) {
  const map = {
    general:'General (Open)', obc:'OBC', sc:'SC', st:'ST',
    ews:'EWS', vjnt:'VJNT', sbc:'SBC', other:'Other'
  };
  return map[val] || val || '—';
}

function formatCourse(val) {
  const map = {
    // Degree courses
    'btech-cs':'B.Tech — CSE', 'btech-it':'B.Tech — IT',
    'btech-mech':'B.Tech — Mech.', 'btech-civil':'B.Tech — Civil',
    'btech-eee':'B.Tech — EEE', 'btech-ai':'B.Tech — AI & ML',
    'btech-data':'B.Tech — Data Science', 'mbbs':'MBBS', 'bds':'BDS',
    'bpharm':'B.Pharm', 'bsc-nursing':'B.Sc Nursing',
    'bba':'BBA', 'bcom':'B.Com', 'mba':'MBA',
    'bsc':'B.Sc', 'ba':'BA', 'bca':'BCA', 'bsc-it':'B.Sc IT',
    'llb':'LLB', 'barch':'B.Arch',
    // Intermediate streams
    'mpc':'MPC (Maths, Physics, Chemistry)',
    'bipc':'BiPC (Biology, Physics, Chemistry)',
    'mbipc':'M BiPC (Maths, Biology, Physics, Chemistry)',
    'mpcs':'MPCS (Maths, Physics, Computer Science)',
    'mec':'MEC (Maths, Economics, Commerce)',
    'cec':'CEC (Commerce, Economics, Civics)',
    'hec':'HEC (History, Economics, Civics)',
    'commerce-math':'Commerce with Maths',
    'arts-general':'Arts — General Humanities',
    'arts-lang':'Arts with Languages',
    'home-science':'Home Science',
    'fine-arts':'Fine Arts / Music / Dance',
    'voc-agri':'Vocational — Agriculture',
    'voc-it':'Vocational — IT',
    'other':'Other'
  };
  return map[val] || val || '—';
}

function formatBudgetRange(val) {
  const map = {
    '0-50000':       'Up to ₹50,000 / year',
    '50000-150000':  '₹50K – ₹1.5L / year',
    '150000-400000': '₹1.5L – ₹4L / year',
    '400000+':       'Above ₹4L / year'
  };
  return map[val] || val || '—';
}

// ─── Toast Notifications ──────────────────────────────────────────────────────
function showToast(message, type = 'success', duration = 3500) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      ${type === 'success'
        ? '<polyline points="20 6 9 17 4 12"/>'
        : type === 'error'
        ? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
        : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="7" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'}
    </svg>
    ${message}
  `;
  document.body.appendChild(toast);
  toast.style.animation = 'toastIn 0.3s ease forwards';

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─── Profile Review Modal (Confirmation before submission) ───────────────────
function showProfileReviewModal() {
  // Create modal HTML if it doesn't exist
  let modal = document.getElementById('profileReviewModal');
  
  if (!modal) {
    const modalHTML = `
      <div id="profileReviewModal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h2>📋 Review Your Profile</h2>
            <p>Please verify that all details are correct before we find your colleges.</p>
          </div>

          <div class="profile-review-grid">
            <div class="review-item">
              <span class="review-label">Full Name</span>
              <span class="review-value" id="review-name">—</span>
            </div>
            <div class="review-item">
              <span class="review-label">Class</span>
              <span class="review-value" id="review-class">—</span>
            </div>
            <div class="review-item">
              <span class="review-label">Category</span>
              <span class="review-value" id="review-caste">—</span>
            </div>
            <div class="review-item">
              <span class="review-label">Course / Stream</span>
              <span class="review-value" id="review-course">—</span>
            </div>
            <div class="review-item">
              <span class="review-label">Percentage Marks</span>
              <span class="review-value" id="review-marks">—</span>
            </div>
            <div class="review-item">
              <span class="review-label">Annual Budget</span>
              <span class="review-value" id="review-budget">—</span>
            </div>
            <div class="review-item full-width">
              <span class="review-label">Location Preference</span>
              <span class="review-value" id="review-location">—</span>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeProfileReviewModal()">← Back & Edit</button>
            <button class="btn btn-primary" onclick="confirmAndSubmit()">✓ Correct – Find Colleges</button>
          </div>

          <p class="review-notice">💡 If any information is wrong, click "Back & Edit" to correct it.</p>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    modal = document.getElementById('profileReviewModal');
  }

  // Populate modal with current form data
  const fd = state.formData;
  
  document.getElementById('review-name').textContent = fd.name || '—';
  document.getElementById('review-class').textContent = formatClass(fd.class);
  document.getElementById('review-caste').textContent = formatCaste(fd.caste);
  document.getElementById('review-course').textContent = formatCourse(fd.course);
  document.getElementById('review-marks').textContent = fd.marks ? `${fd.marks}%` : '—';
  
  const budget = fd.budgetCustom
    ? `₹${parseInt(fd.budgetCustom).toLocaleString('en-IN')} / year`
    : (fd.budgetRange ? formatBudgetRange(fd.budgetRange) : '—');
  document.getElementById('review-budget').textContent = budget;
  
  const loc = fd.location ? fd.location.charAt(0).toUpperCase() + fd.location.slice(1) : 'All India';
  document.getElementById('review-location').textContent = loc;

  // Show modal with animation
  modal.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeProfileReviewModal() {
  const modal = document.getElementById('profileReviewModal');
  if (modal) {
    modal.classList.remove('visible');
    document.body.style.overflow = '';
  }
}

function confirmAndSubmit() {
  closeProfileReviewModal();
  submitForm();
}
