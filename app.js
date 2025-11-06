// ===================================================
// app.js — Supabase + localStorage fallback (fixed)
// ===================================================

// 🧩 Connect to Supabase
const SUPABASE_URL = "https://ixpsdyliaernbszboefx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4cHNkeWxpYWVybmJzemJvZWZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTUzMzk3NCwiZXhwIjoyMDc3MTA5OTc0fQ.fpn3-v5UAQI_9JI76_oyBQPH55bd6xglIStVgtXxD6c";

// Single consistent Supabase client variable
let supabaseClient = null;
try {
  if (window.supabase && SUPABASE_URL && SUPABASE_KEY) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("✅ Supabase connected successfully!");
  } else {
    console.warn("⚠️ Supabase library not present or keys missing — using localStorage fallback.");
  }
} catch (err) {
  console.error("❌ Supabase initialization failed — using localStorage fallback.", err);
  supabaseClient = null;
}




// -------------------- AUTH (Supabase-based) --------------------

// --- SIGNUP ---
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { fullName },
      },
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Signup successful! You can now log in.");
      window.location.href = "login.html";
    }
  });
}

// --- LOGIN ---
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Invalid credentials! " + error.message);
    } else {
      alert("Login successful!");
      window.location.href = "dashboard.html";
    }
  });
}

// --- LOGOUT ---
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
  });
}

// -------------------- STORAGE (local arrays) --------------------
const EXPENSES_KEY = "Expenses";
const INCOME_KEY = "Income";

let expenses = JSON.parse(localStorage.getItem(EXPENSES_KEY)) || [];
let incomes = JSON.parse(localStorage.getItem(INCOME_KEY)) || [];

function saveExpensesLocal() { localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses)); }
function saveIncomeLocal() { localStorage.setItem(INCOME_KEY, JSON.stringify(incomes)); }

// -------------------- CURRENCY --------------------
let currentCurrency = localStorage.getItem("currency") || "GHS";
const currencyRates = { GHS: 1, USD: 0.075, EUR: 0.069 };
function formatCurrency(amount) {
  if (typeof amount !== "number") amount = parseFloat(amount) || 0;
  const rate = currencyRates[currentCurrency] ?? 1;
  return `${currentCurrency} ${ (amount * rate).toFixed(2) }`;
}
document.getElementById("currency")?.addEventListener("change", (e) => {
  currentCurrency = e.target.value;
  localStorage.setItem("currency", currentCurrency);
  renderExpenses();
  renderIncome();
  updateSummary();
  updateCharts();
});

// -------------------- CHARTS & SUMMARY --------------------
let categoryChart = null;
let monthlyChart = null;

function updateCharts() {
  if (!document.getElementById("categoryChart") || !document.getElementById("monthlyChart")) return;

  const categories = [...new Set(expenses.map(e => e.category || "—"))];
  const categoryTotals = categories.map(cat => expenses.filter(e => e.category === cat).reduce((s, x) => s + Number(x.amount || 0), 0));

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthlyTotals = new Array(12).fill(0);
  expenses.forEach(e => {
    if (!e.date) return;
    const d = new Date(e.date);
    if (!isNaN(d)) monthlyTotals[d.getMonth()] += Number(e.amount || 0);
  });

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(document.getElementById("categoryChart"), {
    type: "pie",
    data: { labels: categories, datasets: [{ data: categoryTotals }] },
  });

  if (monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(document.getElementById("monthlyChart"), {
    type: "bar",
    data: { labels: months, datasets: [{ label: "Monthly Expenses", data: monthlyTotals }] },
  });
}

function getWeek(date) {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const pastDays = (date - firstDay) / 86400000;
  return Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
}

function updateSummary() {
  const now = new Date();
  function sumByPeriod(records) {
    let daily = 0, weekly = 0, monthly = 0, yearly = 0;
    records.forEach(r => {
      const d = new Date(r.date);
      if (isNaN(d)) return;
      const amt = Number(r.amount || 0);
      if (d.toDateString() === now.toDateString()) daily += amt;
      if (d.getFullYear() === now.getFullYear() && getWeek(d) === getWeek(now)) weekly += amt;
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) monthly += amt;
      if (d.getFullYear() === now.getFullYear()) yearly += amt;
    });
    return { daily, weekly, monthly, yearly };
  }

  const expTotals = sumByPeriod(expenses);
  const incTotals = sumByPeriod(incomes);

  if (document.getElementById("expDaily")) {
    document.getElementById("expDaily").textContent = formatCurrency(expTotals.daily);
    document.getElementById("expWeekly").textContent = formatCurrency(expTotals.weekly);
    document.getElementById("expMonthly").textContent = formatCurrency(expTotals.monthly);
    document.getElementById("expYearly").textContent = formatCurrency(expTotals.yearly);
  }
  if (document.getElementById("incDaily")) {
    document.getElementById("incDaily").textContent = formatCurrency(incTotals.daily);
    document.getElementById("incWeekly").textContent = formatCurrency(incTotals.weekly);
    document.getElementById("incMonthly").textContent = formatCurrency(incTotals.monthly);
    document.getElementById("incYearly").textContent = formatCurrency(incTotals.yearly);
  }
  if (document.getElementById("balDaily")) {
    document.getElementById("balDaily").textContent = formatCurrency(incTotals.daily - expTotals.daily);
    document.getElementById("balWeekly").textContent = formatCurrency(incTotals.weekly - expTotals.weekly);
    document.getElementById("balMonthly").textContent = formatCurrency(incTotals.monthly - expTotals.monthly);
    document.getElementById("balYearly").textContent = formatCurrency(incTotals.yearly - expTotals.yearly);
  }
}

// -------------------- RENDER / EDIT / SAVE / DELETE (Expenses) --------------------
const expenseForm = document.getElementById("expenseForm");
const expensesList = document.getElementById("expensesList");

async function loadExpensesFromDB() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.from("Expenses").select("*").order("id", { ascending: true });
  if (error) return console.error("Load Expenses error:", error);
  expenses = (data || []).map(r => ({ ...r, amount: Number(r.amount) }));
  renderExpenses();
  updateCharts();
  updateSummary();
}

async function addExpenseToDB(exp) {
  if (!supabaseClient) return false;
  const { data, error } = await supabaseClient.from("Expenses").insert([exp]).select().single();
  if (error) { console.error("Add Expense error:", error); return false; }
  return data;
}

async function updateExpenseInDB(id, payload) {
  if (!supabaseClient) return false;
  const { data, error } = await supabaseClient.from("Expenses").update(payload).eq("id", id).select().single();
  if (error) { console.error("Update Expense error:", error); return false; }
  return data;
}

async function deleteExpenseFromDB(id) {
  if (!supabaseClient) return false;
  const { error } = await supabaseClient.from("Expenses").delete().eq("id", id);
  if (error) { console.error("Delete Expense error:", error); return false; }
  return true;
}

if (expenseForm) {
  expenseForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const item = document.getElementById("item").value.trim();
    const amount = parseFloat(document.getElementById("amount").value);
    const category = document.getElementById("category").value;
    const date = document.getElementById("date").value;
    if (!item || !amount || !category || !date) { alert("Please fill all fields."); return; }

    if (supabaseClient) {
      const inserted = await addExpenseToDB({ item, category, amount, date });
      if (inserted) {
        await loadExpensesFromDB();
      } else {
        alert("Failed to save Expense to server. Check console.");
      }
    } else {
      const localRow = { id: Date.now(), item, category, amount, date };
      expenses.push(localRow);
      saveExpensesLocal();
      renderExpenses();
      updateCharts();
      updateSummary();
    }
    expenseForm.reset();
  });
}

function renderExpenses() {
  if (!expensesList) return;
  expensesList.innerHTML = "";
  expenses.forEach((exp, index) => {
    const row = document.createElement("tr");
    row.dataset.index = index;
    row.innerHTML = `
      <td>${escapeHtml(exp.item)}</td>
      <td>${escapeHtml(exp.category)}</td>
      <td>${formatCurrency(Number(exp.amount || 0))}</td>
      <td>${escapeHtml(exp.date)}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-edit" onclick="editExpense(${index})">Edit</button>
          <button class="btn btn-delete" onclick="deleteExpense(${index})">Delete</button>
        </div>
      </td>
    `;
    expensesList.appendChild(row);
  });
}

function editExpense(index) {
  const row = expensesList.children[index];
  const exp = expenses[index];
  row.innerHTML = `
    <td><input type="text" id="editItem${index}" value="${escapeHtmlAttr(exp.item)}"></td>
    <td><input type="text" id="editCategory${index}" value="${escapeHtmlAttr(exp.category)}"></td>
    <td><input type="number" id="editAmount${index}" value="${Number(exp.amount)}" step="0.01"></td>
    <td><input type="date" id="editDate${index}" value="${exp.date}"></td>
    <td>
      <button class="save-btn" onclick="saveExpense(${index})">Save</button>
      <button class="cancel-btn" onclick="renderExpenses()">Cancel</button>
    </td>
  `;
}

async function saveExpense(index) {
  const id = expenses[index]?.id;
  const payload = {
    item: document.getElementById(`editItem${index}`).value.trim(),
    category: document.getElementById(`editCategory${index}`).value.trim(),
    amount: parseFloat(document.getElementById(`editAmount${index}`).value),
    date: document.getElementById(`editDate${index}`).value,
  };
  if (supabaseClient && id) {
    const updated = await updateExpenseInDB(id, payload);
    if (updated) {
      await loadExpensesFromDB();
    } else {
      alert("Failed to update expense on server. See console.");
    }
  } else {
    expenses[index] = { ...expenses[index], ...payload };
    saveExpensesLocal();
    renderExpenses();
    updateCharts();
    updateSummary();
  }
}

async function deleteExpense(index) {
  if (!confirm("Are you sure you want to delete this expense?")) return;
  const id = expenses[index]?.id;
  if (supabaseClient && id) {
    const ok = await deleteExpenseFromDB(id);
    if (ok) await loadExpensesFromDB();
    else alert("Failed to delete on server. See console.");
  } else {
    expenses.splice(index, 1);
    saveExpensesLocal();
    renderExpenses();
    updateCharts();
    updateSummary();
  }
}

// -------------------- RENDER / EDIT / SAVE / DELETE (Income) --------------------
const incomeForm = document.getElementById("incomeForm");
const incomeList = document.getElementById("incomeList");

async function loadIncomeFromDB() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.from("Income").select("*").order("id", { ascending: true });
  if (error) return console.error("Load income error:", error);
  incomes = (data || []).map(r => ({ ...r, amount: Number(r.amount) }));
  renderIncome();
  updateSummary();
}

async function addIncomeToDB(row) {
  if (!supabaseClient) return false;
  const { data, error } = await supabaseClient.from("Income").insert([row]).select().single();
  if (error) { console.error("Add Income error:", error); return false; }
  return data;
}

async function updateIncomeInDB(id, payload) {
  if (!supabaseClient) return false;
  const { data, error } = await supabaseClient.from("Income").update(payload).eq("id", id).select().single();
  if (error) { console.error("Update Income error:", error); return false; }
  return data;
}

async function deleteIncomeFromDB(id) {
  if (!supabaseClient) return false;
  const { error } = await supabaseClient.from("Income").delete().eq("id", id);
  if (error) { console.error("Delete Income error:", error); return false; }
  return true;
}

if (incomeForm) {
  incomeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const source = document.getElementById("incomeSource").value.trim();
    const amount = parseFloat(document.getElementById("incomeAmount").value);
    const category = document.getElementById("incomeCategory")?.value || "—";
    const date = document.getElementById("incomeDate").value;
    if (!source || !amount || !date) { alert("Please fill all fields."); return; }

    if (supabaseClient) {
      const inserted = await addIncomeToDB({ source, category, amount, date });
      if (inserted) await loadIncomeFromDB();
      else alert("Failed to save Income to server. See console.");
    } else {
      const localRow = { id: Date.now(), source, category, amount, date };
      incomes.push(localRow);
      saveIncomeLocal();
      renderIncome();
      updateSummary();
    }
    incomeForm.reset();
  });
}

function renderIncome() {
  if (!incomeList) return;
  incomeList.innerHTML = "";
  incomes.forEach((inc, index) => {
    const row = document.createElement("tr");
    row.dataset.index = index;
    row.innerHTML = `
      <td>${escapeHtml(inc.source)}</td>
      <td>${escapeHtml(inc.category)}</td>
      <td>${formatCurrency(Number(inc.amount || 0))}</td>
      <td>${escapeHtml(inc.date)}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-edit" onclick="editIncome(${index})">Edit</button>
          <button class="btn btn-delete" onclick="deleteIncome(${index})">Delete</button>
        </div>
      </td>
    `;
    incomeList.appendChild(row);
  });
}

function editIncome(index) {
  const row = incomeList.children[index];
  const inc = incomes[index];
  row.innerHTML = `
    <td><input type="text" id="editSource${index}" value="${escapeHtmlAttr(inc.source)}"></td>
    <td><input type="text" id="editCategoryInc${index}" value="${escapeHtmlAttr(inc.category)}"></td>
    <td><input type="number" id="editAmountInc${index}" value="${Number(inc.amount)}" step="0.01"></td>
    <td><input type="date" id="editDateInc${index}" value="${inc.date}"></td>
    <td>
      <button class="save-btn" onclick="saveIncomeEdit(${index})">Save</button>
      <button class="cancel-btn" onclick="renderIncome()">Cancel</button>
    </td>
  `;
}

async function saveIncomeEdit(index) {
  const id = incomes[index]?.id;
  const payload = {
    source: document.getElementById(`editSource${index}`).value.trim(),
    category: document.getElementById(`editCategoryInc${index}`).value.trim(),
    amount: parseFloat(document.getElementById(`editAmountInc${index}`).value),
    date: document.getElementById(`editDateInc${index}`).value,
  };
  if (supabaseClient && id) {
    const updated = await updateIncomeInDB(id, payload);
    if (updated) await loadIncomeFromDB();
    else alert("Failed to update Income on server. See console.");
  } else {
    incomes[index] = { ...incomes[index], ...payload };
    saveIncomeLocal();
    renderIncome();
    updateSummary();
  }
}

async function deleteIncome(index) {
  if (!confirm("Are you sure you want to delete this Income?")) return;
  const id = incomes[index]?.id;
  if (supabaseClient && id) {
    const ok = await deleteIncomeFromDB(id);
    if (ok) await loadIncomeFromDB();
    else alert("Failed to delete Income on server. See console.");
  } else {
    incomes.splice(index, 1);
    saveIncomeLocal();
    renderIncome();
    updateSummary();
  }
}

// -------------------- INITIAL LOAD --------------------
async function initialLoad() {
  const currencySelect = document.getElementById("currency");
  if (currencySelect) currencySelect.value = currentCurrency;

  if (supabaseClient) {
    // Try to load DB rows; if any error occurs, logs will show
    await loadExpensesFromDB();
    await loadIncomeFromDB();
    updateCharts();
  } else {
    // local fallback: render local arrays
    renderExpenses();
    renderIncome();
    updateCharts();
  }
  updateSummary();
}

document.addEventListener("DOMContentLoaded", initialLoad);

// -------------------- SMALL UTILITIES --------------------
function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str).replace(/[&<>"']/g, (s) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[s]);
}
function escapeHtmlAttr(str) {
  if (!str && str !== 0) return "";
  return String(str).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}



document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.getElementById("themeToggle");
  const body = document.body;

  if (!themeToggle) return console.error("themeToggle button not found!");

  if (localStorage.getItem("theme") === "dark") {
    body.classList.add("dark-mode");
    themeToggle.textContent = "☀️ Light Mode";
  }

  themeToggle.addEventListener("click", () => {
    const darkMode = body.classList.toggle("dark-mode");
    if (darkMode) {
      themeToggle.textContent = "☀️ Light Mode";
      localStorage.setItem("theme", "dark");
    } else {
      themeToggle.textContent = "🌙 Dark Mode";
      localStorage.setItem("theme", "light");
    }
  });
});


// === SIDEBAR TOGGLE ===
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.getElementById("sidebar");
const sections = document.querySelectorAll(".content-section");

menuToggle.addEventListener("click", () => {
  sidebar.classList.toggle("active");
});

// === MENU NAVIGATION ===
sidebar.querySelectorAll("li").forEach(item => {
  item.addEventListener("click", () => {
    const target = item.getAttribute("data-section");

    sections.forEach(section => {
      section.classList.add("hidden");
    });

    document.getElementById(target).classList.remove("hidden");
    sidebar.classList.remove("active");
  });
});


// Hide/Show Password
function togglePassword(inputId, icon) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    input.type = "password";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
}





