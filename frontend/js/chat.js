/* ═══════════════════════════════════════════════════════════════
   EDUMATCH — AI CHAT PAGE JAVASCRIPT
   Reads student profile + colleges from localStorage, streams
   responses from the Gemini-powered /chat endpoint via SSE.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const STORAGE_KEY = 'edumatch_results';

// ── App state ─────────────────────────────────────────────────────────────────
const state = {
  messages:       [],     // { role: 'user'|'assistant', content: string }
  streaming:      false,
  studentProfile: {},
  topColleges:    [],
};

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadStudentData();
  renderSidebar();
  renderGreeting();
  initInputListener();
});

// ── Load student data from localStorage ───────────────────────────────────────
function loadStudentData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  let data   = null;
  try { data = raw ? JSON.parse(raw) : null; } catch (_) {}

  if (!data) {
    // Demo fallback
    data = {
      student_name: 'Demo Student',
      filters_applied: { marks: 82, stream: 'MPC', location: 'Hyderabad', budget: 150000 },
      results: [],
    };
    showToast('ℹ️ No profile found — showing demo mode. Fill the form first!', 'info', 5000);
  }

  const f = data.filters_applied || {};
  state.studentProfile = {
    name:      data.student_name || 'Student',
    marks:     f.marks     || '?',
    stream:    f.stream    || '?',
    location:  f.location  || 'Hyderabad',
    budget:    f.budget    || 0,
    interests: [],
  };
  state.topColleges = (data.results || []).slice(0, 6);
}

// ── Render sidebar ────────────────────────────────────────────────────────────
function renderSidebar() {
  const p = state.studentProfile;

  // Avatar + name
  const av = document.getElementById('profileAvatar');
  if (av) av.textContent = (p.name || 'S')[0].toUpperCase();
  const nm = document.getElementById('profileName');
  if (nm) nm.textContent = p.name || 'Student';

  // Profile chips
  const chips = document.getElementById('profileChips');
  if (chips) {
    const defs = [
      p.marks    ? `📊 ${p.marks}%`          : null,
      p.stream   ? `📚 ${p.stream}`          : null,
      p.location ? `📍 ${p.location}`        : null,
      p.budget   ? `💰 ₹${fmtBudget(p.budget)}` : null,
    ].filter(Boolean);
    chips.innerHTML = defs.map(d => `<span class="p-chip">${d}</span>`).join('');
  }

  // Context colleges
  const ctx = document.getElementById('ctxColleges');
  if (ctx) {
    if (!state.topColleges.length) {
      ctx.innerHTML = '<p style="font-size:.75rem;color:var(--txt3)">No matches yet — fill the form first.</p>';
    } else {
      ctx.innerHTML = state.topColleges.slice(0, 5).map(c => `
        <div class="ctx-item">
          <div class="ctx-name">${c.name}</div>
          <div class="ctx-meta">
            <span class="ctx-cat ${(c.category||'').toLowerCase()}">${c.category || '—'}</span>
            <span>${c.match_score || '—'}% match</span>
            <span>₹${fmtBudget(c.fee_per_year)}/yr</span>
          </div>
        </div>
      `).join('');
    }
  }
}

// ── Render initial greeting ───────────────────────────────────────────────────
function renderGreeting() {
  const win  = document.getElementById('chatWindow');
  const p    = state.studentProfile;
  const safe = state.topColleges.filter(c => c.category === 'Safe').length;
  const top  = state.topColleges[0]?.name || 'your top match';

  // Greeting banner
  const banner = document.createElement('div');
  banner.className = 'greeting-banner';
  banner.innerHTML = `
    <div class="greeting-robot">🤖</div>
    <div class="greeting-text">
      <h3>Hi ${p.name || 'there'}! I'm your EduMatch AI Advisor 🎓</h3>
      <p>
        I've reviewed your profile — <strong>${p.marks}% in ${p.stream}</strong>.
        You have <strong>${safe} Safe</strong> and ${state.topColleges.length - safe} other matches.
        Your top pick is <strong>${top}</strong>.<br>
        Ask me anything about colleges, courses, fees, or EAMCET!
      </p>
    </div>
  `;
  win.appendChild(banner);

  // Initial AI welcome message (not sent to backend — just displayed)
  const initMsg = `Hi! I've already looked at your profile — ${p.marks}% in ${p.stream}, budget ₹${fmtBudget(p.budget)}/yr, preferred location ${p.location}. I can see ${state.topColleges.length} colleges matched for you! Ask me anything — which college to apply to first, about EAMCET, course choices, fees… I'm here to help 😊`;
  appendMessage('assistant', initMsg);
  // Push to state so it's in history on first user message
  state.messages.push({ role: 'assistant', content: initMsg });
}

// ── Input listener ────────────────────────────────────────────────────────────
function initInputListener() {
  const input = document.getElementById('chatInput');
  const btn   = document.getElementById('sendBtn');
  if (!input || !btn) return;

  input.addEventListener('input', () => {
    btn.disabled = !input.value.trim() || state.streaming;
  });
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// ── Quick question chip ───────────────────────────────────────────────────────
function sendQuick(btn) {
  if (state.streaming) return;
  const text = btn.textContent.trim();
  document.getElementById('chatInput').value = text;
  sendMessage();
}

// ── Send message ──────────────────────────────────────────────────────────────
async function sendMessage() {
  const input   = document.getElementById('chatInput');
  const userMsg = input.value.trim();
  if (!userMsg || state.streaming) return;

  // Clear input
  input.value  = '';
  input.style.height = 'auto';
  document.getElementById('sendBtn').disabled = true;

  // Append user bubble
  appendMessage('user', userMsg);
  state.messages.push({ role: 'user', content: userMsg });

  // Show typing indicator
  state.streaming = true;
  setTyping(true);

  // Scroll to bottom
  scrollBottom();

  try {
    const res = await fetch('http://localhost:8000/api/chat/', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message:         userMsg,
        history:         state.messages.slice(0, -1), // exclude current user msg
        student_profile: state.studentProfile,
        top_colleges:    state.topColleges,
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // Hide typing, create empty AI bubble
    setTyping(false);
    const bubbleEl = appendMessage('assistant', '');
    let   fullText = '';

    // Stream SSE tokens
    const reader  = res.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') break;

        try {
          const { token, error } = JSON.parse(payload);
          if (token) {
            fullText += token;
            updateBubble(bubbleEl, fullText, true);   // true = show cursor
            scrollBottom();
          }
          if (error) throw new Error(error);
        } catch (_) {}
      }
    }

    // Final render — remove cursor
    updateBubble(bubbleEl, fullText, false);
    state.messages.push({ role: 'assistant', content: fullText });

  } catch (err) {
    setTyping(false);
    appendMessage('assistant', '⚠️ Couldn\'t reach the AI right now. Make sure the backend is running and try again!', true);
    console.error('Chat error:', err);
  } finally {
    state.streaming = false;
    document.getElementById('sendBtn').disabled = !document.getElementById('chatInput').value.trim();
    scrollBottom();
  }
}

// ── DOM helpers ───────────────────────────────────────────────────────────────
function appendMessage(role, text, isError = false) {
  const win  = document.getElementById('chatWindow');
  const row  = document.createElement('div');
  row.className = `msg-row ${role === 'user' ? 'user' : ''}`;

  const avatarClass = role === 'user' ? 'user-av' : 'ai';
  const avatarText  = role === 'user'
    ? (state.studentProfile.name || 'S')[0].toUpperCase()
    : 'AI';
  const bubbleClass = role === 'user' ? 'user-bub' : `ai${isError ? ' error' : ''}`;

  row.innerHTML = `
    <div class="msg-avatar ${avatarClass}">${avatarText}</div>
    <div class="msg-bubble ${bubbleClass}" data-role="${role}">
      ${formatText(text)}
    </div>
  `;

  win.appendChild(row);
  return row.querySelector('.msg-bubble');
}

function updateBubble(el, text, showCursor) {
  if (!el) return;
  el.innerHTML = formatText(text) + (showCursor ? '<span class="cursor"></span>' : '');
}

function formatText(text) {
  // Basic markdown: **bold**, *italic*, newlines → <br>
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/`(.+?)`/g,'<code style="background:rgba(99,102,241,0.15);padding:1px 5px;border-radius:4px;font-size:.85em">$1</code>')
    .replace(/\n/g,'<br>');
}

function setTyping(show) {
  const el = document.getElementById('typingWrap');
  if (el) el.style.display = show ? 'block' : 'none';
  if (show) scrollBottom();
}

function scrollBottom() {
  const win = document.getElementById('chatWindow');
  if (win) win.scrollTop = win.scrollHeight;
}

// ── Clear chat ────────────────────────────────────────────────────────────────
function clearChat() {
  state.messages = [];
  const win = document.getElementById('chatWindow');
  if (win) win.innerHTML = '';
  renderGreeting();
  showToast('🔄 Started a new conversation!', 'success');
}

// ── Format helpers ────────────────────────────────────────────────────────────
function fmtBudget(n) {
  if (!n) return '?';
  if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
  if (n >= 1000)   return (n / 1000).toFixed(0) + 'K';
  return String(n);
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
