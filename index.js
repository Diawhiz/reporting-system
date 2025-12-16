const STORAGE_KEY = 'logistics_report_data';

// --- Data Management Functions ---

const getTodayDateKey = () => document.getElementById('reportDateInput').value;

const getReportData = (dateKey) => {
    const storedData = localStorage.getItem(STORAGE_KEY);
    const data = storedData ? JSON.parse(storedData) : {};
    return data[dateKey] || { orders: [], expenses: [], cashWithRiders: 0 };
};

const saveReportData = (dateKey, data) => {
    const storedData = localStorage.getItem(STORAGE_KEY);
    let allData = storedData ? JSON.parse(storedData) : {};
    allData[dateKey] = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
    generateReport(); // Refresh report after saving
};

// --- Copy Functionality ---

const copyReportToClipboard = () => {
    const reportContainer = document.getElementById('reportContainer');
    const reportDate = document.getElementById('reportDateInput').value;
    
    // Create a temporary element to hold the report HTML for text extraction
    const tempElement = document.createElement('div');
    tempElement.innerHTML = reportContainer.innerHTML;

    // Get the raw text and clean it up for pasting (removes excessive whitespace/newlines)
    let reportText = tempElement.innerText;
    reportText = reportText.replace(/\n\s*\n/g, '\n\n').trim();
    
    // Format header
    const headerText = `\n--- DAILY REPORT FOR ${reportDate} ---\n\n`;

    // Use the modern Clipboard API
    navigator.clipboard.writeText(headerText + reportText).then(() => {
        // Provide visual feedback
        const button = document.getElementById('copyReportButton');
        const originalText = button.textContent;
        button.textContent = '✅ Copied!';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);

    }).catch(err => {
        console.error('Could not copy text: ', err);
        alert('❌ Error copying report. Please check the browser console.');
    });
};


// --- Initialization and Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('reportDateInput');
    
    // Set default date to today and load report
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    generateReport();

    // Load report when date changes
    dateInput.addEventListener('change', generateReport);

    // Form Submission Handlers
    document.getElementById('orderForm').addEventListener('submit', handleOrderSubmit);
    document.getElementById('expenseForm').addEventListener('submit', handleExpenseSubmit);
    document.getElementById('settlementForm').addEventListener('submit', handleSettlementSubmit);
    
    // New: Copy Button Listener
    document.getElementById('copyReportButton').addEventListener('click', copyReportToClipboard);
});

// --- Submission Handlers (UNCHANGED) ---

const handleOrderSubmit = (e) => {
    e.preventDefault();
    const dateKey = getTodayDateKey();
    const data = getReportData(dateKey);

    const newOrder = {
        id: Date.now(), // Unique ID
        itemDescription: document.getElementById('orderItem').value,
        clientPrice: Number(document.getElementById('orderPrice').value),
        deliveryFee: Number(document.getElementById('deliveryFee').value),
        riderTag: document.getElementById('riderTag').value,
        location: document.getElementById('orderLocation').value,
        isCash: document.getElementById('isCash').checked,
        isDelivered: document.getElementById('isDelivered').checked,
    };
    
    data.orders.push(newOrder);
    saveReportData(dateKey, data);
    e.target.reset(); // Clear form
};

const handleExpenseSubmit = (e) => {
    e.preventDefault();
    const dateKey = getTodayDateKey();
    const data = getReportData(dateKey);

    const newExpense = {
        id: Date.now(),
        description: document.getElementById('expenseDescription').value,
        amount: Number(document.getElementById('expenseAmount').value),
    };
    
    data.expenses.push(newExpense);
    saveReportData(dateKey, data);
    e.target.reset(); 
};

const handleSettlementSubmit = (e) => {
    e.preventDefault();
    const dateKey = getTodayDateKey();
    const data = getReportData(dateKey);

    data.cashWithRiders = Number(document.getElementById('cashWithRiders').value) || 0;
    
    saveReportData(dateKey, data);
};

// --- Report Generation (UPDATED FOR COPY BUTTON) ---

const formatCurrency = (amount) => amount.toLocaleString('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 });

const generateReport = () => {
    const dateKey = getTodayDateKey();
    const { orders, expenses, cashWithRiders } = getReportData(dateKey);
    const container = document.getElementById('reportContainer');
    const copyButton = document.getElementById('copyReportButton'); // Get copy button reference
    
    if (orders.length === 0 && expenses.length === 0 && cashWithRiders === 0) {
        container.innerHTML = `<p>No data recorded for ${dateKey}. Start adding orders and expenses above.</p>`;
        copyButton.style.display = 'none'; // Hide button if no data
        return;
    }
    
    copyButton.style.display = 'block'; // Show button if data exists

    // 1. Group Orders by Rider/Location
    const groupedOrders = orders.reduce((acc, order) => {
        if (!order.isDelivered) return acc;
        const key = `${order.location} (${order.riderTag})`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(order);
        return acc;
    }, {});

    // 2. Calculations
    const totalClientFunds = orders.filter(o => o.isDelivered).reduce((sum, o) => sum + o.clientPrice, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const firstBalance = totalClientFunds - totalExpenses;
    const finalBalance = firstBalance - cashWithRiders;
    
    // --- HTML Rendering ---
    let reportHTML = `
        <h2>📅 Report for: ${dateKey}</h2>
        <hr/>
        <h3>📦 Delivered Orders Summary</h3>
    `;

    // A. Render Grouped Orders
    let orderIndex = 1;
    for (const [riderKey, riderOrders] of Object.entries(groupedOrders)) {
        const subtotal = riderOrders.reduce((sum, o) => sum + o.clientPrice, 0);
        
        reportHTML += `<div class="rider-group">
            <h3>${riderKey}</h3>
            <ol>`;
        
        riderOrders.forEach(order => {
            const clientPrice = order.clientPrice.toLocaleString();
            const deliveryFee = order.deliveryFee.toLocaleString();
            const cashTag = order.isCash ? ' (cash)' : '';
            reportHTML += `<li>${orderIndex++}. ${order.itemDescription} - ${clientPrice} (${deliveryFee})${cashTag}</li>`;
        });

        reportHTML += `</ol>
            <p class="summary-line">
                Total for ${riderKey}: ${subtotal.toLocaleString()}
            </p>
            <hr/>
        </div>`;
    }

    reportHTML += `<div class="summary-line">
        <strong>TOTAL SALES (Client Funds Collected): ${totalClientFunds.toLocaleString()}</strong>
    </div>
    
    <hr/>
    
    <h3>💸 Expenses</h3>
    <ol class="expense-list">`;
    
    // B. Render Expenses
    expenses.forEach((expense, index) => {
        reportHTML += `<li>${index + 1}. ${expense.description} - ${expense.amount.toLocaleString()}</li>`;
    });

    reportHTML += `</ol>
    <div class="summary-line">
        <strong>TOTAL EXPENSES: ${totalExpenses.toLocaleString()}</strong>
    </div>

    <hr/>
    
    <h3>💰 Reconciliation Summary</h3>
    
    <p>Client Funds Collected (${totalClientFunds.toLocaleString()})</p>
    <p>- Total Expenses Paid (${totalExpenses.toLocaleString()})</p>
    <p class="summary-line">
        = Balance: ${firstBalance.toLocaleString()}
    </p>

    <p>- Cash with Riders (Outstanding): ${cashWithRiders.toLocaleString()}</p>

    <p class="final-balance">
        = FINAL TRANSFER AMOUNT: ${finalBalance.toLocaleString()}
    </p>
    `;

    container.innerHTML = reportHTML;
    
    // Update Cash with Riders input field to reflect current stored value
    document.getElementById('cashWithRiders').value = cashWithRiders;
};
  
