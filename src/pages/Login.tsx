import React, { useState, useEffect } from 'react';
import { Lock, User, ShieldAlert, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { type AdminLanguage, getLocalizedText } from '../utils/adminLanguage';
import './Login.css';

interface LoginProps {
    onLogin: (user: any) => void;
    language: AdminLanguage;
    onLanguageChange: (lang: AdminLanguage) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, language, onLanguageChange }) => {
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const checkSetup = async () => {
            try {
                const response = await fetch('/api/check-setup');
                const data = await response.json();
                if (data.needsSetup) {
                    setIsLoginMode(false);
                }
            } catch (err) {
                console.error('Setup check failed', err);
            }
        };
        checkSetup();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanUsername = username.trim();
        const cleanName = name.trim();
        if (!cleanUsername || !password.trim()) {
            toast.error(getLocalizedText(language, 'İstifadəçi adı və şifrə mütləqdir', 'Логин и пароль обязательны'));
            return;
        }
        if (!isLoginMode && !cleanName) {
            toast.error(getLocalizedText(language, 'Tam ad mütləqdir', 'Полное имя обязательно'));
            return;
        }
        if (!isLoginMode && password.length < 6) {
            toast.error(getLocalizedText(language, 'Şifrə ən azı 6 simvol olmalıdır', 'Пароль должен содержать минимум 6 символов'));
            return;
        }

        setIsLoading(true);

        try {
            const endpoint = isLoginMode ? '/api/login' : '/api/setup';
            const body = isLoginMode
                ? { username: cleanUsername, password }
                : { username: cleanUsername, password, name: cleanName };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || (isLoginMode
                    ? getLocalizedText(language, 'Giriş uğursuz oldu', 'Ошибка входа')
                    : getLocalizedText(language, 'Quraşdırma uğursuz oldu', 'Ошибка настройки')));
            }

            if (isLoginMode) {
                localStorage.setItem('forsaj_admin_token', result.token);
                localStorage.setItem('forsaj_admin_user', JSON.stringify(result.user));
                onLogin(result.user);
                toast.success(getLocalizedText(language, 'Xoş gəldiniz!', 'Добро пожаловать!'));
            } else {
                toast.success(getLocalizedText(language, 'Baza uğurla başladıldı! İndi daxil ola bilərsiniz.', 'Система успешно инициализирована. Теперь можно войти.'));
                setIsLoginMode(true);
            }
        } catch (err: any) {
            toast.error(err.message || getLocalizedText(language, 'Əməliyyat uğursuz oldu', 'Операция не выполнена'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card fade-in">
                <div className="login-lang-switch" aria-label="Login language switch">
                    <button
                        type="button"
                        className={`login-lang-btn ${language === 'az' ? 'active' : ''}`}
                        onClick={() => onLanguageChange('az')}
                    >
                        AZ
                    </button>
                    <button
                        type="button"
                        className={`login-lang-btn ${language === 'ru' ? 'active' : ''}`}
                        onClick={() => onLanguageChange('ru')}
                    >
                        RU
                    </button>
                </div>
                <div className="login-header">
                    <div className="login-logo">
                        {isLoginMode ? <ShieldAlert size={40} className="logo-icon" /> : <Lock size={40} className="logo-icon" />}
                    </div>
                    <h1>{isLoginMode
                        ? getLocalizedText(language, 'Forsaj İdarəetmə Paneli', 'Панель управления Forsaj')
                        : getLocalizedText(language, 'Sistem Quraşdırılması', 'Настройка системы')}</h1>
                    <p>{isLoginMode
                        ? getLocalizedText(language, 'Sistemə daxil olmaq üçün məlumatlarınızı daxil edin', 'Введите данные для входа в систему')
                        : getLocalizedText(language, 'İlkin Baş Admin hesabını yaradaraq sistemi başladın', 'Создайте первого главного администратора для запуска системы')}</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    {!isLoginMode && (
                        <div className="form-group">
                            <label><User size={16} /> {getLocalizedText(language, 'Tam Adınız', 'Ваше полное имя')}</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={getLocalizedText(language, 'Məs: Əli Məmmədov', 'Например: Али Мамедов')}
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label><User size={16} /> {getLocalizedText(language, 'İstifadəçi Adı', 'Имя пользователя')}</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder={getLocalizedText(language, 'Məs: admin', 'Например: admin')}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label><Lock size={16} /> {getLocalizedText(language, 'Şifrə', 'Пароль')}</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button type="submit" className="login-btn" disabled={isLoading}>
                        {isLoading ? (
                            <div className="loader-container">
                                <Loader2 className="animate-spin" size={20} />
                                <span>{getLocalizedText(language, 'Gözləyin...', 'Подождите...')}</span>
                            </div>
                        ) : (
                            isLoginMode
                                ? getLocalizedText(language, 'Daxil ol', 'Войти')
                                : getLocalizedText(language, 'Sistemi başlat', 'Запустить систему')
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <p>{getLocalizedText(language, '© 2026 Forsaj Club. Platformanın təhlükəsizliyi üçün mütəmadi olaraq şifrənizi yeniləyin.', '© 2026 Forsaj Club. Для безопасности платформы регулярно обновляйте пароль.')}</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
