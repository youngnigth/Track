// ====== ES Futures Tracker App ======
const SIDES = { long: 1, short: -1 };
const POINT_VALUE = 50;

// ==== DOM refs ====
const navLinks = document.querySelectorAll('.sidebar nav a');
const dashboardSection = document.getElementById('dashboard-section');
const historySection = document.getElementById('history-section');
const calendarSection = document.getElementById('calendar-section');

const themeToggle = document.getElementById('theme-toggle');
const mainBody = document.body;

const investmentInput = document.getElementById('initial-investment-input');
const saveInvestmentBtn = document.getElementById('save-investment-btn');
const currentInvestmentSpan = document.getElementById('current-investment');

const addTradeBtn = document.getElementById('add-trade-btn');
const tradeList = document.getElementById('trade-list');
const summaryPnL = document.getElementById('summary-pnl');
const summaryWinrate = document.getElementById('summary-winrate');
const summaryPF = document.getElementById('summary-pf');
const summaryStreak = document.getElementById('summary-streak');
const summaryBalance = document.getElementById('summary-balance');

const historyTableBody = document.querySelector('#history-table tbody');
const exportCsvBtn = document.getElementById('export-csv-btn');

const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const tradeForm = document.getElementById('trade-form');
const tradeDate = document.getElementById('trade-date');
const tradeSide = document.getElementById('trade-side');
const tradeEntry = document.getElementById('trade-entry');
const tradeEntryTime = document.getElementById('trade-entry-time');
const tradeExit = document.getElementById('trade-exit');
const tradeExitTime = document.getElementById('trade-exit-time');
const tradeContracts = document.getElementById('trade-contracts');
const modalCancel = document.getElementById('modal-cancel');

const calendarDiv = document.getElementById('calendar');
const calendarStatsDiv = document.getElementById('calendar-stats');
const calendarChartCanvas = document.getElementById('calendar-chart');

// ==== State ====
let trades = [];
let editingTradeIdx = null;
let investment = 0;
let calendarChart = null;
let selectedCalendarDate = null; // for "add/edit by date"

// ==== Storage ====
function saveState() {
  localStorage.setItem('esfutures_trades', JSON.stringify(trades));
  localStorage.setItem('esfutures_investment', investment);
}
function loadState() {
  trades = JSON.parse(localStorage.getItem('esfutures_trades') || '[]');
  investment = parseFloat(localStorage.getItem('esfutures_investment') || '0');
}

// ==== Utility ====
const usdFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
function fmtUSD(num) { return usdFmt.format(num); }
function fmtPct(n) { return (n * 100).toFixed(1) + '%'; }
function fmtDate(d) { return d.split('-').reverse().join('/'); } // yyyy-mm-dd -> dd/mm/yyyy

// ==== Navigation ====
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    dashboardSection.style.display = link.id === 'nav-dashboard' ? 'block' : 'none';
    historySection.style.display = link.id === 'nav-history' ? 'block' : 'none';
    calendarSection.style.display = link.id === 'nav-calendar' ? 'block' : 'none';
    if (link.id === 'nav-calendar') renderCalendar();
  });
});

// ==== Theme Toggle ====
themeToggle.onclick = () => {
  const isDark = mainBody.classList.toggle('dark');
  localStorage.setItem('esfutures_theme', isDark ? 'dark' : 'light');
};
if (localStorage.getItem('esfutures_theme') === 'dark') mainBody.classList.add('dark');

// ==== Investment Handling ====
function updateInvestmentDisplay() {
  currentInvestmentSpan.textContent = `Current: ${fmtUSD(investment)}`;
}
saveInvestmentBtn.onclick = () => {
  investment = parseFloat(investmentInput.value || '0');
  saveState();
  updateInvestmentDisplay();
  updateSummary();
};
updateInvestmentDisplay();

// ==== Trade Modal ====
function showModal(editIdx = null, forceDate = null) {
  modal.classList.add('show');
  if (editIdx === null) {
    modalTitle.textContent = 'Add Trade';
    tradeForm.reset();
    tradeContracts.value = 1;
    if (forceDate) tradeDate.value = forceDate;
    else tradeDate.value = '';
    editingTradeIdx = null;
  } else {
    modalTitle.textContent = 'Edit Trade';
    const t = trades[editIdx];
    tradeDate.value = t.date;
    tradeSide.value = t.side;
    tradeEntry.value = t.entry;
    tradeEntryTime.value = t.entryTime;
    tradeExit.value = t.exit;
    tradeExitTime.value = t.exitTime;
    tradeContracts.value = t.contracts;
    editingTradeIdx = editIdx;
  }
  document.body.classList.add('modal-open');
}
function hideModal() {
  modal.classList.remove('show');
  tradeForm.reset();
  editingTradeIdx = null;
  document.body.classList.remove('modal-open');
}
addTradeBtn.onclick = () => showModal();
modalCancel.onclick = hideModal;
modal.addEventListener('click', e => { if (e.target === modal) hideModal(); });

// ==== Add/Edit Trade ====
tradeForm.onsubmit = (e) => {
  e.preventDefault();
  const trade = {
    date: tradeDate.value,
    side: tradeSide.value,
    entry: parseFloat(tradeEntry.value),
    entryTime: tradeEntryTime.value,
    exit: parseFloat(tradeExit.value),
    exitTime: tradeExitTime.value,
    contracts: parseInt(tradeContracts.value),
  };
  if (editingTradeIdx !== null) trades[editingTradeIdx] = trade;
  else trades.push(trade);
  saveState();
  hideModal();
  updateSummary();
  renderTradeList();
  renderHistory();
  renderCalendar();
};

// ==== Delete/Edit handlers ====
function handleEdit(idx) { showModal(idx); }
function handleDelete(idx) {
  if (confirm('Delete this trade?')) {
    trades.splice(idx, 1);
    saveState();
    updateSummary();
    renderTradeList();
    renderHistory();
    renderCalendar();
  }
}
window.handleEdit = handleEdit;
window.handleDelete = handleDelete;

// ==== Trade List (Dashboard) ====
function renderTradeList() {
  tradeList.innerHTML = '';
  const today = new Date().toISOString().slice(0,10);
  trades.forEach((t, idx) => {
    if (t.date === today) {
      const li = document.createElement('li');
      const points = (t.exit - t.entry) * SIDES[t.side];
      const pnl = points * POINT_VALUE * t.contracts;
      li.innerHTML = `
        <div>
          <span>${t.side === 'long' ? '🟢' : '🔴'} ${t.side.toUpperCase()}</span> | 
          ${t.entry}→${t.exit} (${points > 0 ? '+' : ''}${points.toFixed(2)} pts, ${fmtUSD(pnl)}) ×${t.contracts}
          <span style="color:#888;font-size:.97em;margin-left:.5em;">${t.entryTime}→${t.exitTime}</span>
        </div>
        <div>
          <button onclick="handleEdit(${idx})">✎</button>
          <button onclick="handleDelete(${idx})">🗑️</button>
        </div>
      `;
      tradeList.appendChild(li);
    }
  });
}

// ==== Dashboard Summary Stats ====
function updateSummary() {
  const today = new Date().toISOString().slice(0,10);
  let wins = 0, losses = 0, total = 0, gross = 0, pfWin = 0, pfLoss = 0, streak = 0, maxStreak = 0;
  let lastSide = null, streakCount = 0, totalPnl = 0;

  trades.forEach(t => {
    const points = (t.exit - t.entry) * SIDES[t.side];
    const pnl = points * POINT_VALUE * t.contracts;
    if (t.date === today) {
      total += 1;
      gross += pnl;
      if (pnl > 0) { wins += 1; pfWin += pnl; }
      else if (pnl < 0) { losses += 1; pfLoss -= pnl; }
    }
    // Streak calculation
    if (pnl > 0) {
      if (lastSide === 'win') streakCount++;
      else streakCount = 1;
      lastSide = 'win';
    } else if (pnl < 0) {
      if (lastSide === 'loss') streakCount++;
      else streakCount = 1;
      lastSide = 'loss';
    }
    if (streakCount > maxStreak) maxStreak = streakCount;
    totalPnl += pnl;
  });

  summaryPnL.textContent = fmtUSD(gross);
  summaryWinrate.textContent = total ? Math.round((wins / total) * 100) + '%' : '0%';
  summaryPF.textContent = pfLoss ? (pfWin / pfLoss).toFixed(2) : (pfWin ? '99.99' : '0.00');
  summaryStreak.textContent = maxStreak;
  summaryBalance.textContent = fmtUSD(investment + totalPnl);
}

// ==== Trade History Table ====
function renderHistory() {
  historyTableBody.innerHTML = '';
  trades.slice().reverse().forEach((t, idx) => {
    const points = (t.exit - t.entry) * SIDES[t.side];
    const pnl = points * POINT_VALUE * t.contracts;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td data-label="Date">${fmtDate(t.date)}</td>
      <td data-label="Side">${t.side.toUpperCase()}</td>
      <td data-label="Entry Time">${t.entryTime}</td>
      <td data-label="Exit Time">${t.exitTime}</td>
      <td data-label="Entry">${t.entry}</td>
      <td data-label="Exit">${t.exit}</td>
      <td data-label="Contracts">${t.contracts}</td>
      <td data-label="Points">${points.toFixed(2)}</td>
      <td data-label="P/L" style="color:${pnl >= 0 ? '#16f59b' : '#f43f5e'}">${fmtUSD(pnl)}</td>
      <td data-label="Actions">
        <button onclick="handleEdit(${trades.length-1-idx})">✎</button>
        <button onclick="handleDelete(${trades.length-1-idx})">🗑️</button>
      </td>
    `;
    historyTableBody.appendChild(row);
  });
}

// ==== Export to CSV ====
if (exportCsvBtn) {
  exportCsvBtn.onclick = () => {
    const csv = [
      ["Date","Side","Entry Time","Exit Time","Entry","Exit","Contracts","Points","P/L"],
      ...trades.map(t => {
        const points = (t.exit - t.entry) * SIDES[t.side];
        const pnl = points * POINT_VALUE * t.contracts;
        return [
          fmtDate(t.date), t.side.toUpperCase(), t.entryTime, t.exitTime, t.entry, t.exit,
          t.contracts, points.toFixed(2), pnl.toFixed(2)
        ].join(',');
      })
    ].join('\n');
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'es_futures_history.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 800);
  }
}

// ==== Calendar + Chart.js Integration + Date Selection ====
// Helper for weekly/monthly stats
function getStatsForPeriod(startDate, endDate) {
  let totalPnl = 0, wins = 0, losses = 0, total = 0;
  trades.forEach(t => {
    if (t.date >= startDate && t.date <= endDate) {
      const points = (t.exit - t.entry) * SIDES[t.side];
      const pnl = points * POINT_VALUE * t.contracts;
      totalPnl += pnl;
      if (pnl > 0) wins++;
      else if (pnl < 0) losses++;
      total++;
    }
  });
  return { totalPnl, wins, losses, total };
}

function renderCalendar() {
  // P&L by date
  const stats = {};
  trades.forEach(t => {
    const points = (t.exit - t.entry) * SIDES[t.side];
    const pnl = points * POINT_VALUE * t.contracts;
    if (!stats[t.date]) stats[t.date] = 0;
    stats[t.date] += pnl;
  });

  // Calendar table (with clickable day cells)
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = `<table style="width:100%;border-collapse:separate;border-spacing:8px;text-align:center"><tr>
    <th>Su</th><th>Mo</th><th>Tu</th><th>We</th><th>Th</th><th>Fr</th><th>Sa</th></tr><tr>`;
  let day = 1, cell = 0;
  for (let i = 0; i < firstDay; ++i, ++cell) html += `<td></td>`;
  for (; day <= daysInMonth; ++day, ++cell) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const pnl = stats[dateStr] || 0;
    html += `<td 
      data-date="${dateStr}" 
      style="background:${pnl>0?'rgba(22,245,155,0.13)':pnl<0?'rgba(244,63,94,0.13)':'rgba(34,211,238,0.06)'};border-radius:12px;cursor:pointer;">
      <div style="font-weight:700;font-size:1.13em;">${day}</div>
      <div style="font-size:.99em;color:${pnl>0?'#16f59b':pnl<0?'#f43f5e':'#7dd3fc'}">${pnl!==0 ? fmtUSD(pnl) : '-'}</div>
    </td>`;
    if (cell % 7 === 6 && day < daysInMonth) html += '</tr><tr>';
  }
  for (; cell % 7 !== 0; ++cell) html += `<td></td>`;
  html += '</tr></table>';
  calendarDiv.innerHTML = html;

  // ---- Calendar day click events ----
  [...calendarDiv.querySelectorAll('td[data-date]')].forEach(td => {
    td.onclick = () => {
      showModal(null, td.getAttribute('data-date'));
    };
  });

  // ---- Weekly/monthly stats above calendar ----
  if (calendarStatsDiv) {
    const today = new Date();
    // This week's Monday and Sunday
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    function formatDateStr(d) {
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    const weekStats = getStatsForPeriod(formatDateStr(monday), formatDateStr(sunday));
    const monthStats = getStatsForPeriod(`${year}-${String(month+1).padStart(2,'0')}-01`, `${year}-${String(month+1).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`);

    calendarStatsDiv.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:2.1rem;margin-bottom:2rem;margin-top:0.3rem;">
        <div>
          <div style="font-size:1.04em;color:var(--accent);font-weight:600;">This Week</div>
          <div style="font-weight:800;font-size:1.3em;margin-top:0.1em;">${fmtUSD(weekStats.totalPnl)}</div>
          <div style="font-size:.97em;">Wins: ${weekStats.wins} / Losses: ${weekStats.losses}</div>
        </div>
        <div>
          <div style="font-size:1.04em;color:var(--primary);font-weight:600;">This Month</div>
          <div style="font-weight:800;font-size:1.3em;margin-top:0.1em;">${fmtUSD(monthStats.totalPnl)}</div>
          <div style="font-size:.97em;">Wins: ${monthStats.wins} / Losses: ${monthStats.losses}</div>
        </div>
      </div>
    `;
  }

  // ---- Chart.js Integration ----
  const days = [];
  const pnls = [];
  for(let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    let pnl = 0;
    trades.forEach(t => {
      if(t.date === dateStr) {
        const points = (t.exit - t.entry) * SIDES[t.side];
        pnl += points * POINT_VALUE * t.contracts;
      }
    });
    days.push(d);
    pnls.push(pnl);
  }

  if (calendarChart) calendarChart.destroy();
  const ctx = calendarChartCanvas.getContext('2d');
  calendarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [{
        label: 'Daily P&L ($)',
        data: pnls,
        borderColor: pnls.map(pnl => pnl >= 0 ? '#16f59b' : '#f43f5e'),
        backgroundColor: pnls.map(pnl => pnl >= 0 ? 'rgba(22,245,155,0.19)' : 'rgba(244,63,94,0.15)'),
        borderWidth: 2,
        tension: 0.32,
        fill: true
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` P&L: $${ctx.parsed.y.toFixed(2)}`
          }
        }
      },
      scales: {
        x: { 
          title: { display: true, text: 'Day of Month', color: '#a5b4fc', font: { weight: 'bold', size: 13 } },
          ticks: { color: '#a5b4fc' }
        },
        y: {
          title: { display: true, text: 'P&L ($)', color: '#a5b4fc', font: { weight: 'bold', size: 13 } },
          ticks: { color: '#a5b4fc' },
          grid: { color: 'rgba(79,70,229,0.08)' }
        }
      }
    }
  });
}

// ==== App Init ====
function appInit() {
  loadState();
  updateInvestmentDisplay();
  renderTradeList();
  updateSummary();
  renderHistory();
  renderCalendar();
}
appInit();
