const fs = require('fs');

let appCode = fs.readFileSync('app.js', 'utf8');

// Replace addOrUpdateDelivery
appCode = appCode.replace(
    /const vendor_id = document\.getElementById\('delivery-vendor'\)\.value \|\| null;[\s\S]*?const payload = { id, date, location, rider, product, price, fee, vendor_id, item_id, quantity };/,
    `const itemsArr = [];
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

    const payload = { id, date, location, rider, product, price, fee, items_json };`
);

appCode = appCode.replace(
    /clearInputs\(\['delivery-location', 'product-name', 'product-price', 'delivery-fee', 'delivery-quantity'\]\);\n\s*document\.getElementById\('delivery-vendor'\)\.value = "";\n\s*document\.getElementById\('delivery-item'\)\.value = "";/,
    `clearInputs(['delivery-location', 'product-name', 'product-price', 'delivery-fee']);
    document.getElementById('delivery-items-container').innerHTML = '';`
);

// editDelivery
appCode = appCode.replace(
    /document\.getElementById\('delivery-vendor'\)\.value = d\.vendor_id \|\| "";\n\s*document\.getElementById\('delivery-item'\)\.value = d\.item_id \|\| "";\n\s*document\.getElementById\('delivery-quantity'\)\.value = d\.quantity \|\| "";/,
    `document.getElementById('delivery-items-container').innerHTML = '';
    const items = d.items_json ? JSON.parse(d.items_json) : [];
    if (items.length > 0) {
        items.forEach(item => addDeliveryItemRow(item.vendor_id, item.item_id, item.quantity));
    } else if (d.vendor_id && d.item_id && d.quantity > 0) {
        addDeliveryItemRow(d.vendor_id, d.item_id, d.quantity);
    }`
);

// clearInputs also used elsewhere?
const newFunctions = `
window.addDeliveryItemRow = function(vendorId = '', itemId = '', quantity = '') {
    const container = document.getElementById('delivery-items-container');
    const rowId = 'item-row-' + Date.now() + Math.floor(Math.random()*1000);
    const rowHTML = \`
        <div id="\${rowId}" class="delivery-item-row" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: flex-end; padding-bottom: 10px; border-bottom: 1px dashed var(--surface-border);">
            <div style="flex: 1;">
                <label style="font-size: 0.75rem;">Vendor</label>
                <select class="styled-select row-vendor" onchange="populateRowItems('\${rowId}')">
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
                <input type="number" class="row-qty" value="\${quantity}" placeholder="0" style="width: 100%;">
            </div>
            <button type="button" class="btn btn-danger" onclick="document.getElementById('\${rowId}').remove(); updateProductNameFromRows();" style="padding: 8px; margin-bottom: 2px;">X</button>
        </div>
    \`;
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
            opt.innerText = \`\${s.item_name} (Qty: \${s.quantity})\`;
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
`;

appCode += "\n" + newFunctions;

fs.writeFileSync('app.js', appCode);
console.log("App code patched");
