import { ExternalLink } from 'lucide-react';
import { type AdminLanguage, getLocalizedText } from '../utils/adminLanguage';
import './Header.css';

interface HeaderProps {
    user: any;
    language: AdminLanguage;
}

const Header: React.FC<HeaderProps> = ({ user, language }) => {
    return (
        <header className="header">
            <div className="header-right">
                <a href={import.meta.env.PROD ? "/" : "http://localhost:3005"} target="_blank" rel="noopener noreferrer" className="view-site-btn">
                    <ExternalLink size={16} /> {getLocalizedText(language, 'Sayta Bax', 'Открыть сайт')}
                </a>
                <div className="header-profile">
                    <div className="profile-info">
                        <span className="profile-name">{user?.name || getLocalizedText(language, 'Forsaj İdarəçisi', 'Администратор Forsaj')}</span>
                        <span className="profile-status">{user?.role === 'master'
                            ? getLocalizedText(language, 'Baş Admin', 'Главный админ')
                            : getLocalizedText(language, 'Sayt Redaktoru', 'Редактор сайта')}</span>
                    </div>
                    <img src={`https://ui-avatars.com/api/?name=${user?.name || 'Admin'}&background=random`} alt={getLocalizedText(language, 'Profil', 'Профиль')} />
                </div>
            </div>
        </header>
    );
};

export default Header;
