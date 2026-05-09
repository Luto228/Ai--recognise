const sharedTranslations = {
    en: {
        fillAll: 'Fill all fields!',
        passMinLength: 'Password must be at least 8 characters',
        passMismatch: 'Passwords do not match!',
        enterNickPass: 'Enter nickname and password'
    },
    ru: {
        fillAll: 'Заполните все поля!',
        passMinLength: 'Пароль должен быть от 8 символов',
        passMismatch: 'Пароли не совпадают!',
        enterNickPass: 'Введите никнейм и пароль'
    }
};

function validateAuth(nickname, password, rePassword = null, isRegister = false, lang = 'en') {
    const t = sharedTranslations[lang] || sharedTranslations['en'];
    
    if (!nickname || !password) {
        return { isValid: false, error: t.enterNickPass };
    }

    if (password.length < 8) {
        return { isValid: false, error: t.passMinLength };
    }

    if (isRegister) {
        if (!rePassword) {
            return { isValid: false, error: t.fillAll };
        }
        if (password !== rePassword) {
            return { isValid: false, error: t.passMismatch };
        }
    }

    return { isValid: true };
}

// Export for popup.js (which might use it as a global)
// and content.js (which also uses it as a global)
if (typeof window !== 'undefined') {
    window.validateAuth = validateAuth;
    window.sharedTranslations = sharedTranslations;
}
