let deliveries = [];
let expenses = [];
let currentUser = null;

// --- INITIALIZATION & AUTH CHECKS ---
window.onload = async () => {
    // Set default date to today
    document.getElementById('report-date').valueAsDate = new Date();
    
    // Listen for date changes to load data dynamically
    document.getElementById('report-date').addEventListener('change', loadData);
    
    // Check if user is already logged in
    const token = localStorage.getItem('sessionToken');
    if (token) {
        try {
            const res = await fetch('/api/auth?action=validate', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                currentUser = data.username;
                showDashboard();
                return;
            }
        } catch (err) {
            console.error('Session validation failed:', err);
        }
    }
    
    // If no session, show authentication container
    showAuth();
};

function showDashboard() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    document.getElementById('user-greeting').innerText = currentUser;
    loadData();
}

function showAuth() {
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('auth-error').style.display = 'none';
}

// --- AUTHENTICATION ACTIONS ---
async function handleAuth(mode) {
    const usernameInput = document.getElementById('auth-username').value.trim();
    const passwordInput = document.getElementById('auth-password').value;
    const errorDiv = document.getElementById('auth-error');
    
    if (!usernameInput || !passwordInput) {
        errorDiv.innerText = "Please fill in all fields.";
        errorDiv.style.display = 'block';
        return;
    }

    errorDiv.style.display = 'none';

    try {
        const res = await fetch(`/api/auth?action=${mode}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });

        const data = await res.json();
        
        if (res.ok) {
            if (mode === 'login') {
                localStorage.setItem('sessionToken', data.token);
                currentUser = data.username;
                
                // Clear login fields
                document.getElementById('auth-username').value = "";
                document.getElementById('auth-password').value = "";
                
                showDashboard();
            } else {
                alert('Registration successful! Please login.');
                document.getElementById('auth-password').value = "";
            }
        } else {
            errorDiv.innerText = data.error || 'Authentication failed.';
            errorDiv.style.display = 'block';
        }
    } catch (err) {
        console.error(err);
        errorDiv.innerText = 'Connection to server failed.';
        errorDiv.style.display = 'block';
    }
}

function logout() {
    localStorage.removeItem('sessionToken');
    currentUser = null;
    deliveries = [];
    expenses = [];
    showAuth();
}

// Ensure globally available for HTML onclicks
window.handleAuth = handleAuth;
window.logout = logout;

// --- NAVIGATION ---
function navigateDay(offset) {
    const dateInput = document.getElementById('report-date');
    if (!dateInput.value) return;
    
    const currentDate = new Date(dateInput.value);
    currentDate.setDate(currentDate.getDate() + offset);
    
    const yyyy = currentDate.getFullYear();
    const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dd = String(currentDate.getDate()).padStart(2, '0');
    
    dateInput.value = `${yyyy}-${mm}-${dd}`;
    loadData();
}
window.navigateDay = navigateDay;

// --- DATA ACCESS ---
async function loadData() {
    const dateInput = document.getElementById('report-date').value;
    const token = localStorage.getItem('sessionToken');
    if (!dateInput || !token) return;

    try {
        const [deliveriesRes, expensesRes] = await Promise.all([
            fetch(`/api/deliveries?date=${dateInput}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`/api/expenses?date=${dateInput}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        if (deliveriesRes.ok) {
            deliveries = await deliveriesRes.json();
        } else if (deliveriesRes.status === 401) {
            return logout();
        }

        if (expensesRes.ok) {
            expenses = await expensesRes.json();
        } else if (expensesRes.status === 401) {
            return logout();
        }

        renderAll();
    } catch (err) {
        console.error('Error loading data:', err);
    }
}

// --- CORE FUNCTIONS ---
async function addOrUpdateDelivery() {
    const date = document.getElementById('report-date').value;
    const location = document.getElementById('delivery-location').value.trim();
    const rider = document.getElementById('rider-name').value.trim();
    const product = document.getElementById('product-name').value.trim();
    const price = parseFloat(document.getElementById('product-price').value) || 0;
    const fee = parseFloat(document.getElementById('delivery-fee').value) || 0;
    const editIndex = document.getElementById('edit-delivery-index').value;
    const token = localStorage.getItem('sessionToken');

    if (!date || !location || !rider || !product) {
        return alert("Please fill Date, Location, Rider, and Product");
    }

    if (!token) return logout();

    let id = null;
    if (editIndex !== "") {
        const item = deliveries[editIndex];
        if (item) id = item.id;
    }

    const payload = { id, date, location, rider, product, price, fee };

    try {
        const res = await fetch('/api/deliveries', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            document.getElementById('edit-delivery-index').value = "";
            document.getElementById('delivery-btn').innerText = "Add Delivery";
            clearInputs(['delivery-location', 'product-name', 'product-price', 'delivery-fee']);
            await loadData();
        } else {
            const errData = await res.json();
            alert(`Error: ${errData.error || 'Failed to save delivery'}`);
        }
    } catch (err) {
        console.error('Error saving delivery:', err);
    }
}

async function addOrUpdateExpense() {
    const date = document.getElementById('report-date').value;
    const desc = document.getElementById('expense-desc').value.trim();
    const amt = parseFloat(document.getElementById('expense-amt').value) || 0;
    const editIndex = document.getElementById('edit-expense-index').value;
    const token = localStorage.getItem('sessionToken');

    if (!date || !desc || amt <= 0) {
        return alert("Enter expense details and a valid date");
    }

    if (!token) return logout();

    let id = null;
    if (editIndex !== "") {
        const item = expenses[editIndex];
        if (item) id = item.id;
    }

    const payload = { id, date, desc, amt };

    try {
        const res = await fetch('/api/expenses', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            document.getElementById('edit-expense-index').value = "";
            document.getElementById('expense-btn').innerText = "Add Expense";
            clearInputs(['expense-desc', 'expense-amt']);
            await loadData();
        } else {
            const errData = await res.json();
            alert(`Error: ${errData.error || 'Failed to save expense'}`);
        }
    } catch (err) {
        console.error('Error saving expense:', err);
    }
}

async function deleteDelivery(i) {
    const item = deliveries[i];
    const token = localStorage.getItem('sessionToken');
    if (!item || !item.id) return;
    if (!token) return logout();

    if (!confirm("Are you sure you want to delete this delivery?")) return;

    try {
        const res = await fetch(`/api/deliveries?id=${item.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            await loadData();
        } else {
            alert('Failed to delete delivery');
        }
    } catch (err) {
        console.error('Error deleting delivery:', err);
    }
}

async function deleteExpense(i) {
    const item = expenses[i];
    const token = localStorage.getItem('sessionToken');
    if (!item || !item.id) return;
    if (!token) return logout();

    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
        const res = await fetch(`/api/expenses?id=${item.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            await loadData();
        } else {
            alert('Failed to delete expense');
        }
    } catch (err) {
        console.error('Error deleting expense:', err);
    }
}

// --- RENDER LOGIC ---
function renderDeliveries() {
    const container = document.getElementById('delivery-list');
    container.innerHTML = "<h3>Delivered Orders</h3>";

    if (deliveries.length === 0) {
        container.innerHTML += "<p style='text-align:center;color:#64748b;padding: 10px 0;'>No deliveries for this date.</p>";
        return;
    }

    const groupedByRider = {};
    deliveries.forEach((d, i) => {
        if (!groupedByRider[d.rider]) groupedByRider[d.rider] = [];
        groupedByRider[d.rider].push({ ...d, originalIndex: i });
    });

    for (const riderName in groupedByRider) {
        let riderTotal = 0;
        let html = `<div class="rider-block"><strong class="rider-title">Rider: ${riderName}</strong>`;
        
        groupedByRider[riderName].forEach(item => {
            const price = Number(item.price) || 0;
            const fee = Number(item.fee) || 0;
            riderTotal += price;
            html += `
                <div class="item-row">
                    <span><strong>${item.location}</strong>: ${item.product} - ₦${price.toLocaleString()} (Fee: ₦${fee.toLocaleString()})</span>
                    <div class="action-btns">
                        <button style="background:orange" onclick="editDelivery(${item.originalIndex})">Edit</button>
                        <button style="background:red" onclick="deleteDelivery(${item.originalIndex})">Del</button>
                    </div>
                </div>`;
        });
        
        html += `<div style="margin-top:8px; font-size:0.9rem; font-weight:600; color:var(--accent);">Total: ₦${riderTotal.toLocaleString()}</div></div>`;
        container.innerHTML += html;
    }
}

function renderExpenses() {
    const container = document.getElementById('expense-list');
    container.innerHTML = "<h3>Expenses</h3>";

    if (expenses.length === 0) {
        container.innerHTML += "<p style='text-align:center;color:#64748b;padding: 10px 0;'>No expenses for this date.</p>";
        return;
    }

    expenses.forEach((e, i) => {
        const amt = Number(e.amt) || 0;
        container.innerHTML += `
            <div class="item-row">
                <span><strong>${e.desc}</strong>: ₦${amt.toLocaleString()}</span>
                <div class="action-btns">
                    <button style="background:orange" onclick="editExpense(${i})">Edit</button>
                    <button style="background:red" onclick="deleteExpense(${i})">Del</button>
                </div>
            </div>`;
    });
}

function renderSummary() {
    const totalSales = deliveries.reduce((sum, d) => sum + (Number(d.price) || 0), 0);
    const totalExp = expenses.reduce((sum, e) => sum + (Number(e.amt) || 0), 0);
    document.getElementById('reconciliation-summary').innerHTML = `
        <div class="summary-box">
            <h3>Reconciliation</h3>
            <div class="summary-details">
                <div class="summary-row">
                    <span>Total Sales</span>
                    <span>₦${totalSales.toLocaleString()}</span>
                </div>
                <div class="summary-row">
                    <span>Total Expenses</span>
                    <span>₦${totalExp.toLocaleString()}</span>
                </div>
                <div class="summary-total">
                    <span>Final Transfer</span>
                    <h4>₦${(totalSales - totalExp).toLocaleString()}</h4>
                </div>
            </div>
        </div>`;
}

function renderAll() { 
    renderDeliveries(); 
    renderExpenses(); 
    renderSummary(); 
}

// --- UI HELPERS ---
function editDelivery(index) {
    const d = deliveries[index];
    if (!d) return;
    document.getElementById('delivery-location').value = d.location;
    document.getElementById('rider-name').value = d.rider;
    document.getElementById('product-name').value = d.product;
    document.getElementById('product-price').value = d.price;
    document.getElementById('delivery-fee').value = d.fee;
    document.getElementById('edit-delivery-index').value = index;
    document.getElementById('delivery-btn').innerText = "Update Detail";
    window.scrollTo(0,0);
}

function editExpense(index) {
    const e = expenses[index];
    if (!e) return;
    document.getElementById('expense-desc').value = e.desc;
    document.getElementById('expense-amt').value = e.amt;
    document.getElementById('edit-expense-index').value = index;
    document.getElementById('expense-btn').innerText = "Update Expense";
}

function clearInputs(ids) { 
    ids.forEach(id => document.getElementById(id).value = ""); 
}

function copyFullReport() {
    const date = document.getElementById('report-date').value;
    let text = `DAILY REPORT FOR ${date}\n\n=== DELIVERED ORDERS ===\n`;

    const groupedByRider = {};
    deliveries.forEach(d => {
        if (!groupedByRider[d.rider]) groupedByRider[d.rider] = [];
        groupedByRider[d.rider].push(d);
    });

    let totalSales = 0;
    let globalCount = 1;

    for (const rider in groupedByRider) {
        text += `${rider.toUpperCase()}\n`;
        let riderSubtotal = 0;
        
        groupedByRider[rider].forEach(item => {
            const price = Number(item.price) || 0;
            const fee = Number(item.fee) || 0;
            text += `- ${globalCount}. ${item.location}: ${item.product} ${price.toLocaleString()} (${fee.toLocaleString()})\n`;
            riderSubtotal += price;
            totalSales += price;
            globalCount++;
        });
        text += `- Total for ${rider}: ${riderSubtotal.toLocaleString()}\n\n`;
    }

    text += `TOTAL SALES: ${totalSales.toLocaleString()}\n\n=== EXPENSES ===\n`;
    let totalExp = 0;
    expenses.forEach((e, i) => {
        const amt = Number(e.amt) || 0;
        text += `- ${i + 1}. ${e.desc} ${amt.toLocaleString()}\n`;
        totalExp += amt;
    });

    text += `--- TOTAL EXPENSES: ${totalExp.toLocaleString()}\n\n`;
    text += `=== RECONCILIATION ===\n`;
    text += `Client Funds Collected (${totalSales.toLocaleString()}) - Total Expenses Paid (${totalExp.toLocaleString()}) = Balance: ${(totalSales - totalExp).toLocaleString()}\n\n`;
    text += `= FINAL TRANSFER AMOUNT: ${(totalSales - totalExp).toLocaleString()}`;

    navigator.clipboard.writeText(text).then(() => alert("Report Copied!"));
}
