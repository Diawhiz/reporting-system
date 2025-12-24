let deliveries = [];
let expenses = [];

document.getElementById('report-date').valueAsDate = new Date();

function addOrUpdateDelivery() {
    const location = document.getElementById('delivery-location').value.trim();
    const rider = document.getElementById('rider-name').value.trim();
    const product = document.getElementById('product-name').value.trim();
    const price = parseFloat(document.getElementById('product-price').value) || 0;
    const fee = parseFloat(document.getElementById('delivery-fee').value) || 0;
    const editIndex = document.getElementById('edit-delivery-index').value;

    if (!location || !rider || !product) return alert("Please fill Location, Rider, and Product");

    const obj = { location, rider, product, price, fee };

    if (editIndex !== "") {
        deliveries[editIndex] = obj;
        document.getElementById('edit-delivery-index').value = "";
        document.getElementById('delivery-btn').innerText = "Add Delivery";
    } else {
        deliveries.push(obj);
    }

    clearInputs(['delivery-location', 'product-name', 'product-price', 'delivery-fee']);
    renderAll();
}

function renderDeliveries() {
    const container = document.getElementById('delivery-list');
    container.innerHTML = "<h3>=== DELIVERED ORDERS ===</h3>";

    // NEW LOGIC: Group strictly by Rider Name
    const groupedByRider = {};
    deliveries.forEach((d, i) => {
        if (!groupedByRider[d.rider]) groupedByRider[d.rider] = [];
        groupedByRider[d.rider].push({ ...d, originalIndex: i });
    });

    for (const riderName in groupedByRider) {
        let riderTotal = 0;
        let html = `<div class="rider-block"><strong>Rider: ${riderName}</strong>`;
        
        groupedByRider[riderName].forEach(item => {
            riderTotal += item.price;
            html += `
                <div class="item-row">
                    <span><strong>${item.location}</strong>: ${item.product} - ${item.price.toLocaleString()} (${item.fee.toLocaleString()})</span>
                    <div class="action-btns">
                        <button style="background:orange" onclick="editDelivery(${item.originalIndex})">Edit</button>
                        <button style="background:red; color:white;" onclick="deleteDelivery(${item.originalIndex})">Del</button>
                    </div>
                </div>`;
        });
        
        html += `<div style="margin-top:5px; font-size:0.9rem; color:var(--accent);">Total for ${riderName}: <strong>${riderTotal.toLocaleString()}</strong></div></div>`;
        container.innerHTML += html;
    }
}

// --- PLAIN TEXT COPY (RESTRUCTURED) ---
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
            text += `- ${globalCount}. ${item.location}: ${item.product} ${item.price.toLocaleString()} (${item.fee.toLocaleString()})\n`;
            riderSubtotal += item.price;
            totalSales += item.price;
            globalCount++;
        });
        text += `- Total for ${rider}: ${riderSubtotal.toLocaleString()}\n\n`;
    }

    text += `TOTAL SALES: ${totalSales.toLocaleString()}\n\n=== EXPENSES ===\n`;
    let totalExp = 0;
    expenses.forEach((e, i) => {
        text += `- ${i + 1}. ${e.desc} ${e.amt.toLocaleString()}\n`;
        totalExp += e.amt;
    });

    text += `--- TOTAL EXPENSES: ${totalExp.toLocaleString()}\n\n`;
    text += `=== RECONCILIATION ===\n`;
    text += `Client Funds Collected (${totalSales.toLocaleString()}) - Total Expenses Paid (${totalExp.toLocaleString()}) = Balance: ${(totalSales - totalExp).toLocaleString()}\n\n`;
    text += `= FINAL TRANSFER AMOUNT: ${(totalSales - totalExp).toLocaleString()}`;

    navigator.clipboard.writeText(text).then(() => alert("Report Copied in Rider-Priority Format!"));
}

// Use the previous Edit/Delete/Summary functions provided in the last response...
function editDelivery(index) {
    const d = deliveries[index];
    document.getElementById('delivery-location').value = d.location;
    document.getElementById('rider-name').value = d.rider;
    document.getElementById('product-name').value = d.product;
    document.getElementById('product-price').value = d.price;
    document.getElementById('delivery-fee').value = d.fee;
    document.getElementById('edit-delivery-index').value = index;
    document.getElementById('delivery-btn').innerText = "Update Detail";
    window.scrollTo(0,0);
}
function addOrUpdateExpense() {
    const desc = document.getElementById('expense-desc').value.trim();
    const amt = parseFloat(document.getElementById('expense-amt').value) || 0;
    const editIndex = document.getElementById('edit-expense-index').value;
    if (!desc || amt <= 0) return alert("Enter expense details");
    if (editIndex !== "") {
        expenses[editIndex] = { desc, amt };
        document.getElementById('edit-expense-index').value = "";
        document.getElementById('expense-btn').innerText = "Add Expense";
    } else { expenses.push({ desc, amt }); }
    clearInputs(['expense-desc', 'expense-amt']);
    renderAll();
}
function renderExpenses() {
    const container = document.getElementById('expense-list');
    container.innerHTML = "<h3>=== EXPENSES ===</h3>";
    expenses.forEach((e, i) => {
        container.innerHTML += `<div class="item-row"><span>${e.desc}: ${e.amt.toLocaleString()}</span><div class="action-btns"><button style="background:orange" onclick="editExpense(${i})">Edit</button><button style="background:red; color:white;" onclick="deleteExpense(${i})">Del</button></div></div>`;
    });
}
function editExpense(index) {
    const e = expenses[index];
    document.getElementById('expense-desc').value = e.desc;
    document.getElementById('expense-amt').value = e.amt;
    document.getElementById('edit-expense-index').value = index;
    document.getElementById('expense-btn').innerText = "Update Expense";
}
function renderAll() { renderDeliveries(); renderExpenses(); renderSummary(); }
function renderSummary() {
    const totalSales = deliveries.reduce((sum, d) => sum + d.price, 0);
    const totalExp = expenses.reduce((sum, e) => sum + e.amt, 0);
    document.getElementById('reconciliation-summary').innerHTML = `<div class="summary-box"><h3>=== RECONCILIATION ===</h3><p>Sales: ${totalSales.toLocaleString()}</p><p>Expenses: ${totalExp.toLocaleString()}</p><h4 style="margin:10px 0 0 0; color:var(--accent)">Final Transfer: ${(totalSales - totalExp).toLocaleString()}</h4></div>`;
}
function deleteDelivery(i) { deliveries.splice(i, 1); renderAll(); }
function deleteExpense(i) { expenses.splice(i, 1); renderAll(); }
function clearInputs(ids) { ids.forEach(id => document.getElementById(id).value = ""); }