const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// Replace confirm with await customConfirm
code = code.replace(/confirm\(/g, 'await customConfirm(');

// Replace prompt with await customPrompt
code = code.replace(/prompt\(/g, 'await customPrompt(');

// Replace alert with customAlert
code = code.replace(/alert\(/g, 'customAlert(');

// Prepend the custom modal UI code to app.js
const customUI = `
// --- Custom Popup UI ---
function createPopupOverlay() {
    let overlay = document.getElementById('custom-popup-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'custom-popup-overlay';
        overlay.style.cssText = \`
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
            z-index: 10000; opacity: 0; transition: opacity 0.3s ease; pointer-events: none;
        \`;
        document.body.appendChild(overlay);
    }
    return overlay;
}

window.customAlert = function(msg) {
    return new Promise(resolve => {
        const overlay = createPopupOverlay();
        overlay.innerHTML = \`
            <div style="background: var(--surface-bg, #fff); color: var(--text-main, #333); padding: 24px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); max-width: 400px; width: 90%; text-align: center; transform: translateY(-20px); transition: transform 0.3s ease;">
                <p style="margin: 0 0 20px 0; font-size: 1.1rem;">\${msg}</p>
                <button id="custom-alert-btn" style="background: var(--primary-color, #4361ee); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">OK</button>
            </div>
        \`;
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
        overlay.innerHTML = \`
            <div style="background: var(--surface-bg, #fff); color: var(--text-main, #333); padding: 24px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); max-width: 400px; width: 90%; text-align: center; transform: translateY(-20px); transition: transform 0.3s ease;">
                <p style="margin: 0 0 20px 0; font-size: 1.1rem;">\${msg}</p>
                <div style="display: flex; justify-content: center; gap: 12px;">
                    <button id="custom-confirm-cancel" style="background: var(--surface-border, #ddd); color: var(--text-main, #333); border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">Cancel</button>
                    <button id="custom-confirm-ok" style="background: var(--danger-color, #ef233c); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">Confirm</button>
                </div>
            </div>
        \`;
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
        overlay.innerHTML = \`
            <div style="background: var(--surface-bg, #fff); color: var(--text-main, #333); padding: 24px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); max-width: 400px; width: 90%; text-align: center; transform: translateY(-20px); transition: transform 0.3s ease;">
                <p style="margin: 0 0 15px 0; font-size: 1.1rem; text-align: left;">\${msg}</p>
                <input type="text" id="custom-prompt-input" value="\${defaultVal}" style="width: 100%; padding: 10px; border: 1px solid var(--surface-border, #ccc); border-radius: 6px; margin-bottom: 20px; background: var(--bg-color, #fff); color: var(--text-main, #333); outline: none;">
                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button id="custom-prompt-cancel" style="background: var(--surface-border, #ddd); color: var(--text-main, #333); border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">Cancel</button>
                    <button id="custom-prompt-ok" style="background: var(--primary-color, #4361ee); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">OK</button>
                </div>
            </div>
        \`;
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
` + "\n\n" + code;

fs.writeFileSync('app.js', code);
console.log('Replacements completed.');
