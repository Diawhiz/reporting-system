let deliveries = [];
let expenses = [];

// --- INITIALIZATION ---
window.onload = () => {
    // Set default date to today
    document.getElementById('report-date').valueAsDate = new Date();
    
    // Listen for date changes to load data dynamically
    document.getElementById('report-date').addEventListener('change', loadData);
    
    // Load initial data
    loadData();
};

// --- NAVIGATION ---
function navigateDay(offset) {
    const dateInput = document.getElementById('report-date');
    if (!dateInput.value) return;
    
    const currentDate = new Date(dateInput.value);
    // Add offset days
    currentDate.setDate(currentDate.getDate() + offset);
    
    // Format to YYYY-MM-DD
    const yyyy = currentDate.getFullYear();
    const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dd = String(currentDate.getDate()).padStart(2, '0');
    
    dateInput.value = `${yyyy}-${mm}-${dd}`;
    
    // Trigger load
    loadData();
}

// --- DATA ACCESS ---
async function loadData() {
    const dateInput = document.getElementById('report-date').value;
    if (!dateInput) return;

    try {
        const [deliveriesRes, expensesRes] = await Promise.all([
            fetch(`/api/deliveries?date=${dateInput}`),
            fetch(`/api/expenses?date=${dateInput}`)
        ]);

        if (deliveriesRes.ok) {
            deliveries = await deliveriesRes.json();
        }
        if (expensesRes.ok) {
            expenses = await expensesRes.json();
        }

        renderAll();
    } catch (err) {
        console.error('Error loading data:', err);
        alert('Could not connect to the server or database. Ensure the server is running.');
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

    if (!date || !location || !rider || !product) {
        return alert("Please fill Date, Location, Rider, and Product");
    }

    // Determine if we are updating an existing entry
    let id = null;
    if (editIndex !== "") {
        const item = deliveries[editIndex];
        if (item) id = item.id;
    }

    const payload = { id, date, location, rider, product, price, fee };

    try {
        const res = await fetch('/api/deliveries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        alert('Failed to connect to server.');
    }
}

async function addOrUpdateExpense() {
    const date = document.getElementById('report-date').value;
    const desc = document.getElementById('expense-desc').value.trim();
    const amt = parseFloat(document.getElementById('expense-amt').value) || 0;
    const editIndex = document.getElementById('edit-expense-index').value;

    if (!date || !desc || amt <= 0) {
        return alert("Enter expense details and a valid date");
    }

    let id = null;
    if (editIndex !== "") {
        const item = expenses[editIndex];
        if (item) id = item.id;
    }

    const payload = { id, date, desc, amt };

    try {
        const res = await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        alert('Failed to connect to server.');
    }
}

async function deleteDelivery(i) {
    const item = deliveries[i];
    if (!item || !item.id) return;

    if (!confirm("Are you sure you want to delete this delivery?")) return;

    try {
        const res = await fetch(`/api/deliveries?id=${item.id}`, {
            method: 'DELETE'
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
    if (!item || !item.id) return;

    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
        const res = await fetch(`/api/expenses?id=${item.id}`, {
            method: 'DELETE'
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

// Ensure the helper is globally available for HTML onclick handlers
window.navigateDay = navigateDay;

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
