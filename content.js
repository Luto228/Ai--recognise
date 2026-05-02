/* Injecting a floating button as described in the README */

const button = document.createElement('div');
button.id = 'ai-recognizer-floating-btn';
button.innerHTML = '🤖';
button.title = 'Open AI Recognizer';
document.body.appendChild(button);

const bubble = document.createElement('div');
bubble.id = 'ai-recognizer-bubble';
bubble.innerHTML = 'Выделяй, я смотрю! 👀';
document.body.appendChild(bubble);

let isInspectMode = false;

function toggleInspectMode() {
    isInspectMode = !isInspectMode;
    if (isInspectMode) {
        document.body.classList.add('ai-inspect-mode');
        bubble.classList.add('show');
    } else {
        document.body.classList.remove('ai-inspect-mode');
        bubble.classList.remove('show');
        // Clear all hovers just in case
        document.querySelectorAll('.ai-inspect-hover').forEach(el => el.classList.remove('ai-inspect-hover'));
    }
}

let clickTimer = null;
button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.detail === 1) {
        clickTimer = setTimeout(() => {
            toggleInspectMode();
        }, 200);
    }
});

button.addEventListener('dblclick', (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearTimeout(clickTimer);
    if (isInspectMode) toggleInspectMode();
    showProfileModal();
});

function showProfileModal() {
    let modal = document.getElementById('ai-recognizer-profile');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ai-recognizer-profile';
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    chrome.storage.local.get(['killedAI', 'studiedHuman'], (data) => {
        let killedAI = data.killedAI || [];
        let studiedHuman = data.studiedHuman || [];
        
        modal.innerHTML = `
            <div class="ai-profile-content">
                <div class="ai-modal-close" id="ai-profile-close-btn">×</div>
                <h2>Статистика Бота 🤖</h2>
                
                <div class="ai-stats-container">
                    <div class="ai-stat-box ai-stat-danger" id="ai-btn-killed">
                        <h3>УБИТО ИИ</h3>
                        <div class="ai-stat-number">${killedAI.length}</div>
                    </div>
                    <div class="ai-stat-box ai-stat-success" id="ai-btn-studied">
                        <h3>ИЗУЧЕНО ЛЮДСКОГО</h3>
                        <div class="ai-stat-number">${studiedHuman.length}</div>
                    </div>
                </div>
                
                <div id="ai-profile-list" class="ai-profile-list" style="display: none;"></div>
            </div>
        `;
        modal.style.display = 'flex';
        
        document.getElementById('ai-profile-close-btn').onclick = () => modal.remove();
        document.getElementById('ai-btn-killed').onclick = () => showList(killedAI, 'УБИТО ИИ', 'ai-danger-text');
        document.getElementById('ai-btn-studied').onclick = () => showList(studiedHuman, 'ИЗУЧЕНО ЛЮДСКОГО', 'ai-success-text');
    });
}

function showList(items, title, colorClass) {
    const listDiv = document.getElementById('ai-profile-list');
    listDiv.style.display = 'block';
    
    if (items.length === 0) {
        listDiv.innerHTML = `<h3 class="${colorClass}">${title}</h3><p style="color: #6b7280; text-align: center;">Пока пусто...</p>`;
        return;
    }
    
    let html = `<h3 class="${colorClass}">${title}</h3><div class="ai-grid">`;
    items.forEach(item => {
        html += `
            <div class="ai-grid-item" title="${item.reason || ''}">
                <img src="${item.url}" alt="image" />
                <button class="ai-download-btn" data-url="${item.url}">💾 Скачать</button>
            </div>
        `;
    });
    html += `</div>`;
    listDiv.innerHTML = html;
    
    // Bind click events dynamically to bypass Extension CSP for inline handlers
    listDiv.querySelectorAll('.ai-download-btn').forEach(btn => {
        btn.onclick = (e) => {
            const url = e.target.getAttribute('data-url');
            chrome.runtime.sendMessage({ action: 'downloadImage', url: url });
        };
    });
}

// Image hover logic for inspect mode
let currentHoveredImage = null;

document.addEventListener('mouseover', (e) => {
    if (!isInspectMode) return;
    
    // Check if target is img, or find img inside it
    let img = null;
    if (e.target.tagName && e.target.tagName.toLowerCase() === 'img') {
        img = e.target;
    } else if (e.target.querySelector) {
        img = e.target.querySelector('img');
    }

    if (img) {
        // Remove hover from previous if any
        if (currentHoveredImage && currentHoveredImage !== img) {
            currentHoveredImage.classList.remove('ai-inspect-hover');
        }
        img.classList.add('ai-inspect-hover');
        currentHoveredImage = img;
    }
});

document.addEventListener('mouseout', (e) => {
    if (!isInspectMode) return;
    if (currentHoveredImage) {
        // We don't remove immediately on mouseout to allow clicking on overlays
        // It will be cleaned up on the next mouseover or when exiting inspect mode
    }
});

document.addEventListener('click', (e) => {
    if (!isInspectMode) return;
    
    if (e.target === button || e.target === bubble || button.contains(e.target)) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const src = currentHoveredImage ? currentHoveredImage.src : null;
    
    // Exit inspect mode
    toggleInspectMode();
    currentHoveredImage = null;
    
    // Trigger analysis
    if (src) {
        chrome.runtime.sendMessage({ action: "analyzeImageUrl", url: src });
    }
}, true); // capture phase to override default link clicks

let activeRequestId = 0;

// Message listener for context menu actions
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startRecognition") {
        activeRequestId = request.requestId;
        showModal("Analyzing image...", true, null, activeRequestId);
    } else if (request.action === "showResult") {
        if (request.requestId === activeRequestId) {
            showModal(request.result.verdict, false, request.result, request.requestId);
        }
    }
});

function showModal(text, isLoading, data = null, requestId = 0) {
    let modal = document.getElementById('ai-recognizer-modal');
    if (!modal) {
        if (!isLoading) return; // Don't show results if modal was closed
        modal = document.createElement('div');
        modal.id = 'ai-recognizer-modal';
        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                // Shake logic if loading
                const spinner = modal.querySelector('.ai-spinner');
                if (spinner) {
                    const content = modal.querySelector('.ai-modal-content');
                    content.classList.add('ai-shake');
                    
                    let warning = document.getElementById('ai-wait-warning');
                    if (!warning) {
                        warning = document.createElement('div');
                        warning.id = 'ai-wait-warning';
                        warning.style.color = '#ef4444';
                        warning.style.fontWeight = '900';
                        warning.style.fontSize = '1.3rem';
                        warning.style.position = 'absolute';
                        warning.style.top = '-40px';
                        warning.style.left = '50%';
                        warning.style.transform = 'translateX(-50%)';
                        warning.style.whiteSpace = 'nowrap';
                        warning.innerText = 'ПОДОЖДИ ДРУГ!';
                        content.appendChild(warning);
                    }
                    
                    setTimeout(() => {
                        content.classList.remove('ai-shake');
                        const w = document.getElementById('ai-wait-warning');
                        if (w) w.remove();
                    }, 1000);
                    
                    return; // Prevent modal close
                }
                
                activeRequestId = 0; // Cancel current request tracking
                modal.remove();
            }
        });
    }

    modal.innerHTML = `
        <div class="ai-modal-content ${data && data.is_ai ? 'ai-danger' : data ? 'ai-success' : ''}">
            <div class="ai-modal-close">×</div>
            <h3 style="margin-top: 0; color: #1f2937;">AI Recognizer</h3>
            <div class="ai-modal-body">
                ${isLoading ? '<div class="ai-spinner"></div>' : ''}
                <p class="ai-verdict">${text}</p>
                ${data && data.reason ? `<p style="font-size: 0.8rem; color: #4b5563; margin-bottom: 10px;">${data.reason}</p>` : ''}
                ${data ? `<p class="ai-confidence">Confidence: ${data.confidence}</p>` : ''}
                ${!isLoading ? '<button class="ai-modal-btn">Close</button>' : ''}
            </div>
        </div>
    `;
    modal.style.display = 'flex';

    const closeX = modal.querySelector('.ai-modal-close');
    const closeBtn = modal.querySelector('.ai-modal-btn');

    const closeHandler = () => {
        activeRequestId = 0; // Reset tracking so incoming results are ignored
        modal.remove();
    };

    if (closeX) closeX.onclick = closeHandler;
    if (closeBtn) closeBtn.onclick = closeHandler;
}

// Close on ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
        const modal = document.getElementById('ai-recognizer-modal');
        if (modal) modal.remove();
    }
});
