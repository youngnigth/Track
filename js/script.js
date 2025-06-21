// js/script.js
// Site-wide JS: Nav toggle, Reading Progress, Financial Report with localStorage, Clear, Download CSV & PDF, Back-to-top, Category Definitions
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
      catDescEl.textContent = categoryDefs[categorySelect.value] || '';
    });
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
    const downloadCSVBtn = document.getElementById('download-btn');
    const downloadPDFBtn = document.getElementById('download-pdf-btn');
    const ctx = document.getElementById('budget-chart').getContext('2d');

    let entries = JSON.parse(localStorage.getItem('financeEntries')) || [];
    const computeTotals = () => {
      const totals = { 'Income':0, 'Assets':0, 'Liabilities':0, 'Smart Savings':0, 'Investment':0, 'Debt':0 };
      entries.forEach(e => { totals[e.category] += e.amount; });
      return totals;
    };

    const categories = Object.keys(categoryDefs);
    let totals = computeTotals();
    const chart = new Chart(ctx, {
      type: 'pie',
      data: { labels: categories, datasets: [{ data: categories.map(c => totals[c]), backgroundColor: categories.map((_,i) => `hsl(${i*60},70%,50%)`) }] },
      options: { responsive: true }
    });

    updateReport();

    form.addEventListener('submit', e => {
      e.preventDefault();
      const category = categorySelect.value;
      const desc = descInput.value.trim();
      const amount = parseFloat(amountInput.value);
      if (!category || !desc || isNaN(amount)) return;
      entries.push({ category, desc, amount }); saveData(); updateReport(); form.reset(); catDescEl.textContent = categoryDefs[category];
    });

    clearBtn.addEventListener('click', () => {
      if (confirm('Clear all financial data?')) { entries = []; saveData(); updateReport(); }
    });

    downloadCSVBtn.addEventListener('click', () => {
      const rows = [['Category','Description','Amount']];
      entries.forEach(e => rows.push([e.category, e.desc, e.amount.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})]));
      totals = computeTotals();
      const totalIncome = totals['Income'];
      const totalAssets = totals['Assets'] + totals['Smart Savings'] + totals['Investment'];
      const totalLiabilities = totals['Liabilities'] + totals['Debt'];
      const netWorth = totalIncome + totalAssets - totalLiabilities;
      rows.push(['Total Income','', totalIncome.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})]);
      rows.push(['Total Network','', netWorth.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})]);
      rows.push(['Balance','', netWorth.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})]);
      const csv = rows.map(r=>r.join(',')).join('\n');
      const blob = new Blob([csv],{type:'text/csv'}), url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download='financial_report.csv';a.click();URL.revokeObjectURL(url);
    });

    // Download PDF with jsPDF and chart image
    if (downloadPDFBtn) {
      downloadPDFBtn.addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p','pt','a4');
        totals = computeTotals();
        const totalIncome = totals['Income'];
        const totalAssets = totals['Assets'] + totals['Smart Savings'] + totals['Investment'];
        const totalLiabilities = totals['Liabilities'] + totals['Debt'];
        const netWorth = totalIncome + totalAssets - totalLiabilities;
        doc.setFontSize(16); doc.text('Growth Hub Financial Report',40,40);
        doc.setFontSize(12);
        doc.text(`Net Worth: $${netWorth.toLocaleString('en-US')}`,40,60);
        doc.text(`Total Income: $${totalIncome.toLocaleString('en-US')}`,40,80);
        doc.text(`Total Assets: $${totalAssets.toLocaleString('en-US')}`,40,100);
        doc.text(`Total Liabilities: $${totalLiabilities.toLocaleString('en-US')}`,40,120);
        // Add chart image directly
        const imgData = chart.toBase64Image();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 40;
        const imgProps = doc.getImageProperties(imgData);
        const pdfW = pageWidth - margin*2;
        const pdfH = (imgProps.height * pdfW) / imgProps.width;
        doc.addImage(imgData,'PNG',margin,140,pdfW,pdfH);
        // Add table data below chart
        let y = 140 + pdfH + 20;
        doc.setFontSize(10);
        doc.text('Category        Description        Amount',40,y);
        y += 12;
        entries.forEach(e => {
          const line = `${e.category}        ${e.desc}        $${e.amount.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
          doc.text(line,40,y);
          y += 12;
          if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 40; }
        });
        doc.save('financial_report.pdf');
      });
    }

    function saveData() {
      localStorage.setItem('financeEntries', JSON.stringify(entries));
    }

    function updateReport() {
      tableBody.innerHTML = '';
      entries.forEach(e => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${e.category}</td><td>${e.desc}</td><td>$${e.amount.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>`;
        tableBody.appendChild(row);
      });
      totals = computeTotals();
      const totalIncome = totals['Income'];
      const totalAssets = totals['Assets'] + totals['Smart Savings'] + totals['Investment'];
      const totalLiabilities = totals['Liabilities'] + totals['Debt'];
      const netWorth = totalIncome + totalAssets - totalLiabilities;
      netWorthEl.textContent = `$${netWorth.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
      balanceEl.textContent = `$${netWorth.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
      chart.data.datasets[0].data = categories.map(cat => totals[cat]);
      chart.update();
    }
  }
});
