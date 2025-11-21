const STORAGE_KEY = "catatan_keuangan_alfi";
let records = [];

function formatCurrency(n) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n);
}

function parseAmountInput(v) {
  const s = String(v || "").trim().replace(/[^0-9,\.]/g, "");
  const normalized = s.replace(/\./g, "").replace(/,/g, ".");
  const num = parseFloat(normalized);
  return Number.isFinite(num) ? num : NaN;
}

function formatAmountInputValue(n) {
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  records = raw ? JSON.parse(raw) : [];
}

function yearRange() {
  const years = new Set();
  records.forEach(r => years.add(new Date(r.date).getFullYear()));
  const current = new Date().getFullYear();
  for (let y = current - 5; y <= current + 1; y++) years.add(y);
  return Array.from(years).sort((a,b)=>a-b);
}

function populateFilters() {
  const monthNames = ["Semua Bulan","Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const mSel = document.getElementById("filter-month");
  mSel.innerHTML = monthNames.map((n,i)=>`<option value="${i}">${n}</option>`).join("");
  mSel.value = "0";
  const ySel = document.getElementById("filter-year");
  const ys = yearRange();
  ySel.innerHTML = ["<option value="">Semua Tahun</option>", ...ys.map(y=>`<option value="${y}">${y}</option>")].join("");
  ySel.value = "";
}

function getFilters() {
  const m = parseInt(document.getElementById("filter-month").value, 10);
  const yVal = document.getElementById("filter-year").value;
  const y = yVal === "" ? null : parseInt(yVal, 10);
  return { month: m, year: y };
}

function filtered() {
  const { month, year } = getFilters();
  return records.filter(r => {
    const d = new Date(r.date);
    const ym = d.getMonth() + 1;
    const yy = d.getFullYear();
    const monthOk = month === 0 || ym === month;
    const yearOk = year == null || yy === year;
    return monthOk && yearOk;
  }).sort((a,b)=> new Date(b.date) - new Date(a.date));
}

function renderSummary(list) {
  const income = list.filter(r=>r.type === "income").reduce((s,r)=> s + Number(r.amount), 0);
  const expense = list.filter(r=>r.type === "expense").reduce((s,r)=> s + Number(r.amount), 0);
  const balance = income - expense;
  document.getElementById("total-income").textContent = formatCurrency(income);
  document.getElementById("total-expense").textContent = formatCurrency(expense);
  document.getElementById("balance").textContent = formatCurrency(balance);
}

function renderList() {
  const list = filtered();
  renderSummary(list);
  const tbody = document.getElementById("tx-list");
  tbody.innerHTML = list.map(r=>{
    const d = new Date(r.date).toLocaleDateString("id-ID");
    const amtCls = r.type === "income" ? "income" : "expense";
    return `
      <tr>
        <td>${d}</td>
        <td>${r.desc}</td>
        <td>${r.category}</td>
        <td>${r.type === "expense" ? (r.note || "-") : "-"}</td>
        <td><span class="badge ${amtCls}">${r.type === "income" ? "Pemasukan" : "Pengeluaran"}</span></td>
        <td class="amount ${amtCls}">${formatCurrency(Number(r.amount))}</td>
        <td>
          <button data-id="${r.id}" class="row-del">Hapus</button>
        </td>
      </tr>
    `;
  }).join("");
}

function addRecord(e) {
  e.preventDefault();
  const date = document.getElementById("date").value;
  const desc = document.getElementById("desc").value.trim();
  const category = document.getElementById("category").value.trim();
  const type = document.getElementById("type").value;
  const amountStr = document.getElementById("amount").value;
  const note = document.getElementById("note") ? document.getElementById("note").value.trim() : "";
  const nAmount = parseAmountInput(amountStr);
  if (!date || !desc || !category || !type || !Number.isFinite(nAmount) || nAmount < 0) {
    alert("Mohon isi semua field dengan benar. Jumlah harus >= 0.");
    return;
  }
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  const payload = { id, date, desc, category, type, amount: nAmount };
  if (type === "expense" && note) payload.note = note;
  records.push(payload);
  save();
  renderList();
  e.target.reset();
}

function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  save();
  renderList();
}

function bindEvents() {
  document.getElementById("tx-form").addEventListener("submit", addRecord);
  document.getElementById("tx-list").addEventListener("click", (e)=>{
    const btn = e.target.closest(".row-del");
    if (btn) deleteRecord(btn.getAttribute("data-id"));
  });
  document.getElementById("filter-month").addEventListener("change", renderList);
  document.getElementById("filter-year").addEventListener("change", renderList);
  const typeSel = document.getElementById("type");
  const noteField = document.getElementById("note");
  const amountInput = document.getElementById("amount");
  function toggleNote() {
    if (!noteField) return;
    const isExpense = typeSel.value === "expense";
    noteField.style.display = isExpense ? "block" : "none";
    if (!isExpense) noteField.value = "";
  }
  typeSel.addEventListener("change", toggleNote);
  toggleNote();
  if (amountInput) {
    amountInput.addEventListener("input", () => {
      const n = parseAmountInput(amountInput.value);
      amountInput.value = Number.isFinite(n) ? formatAmountInputValue(n) : "";
    });
    amountInput.addEventListener("blur", () => {
      const n = parseAmountInput(amountInput.value);
      amountInput.value = Number.isFinite(n) ? formatAmountInputValue(n) : "";
    });
  }
  document.getElementById("export-btn").addEventListener("click", ()=>{
    const data = JSON.stringify(records);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "catatan_keuangan.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
  document.getElementById("clear-btn").addEventListener("click", ()=>{
    records = [];
    save();
    populateFilters();
    renderList();
  });
}

function init() {
  load();
  populateFilters();
  bindEvents();
  renderList();
}

init();
