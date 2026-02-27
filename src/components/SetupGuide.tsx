import { useState } from 'react';
import { FileJson, FolderSync, Settings, Search, PlusCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { type AdminLanguage, getLocalizedText } from '../utils/adminLanguage';
import './SetupGuide.css';

interface SetupGuideProps {
    language: AdminLanguage;
}

const SetupGuide: React.FC<SetupGuideProps> = ({ language }) => {
    const [isScanning, setIsScanning] = useState(false);

    const startScan = async () => {
        setIsScanning(true);
        const tid = toast.loading(getLocalizedText(language, 'Front qovluğu skan edilir...', 'Сканируется папка front...'));
        try {
            const res = await fetch('/api/extract-content', { method: 'POST' });
            if (!res.ok) throw new Error(getLocalizedText(language, 'Skan xətası', 'Ошибка сканирования'));
            toast.success(getLocalizedText(language, 'Skan tamamlandı! Panel yenilənir...', 'Сканирование завершено! Панель обновляется...'), { id: tid });
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            toast.error(getLocalizedText(language, 'Skan uğursuz oldu!', 'Сканирование не удалось!'), { id: tid });
        } finally {
            setIsScanning(false);
        }
    };

    const steps = [
        {
            id: 1,
            title: getLocalizedText(language, 'Sitemap Faylını Yaradın', 'Создайте файл Sitemap'),
            description: getLocalizedText(language, 'public/sitemap.json faylına menyu strukturunuzu əlavə edin və ya front-dan gətirin.', 'Добавьте структуру меню в public/sitemap.json или импортируйте из front.'),
            path: 'public/sitemap.json',
            icon: FileJson,
        },
        {
            id: 2,
            title: getLocalizedText(language, 'Front Layihəsini Sinxronlaşdırın', 'Синхронизируйте Front-проект'),
            description: getLocalizedText(language, '/front qovluğundakı React layihəsini skan edərək bütün səhifələri menyuya çıxarın.', 'Просканируйте React-проект в /front и добавьте все страницы в меню.'),
            path: '/front/src/pages',
            icon: FolderSync,
        },
        {
            id: 3,
            title: getLocalizedText(language, 'Sistem Ayarlarını Tənzimləyin', 'Настройте системные параметры'),
            description: getLocalizedText(language, 'Saytın ümumi tənzimləmələrini, loqo və əlaqə məlumatlarını idarə edin.', 'Управляйте общими настройками сайта, логотипом и контактной информацией.'),
            path: getLocalizedText(language, 'Sistem Ayarları', 'Системные настройки'),
            icon: Settings,
        }
    ];

    return (
        <div className="setup-guide">
            <div className="setup-header">
                <div className="setup-brand">
                    <div className="octo-logo">🏎️</div>
                    <h2>{getLocalizedText(language, 'Forsaj Club İdarəetmə', 'Управление Forsaj Club')}</h2>
                </div>
                <h1>{getLocalizedText(language, 'Xoş Gəlmisiniz! Paneli Qurmağa Başlayaq', 'Добро пожаловать! Давайте настроим панель')}</h1>
                <p>{getLocalizedText(language, 'Forsaj Club platformanız üçün premium admin paneli artıq hazırdır. Aşağıdakı addımları izləyərək front layihənizi adminlə birləşdirin.', 'Премиум админ-панель для Forsaj Club готова. Выполните шаги ниже, чтобы связать front-проект с админкой.')}</p>
            </div>

            <div className="setup-grid">
                <div className="steps-container">
                    {steps.map((step) => (
                        <div key={step.id} className="step-card">
                            <div className="step-icon">
                                <step.icon size={26} />
                            </div>
                            <div className="step-content">
                                <h3>{step.title}</h3>
                                <p>{step.description}</p>
                                <span className="step-badge">{step.path}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="setup-sidebar-actions">
                    <div className="action-card primary">
                        <PlusCircle size={32} />
                        <h4>{getLocalizedText(language, 'Yeni Səhifə Əlavə Et', 'Добавить новую страницу')}</h4>
                        <p>{getLocalizedText(language, 'Dinamik olaraq yeni admin səhifəsi yaradın.', 'Создайте новую страницу админки динамически.')}</p>
                    </div>
                    <div className="action-card secondary">
                        <Search size={32} />
                        <h4>{getLocalizedText(language, 'Front Skaner', 'Сканер Front')}</h4>
                        <p>{getLocalizedText(language, '/front qosulub. Skanlamağa hazırdır.', '/front подключен. Готов к сканированию.')}</p>
                        <button
                            className={`scan-btn ${isScanning ? 'loading' : ''}`}
                            onClick={startScan}
                            disabled={isScanning}
                        >
                            {isScanning ? <Loader2 className="animate-spin" /> : getLocalizedText(language, 'İndi Skan Et', 'Сканировать сейчас')}
                        </button>
                    </div>
                </div>
            </div>

            <div className="setup-footer">
                <div className="info-box">
                    <strong>{getLocalizedText(language, 'Məlumat:', 'Информация:')}</strong> {getLocalizedText(language, '/front qovluğu aşkar edildi. Sitemap avtomatik generasiya olunduqda bu ekran Dashboard ilə əvəzlənəcək.', 'Папка /front обнаружена. После автогенерации sitemap этот экран будет заменен Dashboard.')}
                </div>
            </div>
        </div>
    );
};

export default SetupGuide;
