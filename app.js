// ==========================
// User Auth (Signup/Login)
// ==========================
const USERS_KEY = "users";
const SESSION_KEY = "sessionUser";

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
}
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// ===== SIGNUP =====
document.getElementById("signupForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const fullName = document.getElementById("fullName").value;
  const email = document.getElementById("email").value;
  const contact = document.getElementById("contact").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (password !== confirmPassword) {
    alert("Passwords do not match!");
    return;
  }

  let users = getUsers();
  if (users.find(user => user.email === email)) {
    alert("Email already exists!");
    return;
  }

  users.push({ fullName, email, contact, password });
  saveUsers(users);
  alert("Signup successful! Please login.");
  window.location.href = "login.html";
});

// ===== LOGIN =====
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", e => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    let users = getUsers();
    let user = users.find(u => u.email === email && u.password === password);

    if (user) {
      localStorage.setItem(SESSION_KEY, email);
      window.location.href = "dashboard.html";
    } else {
      alert("Invalid credentials");
    }
  });
}

// ===== PROTECT DASHBOARD =====
if (window.location.pathname.includes("dashboard.html")) {
  const sessionUser = localStorage.getItem(SESSION_KEY);
  if (!sessionUser) {
    window.location.href = "login.html";
  }
}

// ===== LOGOUT =====
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "login.html";
  });
}

// ==========================
// Expenses & Income Logic
// ==========================
const EXPENSES_KEY = "expenses";
const INCOME_KEY = "income";

let expenses = JSON.parse(localStorage.getItem(EXPENSES_KEY)) || [];
let incomes = JSON.parse(localStorage.getItem(INCOME_KEY)) || [];

function saveExpenses() {
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}
function saveIncome() {
  localStorage.setItem(INCOME_KEY, JSON.stringify(incomes));
}

// ===== EXPENSE FORM =====
const expenseForm = document.getElementById("expenseForm");
const expensesList = document.getElementById("expensesList");
if (expenseForm) {
  expenseForm.addEventListener("submit", e => {
    e.preventDefault();
    const item = document.getElementById("item").value;
    const amount = parseFloat(document.getElementById("amount").value);
    const category = document.getElementById("category").value;
    const date = document.getElementById("date").value;

    expenses.push({ item, amount, category, date });
    saveExpenses();
    renderExpenses();
    expenseForm.reset();
  });
}

// ===== INCOME FORM =====
const incomeForm = document.getElementById("incomeForm");
const incomeList = document.getElementById("incomeList");
if (incomeForm) {
  incomeForm.addEventListener("submit", e => {
    e.preventDefault();
    const source = document.getElementById("incomeSource").value;
    const amount = parseFloat(document.getElementById("incomeAmount").value);
    const date = document.getElementById("incomeDate").value;

    incomes.push({ source, amount, date });
    saveIncome();
    renderIncome();
    incomeForm.reset();
  });
}

// ===== RENDER EXPENSES =====
function renderExpenses() {
  if (!expensesList) return;
  expensesList.innerHTML = "";
  expenses.forEach(exp => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${exp.item}</td><td>${exp.category}</td><td>${exp.amount}</td><td>${exp.date}</td>`;
    expensesList.appendChild(row);
  });
  updateCharts();
  updateSummary();
}

// ===== RENDER INCOME =====
function renderIncome() {
  if (!incomeList) return;
  incomeList.innerHTML = "";
  incomes.forEach(inc => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${inc.source}</td><td>${inc.amount}</td><td>${inc.date}</td>`;
    incomeList.appendChild(row);
  });
  updateCharts();
  updateSummary();
}

// ==========================
// Charts & Summaries
// ==========================
let categoryChart, monthlyChart;

function updateCharts() {
  if (!document.getElementById("categoryChart")) return;

  const categories = ["Food","Transportation","Bills","Groceries","Others"];
  const categoryTotals = categories.map(cat =>
    expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0)
  );

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthlyTotals = new Array(12).fill(0);
  expenses.forEach(e => {
    const m = new Date(e.date).getMonth();
    monthlyTotals[m] += e.amount;
  });

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(document.getElementById("categoryChart"), {
    type: "pie",
    data: { labels: categories, datasets: [{ data: categoryTotals }] }
  });

  if (monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(document.getElementById("monthlyChart"), {
    type: "bar",
    data: { labels: months, datasets: [{ label: "Monthly Expenses", data: monthlyTotals }] }
  });
}

// ===== SUMMARY =====
function updateSummary() {
  const now = new Date();

  // Helper to sum records
  function sumByPeriod(records) {
    let daily = 0, weekly = 0, monthly = 0, yearly = 0;
    records.forEach(r => {
      const d = new Date(r.date);
      if (d.toDateString() === now.toDateString()) daily += r.amount;
      if (d.getFullYear() === now.getFullYear() && getWeek(d) === getWeek(now)) weekly += r.amount;
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) monthly += r.amount;
      if (d.getFullYear() === now.getFullYear()) yearly += r.amount;
    });
    return { daily, weekly, monthly, yearly };
  }

  const expTotals = sumByPeriod(expenses);
  const incTotals = sumByPeriod(incomes);

  // Update Expense Summary
  if (document.getElementById("expDaily")) {
    document.getElementById("expDaily").textContent = expTotals.daily.toFixed(2);
    document.getElementById("expWeekly").textContent = expTotals.weekly.toFixed(2);
    document.getElementById("expMonthly").textContent = expTotals.monthly.toFixed(2);
    document.getElementById("expYearly").textContent = expTotals.yearly.toFixed(2);
  }

  // Update Income Summary
  if (document.getElementById("incDaily")) {
    document.getElementById("incDaily").textContent = incTotals.daily.toFixed(2);
    document.getElementById("incWeekly").textContent = incTotals.weekly.toFixed(2);
    document.getElementById("incMonthly").textContent = incTotals.monthly.toFixed(2);
    document.getElementById("incYearly").textContent = incTotals.yearly.toFixed(2);
  }

  // Update Balance
  if (document.getElementById("balDaily")) {
    document.getElementById("balDaily").textContent = (incTotals.daily - expTotals.daily).toFixed(2);
    document.getElementById("balWeekly").textContent = (incTotals.weekly - expTotals.weekly).toFixed(2);
    document.getElementById("balMonthly").textContent = (incTotals.monthly - expTotals.monthly).toFixed(2);
    document.getElementById("balYearly").textContent = (incTotals.yearly - expTotals.yearly).toFixed(2);
  }
}

// Helper: get week number
function getWeek(date) {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const pastDays = (date - firstDay) / 86400000;
  return Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
}

// ==========================
// Theme Toggle
// ==========================
const themeToggle = document.getElementById("themeToggle");
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
  });
}

// ==========================
// Initialize
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  renderExpenses();
  renderIncome();
  updateSummary();
});



// Render Expenses
function renderExpenses() {
  if (!expensesList) return;
  expensesList.innerHTML = "";
  expenses.forEach((exp, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${exp.item}</td>
      <td>${exp.category}</td>
      <td>${exp.amount}</td>
      <td>${exp.date}</td>
      <td>
        <button class="edit-btn" onclick="editExpense(${index})">Edit</button>
        <button class="delete-btn" onclick="deleteExpense(${index})">Delete</button>
      </td>
    `;
    expensesList.appendChild(row);
  });
  updateCharts();
  updateSummary();
}

// Render Income
function renderIncome() {
  if (!incomeList) return;
  incomeList.innerHTML = "";
  incomes.forEach((inc, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${inc.source}</td>
      <td>${inc.amount}</td>
      <td>${inc.date}</td>
      <td>
        <button class="edit-btn" onclick="editIncome(${index})">Edit</button>
        <button class="delete-btn" onclick="deleteIncome(${index})">Delete</button>
      </td>
    `;
    incomeList.appendChild(row);
  });
  updateCharts();
  updateSummary();
}

// Delete
function deleteExpense(index) {
  expenses.splice(index, 1);
  saveExpenses();
  renderExpenses();
}
function deleteIncome(index) {
  incomes.splice(index, 1);
  saveIncome();
  renderIncome();
}

// Inline Edit for Expenses
function editExpense(index) {
  const row = expensesList.children[index];
  const exp = expenses[index];
  row.innerHTML = `
    <td><input type="text" id="editItem${index}" value="${exp.item}"></td>
    <td><input type="text" id="editCategory${index}" value="${exp.category}"></td>
    <td><input type="number" id="editAmount${index}" value="${exp.amount}"></td>
    <td><input type="date" id="editDate${index}" value="${exp.date}"></td>
    <td>
      <button class="save-btn" onclick="saveExpense(${index})">Save</button>
      <button class="cancel-btn" onclick="renderExpenses()">Cancel</button>
    </td>
  `;
}

function saveExpense(index) {
  expenses[index] = {
    item: document.getElementById(`editItem${index}`).value,
    category: document.getElementById(`editCategory${index}`).value,
    amount: parseFloat(document.getElementById(`editAmount${index}`).value),
    date: document.getElementById(`editDate${index}`).value,
  };
  saveExpenses();
  renderExpenses();
}

// Inline Edit for Income
function editIncome(index) {
  const row = incomeList.children[index];
  const inc = incomes[index];
  row.innerHTML = `
    <td><input type="text" id="editSource${index}" value="${inc.source}"></td>
    <td><input type="number" id="editAmountInc${index}" value="${inc.amount}"></td>
    <td><input type="date" id="editDateInc${index}" value="${inc.date}"></td>
    <td>
      <button class="save-btn" onclick="saveIncomeEdit(${index})">Save</button>
      <button class="cancel-btn" onclick="renderIncome()">Cancel</button>
    </td>
  `;
}

function saveIncomeEdit(index) {
  incomes[index] = {
    source: document.getElementById(`editSource${index}`).value,
    amount: parseFloat(document.getElementById(`editAmountInc${index}`).value),
    date: document.getElementById(`editDateInc${index}`).value,
  };
  saveIncome();
  renderIncome();
}


// Delete with Confirmation
function deleteExpense(index) {
  if (confirm("Are you sure you want to delete this expense?")) {
    expenses.splice(index, 1);
    saveExpenses();
    renderExpenses();
  }
}

function deleteIncome(index) {
  if (confirm("Are you sure you want to delete this income?")) {
    incomes.splice(index, 1);
    saveIncome();
    renderIncome();
  }
}


    // Forgot Password (Basic Example)
   document.getElementById("forgotPasswordForm").addEventListener("submit", function(e) {
      e.preventDefault();

      const email = document.getElementById("forgotEmail").value;
      const newPass = document.getElementById("newPassword").value;
      const confirmPass = document.getElementById("confirmNewPassword").value;

      if (newPass !== confirmPass) {
        alert("Passwords do not match!");
        return;
      }

      let users = JSON.parse(localStorage.getItem("users")) || [];
      let user = users.find(u => u.email === email);

      if (!user) {
        alert("No account found with this email.");
        return;
      }

      user.password = newPass;
      localStorage.setItem("users", JSON.stringify(users));
      alert("Password reset successful! Please login with your new password.");
      window.location.href = "login.html";
    });

//Show password/hide password
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







