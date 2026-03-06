export type AdminLanguage = 'az' | 'ru' | 'en';

export const ADMIN_LANGUAGE_STORAGE_KEY = 'forsaj_admin_language';

const normalizeText = (value: string) =>
  (value || '')
    .toLocaleLowerCase('az')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ə/g, 'e')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .trim();

const sidebarUiLabels = {
  az: {
    primaryNavigation: 'ƏSAS NAVİQASİYA',
    groupContent: 'SAYT MƏZMUNU',
    groupLegal: 'HÜQUQİ SƏHİFƏLƏR',
    groupManagement: 'İDARƏETMƏ',
    emptyMenu: 'Menyu boşdur',
    logout: 'Çıxış',
  },
  ru: {
    primaryNavigation: 'ОСНОВНАЯ НАВИГАЦИЯ',
    groupContent: 'КОНТЕНТ САЙТА',
    groupLegal: 'ЮРИДИЧЕСКИЕ СТРАНИЦЫ',
    groupManagement: 'УПРАВЛЕНИЕ',
    emptyMenu: 'Меню пустое',
    logout: 'Выход',
  },
  en: {
    primaryNavigation: 'MAIN NAVIGATION',
    groupContent: 'SITE CONTENT',
    groupLegal: 'LEGAL PAGES',
    groupManagement: 'MANAGEMENT',
    emptyMenu: 'Menu is empty',
    logout: 'Logout',
  },
} as const;

const titleMapRu: Record<string, string> = {
  'ana sehife': 'Главная',
  'ana sehife / naviqasiya / footer': 'Главная / Навигация / Footer',
  haqqimizda: 'О нас',
  xeberler: 'Новости',
  tedbirler: 'Мероприятия',
  suruculer: 'Пилоты',
  qalereya: 'Галерея',
  qaydalar: 'Правила',
  elaqe: 'Контакты',
  'istifadeci idaresi': 'Управление пользователями',
  'sistem ayarlari': 'Системные настройки',
  'whatsapp integration': 'Интеграция WhatsApp',
  sosyal: 'Соцсети',
  'sosial media': 'Соцсети',
  muracietler: 'Заявки',
  'privacy policy': 'Политика конфиденциальности',
  'terms of service': 'Условия использования',
  'ana sehife bloklari': 'Блоки главной',
  'menyu ve naviqasiya': 'Меню и навигация',
  'hero bolmesi': 'Hero секция',
  'marquee yazisi': 'Бегущая строка',
  footer: 'Футер',
  'xeber mezmunu': 'Контент новостей',
  'xeber sehifesi metni': 'Текст страницы новости',
  'tedbir siyahisi': 'Список мероприятий',
  'tedbir sehifesi metni': 'Текст страницы мероприятия',
  'surucu cedveli': 'Таблица пилотов',
  'suruculer sehifesi metni': 'Текст страницы пилотов',
  'seo ayarlari': 'Настройки SEO',
  'umumi parametrler': 'Общие параметры',
  'elaqe ve sosial': 'Контакты и соцсети',
  'marquee ayarlari': 'Настройки бегущей строки',
  'tetbiq ayarlari': 'Настройки приложения',
  'gizlenen ayarlar': 'Скрытые настройки',
  translations: 'Переводы',
};

const titleMapAz: Record<string, string> = {
  'ana sehife / naviqasiya / footer': 'Ana Səhifə',
  sosyal: 'Sosial Media',
};

const titleMapEn: Record<string, string> = {
  'ana sehife': 'Home',
  'ana sehife / naviqasiya / footer': 'Home / Navigation / Footer',
  haqqimizda: 'About',
  xeberler: 'News',
  tedbirler: 'Events',
  suruculer: 'Drivers',
  qalereya: 'Gallery',
  qaydalar: 'Rules',
  elaqe: 'Contact',
  'istifadeci idaresi': 'User Management',
  'sistem ayarlari': 'System Settings',
  'whatsapp integration': 'WhatsApp Integration',
  sosyal: 'Social Media',
  'sosial media': 'Social Media',
  muracietler: 'Applications',
  'privacy policy': 'Privacy Policy',
  'terms of service': 'Terms of Service',
  translations: 'Translations',
};

const pathMapRu: Record<string, string> = {
  '/applications': 'Заявки',
  '/users-management': 'Управление пользователями',
  '/general-settings?tab=general': 'Системные настройки',
  '/?page=contactpage': 'Контакты',
  '/?page=rulespage': 'Правила',
  '/?page=newspage': 'Новости',
  '/?page=eventspage': 'Мероприятия',
  '/?page=drivers': 'Пилоты',
  '/?page=about': 'О нас',
  '/?page=gallerypage': 'Галерея',
  '/general-settings?tab=social': 'Соцсети',
  '/general-settings?tab=whatsapp': 'Интеграция WhatsApp',
  '/general-settings?tab=seo': 'Настройки SEO',
  '/general-settings?tab=contact': 'Контакты и соцсети',
  '/general-settings?tab=marquee': 'Настройки бегущей строки',
  '/general-settings?tab=stats': 'Настройки приложения',
  '/general-settings?tab=hidden': 'Скрытые настройки',
  '/translations': 'Переводы',
  '/?page=privacypolicypage': 'Политика конфиденциальности',
  '/?page=termsofservicepage': 'Условия использования',
};

const pathMapAz: Record<string, string> = {
  '/general-settings?tab=social': 'Sosial Media',
  '/general-settings?tab=whatsapp': 'WhatsApp Integration',
  '/translations': 'Translations',
};

const pathMapEn: Record<string, string> = {
  '/applications': 'Applications',
  '/users-management': 'User Management',
  '/general-settings?tab=general': 'System Settings',
  '/?page=contactpage': 'Contact',
  '/?page=rulespage': 'Rules',
  '/?page=newspage': 'News',
  '/?page=eventspage': 'Events',
  '/?page=drivers': 'Drivers',
  '/?page=about': 'About',
  '/?page=gallerypage': 'Gallery',
  '/general-settings?tab=social': 'Social Media',
  '/general-settings?tab=whatsapp': 'WhatsApp Integration',
  '/translations': 'Translations',
  '/?page=privacypolicypage': 'Privacy Policy',
  '/?page=termsofservicepage': 'Terms of Service',
};

const normalizeSidebarPathKey = (path?: string) => {
  const raw = String(path || '').trim().toLocaleLowerCase('az');
  if (!raw) return '';
  if (raw === '/admin') return '/';
  if (raw.startsWith('/admin?')) return `/${raw.slice('/admin'.length)}`;
  if (raw.startsWith('/admin/')) return raw.slice('/admin'.length);
  return raw;
};

type TranslationPair = { az: string; ru: string; en?: string };

const ADMIN_TEXT_PAIRS: TranslationPair[] = [
  { az: 'Yüklənir...', ru: 'Загрузка...' },
  { az: 'Səhifə tapılmadı', ru: 'Страница не найдена' },
  { az: 'Sayta Bax', ru: 'Открыть сайт' },
  { az: 'Forsaj İdarəçisi', ru: 'Администратор Forsaj' },
  { az: 'Baş Admin', ru: 'Главный админ' },
  { az: 'Sayt Redaktoru', ru: 'Редактор сайта' },
  { az: 'Profil', ru: 'Профиль' },
  { az: 'İstifadəçi adı və şifrə mütləqdir', ru: 'Логин и пароль обязательны' },
  { az: 'Tam ad mütləqdir', ru: 'Полное имя обязательно' },
  { az: 'Şifrə ən azı 6 simvol olmalıdır', ru: 'Пароль должен содержать минимум 6 символов' },
  { az: 'Giriş uğursuz oldu', ru: 'Ошибка входа' },
  { az: 'Quraşdırma uğursuz oldu', ru: 'Ошибка настройки' },
  { az: 'Xoş gəldiniz!', ru: 'Добро пожаловать!' },
  { az: 'Baza uğurla başladıldı! İndi daxil ola bilərsiniz.', ru: 'Система успешно инициализирована. Теперь можно войти.' },
  { az: 'Əməliyyat uğursuz oldu', ru: 'Операция не выполнена' },
  { az: 'Forsaj İdarəetmə Paneli', ru: 'Панель управления Forsaj' },
  { az: 'Sistem Quraşdırılması', ru: 'Настройка системы' },
  { az: 'Sistemə daxil olmaq üçün məlumatlarınızı daxil edin', ru: 'Введите данные для входа в систему' },
  { az: 'İlkin Baş Admin hesabını yaradaraq sistemi başladın', ru: 'Создайте первого главного администратора для запуска системы' },
  { az: 'Tam Adınız', ru: 'Ваше полное имя' },
  { az: 'İstifadəçi Adı', ru: 'Имя пользователя' },
  { az: 'Şifrə', ru: 'Пароль' },
  { az: 'Gözləyin...', ru: 'Подождите...' },
  { az: 'Daxil ol', ru: 'Войти' },
  { az: 'Sistemi başlat', ru: 'Запустить систему' },
  { az: 'Məs: Əli Məmmədov', ru: 'Например: Али Мамедов' },
  { az: 'Məs: admin', ru: 'Например: admin' },
  { az: 'Front qovluğu skan edilir...', ru: 'Сканируется папка front...' },
  { az: 'Skan xətası', ru: 'Ошибка сканирования' },
  { az: 'Skan tamamlandı! Panel yenilənir...', ru: 'Сканирование завершено! Панель обновляется...' },
  { az: 'Skan uğursuz oldu!', ru: 'Сканирование не удалось!' },
  { az: 'Sitemap Faylını Yaradın', ru: 'Создайте файл Sitemap' },
  { az: 'Front Layihəsini Sinxronlaşdırın', ru: 'Синхронизируйте Front-проект' },
  { az: 'Sistem Ayarlarını Tənzimləyin', ru: 'Настройте системные параметры' },
  { az: 'Xoş Gəlmisiniz! Paneli Qurmağa Başlayaq', ru: 'Добро пожаловать! Давайте настроим панель' },
  { az: 'Yeni Səhifə Əlavə Et', ru: 'Добавить новую страницу' },
  { az: 'Dinamik olaraq yeni admin səhifəsi yaradın.', ru: 'Создайте новую страницу админки динамически.' },
  { az: 'Front Skaner', ru: 'Сканер Front' },
  { az: '/front qosulub. Skanlamağa hazırdır.', ru: '/front подключен. Готов к сканированию.' },
  { az: 'İndi Skan Et', ru: 'Сканировать сейчас' },
  { az: 'Məlumat:', ru: 'Информация:' },
  { az: 'Sessiya müddəti bitib. Yenidən daxil olun.', ru: 'Сессия истекла. Войдите снова.' },
  { az: 'İstifadəçiləri yükləmək mümkün olmadı', ru: 'Не удалось загрузить пользователей' },
  { az: 'Zəhmət olmasa bütün sahələri doldurun', ru: 'Пожалуйста, заполните все поля' },
  { az: 'İstifadəçi yeniləndi', ru: 'Пользователь обновлен' },
  { az: 'Yeni istifadəçi yaradıldı', ru: 'Новый пользователь создан' },
  { az: 'Xəta baş verdi', ru: 'Произошла ошибка' },
  { az: 'Serverlə bağlantı kəsildi', ru: 'Потеряно соединение с сервером' },
  { az: 'Bu istifadəçini silmək istədiyinizə əminsiniz?', ru: 'Вы уверены, что хотите удалить этого пользователя?' },
  { az: 'İstifadəçi silindi', ru: 'Пользователь удален' },
  { az: 'Silmək mümkün olmadı', ru: 'Не удалось удалить' },
  { az: 'Admin Hesabları', ru: 'Аккаунты админов' },
  { az: 'Yeni idarəçi', ru: 'Новый админ' },
  { az: 'Baş admin', ru: 'Главный админ' },
  { az: 'Redaktor', ru: 'Редактор' },
  { az: 'Düzəliş et', ru: 'Редактировать' },
  { az: 'Sil', ru: 'Удалить' },
  { az: 'İstifadəçini redaktə et', ru: 'Редактировать пользователя' },
  { az: 'Yeni idarəçi hesabı', ru: 'Новый администратор' },
  { az: 'Dəyişmək istəmirsinizsə boş saxlayın', ru: 'Оставьте пустым, если не хотите менять' },
  { az: 'Baş Admin (Tam səlahiyyət)', ru: 'Главный админ (полные права)' },
  { az: 'Redaktor (Məhdud səlahiyyət)', ru: 'Редактор (ограниченные права)' },
  { az: 'Ləğv et', ru: 'Отмена' },
  { az: 'Yadda Saxla', ru: 'Сохранить' },
  { az: 'Müraciətlər yüklənərkən xəta baş verdi', ru: 'Ошибка при загрузке заявок' },
  { az: 'Bu müraciəti silmək istədiyinizə əminsiniz?', ru: 'Вы уверены, что хотите удалить эту заявку?' },
  { az: 'Müraciət silindi', ru: 'Заявка удалена' },
  { az: 'Silinmə zamanı xəta baş verdi', ru: 'Ошибка при удалении' },
  { az: 'Export üçün müraciət tapılmadı', ru: 'Нет заявок для экспорта' },
  { az: 'XLSX faylı yükləndi', ru: 'XLSX файл загружен' },
  { az: 'XLSX export zamanı xəta baş verdi', ru: 'Ошибка экспорта XLSX' },
  { az: 'Müraciətlər', ru: 'Заявки' },
  { az: 'Hamısı', ru: 'Все' },
  { az: 'Oxunmamış', ru: 'Непрочитанные' },
  { az: 'Oxunmuş', ru: 'Прочитанные' },
  { az: 'Excelə Aktar', ru: 'Экспорт в Excel' },
  { az: 'Heç bir müraciət tapılmadı', ru: 'Заявки не найдены' },
  { az: 'Müraciət Təfərrüatları', ru: 'Детали заявки' },
  { az: 'Göndərən', ru: 'Отправитель' },
  { az: 'Əlaqə', ru: 'Контакт' },
  { az: 'Məzmun', ru: 'Содержание' },
  { az: 'Baxmaq üçün siyahıdan müraciət seçin', ru: 'Выберите заявку из списка для просмотра' },
  { az: 'Sistem Ayarları', ru: 'Системные настройки' },
  { az: 'Yadda saxlanılır...', ru: 'Сохраняется...' },
  { az: 'Ayarlar qeyd edildi!', ru: 'Настройки сохранены!' },
  { az: 'Ayarlar yüklənərkən xəta baş verdi', ru: 'Ошибка загрузки настроек' },
  { az: 'Şəkil yüklənir...', ru: 'Загрузка изображения...' },
  { az: 'Şəkil yükləndi', ru: 'Изображение загружено' },
  { az: 'Yükləmə xətası', ru: 'Ошибка загрузки' },
  { az: 'Gizlədilmiş ayar kartları', ru: 'Скрытые карточки настроек' },
  { az: 'SEO, Brendinq və ümumi sayt tənzimləmələri', ru: 'SEO, брендинг и общие настройки сайта' },
  { az: 'Gizlənmiş kart yoxdur. Kartları gizlətmək üçün normal görünüşdə kartın üzərinə gəlib göz ikonuna klikləyin.', ru: 'Скрытых карточек нет. Чтобы скрыть карточку, наведите на нее и нажмите иконку глаза.' },
  { az: 'Gizlət', ru: 'Скрыть' },
  { az: 'Göstər', ru: 'Показать' },
  { az: 'Test et', ru: 'Проверить' },
  { az: 'Aktiv', ru: 'Активно' },
  { az: 'Deaktiv', ru: 'Неактивно' },
  { az: 'WhatsApp Integration', ru: 'Интеграция WhatsApp' },
  { az: 'Admin Panel', ru: 'Панель администратора' },
  { az: 'Komponentləri və məzmunu axtar...', ru: 'Поиск компонентов и контента...' },
  { az: 'Geniş Rejim: Məcburi', ru: 'Широкий режим: обязателен' },
  { az: 'Gizlədilənləri Aç', ru: 'Показать скрытые' },
  { az: 'Paneldə gizlə', ru: 'Скрыть в панели' },
  { az: 'Paneldə gizlədilən bütün bölmələri yenidən göstər', ru: 'Показать все разделы, скрытые в панели' },
  { az: 'Bu section paneldə gizlidir. Yenidən göstərmək üçün “Paneldə gizlə” seçimini söndürün.', ru: 'Этот раздел скрыт в панели. Чтобы снова показать его, отключите опцию «Скрыть в панели».' },
  { az: 'Marquee bölməsi paneldə gizlədildi. Yuxarıdakı checkbox ilə geri aça bilərsiniz.', ru: 'Раздел Marquee скрыт в панели. Вы можете снова открыть его с помощью чекбокса выше.' },
  { az: 'Saxla', ru: 'Сохранить' },
  { az: 'Ana Səhifə', ru: 'Главная' },
  { az: 'Tədbirlər', ru: 'События' },
  { az: 'Tədbir İdarəetməsi', ru: 'Управление мероприятиями' },
  { az: 'Tedbir Yönetimi', ru: 'Управление мероприятиями' },
  { az: 'Xəbərlər', ru: 'Новости' },
  { az: 'Sürücülər', ru: 'Пилоты' },
  { az: 'Videolar', ru: 'Видео' },
  { az: 'Fotolar', ru: 'Фото' },
  { az: 'Geniş rejim məcburi aktivdir: texniki ID, sıralama, silmə və gizlətmə alətləri hər zaman görünür.', ru: 'Расширенный режим включен принудительно: технический ID, сортировка, удаление и скрытие всегда отображаются.' },
  { az: 'Əlaqə Səhifəsi', ru: 'Страница контактов' },
  { az: 'Əlaqə səhifəsində ofis, departament və form mətnləri.', ru: 'Тексты офиса, отделов и формы на странице контактов.' },
  { az: 'VƏZİYYƏT:', ru: 'СИТУАЦИЯ:' },
  { az: 'Müraciət İstiqaməti Seçimləri', ru: 'Варианты направления обращения' },
  { az: 'Yeni Seçim', ru: 'Новый вариант' },
  { az: 'Bu seçimlər əlaqə formundakı dropdown içində göstərilir.', ru: 'Эти варианты отображаются в выпадающем списке формы контакта.' },
  { az: 'Mətn Sahələri', ru: 'Текстовые поля' },
  { az: 'Mətn Əlavə Et', ru: 'Добавить текст' },
  { az: 'Səhifə və Sistem', ru: 'Страница и система' },
  { az: 'Səhifə başlığı, status və sistem mesajları', ru: 'Заголовок страницы, статус и системные сообщения' },
  { az: 'Səhifənin ən üstündə görünən əsas başlıq.', ru: 'Основной заголовок, отображаемый в верхней части страницы.' },
  { az: 'Açar mətn', ru: 'Ключевой текст' },
  { az: 'Link əlavə et', ru: 'Добавить ссылку' },
  { az: 'Yuxarı', ru: 'Вверх' },
  { az: 'Aşağı', ru: 'Вниз' },
  { az: 'Yuxarı daşı', ru: 'Переместить вверх' },
  { az: 'Aşağı daşı', ru: 'Переместить вниз' },
  { az: 'Sayta Bax', ru: 'Открыть сайт', en: 'Open Site' },
  { az: 'Forsaj İdarəçisi', ru: 'Администратор Forsaj', en: 'Forsaj Administrator' },
  { az: 'Baş Admin', ru: 'Главный админ', en: 'Super Admin' },
  { az: 'Baş admin', ru: 'Главный админ', en: 'Super Admin' },
  { az: 'Sayt Redaktoru', ru: 'Редактор сайта', en: 'Site Editor' },
  { az: 'Profil', ru: 'Профиль', en: 'Profile' },
  { az: 'Admin Panel', ru: 'Панель администратора', en: 'Admin Panel' },
  { az: 'Geniş Rejim: Məcburi', ru: 'Широкий режим: обязателен', en: 'Wide Mode: Required' },
  { az: 'Gizlədilənləri Aç', ru: 'Показать скрытые', en: 'Show Hidden' },
  { az: 'Saxla', ru: 'Сохранить', en: 'Save' },
  { az: 'Yadda Saxla', ru: 'Сохранить', en: 'Save' },
  { az: 'Tədbir İdarəetməsi', ru: 'Управление мероприятиями', en: 'Event Management' },
  { az: 'Tedbir Yönetimi', ru: 'Управление мероприятиями', en: 'Event Management' },
  { az: 'Geniş rejim məcburi aktivdir: texniki ID, sıralama, silmə və gizlətmə alətləri hər zaman görünür.', ru: 'Расширенный режим включен принудительно: технический ID, сортировка, удаление и скрытие всегда отображаются.', en: 'Wide mode is enforced: technical ID, ordering, delete and hide tools are always visible.' },
  { az: 'Hero Bölməsi', ru: 'Hero секция', en: 'Hero Section' },
  { az: 'Ana səhifənin ilk ekranında görünən başlıq, alt başlıq və düymələr.', ru: 'Заголовок, подзаголовок и кнопки, отображаемые на первом экране главной страницы.', en: 'Heading, subheading and buttons shown on the first screen of the homepage.' },
  { az: 'VƏZİYYƏT:', ru: 'СИТУАЦИЯ:', en: 'STATUS:' },
  { az: 'Mətn Sahələri', ru: 'Текстовые поля', en: 'Text Fields' },
  { az: 'Mətn Əlavə Et', ru: 'Добавить текст', en: 'Add Text' },
  { az: 'Bu mətn saytda olduğu kimi göstərilir.', ru: 'Этот текст отображается на сайте в том виде, в котором он есть.', en: 'This text is displayed on the site as is.' },
  { az: 'Açar mətn', ru: 'Ключевой текст', en: 'Key Text' },
  { az: 'Link əlavə et', ru: 'Добавить ссылку', en: 'Add Link' },
  { az: 'Yuxarı', ru: 'Вверх', en: 'Up' },
  { az: 'Aşağı', ru: 'Вниз', en: 'Down' },
  { az: 'Yuxarı daşı', ru: 'Переместить вверх', en: 'Move Up' },
  { az: 'Aşağı daşı', ru: 'Переместить вниз', en: 'Move Down' },
  { az: 'Paneldə gizlə', ru: 'Скрыть в панели', en: 'Hide In Panel' },
  { az: 'Paneldə gizlədilən bütün bölmələri yenidən göstər', ru: 'Показать все разделы, скрытые в панели', en: 'Show all sections hidden in panel' },
  { az: 'Bu section paneldə gizlidir. Yenidən göstərmək üçün “Paneldə gizlə” seçimini söndürün.', ru: 'Этот раздел скрыт в панели. Чтобы снова показать его, отключите опцию «Скрыть в панели».', en: 'This section is hidden in the panel. Disable “Hide In Panel” to show it again.' },
  { az: 'Marquee bölməsi paneldə gizlədildi. Yuxarıdakı checkbox ilə geri aça bilərsiniz.', ru: 'Раздел Marquee скрыт в панели. Вы можете снова открыть его с помощью чекбокса выше.', en: 'Marquee section is hidden in panel. You can re-open it using the checkbox above.' },
];

const buildLookup = (pairs: TranslationPair[], to: 'az' | 'ru' | 'en') => {
  const map = new Map<string, string>();
  pairs.forEach((pair) => {
    const enValue = pair.en || pair.az;
    const localized = to === 'ru' ? pair.ru : to === 'en' ? enValue : pair.az;
    map.set(pair.az, localized);
    map.set(pair.ru, localized);
    map.set(enValue, localized);
  });
  return map;
};

const TO_RU = buildLookup(ADMIN_TEXT_PAIRS, 'ru');
const TO_AZ = buildLookup(ADMIN_TEXT_PAIRS, 'az');
const TO_EN = buildLookup(ADMIN_TEXT_PAIRS, 'en');

export const getLocalizedText = (lang: AdminLanguage, azText: string, ruText: string) =>
  lang === 'ru' ? ruText : lang === 'en' ? translateAdminUiText('en', azText) : azText;

export const translateAdminUiText = (lang: AdminLanguage, value: string): string => {
  const input = String(value ?? '');
  if (!input) return input;
  const match = input.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!match) return input;
  const [, prefix, core, suffix] = match;
  const lookup = lang === 'ru' ? TO_RU : lang === 'en' ? TO_EN : TO_AZ;
  const translated = lookup.get(core);
  if (!translated) {
    if (lang === 'ru') {
      const optionMatch = core.match(/^Seçim\s+(\d+)$/i);
      if (optionMatch) return `${prefix}Вариант ${optionMatch[1]}${suffix}`;
      const orderMatch = core.match(/^Sıra:\s*(\d+)$/i);
      if (orderMatch) return `${prefix}Ряд: ${orderMatch[1]}${suffix}`;
      const optionFromEn = core.match(/^Option\s+(\d+)$/i);
      if (optionFromEn) return `${prefix}Вариант ${optionFromEn[1]}${suffix}`;
      const orderFromEn = core.match(/^Order:\s*(\d+)$/i);
      if (orderFromEn) return `${prefix}Ряд: ${orderFromEn[1]}${suffix}`;
    }

    if (lang === 'az') {
      const optionMatch = core.match(/^Вариант\s+(\d+)$/i);
      if (optionMatch) return `${prefix}Seçim ${optionMatch[1]}${suffix}`;
      const orderMatch = core.match(/^Ряд:\s*(\d+)$/i);
      if (orderMatch) return `${prefix}Sıra: ${orderMatch[1]}${suffix}`;
      const optionFromEn = core.match(/^Option\s+(\d+)$/i);
      if (optionFromEn) return `${prefix}Seçim ${optionFromEn[1]}${suffix}`;
      const orderFromEn = core.match(/^Order:\s*(\d+)$/i);
      if (orderFromEn) return `${prefix}Sıra: ${orderFromEn[1]}${suffix}`;
    }

    if (lang === 'en') {
      const optionFromAz = core.match(/^Seçim\s+(\d+)$/i);
      if (optionFromAz) return `${prefix}Option ${optionFromAz[1]}${suffix}`;
      const optionFromRu = core.match(/^Вариант\s+(\d+)$/i);
      if (optionFromRu) return `${prefix}Option ${optionFromRu[1]}${suffix}`;
      const orderFromAz = core.match(/^Sıra:\s*(\d+)$/i);
      if (orderFromAz) return `${prefix}Order: ${orderFromAz[1]}${suffix}`;
      const orderFromRu = core.match(/^Ряд:\s*(\d+)$/i);
      if (orderFromRu) return `${prefix}Order: ${orderFromRu[1]}${suffix}`;
    }

    return input;
  }
  return `${prefix}${translated}${suffix}`;
};

export const getAdminLanguageLabel = (lang: AdminLanguage) =>
  lang === 'ru' ? 'Русский' : (lang === 'en' ? 'English' : 'Azərbaycan');

export const getStoredAdminLanguage = (): AdminLanguage => {
  if (typeof window === 'undefined') return 'az';
  const saved = window.localStorage.getItem(ADMIN_LANGUAGE_STORAGE_KEY);
  if (saved === 'ru') return 'ru';
  if (saved === 'en') return 'en';
  return 'az';
};

export const setStoredAdminLanguage = (lang: AdminLanguage) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ADMIN_LANGUAGE_STORAGE_KEY, lang);
};

export const getSidebarUiLabel = (
  lang: AdminLanguage,
  key: keyof (typeof sidebarUiLabels)['az']
) => sidebarUiLabels[lang][key];

export const translateSidebarTitle = (title: string, path: string | undefined, lang: AdminLanguage) => {
  const normalizedTitle = normalizeText(title);
  const normalizedPath = normalizeSidebarPathKey(path);

  if (lang === 'ru') {
    const byPath = pathMapRu[normalizedPath];
    if (byPath) return byPath;
    const byTitle = titleMapRu[normalizedTitle];
    if (byTitle) return byTitle;
    return title;
  }

  if (lang === 'en') {
    const byPath = pathMapEn[normalizedPath];
    if (byPath) return byPath;
    const byTitle = titleMapEn[normalizedTitle];
    if (byTitle) return byTitle;
    return title;
  }

  const byPath = pathMapAz[normalizedPath];
  if (byPath) return byPath;
  const byTitle = titleMapAz[normalizedTitle];
  if (byTitle) return byTitle;
  return title;
};
