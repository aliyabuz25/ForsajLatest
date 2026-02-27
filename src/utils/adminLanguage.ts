export type AdminLanguage = 'az' | 'ru';

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
};

const titleMapAz: Record<string, string> = {
  'ana sehife / naviqasiya / footer': 'Ana Səhifə',
  sosyal: 'Sosial Media',
};

const pathMapRu: Record<string, string> = {
  '/applications': 'Заявки',
  '/users-management': 'Управление пользователями',
  '/general-settings?tab=general': 'Системные настройки',
  '/general-settings?tab=social': 'Соцсети',
  '/general-settings?tab=whatsapp': 'Интеграция WhatsApp',
  '/general-settings?tab=seo': 'Настройки SEO',
  '/general-settings?tab=contact': 'Контакты и соцсети',
  '/general-settings?tab=marquee': 'Настройки бегущей строки',
  '/general-settings?tab=stats': 'Настройки приложения',
  '/general-settings?tab=hidden': 'Скрытые настройки',
  '/?page=privacypolicypage': 'Политика конфиденциальности',
  '/?page=termsofservicepage': 'Условия использования',
};

const pathMapAz: Record<string, string> = {
  '/general-settings?tab=social': 'Sosial Media',
  '/general-settings?tab=whatsapp': 'WhatsApp Integration',
};

type TranslationPair = { az: string; ru: string };

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
];

const buildLookup = (pairs: TranslationPair[], to: 'az' | 'ru') => {
  const map = new Map<string, string>();
  pairs.forEach((pair) => {
    map.set(pair.az, to === 'ru' ? pair.ru : pair.az);
    map.set(pair.ru, to === 'ru' ? pair.ru : pair.az);
  });
  return map;
};

const TO_RU = buildLookup(ADMIN_TEXT_PAIRS, 'ru');
const TO_AZ = buildLookup(ADMIN_TEXT_PAIRS, 'az');

export const getLocalizedText = (lang: AdminLanguage, azText: string, ruText: string) =>
  lang === 'ru' ? ruText : azText;

export const translateAdminUiText = (lang: AdminLanguage, value: string): string => {
  const input = String(value ?? '');
  if (!input) return input;
  const match = input.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!match) return input;
  const [, prefix, core, suffix] = match;
  const lookup = lang === 'ru' ? TO_RU : TO_AZ;
  const translated = lookup.get(core);
  if (!translated) return input;
  return `${prefix}${translated}${suffix}`;
};

export const getAdminLanguageLabel = (lang: AdminLanguage) =>
  lang === 'ru' ? 'Русский' : 'Azərbaycan';

export const getStoredAdminLanguage = (): AdminLanguage => {
  if (typeof window === 'undefined') return 'az';
  const saved = window.localStorage.getItem(ADMIN_LANGUAGE_STORAGE_KEY);
  return saved === 'ru' ? 'ru' : 'az';
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
  const normalizedPath = String(path || '').trim().toLocaleLowerCase('az');

  if (lang === 'ru') {
    const byPath = pathMapRu[normalizedPath];
    if (byPath) return byPath;
    const byTitle = titleMapRu[normalizedTitle];
    if (byTitle) return byTitle;
    return title;
  }

  const byPath = pathMapAz[normalizedPath];
  if (byPath) return byPath;
  const byTitle = titleMapAz[normalizedTitle];
  if (byTitle) return byTitle;
  return title;
};
