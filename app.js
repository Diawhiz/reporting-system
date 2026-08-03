// --- Custom Popup UI ---
function createPopupOverlay() {
    let overlay = document.getElementById('custom-popup-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'custom-popup-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
            z-index: 10000; opacity: 0; transition: opacity 0.3s ease; pointer-events: none;
        `;
        document.body.appendChild(overlay);
    }
    return overlay;
}

window.customAlert = function(msg) {
    return new Promise(resolve => {
        const overlay = createPopupOverlay();
        overlay.innerHTML = `
            <div style="background: var(--surface-bg, #fff); color: var(--text-main, #333); padding: 24px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); max-width: 400px; width: 90%; text-align: center; transform: translateY(-20px); transition: transform 0.3s ease;">
                <p style="margin: 0 0 20px 0; font-size: 1.1rem;">${msg}</p>
                <button id="custom-alert-btn" style="background: var(--primary-color, #4361ee); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">OK</button>
            </div>
        `;
        overlay.style.pointerEvents = 'auto';
        overlay.style.opacity = '1';
        const box = overlay.firstElementChild;
        setTimeout(() => box.style.transform = 'translateY(0)', 10);
        
        document.getElementById('custom-alert-btn').onclick = () => {
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
            setTimeout(() => { overlay.innerHTML = ''; resolve(); }, 300);
        };
    });
}

window.customConfirm = function(msg) {
    return new Promise(resolve => {
        const overlay = createPopupOverlay();
        overlay.innerHTML = `
            <div style="background: var(--surface-bg, #fff); color: var(--text-main, #333); padding: 24px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); max-width: 400px; width: 90%; text-align: center; transform: translateY(-20px); transition: transform 0.3s ease;">
                <p style="margin: 0 0 20px 0; font-size: 1.1rem;">${msg}</p>
                <div style="display: flex; justify-content: center; gap: 12px;">
                    <button id="custom-confirm-cancel" style="background: var(--surface-border, #ddd); color: var(--text-main, #333); border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">Cancel</button>
                    <button id="custom-confirm-ok" style="background: var(--danger-color, #ef233c); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">Confirm</button>
                </div>
            </div>
        `;
        overlay.style.pointerEvents = 'auto';
        overlay.style.opacity = '1';
        const box = overlay.firstElementChild;
        setTimeout(() => box.style.transform = 'translateY(0)', 10);
        
        const close = (val) => {
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
            setTimeout(() => { overlay.innerHTML = ''; resolve(val); }, 300);
        };
        document.getElementById('custom-confirm-cancel').onclick = () => close(false);
        document.getElementById('custom-confirm-ok').onclick = () => close(true);
    });
}

window.customPrompt = function(msg, defaultVal = '') {
    return new Promise(resolve => {
        const overlay = createPopupOverlay();
        overlay.innerHTML = `
            <div style="background: var(--surface-bg, #fff); color: var(--text-main, #333); padding: 24px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); max-width: 400px; width: 90%; text-align: center; transform: translateY(-20px); transition: transform 0.3s ease;">
                <p style="margin: 0 0 15px 0; font-size: 1.1rem; text-align: left;">${msg}</p>
                <input type="text" id="custom-prompt-input" value="${defaultVal}" style="width: 100%; padding: 10px; border: 1px solid var(--surface-border, #ccc); border-radius: 6px; margin-bottom: 20px; background: var(--bg-color, #fff); color: var(--text-main, #333); outline: none;">
                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button id="custom-prompt-cancel" style="background: var(--surface-border, #ddd); color: var(--text-main, #333); border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">Cancel</button>
                    <button id="custom-prompt-ok" style="background: var(--primary-color, #4361ee); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">OK</button>
                </div>
            </div>
        `;
        overlay.style.pointerEvents = 'auto';
        overlay.style.opacity = '1';
        const box = overlay.firstElementChild;
        setTimeout(() => box.style.transform = 'translateY(0)', 10);
        
        const input = document.getElementById('custom-prompt-input');
        input.focus();
        
        const close = (val) => {
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
            setTimeout(() => { overlay.innerHTML = ''; resolve(val); }, 300);
        };
        
        document.getElementById('custom-prompt-cancel').onclick = () => close(null);
        document.getElementById('custom-prompt-ok').onclick = () => close(input.value);
    });
}
window.alert = window.customAlert;
// --- End Custom Popup UI ---

let deliveries = [];
let expenses = [];
let inventoryVendors = [];
let inventoryItems = [];
let inventoryStocks = [];
let currentUser = null;

const apiCache = {
    deliveries: {},
    expenses: {}
};

function clearCache(date) {
    if (date) {
        delete apiCache.deliveries[date];
        delete apiCache.expenses[date];
    } else {
        apiCache.deliveries = {};
        apiCache.expenses = {};
    }
}

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
    loadInventoryData();
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

        let data = {};
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await res.json();
        } else {
            throw new Error(`Server returned status ${res.status}`);
        }
        
        if (res.ok) {
            if (mode === 'login') {
                localStorage.setItem('sessionToken', data.token);
                currentUser = data.username;
                
                // Clear login fields
                document.getElementById('auth-username').value = "";
                document.getElementById('auth-password').value = "";
                
                showDashboard();
            } else {
                customAlert('Registration successful! Please login.');
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
    clearCache();
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

    if (apiCache.deliveries[dateInput] && apiCache.expenses[dateInput]) {
        deliveries = apiCache.deliveries[dateInput];
        expenses = apiCache.expenses[dateInput];
        renderAll();
        return;
    }

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
            apiCache.deliveries[dateInput] = deliveries;
        } else if (deliveriesRes.status === 401) {
            return logout();
        }

        if (expensesRes.ok) {
            expenses = await expensesRes.json();
            apiCache.expenses[dateInput] = expenses;
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
    const itemsArr = [];
    document.querySelectorAll('.delivery-item-row').forEach(row => {
        const vendorId = row.querySelector('.row-vendor').value;
        const itemId = row.querySelector('.row-item').value;
        const qty = parseFloat(row.querySelector('.row-qty').value) || 0;
        if (vendorId && itemId && qty > 0) {
            itemsArr.push({ vendor_id: vendorId, item_id: itemId, quantity: qty });
        }
    });
    const items_json = itemsArr.length > 0 ? JSON.stringify(itemsArr) : null;
    const editIndex = document.getElementById('edit-delivery-index').value;
    const token = localStorage.getItem('sessionToken');

    if (!date || !location || !rider || !product) {
        return customAlert("Please fill Date, Location, Rider, and Product");
    }

    if (!token) return logout();

    let id = null;
    if (editIndex !== "") {
        const item = deliveries[editIndex];
        if (item) id = item.id;
    }

    const payload = { id, date, location, rider, product, price, fee, items_json };

    // Optimistic Update
    if (editIndex !== "") {
        deliveries[editIndex] = { ...deliveries[editIndex], ...payload };
    } else {
        deliveries.push({ ...payload, id: 'temp-' + Date.now() });
    }
    document.getElementById('edit-delivery-index').value = "";
    document.getElementById('delivery-btn').innerText = "Add Delivery";
    clearInputs(['delivery-location', 'product-name', 'product-price', 'delivery-fee']);
    document.getElementById('delivery-items-container').innerHTML = '';
    renderAll();

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
            clearCache(date);
            await loadData();
        } else {
            const errData = await res.json();
            customAlert(`Error: ${errData.error || 'Failed to save delivery'}`);
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
        return customAlert("Enter expense details and a valid date");
    }

    if (!token) return logout();

    let id = null;
    if (editIndex !== "") {
        const item = expenses[editIndex];
        if (item) id = item.id;
    }

    const payload = { id, date, desc, amt };

    // Optimistic Update
    if (editIndex !== "") {
        expenses[editIndex] = { ...expenses[editIndex], ...payload };
    } else {
        expenses.push({ ...payload, id: 'temp-' + Date.now() });
    }
    document.getElementById('edit-expense-index').value = "";
    document.getElementById('expense-btn').innerText = "Add Expense";
    clearInputs(['expense-desc', 'expense-amt']);
    renderAll();

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
            clearCache(date);
            await loadData();
        } else {
            const errData = await res.json();
            customAlert(`Error: ${errData.error || 'Failed to save expense'}`);
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

    if (!await customConfirm("Are you sure you want to delete this delivery?")) return;

    try {
        const res = await fetch(`/api/deliveries?id=${item.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            clearCache(item.date);
            await loadData();
        } else {
            customAlert('Failed to delete delivery');
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

    if (!await customConfirm("Are you sure you want to delete this expense?")) return;

    try {
        const res = await fetch(`/api/expenses?id=${item.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            clearCache(item.date);
            await loadData();
        } else {
            customAlert('Failed to delete expense');
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
    
    document.getElementById('delivery-items-container').innerHTML = '';
    const items = d.items_json ? JSON.parse(d.items_json) : [];
    if (items.length > 0) {
        items.forEach(item => addDeliveryItemRow(item.vendor_id, item.item_id, item.quantity));
    } else if (d.vendor_id && d.item_id && d.quantity > 0) {
        addDeliveryItemRow(d.vendor_id, d.item_id, d.quantity);
    }
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

    navigator.clipboard.writeText(text).then(() => customAlert("Report Copied!"));
}

// --- INVENTORY MANAGEMENT ---
async function loadInventoryData() {
    const token = localStorage.getItem('sessionToken');
    if (!token) return;
    try {
        const [vendorsRes, itemsRes] = await Promise.all([
            fetch('/api/inventory?action=vendors', { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/inventory?action=items', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        if (vendorsRes.ok) inventoryVendors = await vendorsRes.json();
        if (itemsRes.ok) inventoryItems = await itemsRes.json();
        populateInventoryDropdowns();
    } catch (e) {
        console.error("Failed to load inventory:", e);
    }
}

function populateInventoryDropdowns() {
    let vendorHtml = '<option value="">-- Select Vendor --</option>';
    inventoryVendors.forEach(v => vendorHtml += `<option value="${v.id}">${v.name}</option>`);
    
    const deliveryVendorEl = document.getElementById('delivery-vendor');
    if (deliveryVendorEl) deliveryVendorEl.innerHTML = vendorHtml;
    
    const assignVendorEl = document.getElementById('assign-vendor');
    if (assignVendorEl) assignVendorEl.innerHTML = vendorHtml;

    let itemHtml = '<option value="">-- Select Item --</option>';
    inventoryItems.forEach(i => itemHtml += `<option value="${i.id}">${i.name}</option>`);
    
    const deliveryItemEl = document.getElementById('delivery-item');
    if (deliveryItemEl) deliveryItemEl.innerHTML = itemHtml;
    
    const assignItemEl = document.getElementById('assign-item');
    if (assignItemEl) assignItemEl.innerHTML = itemHtml;

    // Repopulate dynamic delivery item rows
    document.querySelectorAll('.delivery-item-row').forEach(row => {
        const vendorVal = row.querySelector('.row-vendor').value;
        const itemVal = row.querySelector('.row-item').value;
        populateRowVendors(row.id, vendorVal);
        populateRowItems(row.id, itemVal);
    });

    renderManageLists();
}

function filterSelect(selectId, filterText) {
    const select = document.getElementById(selectId);
    if(!select) return;
    const isVendor = selectId.includes('vendor');
    const sourceArray = isVendor ? inventoryVendors : inventoryItems;
    
    // Clear and rebuild options
    select.innerHTML = `<option value="">-- Select ${isVendor ? 'Vendor' : 'Item'} --</option>`;
    
    const text = filterText.toLowerCase();
    sourceArray.forEach(item => {
        if (item.name.toLowerCase().includes(text)) {
            select.innerHTML += `<option value="${item.id}">${item.name}</option>`;
        }
    });
}

function renderManageLists() {
    let vendorHtml = '';
    inventoryVendors.forEach(v => {
        vendorHtml += `<div class="stock-item-row" style="padding: 8px 0;"><span>${v.name}</span><button class="btn btn-danger" style="padding:4px 8px; font-size:0.75rem; width:auto;" onclick="deleteVendor('${v.id}')">Delete</button></div>`;
    });
    document.getElementById('manage-vendors-list').innerHTML = vendorHtml;

    let itemHtml = '';
    inventoryItems.forEach(i => {
        const safeName = encodeURIComponent(i.name || '');
        itemHtml += `<div class="stock-item-row" style="padding: 8px 0;">
            <div class="stock-details">
                <strong class="stock-name">${i.name}</strong>
                <span class="stock-meta">Price: ₦${(parseFloat(i.price) || 0).toLocaleString()}</span>
            </div>
            <div class="stock-actions">
                <button class="btn btn-secondary" style="padding:4px 8px; font-size:0.75rem; width:auto;" onclick="editItem('${i.id}', '${safeName}', ${parseFloat(i.price) || 0})">Edit</button>
                <button class="btn btn-danger" style="padding:4px 8px; font-size:0.75rem; width:auto;" onclick="deleteItem('${i.id}')">Delete</button>
            </div>
        </div>`;
    });
    document.getElementById('manage-items-list').innerHTML = itemHtml;
}

async function addVendor() {
    const name = document.getElementById('new-vendor-name').value.trim();
    if(!name) return customAlert("Vendor name required");
    
    // Optimistic Update
    const tempId = 'temp-' + Date.now();
    inventoryVendors.push({ id: tempId, name: name });
    populateInventoryDropdowns();
    document.getElementById('new-vendor-name').value = "";
    
    const token = localStorage.getItem('sessionToken');
    try {
        const res = await fetch('/api/inventory?action=vendors', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name })
        });
        if(res.ok) {
            loadInventoryData(); // sync
        } else {
            customAlert("Failed to add vendor");
            loadInventoryData();
        }
    } catch(e) {
        loadInventoryData();
    }
}

async function addInventoryItem() {
    const name = document.getElementById('new-item-name').value.trim();
    const price = parseFloat(document.getElementById('new-item-price').value) || 0;
    if(!name) return customAlert("Item name required");
    
    // Optimistic Update
    inventoryItems.push({ id: 'temp-' + Date.now(), name, price, general_stock_balance: 0 });
    populateInventoryDropdowns();
    document.getElementById('new-item-name').value = "";
    document.getElementById('new-item-price').value = "";
    
    const token = localStorage.getItem('sessionToken');
    try {
        const res = await fetch('/api/inventory?action=items', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name, price, general_stock_balance: 0 })
        });
        if(res.ok) {
            loadInventoryData(); // sync
        } else {
            customAlert("Failed to add item");
            loadInventoryData();
        }
    } catch(e) {
        loadInventoryData();
    }
}

async function assignStock() {
    const vendor_id = document.getElementById('assign-vendor').value;
    const item_id = document.getElementById('assign-item').value;
    const quantity = parseFloat(document.getElementById('assign-qty').value) || 0;
    
    if(!vendor_id || !item_id || !quantity) return customAlert("Fill all fields correctly");
    
    const v = inventoryVendors.find(x => x.id == vendor_id);
    const i = inventoryItems.find(x => x.id == item_id);
    
    // Optimistic Update
    const existingStock = inventoryStocks.find(s => s.vendor_id == vendor_id && s.item_id == item_id);
    if (existingStock) {
        existingStock.quantity = parseFloat(existingStock.quantity) + quantity;
    } else {
        inventoryStocks.push({
            id: 'temp-' + Date.now(),
            vendor_id, item_id, quantity,
            vendor_name: v ? v.name : 'Unknown Vendor',
            item_name: i ? i.name : 'Unknown Item',
            item_price: i ? i.price : 0
        });
    }
    renderVendorStocks();
    
    document.getElementById('assign-qty').value = "";
    document.getElementById('assign-vendor').value = "";
    document.getElementById('assign-item').value = "";
    
    const token = localStorage.getItem('sessionToken');
    try {
        const res = await fetch('/api/inventory?action=assign', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ vendor_id, item_id, quantity })
        });
        if(res.ok) {
            loadVendorStocks();
        } else {
            customAlert("Failed to assign stock");
            loadVendorStocks();
        }
    } catch(e) {
        loadVendorStocks();
    }
}

async function deleteVendor(id) {
    if(!await customConfirm("Delete vendor? This will also remove their stock balances.")) return;
    
    // Optimistic Update
    inventoryVendors = inventoryVendors.filter(v => v.id != id);
    inventoryStocks = inventoryStocks.filter(s => s.vendor_id != id);
    populateInventoryDropdowns();
    renderVendorStocks();
    
    const token = localStorage.getItem('sessionToken');
    try {
        await fetch(`/api/inventory?action=vendors&id=${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        loadInventoryData();
        loadVendorStocks();
    } catch(e) {
        loadInventoryData();
        loadVendorStocks();
    }
}

async function deleteItem(id) {
    if(!await customConfirm("Delete item? This removes it everywhere.")) return;
    
    // Optimistic Update
    inventoryItems = inventoryItems.filter(i => i.id != id);
    inventoryStocks = inventoryStocks.filter(s => s.item_id != id);
    populateInventoryDropdowns();
    renderVendorStocks();
    
    const token = localStorage.getItem('sessionToken');
    try {
        await fetch(`/api/inventory?action=items&id=${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        loadInventoryData();
        loadVendorStocks();
    } catch(e) {
        loadInventoryData();
        loadVendorStocks();
    }
}

async function editItem(id, encodedName, currentPrice) {
    const name = decodeURIComponent(encodedName);
    const newPrice = await customPrompt(`Update price for ${name} (₦):`, currentPrice);
    if (newPrice === null) return;
    
    // Optimistic Update
    const itemIndex = inventoryItems.findIndex(i => i.id == id);
    if (itemIndex > -1) {
        inventoryItems[itemIndex].price = parseFloat(newPrice) || 0;
        renderManageLists();
        populateInventoryDropdowns();
        
        // Update price in vendor stocks immediately
        inventoryStocks.forEach(stock => {
            if (stock.item_id == id) {
                stock.item_price = parseFloat(newPrice) || 0;
            }
        });
        renderVendorStocks();

        // Update delivery form if any item was edited
        if (typeof updateProductNameFromRows === 'function') {
            updateProductNameFromRows();
        }
    }
    
    const token = localStorage.getItem('sessionToken');
    try {
        const res = await fetch('/api/inventory?action=items', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ id: id, price: parseFloat(newPrice) || 0, general_stock_balance: 0 })
        });
        if (!res.ok) {
            customAlert("Failed to update item");
            loadInventoryData();
            loadVendorStocks();
        } else {
            // Also sync in background
            loadInventoryData();
            loadVendorStocks();
        }
    } catch(e) {
        loadInventoryData();
        loadVendorStocks();
    }
}

async function deleteStock(id) {
    if(!await customConfirm("Delete this stock assignment?")) return;
    
    // Optimistic Update
    inventoryStocks = inventoryStocks.filter(s => s.id != id);
    renderVendorStocks();
    
    const token = localStorage.getItem('sessionToken');
    try {
        await fetch(`/api/inventory?action=vendor-stocks&id=${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        loadVendorStocks();
    } catch(e) {
        loadVendorStocks();
    }
}

async function editStock(id, currentQty, encodedItemName) {
    const itemName = decodeURIComponent(encodedItemName);
    const newQty = await customPrompt(`Update stock quantity for ${itemName}:`, currentQty);
    if (newQty === null) return; // cancelled
    if (isNaN(newQty) || newQty === "") return customAlert("Invalid quantity");
    
    // Optimistic Update
    const stockIndex = inventoryStocks.findIndex(s => s.id == id);
    if (stockIndex > -1) {
        inventoryStocks[stockIndex].quantity = parseFloat(newQty);
        renderVendorStocks();
    }
    
    const token = localStorage.getItem('sessionToken');
    try {
        const res = await fetch('/api/inventory?action=vendor-stocks', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ id: id, quantity: parseFloat(newQty) })
        });
        if (res.ok) {
            loadVendorStocks();
        } else {
            customAlert("Failed to update stock");
            loadVendorStocks();
        }
    } catch(e) {
        loadVendorStocks();
    }
}

async function loadVendorStocks() {
    const token = localStorage.getItem('sessionToken');
    try {
        const res = await fetch('/api/inventory?action=vendor-stocks', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            inventoryStocks = await res.json();
            renderVendorStocks();
        }
    } catch(e) {
        console.error("Failed to load vendor stocks");
    }
}

function renderVendorStocks() {
    const container = document.getElementById('vendor-stock-list');
    if (inventoryStocks.length === 0) {
        container.innerHTML = "<p style='color:var(--text-muted); text-align:center; padding: 20px 0;'>No stock balances found.</p>";
        return;
    }
    
    const grouped = {};
    inventoryStocks.forEach(row => {
        if(!grouped[row.vendor_name]) grouped[row.vendor_name] = [];
        grouped[row.vendor_name].push(row);
    });

    let html = "";
    let grandTotalValue = 0;
    
    for (const [vName, stocks] of Object.entries(grouped)) {
        let vendorTotal = 0;
        
        let rowsHtml = "";
        stocks.forEach(row => {
            const lineTotal = (parseFloat(row.quantity) || 0) * (parseFloat(row.item_price) || 0);
            vendorTotal += lineTotal;
            grandTotalValue += lineTotal;
            const safeItemName = encodeURIComponent(row.item_name || '');
            rowsHtml += `<div class="stock-item-row">
                <div class="stock-details">
                    <span class="stock-name">${row.item_name}</span>
                    <span class="stock-meta">
                        Stock: <strong>${row.quantity}</strong> 
                        | Value: <strong>₦${lineTotal.toLocaleString()}</strong> 
                        (@ ₦${(parseFloat(row.item_price) || 0).toLocaleString()})
                    </span>
                </div>
                <div class="stock-actions">
                    <button class="btn btn-secondary" style="padding:6px 12px; font-size:0.8rem; width:auto;" onclick="editStock('${row.id}', ${row.quantity}, '${safeItemName}')">Edit</button>
                    <button class="btn btn-danger" style="padding:6px 12px; font-size:0.8rem; width:auto;" onclick="deleteStock('${row.id}')">Delete</button>
                </div>
            </div>`;
        });
        
        html += `<div class="vendor-card">
            <div class="vendor-card-header" onclick="toggleVendorCard(this)" style="cursor: pointer;">
                <div>
                    <div class="vendor-name">${vName} <span class="vendor-toggle-icon" style="font-size: 0.8em; margin-left: 5px;">▼</span></div>
                    <div class="vendor-total">Total Value: <span class="vendor-total-val">₦${vendorTotal.toLocaleString()}</span></div>
                </div>
                <button class="btn btn-secondary" style="padding:4px 10px; font-size:0.75rem; width:auto;" onclick="event.stopPropagation(); copyVendorInventory('${vName}')">Copy</button>
            </div>`;
        html += `<div class="vendor-card-body" style="display: none;">`;
        html += rowsHtml;
        html += `</div></div>`;
    }
    
    // Append Grand Total
    html += `<div class="grand-total-box">
        <div class="grand-total-label">Grand Total Value</div>
        <div class="grand-total-value">₦${grandTotalValue.toLocaleString()}</div>
    </div>`;
    
    container.innerHTML = html;
}

function copyAllInventory() {
    let text = "=== ALL INVENTORY BALANCES ===\n\n";
    let hasData = false;
    document.querySelectorAll('#vendor-stock-list > div').forEach(div => {
        const vendorName = div.querySelector('strong')?.innerText;
        if(vendorName) {
            hasData = true;
            text += `${vendorName.toUpperCase()}\n`;
            div.querySelectorAll('div > span').forEach(span => {
                text += `- ${span.innerText}\n`;
            });
            text += "\n";
        }
    });
    if(!hasData) return customAlert("No inventory to copy.");
    navigator.clipboard.writeText(text).then(() => customAlert("All Inventory Copied!"));
}

window.toggleVendorCard = function(headerElement) {
    const card = headerElement.closest('.vendor-card');
    const body = card.querySelector('.vendor-card-body');
    const icon = headerElement.querySelector('.vendor-toggle-icon');
    const isCurrentlyOpen = body.style.display === 'block';

    // Close all others
    document.querySelectorAll('#vendor-stock-list .vendor-card').forEach(el => {
        const otherBody = el.querySelector('.vendor-card-body');
        const otherIcon = el.querySelector('.vendor-toggle-icon');
        if (otherBody) otherBody.style.display = 'none';
        if (otherIcon) otherIcon.innerHTML = '▼';
    });

    // If it wasn't open, open it
    if (!isCurrentlyOpen) {
        body.style.display = 'block';
        if (icon) icon.innerHTML = '▲';
    }
}

function copyVendorInventory(vendorName) {
    let text = `=== INVENTORY FOR ${vendorName.toUpperCase()} ===\n\n`;
    document.querySelectorAll('#vendor-stock-list .vendor-card').forEach(div => {
        const vName = div.querySelector('.vendor-name')?.innerText;
        if(vName === vendorName) {
            div.querySelectorAll('.stock-item-row .stock-name').forEach((span, idx) => {
                const qtyStr = div.querySelectorAll('.stock-item-row .stock-meta strong')[idx * 2]?.innerText || '0';
                text += `- ${span.innerText}: ${qtyStr}\n`;
            });
        }
    });
    navigator.clipboard.writeText(text).then(() => customAlert(`Inventory for ${vendorName} Copied!`));
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
}

function onDeliveryItemChange() {
    if (typeof updateProductNameFromRows === 'function') {
        updateProductNameFromRows();
    }
}

// On load set theme
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
});

// Make functions globally available
window.addVendor = addVendor;
window.addInventoryItem = addInventoryItem;
window.assignStock = assignStock;
window.loadVendorStocks = loadVendorStocks;
window.deleteVendor = deleteVendor;
window.deleteItem = deleteItem;
window.editItem = editItem;
window.deleteStock = deleteStock;
window.editStock = editStock;
window.copyAllInventory = copyAllInventory;
window.copyVendorInventory = copyVendorInventory;
window.filterSelect = filterSelect;
window.toggleTheme = toggleTheme;
window.onDeliveryItemChange = onDeliveryItemChange;



window.addDeliveryItemRow = function(vendorId = '', itemId = '', quantity = '') {
    const container = document.getElementById('delivery-items-container');
    const rowId = 'item-row-' + Date.now() + Math.floor(Math.random()*1000);
    const rowHTML = `
        <div id="${rowId}" class="delivery-item-row" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: flex-end; padding-bottom: 10px; border-bottom: 1px dashed var(--surface-border);">
            <div style="flex: 1;">
                <label style="font-size: 0.75rem;">Vendor</label>
                <select class="styled-select row-vendor" onchange="populateRowItems('${rowId}')">
                    <option value="">-- Select --</option>
                </select>
            </div>
            <div style="flex: 1;">
                <label style="font-size: 0.75rem;">Item</label>
                <select class="styled-select row-item" onchange="updateProductNameFromRows()">
                    <option value="">-- Select --</option>
                </select>
            </div>
            <div style="width: 80px;">
                <label style="font-size: 0.75rem;">Qty</label>
                <input type="number" class="row-qty" value="${quantity}" placeholder="0" style="width: 100%;">
            </div>
            <div style="width: auto;">
                <button type="button" class="btn btn-danger" onclick="document.getElementById('${rowId}').remove(); updateProductNameFromRows();" style="padding: 6px 10px; font-size: 0.8rem; width: auto; margin-bottom: 4px;" title="Remove Item">✕</button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', rowHTML);
    populateRowVendors(rowId, vendorId);
    if (vendorId) {
        populateRowItems(rowId, itemId);
    }
};

window.populateRowVendors = function(rowId, selectedVendorId = '') {
    const row = document.getElementById(rowId);
    if (!row) return;
    const vendorSelect = row.querySelector('.row-vendor');
    vendorSelect.innerHTML = '<option value="">-- Select --</option>';
    inventoryVendors.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.innerText = v.name;
        if (v.id == selectedVendorId) opt.selected = true;
        vendorSelect.appendChild(opt);
    });
};

window.populateRowItems = function(rowId, selectedItemId = '') {
    const row = document.getElementById(rowId);
    if (!row) return;
    const vendorId = row.querySelector('.row-vendor').value;
    const itemSelect = row.querySelector('.row-item');
    itemSelect.innerHTML = '<option value="">-- Select --</option>';
    
    if (vendorId) {
        const availableStocks = inventoryStocks.filter(s => s.vendor_id == vendorId && parseFloat(s.quantity) > 0);
        availableStocks.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.item_id;
            opt.innerText = `${s.item_name} (Qty: ${s.quantity})`;
            if (s.item_id == selectedItemId) opt.selected = true;
            itemSelect.appendChild(opt);
        });
    }
    updateProductNameFromRows();
};

window.updateProductNameFromRows = function() {
    let names = [];
    let totalPrice = 0;
    document.querySelectorAll('.delivery-item-row').forEach(row => {
        const itemSelect = row.querySelector('.row-item');
        if (itemSelect.selectedIndex > 0) {
            // Strip the (Qty: X) part
            const text = itemSelect.options[itemSelect.selectedIndex].text.split(' (Qty:')[0];
            names.push(text);
            const itemId = itemSelect.value;
            const productData = inventoryItems.find(i => i.id == itemId);
            if(productData) {
                totalPrice += (parseFloat(productData.price) || 0);
            }
        }
    });
    
    if (names.length > 0) {
        document.getElementById('product-name').value = names.join(', ');
        // We only automatically set the price if the user hasn't overridden it, or if we want to force it:
        document.getElementById('product-price').value = totalPrice;
        document.getElementById('product-name').parentElement.style.display = 'none';
    } else {
        document.getElementById('product-name').parentElement.style.display = 'flex';
        document.getElementById('product-price').value = '';
        document.getElementById('product-name').value = '';
    }
};
