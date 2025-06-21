// js/script.js
// Site-wide JS: Nav toggle, Reading Progress, Financial Report with localStorage, Clear, Download, Back-to-top, Category Definitions
// -----------------------------

document.addEventListener('DOMContentLoaded', () => {
  // Nav toggle
  document.querySelectorAll('.nav-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector('.site-header').classList.toggle('nav-open');
    });
  });

  // Back-to-top button
  const backToTop = document.getElementById('back-to-top');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.style.display = window.scrollY > 300 ? 'block' : 'none';
    });
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Reading progress bar
  const progressBar = document.getElementById('reading-progress');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = (window.scrollY / docHeight) * 100;
      progressBar.style.width = `${scrolled}%`;
    });
  }

  // Category Definitions
  const categoryDefs = {
    'Income': 'Money received on a regular basis from work, investments, or other sources.',
    'Assets': 'Resources owned by the company that have economic value.',
    'Liabilities': 'Obligations or debts the company owes to others.',
    'Smart Savings': 'Reserved funds allocated for emergencies and short-term goals.',
    'Investment': 'Funds invested in financial vehicles to generate returns.',
    'Debt': 'Long-term or short-term borrowings that must be repaid.'
  };
  const categorySelect = document.getElementById('item-category');
  const catDescEl = document.getElementById('category-description');
  if (categorySelect && catDescEl) {
    categorySelect.addEventListener('change', () => {
      const def = categoryDefs[categorySelect.value] || '';
      catDescEl.textContent = def;
    });
    // Initialize description on load
    catDescEl.textContent = categoryDefs[categorySelect.value];
  }

  // Financial Report Logic
  const form = document.getElementById('tracker-form');
  if (form) {
    const descInput = document.getElementById('item-desc');
    const amountInput = document.getElementById('item-amount');
    const tableBody = document.querySelector('#report-table tbody');
    const netWorthEl = document.getElementById('net-worth');
    const balanceEl = document.getElementById('balance');
    const clearBtn = document.getElementById('clear-btn');
    const downloadBtn = document.getElementById('download-btn');
    const ctx = document.getElementById('budget-chart').getContext('2d');

    // Data structure: store entries array
    let entries = JSON.parse(localStorage.getItem('financeEntries')) || [];

    // Compute totals per category including Income
    const computeTotals = () => {
      const totals = { 'Income':0, 'Assets':0, 'Liabilities':0, 'Smart Savings':0, 'Investment':0, 'Debt':0 };
      entries.forEach(e => {
        totals[e.category] += e.amount;
      });
      return totals;
    };

    // Initialize chart
    const categories = Object.keys(categoryDefs);
    let totals = computeTotals();
    const chart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: categories,
        datasets: [{
          data: categories.map(cat => totals[cat]),
          backgroundColor: categories.map((_, i) => `hsl(${i * 60},70%,50%)`)
        }]
      },
      options: { responsive: true }
    });

    // Initial render
    updateReport();

    // Form submission
    form.addEventListener('submit', e => {
      e.preventDefault();
      const category = categorySelect.value;
      const desc = descInput.value.trim();
      const amount = parseFloat(amountInput.value);
      if (!category || !desc || isNaN(amount)) return;

      entries.push({ category, desc, amount });
      saveData();
      updateReport();
      form.reset();
      // Reset category description
      catDescEl.textContent = categoryDefs[category];
    });

    // Clear all data
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear all financial data?')) {
        entries = [];
        saveData();
        updateReport();
      }
    });

    // Download report as CSV
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        const rows = [['Category','Description','Amount']];
        entries.forEach(e => rows.push([e.category, e.desc, e.amount.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})]));
        // Add summary rows
        totals = computeTotals();
        const totalIncome = totals['Income'];
        const totalAssets = totals['Assets'] + totals['Smart Savings'] + totals['Investment'];
        const totalLiabilities = totals['Liabilities'] + totals['Debt'];
        const netWorth = totalIncome + totalAssets - totalLiabilities;
        rows.push(['Total Income','', totalIncome.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})]);
        rows.push(['Total Network','', netWorth.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})]);
        rows.push(['Balance','', netWorth.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})]);

        const csvContent = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'financial_report.csv';
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    function saveData() {
      localStorage.setItem('financeEntries', JSON.stringify(entries));
    }

    function updateReport() {
      // Update table body
      tableBody.innerHTML = '';
      entries.forEach(e => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${e.category}</td><td>${e.desc}</td><td>$${e.amount.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>`;
        tableBody.appendChild(row);
      });

      // Update summary
      totals = computeTotals();
      const totalIncome = totals['Income'];
      const totalAssets = totals['Assets'] + totals['Smart Savings'] + totals['Investment'];
      const totalLiabilities = totals['Liabilities'] + totals['Debt'];
      const netWorth = totalIncome + totalAssets - totalLiabilities;
      netWorthEl.textContent = `$${netWorth.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
      balanceEl.textContent = `$${netWorth.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;

      // Update chart
      chart.data.datasets[0].data = categories.map(cat => totals[cat]);
      chart.update();
    }
  }
});
