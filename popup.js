// Prevent Esc from closing the popup or overlay behavior
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
    }
}, true);

const loginOverlay = document.getElementById('login-overlay');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const userNameSpan = document.getElementById('user-name');
const nicknameInput = document.getElementById('auth-nickname');
const passwordInput = document.getElementById('auth-password');
const rePasswordInput = document.getElementById('auth-re-password');
const rePasswordContainer = document.getElementById('re-password-container');
const backBtn = document.getElementById('auth-back-btn');
const inputsContainer = document.getElementById('auth-inputs-container');
const welcomeTxt = document.getElementById('txt-welcome');
const loginRegTxt = document.getElementById('txt-login-reg');
const enterCredsTxt = document.getElementById('txt-enter-creds');
const errorMsg = document.getElementById('auth-error-msg');
const capsWarning = document.getElementById('auth-caps-warning');
const capsLang = document.getElementById('caps-lang');
const capsStatus = document.getElementById('caps-status');

function updateCapsWarning(e) {
    const isCaps = e.getModifierState('CapsLock');
    if (isCaps) {
        capsWarning.style.opacity = '1';
        capsWarning.style.transform = 'translateY(0)';
        
        // Dynamic language detection based on character input
        if (e.key && e.key.length === 1) {
            const char = e.key;
            if (/[а-яА-ЯёЁ]/.test(char)) {
                capsLang.textContent = 'Language: RU';
            } else if (/[a-zA-Z]/.test(char)) {
                capsLang.textContent = 'Language: EN';
            }
        } else if (capsLang.textContent === 'Language: --') {
            const browserLang = navigator.language.split('-')[0].toUpperCase();
            capsLang.textContent = 'Language: ' + browserLang;
        }
    } else {
        capsWarning.style.opacity = '0';
        capsWarning.style.transform = 'translateY(5px)';
    }
}

let userID = null;
let isRegisterMode = false;

// Check if user is already logged in
chrome.storage.local.get(['userID', 'userName'], (result) => {
    if (result.userID) {
        userID = result.userID;
        userNameSpan.textContent = result.userName || 'User';
        loginOverlay.style.display = 'none';
    }
});

function showError(msg) {
    if (!msg) {
        errorMsg.style.opacity = '0';
        return;
    }
    errorMsg.textContent = msg;
    errorMsg.style.opacity = '1';
}

// Clear error and check CapsLock on input
[nicknameInput, passwordInput, rePasswordInput].forEach(input => {
    input.addEventListener('input', () => showError(''));
    input.addEventListener('keyup', updateCapsWarning);
    input.addEventListener('keydown', updateCapsWarning);
});

async function authAction(action) {
    const nickname = nicknameInput.value.trim();
    const password = passwordInput.value.trim();

    const validation = validateAuth(
        nickname, 
        password, 
        isRegisterMode ? rePasswordInput.value.trim() : null, 
        action === 'register', 
        currentLang
    );

    if (!validation.isValid) {
        showError(validation.error);
        return;
    }

    try {
        const response = await fetch(`http://127.0.0.1:5000/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname, password })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Auth failed');

        userID = data.user_id;
        userNameSpan.textContent = data.nickname;
        chrome.storage.local.set({ userID: userID, userName: data.nickname });
        loginOverlay.style.display = 'none';
        
        // Clear inputs
        nicknameInput.value = '';
        passwordInput.value = '';
        rePasswordInput.value = '';
        showError('');
        setRegisterMode(false);
    } catch (err) {
        showError(err.message);
    }
}

const togglePasswordBtn = document.getElementById('toggle-password');

togglePasswordBtn.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    togglePasswordBtn.textContent = type === 'password' ? '👁️' : '🙈';
});

function setRegisterMode(mode) {
    isRegisterMode = mode;
    showError(''); // Clear errors when switching
    if (mode) {
        rePasswordContainer.style.display = 'block';
        backBtn.style.display = 'block';
        loginBtn.style.display = 'none';
        
        // Remove manual shifts, let flexbox handle it
        loginOverlay.style.paddingTop = '15px';
        inputsContainer.style.transform = 'translateY(0)';
        welcomeTxt.style.transform = 'translateY(0)';
        loginRegTxt.style.transform = 'translateY(0)';
        enterCredsTxt.style.display = 'none';
        
        const t = translations[currentLang];
        loginRegTxt.textContent = t.register;
    } else {
        rePasswordContainer.style.display = 'none';
        backBtn.style.display = 'none';
        loginBtn.style.display = 'block';
        
        // Reset
        loginOverlay.style.paddingTop = '15px';
        inputsContainer.style.transform = 'translateY(0)';
        welcomeTxt.style.transform = 'translateY(0)';
        loginRegTxt.style.transform = 'translateY(0)';
        enterCredsTxt.style.display = 'block';
        enterCredsTxt.style.opacity = '1';
        
        const t = translations[currentLang];
        loginRegTxt.textContent = t.loginReg;
    }
}

loginBtn.addEventListener('click', () => authAction('login'));
registerBtn.addEventListener('click', () => {
    if (!isRegisterMode) {
        setRegisterMode(true);
    } else {
        authAction('register');
    }
});
backBtn.addEventListener('click', () => setRegisterMode(false));

const langBtn = document.getElementById('lang-btn');
const langModal = document.getElementById('lang-modal');
const closeLangBtn = document.getElementById('close-lang-btn');
const langOpts = document.querySelectorAll('.lang-opt');

const translations = {
    en: {
        welcome: "Welcome",
        loginReg: "Login or Register",
        enterCreds: "Enter your credentials to continue.",
        hello: "Hello",
        changeLang: "Change Language",
        logout: "Logout",
        langTitle: "Language:",
        close: "Close",
        nick: "Nickname",
        pass: "Password",
        repass: "Re-password",
        logoutConfirm: "Enter your nickname ({name}) to logout:"
    },
    ru: {
        welcome: "Добро пожаловать",
        loginReg: "Вход или Регистрация",
        enterCreds: "Введите данные, чтобы продолжить.",
        hello: "Привет",
        changeLang: "Сменить язык",
        logout: "Выйти",
        langTitle: "Язык:",
        close: "Закрыть",
        nick: "Никнейм",
        pass: "Пароль",
        repass: "Повтор пароля",
        logoutConfirm: "Введите ваш никнейм ({name}), чтобы выйти:"
    }
};

let currentLang = 'en';

function updateUI() {
    const t = translations[currentLang];
    document.getElementById('txt-welcome').textContent = t.welcome;
    document.getElementById('txt-login-reg').textContent = t.loginReg;
    document.getElementById('txt-enter-creds').textContent = t.enterCreds;
    document.getElementById('txt-hello').textContent = t.hello;
    document.getElementById('lang-btn').textContent = t.changeLang;
    document.getElementById('logout-btn').textContent = t.logout;
    document.getElementById('txt-lang-title').textContent = t.langTitle;
    document.getElementById('close-lang-btn').textContent = t.close;
    
    document.getElementById('auth-nickname').placeholder = t.nick;
    document.getElementById('auth-password').placeholder = t.pass;
    document.getElementById('auth-re-password').placeholder = t.repass;
    
    if (isRegisterMode) {
        document.getElementById('txt-login-reg').textContent = t.register;
    }
}

chrome.storage.local.get(['userID', 'userName', 'lang'], (result) => {
    if (result.lang) {
        currentLang = result.lang;
        updateUI();
    }
    if (result.userID) {
        userID = result.userID;
        userNameSpan.textContent = result.userName || 'User';
        loginOverlay.style.display = 'none';
    }
});

langBtn.addEventListener('click', () => {
    langModal.style.display = 'flex';
});

closeLangBtn.addEventListener('click', () => {
    langModal.style.display = 'none';
});

langOpts.forEach(opt => {
    opt.addEventListener('click', () => {
        currentLang = opt.dataset.lang;
        chrome.storage.local.set({ lang: currentLang });
        updateUI();
        langModal.style.display = 'none';
    });
});

logoutBtn.addEventListener('click', () => {
    chrome.storage.local.get(['userName'], (result) => {
        const currentName = result.userName || 'User';
        const t = translations[currentLang];
        const confirmation = prompt(t.logoutConfirm.replace('{name}', currentName));
        
        if (confirmation === currentName) {
            userID = null;
            chrome.storage.local.remove(['userID', 'userName']);
            loginOverlay.style.display = 'flex';
        } else if (confirmation !== null) {
            alert(currentLang === 'ru' ? 'Неверный никнейм.' : 'Incorrect nickname.');
        }
    });
});

