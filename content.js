const translations = {
    en: {
        bubble: 'Selecting, I am watching! 👀',
        waitWarning: 'WAIT BRO!',
        statsTitle: 'Bot Stats',
        killedAI: 'KILLED AI',
        studiedHuman: 'STUDIED HUMAN',
        empty: 'Empty for now...',
        download: '💾 Download',
        loginReq: 'Login required 🔐',
        loginReqDescStats: 'To view stats and use all features, please login.',
        loginReqDescAnalyze: 'To analyze images, you must authorize.',
        authBtn: 'Login / Register',
        welcome: 'Welcome 🤖',
        loginOrReg: 'Login or Register',
        login: 'Login',
        register: 'Register',
        nickname: 'Nickname',
        password: 'Password',
        repassword: 're-password',
        wait: 'One moment...',
        fillAll: 'Fill all fields!',
        passMismatch: 'Passwords mismatch!',
        successful: 'Successful!',
        error: 'Error ❌',
        serverError: 'Failed to connect to server. Make sure Python server is running.',
        howToName: 'How shall we name the file? 🤔',
        save: 'Save 💾',
        cancel: 'Cancel',
        close: 'Close',
        analyzing: 'Analyzing image...',
        confidence: 'Confidence'
    },
    ru: {
        bubble: 'Выделяй, я смотрю! 👀',
        waitWarning: 'ПОДОЖДИ ДРУГ!',
        statsTitle: 'Статистика Бота',
        killedAI: 'УБИТО ИИ',
        studiedHuman: 'ИЗУЧЕНО ЛЮДСКОГО',
        empty: 'Пока пусто...',
        download: '💾 Скачать',
        loginReq: 'Требуется вход 🔐',
        loginReqDescStats: 'Для просмотра статистики нужно войти в аккаунт.',
        loginReqDescAnalyze: 'Для анализа изображений нужно авторизоваться.',
        authBtn: 'Войти / Регистрация',
        welcome: 'Добро пожаловать 🤖',
        loginOrReg: 'Вход или Регистрация',
        login: 'Вход',
        register: 'Регистрация',
        nickname: 'Никнейм',
        password: 'Пароль',
        repassword: 'повтор пароля',
        wait: 'Минутку...',
        fillAll: 'Заполни все поля!',
        passMismatch: 'Пароли не совпадают!',
        successful: 'Успешно!',
        error: 'Ошибка ❌',
        serverError: 'Не удалось подключиться к серверу. Убедитесь, что сервер запущен.',
        howToName: 'Как назовем файл? 🤔',
        save: 'Сохранить 💾',
        cancel: 'Отмена',
        close: 'Закрыть',
        analyzing: 'Анализирую...',
        confidence: 'Точность'
    }
};

let currentLang = 'en';

const button = document.createElement('div');
button.id = 'ai-recognizer-floating-btn';
button.innerHTML = '🤖';
button.title = 'Open AI Recognizer';
document.body.appendChild(button);

const bubble = document.createElement('div');
bubble.id = 'ai-recognizer-bubble';
document.body.appendChild(bubble);

chrome.storage.local.get(['lang'], (result) => {
    if (result.lang) currentLang = result.lang;
    bubble.innerHTML = translations[currentLang].bubble;
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.lang) {
        currentLang = changes.lang.newValue;
        bubble.innerHTML = translations[currentLang].bubble;
    }
});

// Fullscreen Overlay Init
const fsOverlay = document.createElement('div');
fsOverlay.id = 'ai-fullscreen-overlay';
fsOverlay.innerHTML = `
    <div class="ai-close-fullscreen-btn" id="ai-fs-close">
        <svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
    </div>
    <div id="ai-fs-container">
        <img id="ai-fullscreen-img" src="" alt="fullscreen" />
        <button id="ai-fs-download-btn" class="ai-fs-download-btn">💾 Скачать</button>
    </div>
`;
document.body.appendChild(fsOverlay);

fsOverlay.addEventListener('click', (e) => {
    // Close if clicking the background, the close button, or the image itself
    if (e.target === fsOverlay || e.target.id === 'ai-fs-close' || e.target.closest('#ai-fs-close') || e.target.id === 'ai-fullscreen-img') {
        fsOverlay.classList.remove('show');
    }
    
    if (e.target.id === 'ai-fs-download-btn') {
        const url = e.target.getAttribute('data-url');
        showSaveModal(url);
        e.stopPropagation();
    }
});

function openFullscreen(url) {
    const t = translations[currentLang];
    const img = document.getElementById('ai-fullscreen-img');
    const dlBtn = document.getElementById('ai-fs-download-btn');
    img.src = url;
    dlBtn.setAttribute('data-url', url);
    dlBtn.innerHTML = t.download;
    fsOverlay.classList.add('show');
}

function showSaveModal(url) {
    let modal = document.getElementById('ai-save-modal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'ai-save-modal';
    
    // Extract default filename from URL or use download.jpg
    let defaultName = "download.jpg";
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const lastPart = pathname.substring(pathname.lastIndexOf('/') + 1);
        if (lastPart && lastPart.includes('.')) {
            defaultName = lastPart.split('?')[0];
        }
    } catch(e) {}

    const t = translations[currentLang];
    modal.innerHTML = `
        <div class="ai-save-content">
            <h3>${t.howToName}</h3>
            <input type="text" id="ai-save-filename" class="ai-save-input" value="${defaultName}" />
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="ai-save-confirm" class="ai-save-btn">${t.save}</button>
                <button id="ai-save-cancel" class="ai-save-btn" style="background: #9ca3af;">${t.cancel}</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const input = document.getElementById('ai-save-filename');
    input.focus();
    input.select();

    const doSave = () => {
        const filename = input.value || "download.jpg";
        chrome.runtime.sendMessage({ action: 'downloadImage', url: url, filename: filename });
        modal.remove();
    };

    document.getElementById('ai-save-confirm').onclick = doSave;
    document.getElementById('ai-save-cancel').onclick = () => modal.remove();
    
    input.onkeydown = (e) => {
        if (e.key === 'Enter') doSave();
        if (e.key === 'Escape') modal.remove();
    };

    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

let isInspectMode = false;
let isDragging = false;
let hasDragged = false;
let startX, startY;
let initialRight, initialBottom;

// Drag logic
button.addEventListener('mousedown', (e) => {
    isDragging = true;
    hasDragged = false;
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = button.getBoundingClientRect();
    initialRight = window.innerWidth - rect.right;
    initialBottom = window.innerHeight - rect.bottom;
    
    button.classList.add('dragging');
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const dx = startX - e.clientX;
    const dy = startY - e.clientY;
    
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasDragged = true;
    }
    
    let newRight = initialRight + dx;
    let newBottom = initialBottom + dy;
    
    // Boundary constraints
    newRight = Math.max(-15, Math.min(window.innerWidth - 35, newRight));
    newBottom = Math.max(-15, Math.min(window.innerHeight - 35, newBottom));
    
    button.style.right = `${newRight}px`;
    button.style.bottom = `${newBottom}px`;
    
    // Update bubble position too
    bubble.style.right = `${newRight}px`;
    bubble.style.bottom = `${newBottom + 60}px`;
});

document.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    button.classList.remove('dragging');
    
    if (hasDragged) {
        checkEdgeSnap();
    }
});

function checkEdgeSnap() {
    const rect = button.getBoundingClientRect();
    const threshold = 0.5; // Extreme precision snap area
    
    let edge = null;
    if (rect.right >= window.innerWidth - threshold) edge = 'right';
    else if (rect.left <= threshold) edge = 'left';
    else if (rect.top <= threshold) edge = 'top';
    else if (rect.bottom >= window.innerHeight - threshold) edge = 'bottom';
    
    if (edge) {
        hideToEdge(edge);
    }
}

function hideToEdge(edge) {
    button.classList.add(`ai-anim-out-${edge}`);
    bubble.classList.remove('show');
    
    setTimeout(() => {
        button.style.visibility = 'hidden';
        showSidebarHandle(edge);
    }, 500);
}

function showSidebarHandle(edge) {
    let handle = document.getElementById('ai-recognizer-sidebar-handle');
    if (!handle) {
        handle = document.createElement('div');
        handle.id = 'ai-recognizer-sidebar-handle';
        document.body.appendChild(handle);
    }
    
    handle.style.display = 'block';
    handle.style.left = 'auto'; handle.style.right = 'auto';
    handle.style.top = 'auto'; handle.style.bottom = 'auto';
    handle.style.width = '6px'; handle.style.height = '40px';
    
    const rect = button.getBoundingClientRect();
    
    if (edge === 'right') {
        handle.style.right = '0';
        handle.style.top = `${Math.max(0, rect.top)}px`;
    } else if (edge === 'left') {
        handle.style.left = '0';
        handle.style.top = `${Math.max(0, rect.top)}px`;
    } else if (edge === 'top') {
        handle.style.top = '0';
        handle.style.left = `${Math.max(0, rect.left)}px`;
        handle.style.width = '40px'; handle.style.height = '6px';
    } else if (edge === 'bottom') {
        handle.style.bottom = '0';
        handle.style.left = `${Math.max(0, rect.left)}px`;
        handle.style.width = '40px'; handle.style.height = '6px';
    }
    
    handle.onclick = () => {
        handle.style.display = 'none';
        button.style.visibility = 'visible';
        button.classList.remove('ai-anim-out-right', 'ai-anim-out-left', 'ai-anim-out-top', 'ai-anim-out-bottom');
        
        // Move slightly away from edge so it doesn't snap back immediately
        const rect = button.getBoundingClientRect();
        if (edge === 'right') button.style.right = '20px';
        if (edge === 'left') button.style.right = `${window.innerWidth - 70}px`;
        if (edge === 'top') button.style.bottom = `${window.innerHeight - 70}px`;
        if (edge === 'bottom') button.style.bottom = '20px';
        
        if (isInspectMode) bubble.classList.add('show');
    };
}

function toggleInspectMode() {
    isInspectMode = !isInspectMode;
    if (isInspectMode) {
        document.body.classList.add('ai-inspect-mode');
        if (button.style.visibility !== 'hidden') bubble.classList.add('show');
    } else {
        document.body.classList.remove('ai-inspect-mode');
        bubble.classList.remove('show');
        // Clear all hovers just in case
        document.querySelectorAll('.ai-inspect-hover').forEach(el => el.classList.remove('ai-inspect-hover'));
    }
}

let clickTimer = null;
button.addEventListener('click', (e) => {
    if (hasDragged) return;
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

    chrome.runtime.sendMessage({ action: "getStats" }, (data) => {
        const t = translations[currentLang];
        if (!data || data.error) {
            console.error("Failed to fetch stats:", data ? data.error : "No data");
            
            // If login required, go straight to auth flow
            if (data && data.error === "Login required") {
                modal.remove();
                showAuthModal();
                return;
            }

            modal.innerHTML = `
                <div class="ai-profile-content">
                    <div class="ai-modal-close" id="ai-profile-close-btn">×</div>
                    <h2>${t.error}</h2>
                    <p>${t.serverError}</p>
                </div>
            `;
            modal.style.display = 'flex';
            document.getElementById('ai-profile-close-btn').onclick = () => modal.remove();
            return;
        }

        let killedAI = data.killedAI || [];
        let studiedHuman = data.studiedHuman || [];
        let killedCount = data.killedCount || 0;
        let studiedCount = data.studiedCount || 0;
        let nickname = data.nickname || 'User';
        
        modal.innerHTML = `
            <div class="ai-profile-content">
                <div class="ai-modal-close" id="ai-profile-close-btn">×</div>
                <h2>${t.statsTitle} ${nickname} 🤖</h2>
                
                <div class="ai-stats-container">
                    <div class="ai-stat-box ai-stat-danger" id="ai-btn-killed">
                        <h3>${t.killedAI}</h3>
                        <div class="ai-stat-number">${killedCount}</div>
                    </div>
                    <div class="ai-stat-box ai-stat-success" id="ai-btn-studied">
                        <h3>${t.studiedHuman}</h3>
                        <div class="ai-stat-number">${studiedCount}</div>
                    </div>
                </div>
                
                <div id="ai-profile-list" class="ai-profile-list" style="display: none;"></div>
            </div>
        `;
        modal.style.display = 'flex';
        
        document.getElementById('ai-profile-close-btn').onclick = () => modal.remove();
        document.getElementById('ai-btn-killed').onclick = () => showList(killedAI, t.killedAI, 'ai-danger-text');
        document.getElementById('ai-btn-studied').onclick = () => showList(studiedHuman, t.studiedHuman, 'ai-success-text');
    });
}

function showList(items, title, colorClass) {
    const listDiv = document.getElementById('ai-profile-list');
    listDiv.style.display = 'block';
    
    const t = translations[currentLang];
    if (items.length === 0) {
        listDiv.innerHTML = `<h3 class="${colorClass}">${title}</h3><p style="color: #6b7280; text-align: center;">${t.empty}</p>`;
        return;
    }
    
    let html = `<h3 class="${colorClass}">${title}</h3><div class="ai-grid">`;
    items.forEach(item => {
        html += `
            <div class="ai-grid-item" title="${item.reason || ''}">
                <img src="${item.url}" alt="image" class="ai-history-img" data-url="${item.url}" />
                <button class="ai-download-btn" data-url="${item.url}">${t.download}</button>
            </div>
        `;
    });
    html += `</div>`;
    listDiv.innerHTML = html;
    
    // Bind click events dynamically
    listDiv.querySelectorAll('.ai-download-btn').forEach(btn => {
        btn.onclick = (e) => {
            const url = e.currentTarget.getAttribute('data-url');
            showSaveModal(url);
        };
    });

    listDiv.querySelectorAll('.ai-history-img').forEach(img => {
        img.onclick = (e) => {
            const url = e.currentTarget.getAttribute('data-url');
            openFullscreen(url);
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
        const t = translations[currentLang];
        showModal(t.analyzing, true, null, activeRequestId);
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
                        warning.innerText = translations[currentLang].waitWarning;
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

        const t = translations[currentLang];
        modal.innerHTML = `
        <div class="ai-modal-content ${text === 'Login required' ? 'ai-danger' : (data && data.is_ai ? 'ai-danger' : data ? 'ai-success' : '')}">
            <div class="ai-modal-close">×</div>
            <h3 style="margin-top: 0; color: #1f2937;">AI Recognizer</h3>
            <div class="ai-modal-body">
                ${isLoading ? '<div class="ai-spinner"></div>' : ''}
                <p class="ai-verdict">${text === 'Login required' ? t.loginReq : text}</p>
                ${text === 'Login required' ? `
                    <p style="font-size: 0.8rem; color: #4b5563; margin-bottom: 10px;">${t.loginReqDescAnalyze}</p>
                    <button class="ai-modal-btn" id="ai-auth-redirect-btn">${t.authBtn}</button>
                ` : ''}
                ${data && data.reason ? `<p style="font-size: 0.8rem; color: #4b5563; margin-bottom: 10px;">${data.reason}</p>` : ''}
                ${data ? `<p class="ai-confidence">${t.confidence}: ${data.confidence}</p>` : ''}
                ${!isLoading && text !== 'Login required' ? `<button class="ai-modal-btn">${t.close}</button>` : ''}
            </div>
        </div>
    `;
    modal.style.display = 'flex';

    if (text === 'Login required') {
        modal.remove();
        showAuthModal();
        return;
    }

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
        const profile = document.getElementById('ai-recognizer-profile');
        if (profile) profile.remove();
        const auth = document.getElementById('ai-recognizer-auth-modal');
        if (auth) auth.remove();
    }
});

function showAuthModal(state = 'choice') {
    const t = translations[currentLang];
    let modal = document.getElementById('ai-recognizer-auth-modal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'ai-recognizer-auth-modal';
    modal.style = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center; z-index: 2000000;
        font-family: 'Inter', sans-serif;
    `;
    
    let contentHtml = '';
    
    if (state === 'choice') {
        contentHtml = `
            <div class="ai-profile-content" style="width: 320px; padding: 40px 20px;">
                <div class="ai-modal-close" id="ai-auth-close">×</div>
                <h2 style="margin-bottom: 5px;">${t.welcome}</h2>
                <p style="margin-bottom: 30px; color: #6b7280; font-size: 0.9rem;">${t.loginOrReg}</p>
                
                <div style="display: flex; flex-direction: column; gap: 15px; width: 100%;">
                    <button id="ai-go-login" class="ai-save-btn" style="width: 100%; padding: 15px; font-size: 1.1rem;">${t.login}</button>
                    <button id="ai-go-reg" style="background: none; border: none; color: #6366f1; cursor: pointer; font-weight: 600; font-size: 0.9rem;">${t.register}</button>
                </div>
            </div>
        `;
    } else if (state === 'login') {
        contentHtml = `
            <div class="ai-profile-content" style="width: 320px; padding: 40px 20px;">
                <div id="ai-auth-back" style="position: absolute; top: 15px; right: 20px; cursor: pointer; color: #9ca3af; font-size: 1.5rem;">➔</div>
                <h2 style="margin-bottom: 25px;">${t.login}</h2>
                
                <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
                    <input type="text" id="ai-auth-nick" placeholder="${t.nickname}" style="padding: 12px; border-radius: 10px; border: 2px solid #e5e7eb; outline: none; font-size: 1rem;">
                    <div style="position: relative; width: 100%;">
                        <input type="password" id="ai-auth-pass" placeholder="${t.password}" style="padding: 12px; border-radius: 10px; border: 2px solid #e5e7eb; outline: none; font-size: 1rem; width: 100%; box-sizing: border-box;">
                        <span id="ai-auth-toggle" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; font-size: 1.2rem;">👁️</span>
                    </div>
                    <button id="ai-auth-submit" class="ai-save-btn" style="margin-top: 10px;">${t.login}</button>
                </div>
                <div id="ai-auth-error" style="margin-top: 15px; font-size: 0.85rem; min-height: 20px;"></div>
            </div>
        `;
    } else if (state === 'register') {
        contentHtml = `
            <div class="ai-profile-content" style="width: 320px; padding: 40px 20px;">
                <div id="ai-auth-back" style="position: absolute; top: 15px; right: 20px; cursor: pointer; color: #9ca3af; font-size: 1.5rem;">➔</div>
                <h2 style="margin-bottom: 25px;">${t.register}</h2>
                
                <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
                    <input type="text" id="ai-auth-nick" placeholder="${t.nickname}" style="padding: 12px; border-radius: 10px; border: 2px solid #e5e7eb; outline: none; font-size: 1rem;">
                    <input type="password" id="ai-auth-pass" placeholder="${t.password}" style="padding: 12px; border-radius: 10px; border: 2px solid #e5e7eb; outline: none; font-size: 1rem;">
                    <input type="password" id="ai-auth-repass" placeholder="${t.repassword}" style="padding: 12px; border-radius: 10px; border: 2px solid #e5e7eb; outline: none; font-size: 1rem;">
                    <button id="ai-auth-submit" class="ai-save-btn" style="margin-top: 10px;">${t.register}</button>
                </div>
                <div id="ai-auth-error" style="margin-top: 15px; font-size: 0.85rem; min-height: 20px;"></div>
            </div>
        `;
    }
    
    modal.innerHTML = contentHtml;
    document.body.appendChild(modal);

    // Close logic
    const closeBtn = document.getElementById('ai-auth-close');
    if (closeBtn) closeBtn.onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    // Back logic
    const backBtn = document.getElementById('ai-auth-back');
    if (backBtn) backBtn.onclick = () => showAuthModal('choice');

    // Navigation logic
    if (state === 'choice') {
        document.getElementById('ai-go-login').onclick = () => showAuthModal('login');
        document.getElementById('ai-go-reg').onclick = () => showAuthModal('register');
    } else {
        const nickInput = document.getElementById('ai-auth-nick');
        const passInput = document.getElementById('ai-auth-pass');
        const repassInput = document.getElementById('ai-auth-repass');
        const errorDiv = document.getElementById('ai-auth-error');
        const toggleBtn = document.getElementById('ai-auth-toggle');

        if (toggleBtn) {
            toggleBtn.onclick = () => {
                const type = passInput.type === 'password' ? 'text' : 'password';
                passInput.type = type;
                toggleBtn.innerText = type === 'password' ? '👁️' : '🙈';
            };
        }

        [nickInput, passInput, repassInput].forEach(input => {
            if (input) {
                input.oninput = () => {
                    errorDiv.innerText = '';
                };
            }
        });

        document.getElementById('ai-auth-submit').onclick = async () => {
            const nickname = nickInput.value.trim();
            const password = passInput.value.trim();
            
            const validation = validateAuth(
                nickname, 
                password, 
                state === 'register' ? repassInput.value.trim() : null, 
                state === 'register', 
                currentLang
            );

            if (!validation.isValid) {
                errorDiv.style.color = "#ef4444";
                errorDiv.innerText = validation.error;
                return;
            }

            errorDiv.style.color = "#6366f1";
            errorDiv.innerText = t.wait;
            
            try {
                const action = state === 'login' ? 'login' : 'register';
                const response = await fetch(`http://127.0.0.1:5000/${action}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nickname, password })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Auth failed');

                chrome.runtime.sendMessage({ 
                    action: "setUserData", 
                    userID: data.user_id, 
                    userName: data.nickname 
                }, (res) => {
                    errorDiv.style.color = "#22c55e"; // Success blue/green
                    errorDiv.innerText = t.successful;
                    setTimeout(() => {
                        modal.remove();
                    }, 1000);
                });
            } catch (err) {
                errorDiv.style.color = "#ef4444";
                errorDiv.innerText = err.message;
            }
        };
    }
}
