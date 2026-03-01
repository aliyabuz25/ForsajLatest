require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 5000;
const app = express();
const FORCED_MAIL_LOGO_URL = 'https://forsaj.octotech.az/uploads/1771427495257-714907240.png';

// ------------------------------------------
// MYSQL CONFIGURATION
// ------------------------------------------
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'forsaj_user',
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || 'forsaj_admin',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000 // 10s timeout
});

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this';

console.log('--- SYSTEM CHECK ---');
console.log('PORT:', PORT);
console.log('DB_HOST:', process.env.MYSQL_HOST || 'localhost');
console.log('DB_USER:', process.env.MYSQL_USER || 'forsaj_user');
console.log('DB_NAME:', process.env.MYSQL_DATABASE || 'forsaj_admin');
console.log('DB_PASS_LEN:', (process.env.MYSQL_PASSWORD || '').length);
console.log('-------------------');

// Database Initialization with Retry logic
const initDB = async (retries = 10) => {
    if (dbInitInProgress) return;
    dbInitInProgress = true;
    lastDbInitAttemptAt = Date.now();

    while (retries > 0) {
        try {
            const connection = await pool.getConnection();
            console.log('Connected to MySQL Database');

            await connection.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    name VARCHAR(255),
                    role VARCHAR(50) DEFAULT 'secondary',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            await connection.query(`
                CREATE TABLE IF NOT EXISTS applications (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    contact VARCHAR(255) NOT NULL,
                    type VARCHAR(100) NOT NULL,
                    content TEXT,
                    status ENUM('unread', 'read') DEFAULT 'unread',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            await connection.query(`
                CREATE TABLE IF NOT EXISTS site_content (
                    id VARCHAR(255) PRIMARY KEY,
                    content_data LONGTEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            console.log('Database initialized: users, applications, and site_content tables ready');
            dbReady = true;
            await migrateFilesToDB();
            connection.release();
            dbInitInProgress = false;
            return; // Success
        } catch (error) {
            dbReady = false;
            console.error(`Database initialization attempt failed (${retries} retries left):`, error.message);
            retries -= 1;
            if (retries > 0) {
                console.log('Retrying in 5 seconds...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
                console.error('All database initialization attempts failed.');
            }
        }
    }

    dbInitInProgress = false;
};



// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// ------------------------------------------
// MIDDLEWARE CONFIGURATION
// ------------------------------------------
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.disable('etag');

// Request Logger & Trailing Slash Normalizer
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl || req.url}`);
    if (req.url.startsWith('/api/') && req.url.length > 5 && req.url.endsWith('/')) {
        req.url = req.url.slice(0, -1);
    }
    next();
});

// Disable browser/proxy caching so clients always fetch the latest content.
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
});

// ------------------------------------------
// ENVIRONMENT & PATH CONFIGURATION
// ------------------------------------------
const WEB_DATA_DIR = process.env.WEB_DATA_DIR || path.join(__dirname, '../front/public');
const FRONT_PUBLIC_DIR = WEB_DATA_DIR;
const SITE_CONTENT_PATH = path.join(WEB_DATA_DIR, 'site-content.json');

const ADMIN_PUBLIC_DIR = process.env.ADMIN_PUBLIC_DIR || path.join(__dirname, '../public');
const ADMIN_SITEMAP_PATH = path.join(ADMIN_PUBLIC_DIR, 'sitemap.json');

const UPLOAD_DIR_PATH = process.env.UPLOAD_DIR || path.join(FRONT_PUBLIC_DIR, 'uploads');

const USERS_FILE_PATH = path.join(WEB_DATA_DIR, 'users.json');
const EVENTS_FILE_PATH = path.join(FRONT_PUBLIC_DIR, 'events.json');
const NEWS_FILE_PATH = path.join(FRONT_PUBLIC_DIR, 'news.json');
const GALLERY_PHOTOS_FILE_PATH = path.join(FRONT_PUBLIC_DIR, 'gallery-photos.json');
const VIDEOS_FILE_PATH = path.join(FRONT_PUBLIC_DIR, 'videos.json');
const DRIVERS_FILE_PATH = path.join(FRONT_PUBLIC_DIR, 'drivers.json');
const SUBSCRIBERS_FILE_PATH = path.join(WEB_DATA_DIR, 'subscribers.json');
const SITE_NEW_STRUCT_PATH = path.join(WEB_DATA_DIR, 'site-new-struct.json');
const SITE_NEW_STRUCT_ID = 'site-new-struct';
const SITE_NEW_STRUCT_RESOURCE_IDS = ['site-content', 'events', 'news', 'gallery-photos', 'videos', 'drivers', 'subscribers'];

// Ensure runtime directories exist in fresh deployments (especially with empty volumes).
const ensureRuntimeDirs = () => {
    const dirs = [WEB_DATA_DIR, ADMIN_PUBLIC_DIR, UPLOAD_DIR_PATH];
    for (const dir of dirs) {
        try {
            fs.mkdirSync(dir, { recursive: true });
        } catch (err) {
            console.error(`Failed to ensure directory: ${dir}`, err.message);
        }
    }
};
ensureRuntimeDirs();

const CONTENT_FILE_PATHS = {
    [SITE_NEW_STRUCT_ID]: SITE_NEW_STRUCT_PATH,
    'site-content': SITE_CONTENT_PATH,
    'events': EVENTS_FILE_PATH,
    'news': NEWS_FILE_PATH,
    'gallery-photos': GALLERY_PHOTOS_FILE_PATH,
    'videos': VIDEOS_FILE_PATH,
    'drivers': DRIVERS_FILE_PATH,
    'subscribers': SUBSCRIBERS_FILE_PATH
};

let dbReady = false;
let dbInitInProgress = false;
let lastDbInitAttemptAt = 0;
let siteStructWriteQueue = Promise.resolve();

// ------------------------------------------
// DATABASE HELPERS & MIGRATION
// ------------------------------------------
// ... (migration logic uses these paths)

const getContentFromDB = async (id) => {
    if (!dbReady) return null;
    try {
        const [rows] = await pool.query('SELECT content_data FROM site_content WHERE id = ?', [id]);
        if (rows.length > 0) {
            return JSON.parse(rows[0].content_data);
        }
        return null;
    } catch (error) {
        console.error(`Error getting content for ${id}:`, error);
        dbReady = false;
        return null;
    }
};

const saveContentToDB = async (id, data) => {
    if (!dbReady) return false;
    try {
        const jsonData = JSON.stringify(data);
        await pool.query(
            'INSERT INTO site_content (id, content_data) VALUES (?, ?) ON DUPLICATE KEY UPDATE content_data = ?',
            [id, jsonData, jsonData]
        );
        return true;
    } catch (error) {
        console.error(`Error saving content for ${id}:`, error);
        dbReady = false;
        return false;
    }
};

const getContentFromFile = async (id) => {
    const filePath = CONTENT_FILE_PATHS[id];
    if (!filePath) return null;
    try {
        const raw = await fsPromises.readFile(filePath, 'utf8');
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const saveContentToFile = async (id, data) => {
    const filePath = CONTENT_FILE_PATHS[id];
    if (!filePath) return false;
    try {
        await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Error saving content file for ${id}:`, error);
        return false;
    }
};

const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]';
const deepClone = (value) => JSON.parse(JSON.stringify(value));
const normalizeListResource = (value) => {
    if (!Array.isArray(value)) return [];
    return value.filter(item => isPlainObject(item) || Array.isArray(item) || typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean' || item === null);
};
const resolvePageIdentity = (page) => {
    if (!isPlainObject(page)) return '';
    const raw = page.id ?? page.page_id;
    return String(raw || '').trim().toLowerCase();
};
const mergeSiteContentPages = (currentValue, incomingValue) => {
    const current = normalizeListResource(currentValue);
    const incoming = normalizeListResource(incomingValue);
    const currentById = new Map(current.map((item) => [resolvePageIdentity(item), item]));
    const seen = new Set();
    const merged = [];

    incoming.forEach((item) => {
        const pageId = resolvePageIdentity(item);
        if (!pageId) {
            merged.push(item);
            return;
        }

        seen.add(pageId);
        const previous = currentById.get(pageId);
        if (!isPlainObject(previous) || !isPlainObject(item)) {
            merged.push(item);
            return;
        }

        merged.push({
            ...previous,
            ...item,
            sections: Array.isArray(item.sections)
                ? item.sections
                : (Array.isArray(previous.sections) ? previous.sections : []),
            images: Array.isArray(item.images)
                ? item.images
                : (Array.isArray(previous.images) ? previous.images : [])
        });
    });

    current.forEach((item) => {
        const pageId = resolvePageIdentity(item);
        if (!pageId || seen.has(pageId)) return;
        merged.push(item);
    });

    return merged;
};

const createDefaultSiteStruct = () => ({
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    resources: SITE_NEW_STRUCT_RESOURCE_IDS.reduce((acc, id) => {
        acc[id] = [];
        return acc;
    }, {})
});

const normalizeSiteStruct = (value) => {
    const base = createDefaultSiteStruct();
    if (!isPlainObject(value)) return base;

    const rawResources = isPlainObject(value.resources) ? value.resources : {};
    const normalizedResources = { ...base.resources };

    SITE_NEW_STRUCT_RESOURCE_IDS.forEach((id) => {
        normalizedResources[id] = normalizeListResource(rawResources[id]);
    });

    for (const [key, rawValue] of Object.entries(rawResources)) {
        if (normalizedResources[key] !== undefined) continue;
        if (Array.isArray(rawValue)) {
            normalizedResources[key] = normalizeListResource(rawValue);
        }
    }

    return {
        schemaVersion: Number.isFinite(value.schemaVersion) ? Number(value.schemaVersion) : base.schemaVersion,
        updatedAt: typeof value.updatedAt === 'string' && value.updatedAt.trim().length > 0
            ? value.updatedAt
            : base.updatedAt,
        resources: normalizedResources
    };
};

const runSiteStructWrite = async (writer) => {
    const run = siteStructWriteQueue.then(() => writer());
    siteStructWriteQueue = run.catch((error) => {
        console.error('[site-new-struct] queued write failed:', error);
    });
    return run;
};

const readLegacyResourceDirect = async (resourceId) => {
    const dbData = await getContentFromDB(resourceId);
    if (dbData !== null) return normalizeListResource(dbData);
    const fileData = await getContentFromFile(resourceId);
    if (fileData !== null) return normalizeListResource(fileData);
    return [];
};

const readSiteStructFromLegacy = async () => {
    const struct = createDefaultSiteStruct();
    for (const resourceId of SITE_NEW_STRUCT_RESOURCE_IDS) {
        struct.resources[resourceId] = await readLegacyResourceDirect(resourceId);
    }
    return struct;
};

const hydrateMissingStructResources = async (value) => {
    const next = normalizeSiteStruct(value);
    let changed = false;

    for (const resourceId of SITE_NEW_STRUCT_RESOURCE_IDS) {
        if (Array.isArray(next.resources?.[resourceId]) && next.resources[resourceId].length > 0) continue;
        const legacyData = await readLegacyResourceDirect(resourceId);
        if (legacyData.length > 0) {
            next.resources[resourceId] = legacyData;
            changed = true;
        }
    }

    return { next, changed };
};

const persistSiteStruct = async (value) => {
    const next = normalizeSiteStruct(value);
    next.updatedAt = new Date().toISOString();
    next.schemaVersion = Number(next.schemaVersion || 1);

    const dbSaved = await saveContentToDB(SITE_NEW_STRUCT_ID, next);
    const fileSaved = await saveContentToFile(SITE_NEW_STRUCT_ID, next);
    let legacySaved = false;

    for (const resourceId of SITE_NEW_STRUCT_RESOURCE_IDS) {
        const resourceData = normalizeListResource(next.resources?.[resourceId]);
        await saveContentToDB(resourceId, resourceData);
        if (await saveContentToFile(resourceId, resourceData)) legacySaved = true;
    }

    return dbSaved || fileSaved || legacySaved;
};

const getSiteStruct = async () => {
    const dbStruct = await getContentFromDB(SITE_NEW_STRUCT_ID);
    if (dbStruct !== null) {
        const hydrated = await hydrateMissingStructResources(dbStruct);
        if (hydrated.changed) await persistSiteStruct(hydrated.next);
        return hydrated.next;
    }

    const fileStruct = await getContentFromFile(SITE_NEW_STRUCT_ID);
    if (fileStruct !== null) {
        const hydrated = await hydrateMissingStructResources(fileStruct);
        await saveContentToDB(SITE_NEW_STRUCT_ID, hydrated.next);
        if (hydrated.changed) await persistSiteStruct(hydrated.next);
        return hydrated.next;
    }

    const mergedFromLegacy = await readSiteStructFromLegacy();
    const hasLegacyData = SITE_NEW_STRUCT_RESOURCE_IDS.some((resourceId) =>
        Array.isArray(mergedFromLegacy.resources?.[resourceId]) && mergedFromLegacy.resources[resourceId].length > 0
    );
    if (hasLegacyData || dbReady) {
        await persistSiteStruct(mergedFromLegacy);
    }
    return mergedFromLegacy;
};

const getSiteStructResource = async (resourceId, fallback = []) => {
    const struct = await getSiteStruct();
    const resource = struct.resources?.[resourceId];
    if (!Array.isArray(resource)) return fallback;
    return deepClone(resource);
};

const saveSiteStructResource = async (resourceId, data) => {
    const normalizedResource = normalizeListResource(data);
    return runSiteStructWrite(async () => {
        const current = await getSiteStruct();
        const existingResource = normalizeListResource(current.resources?.[resourceId]);
        current.resources[resourceId] = resourceId === 'site-content'
            ? mergeSiteContentPages(existingResource, normalizedResource)
            : normalizedResource;
        current.schemaVersion = Number(current.schemaVersion || 1) + 1;
        return persistSiteStruct(current);
    });
};

const getContent = async (id, fallback = []) => {
    if (!dbReady && !dbInitInProgress && Date.now() - lastDbInitAttemptAt > 15000) {
        initDB(1).catch(() => { });
    }

    if (id === SITE_NEW_STRUCT_ID) {
        return getSiteStruct();
    }

    if (SITE_NEW_STRUCT_RESOURCE_IDS.includes(id)) {
        return getSiteStructResource(id, fallback);
    }

    const dbData = await getContentFromDB(id);
    if (dbData !== null) return dbData;

    const fileData = await getContentFromFile(id);
    if (fileData !== null) return fileData;

    return fallback;
};

const saveContent = async (id, data) => {
    if (!dbReady && !dbInitInProgress && Date.now() - lastDbInitAttemptAt > 15000) {
        initDB(1).catch(() => { });
    }

    if (id === SITE_NEW_STRUCT_ID) {
        return runSiteStructWrite(async () => {
            const current = await getSiteStruct();
            const incoming = isPlainObject(data) ? data : {};
            const incomingResources = isPlainObject(incoming.resources) ? incoming.resources : {};
            const mergedResources = {
                ...(isPlainObject(current.resources) ? current.resources : {})
            };

            for (const [resourceId, resourceValue] of Object.entries(incomingResources)) {
                if (!Array.isArray(resourceValue)) continue;
                mergedResources[resourceId] = normalizeListResource(resourceValue);
            }

            const { resources: _ignoredResources, ...incomingTopLevel } = incoming;
            const merged = {
                ...current,
                ...incomingTopLevel,
                resources: mergedResources,
                schemaVersion: Number(current.schemaVersion || 1) + 1
            };
            return persistSiteStruct(merged);
        });
    }

    if (SITE_NEW_STRUCT_RESOURCE_IDS.includes(id)) {
        return saveSiteStructResource(id, data);
    }

    const dbSaved = await saveContentToDB(id, data);
    const fileSaved = await saveContentToFile(id, data);
    return dbSaved || fileSaved;
};

const normalizeListPayload = (value) => {
    if (!Array.isArray(value)) return null;
    return normalizeListResource(value);
};

const isRegistrationEnabled = (rawValue, fallback = true) => {
    if (typeof rawValue === 'boolean') return rawValue;
    const normalized = String(rawValue || '').trim().toLowerCase();
    if (!normalized) return fallback;
    if (['false', '0', 'no', 'off', 'disabled', 'deactive', 'inactive', 'bagli', 'bağlı'].includes(normalized)) {
        return false;
    }
    return true;
};

const normalizeEventItems = (list) => {
    if (!Array.isArray(list)) return [];
    return list.map((item) => ({
        ...(isPlainObject(item) ? item : {}),
        registrationEnabled: isRegistrationEnabled(item?.registrationEnabled ?? item?.registration_enabled, true)
    }));
};

const normalizeSettingId = (value) => String(value || '').trim().toUpperCase();
const normalizeKeyToken = (value) => String(value || '')
    .trim()
    .replace(/^KEY:\s*/i, '')
    .replace(/\.\.\.$/, '')
    .toUpperCase();
const isPlaceholderToken = (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return false;
    return /^[A-Z0-9_]+$/.test(trimmed) || /^KEY:\s*[A-Z0-9_]+$/i.test(trimmed);
};
const isLikelyAssetPath = (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return false;
    if (/^https?:\/\//i.test(trimmed)) return true;
    if (trimmed.startsWith('/')) return true;
    if (/^(uploads|assets|images)\//i.test(trimmed)) return true;
    return /\.(png|jpe?g|webp|svg|gif|avif)(\?.*)?$/i.test(trimmed);
};
const toBoolean = (value, fallback = false) => {
    if (typeof value === 'boolean') return value;
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return fallback;
    return ['1', 'true', 'yes', 'on', 'enabled', 'active'].includes(normalized);
};

const resolveGeneralSettingValue = (siteContent, key, fallback = '') => {
    if (!Array.isArray(siteContent)) return fallback;
    const wanted = normalizeSettingId(key);
    const byPriority = ['general', 'app', 'navbar', 'footer'];
    const pages = [
        ...siteContent.filter((page) => byPriority.includes(String(page?.id || '').trim().toLowerCase())),
        ...siteContent.filter((page) => !byPriority.includes(String(page?.id || '').trim().toLowerCase()))
    ];

    const candidates = [];
    for (const page of pages) {
        const sections = Array.isArray(page?.sections) ? page.sections : [];
        for (const section of sections) {
            const sectionId = normalizeSettingId(section?.id);
            const sectionLabel = normalizeKeyToken(section?.label);
            if (sectionId !== wanted && sectionLabel !== wanted) continue;
            const value = String(section?.value || '').trim();
            if (value) candidates.push(value);
        }
    }

    const preferred = candidates.find((value) => !isPlaceholderToken(value));
    return preferred || fallback;
};

const resolveGeneralImagePath = (siteContent, key, fallback = '') => {
    if (!Array.isArray(siteContent)) return fallback;
    const wanted = normalizeSettingId(key);
    const byPriority = ['general', 'app', 'navbar', 'footer'];
    const pages = [
        ...siteContent.filter((page) => byPriority.includes(String(page?.id || '').trim().toLowerCase())),
        ...siteContent.filter((page) => !byPriority.includes(String(page?.id || '').trim().toLowerCase()))
    ];

    const candidates = [];
    for (const page of pages) {
        const images = Array.isArray(page?.images) ? page.images : [];
        for (const image of images) {
            const imageId = normalizeSettingId(image?.id);
            if (imageId !== wanted) continue;
            const imagePath = String(image?.path || '').trim();
            if (imagePath) candidates.push(imagePath);
        }

        const sections = Array.isArray(page?.sections) ? page.sections : [];
        for (const section of sections) {
            const sectionId = normalizeSettingId(section?.id);
            const sectionLabel = normalizeKeyToken(section?.label);
            if (sectionId !== wanted && sectionLabel !== wanted) continue;
            const sectionValue = String(section?.value || '').trim();
            if (sectionValue && isLikelyAssetPath(sectionValue)) candidates.push(sectionValue);
        }
    }

    const preferred = candidates.find((value) => !isPlaceholderToken(value));
    return preferred || fallback;
};

const getOriginFromUrl = (value) => {
    try {
        return new URL(value).origin;
    } catch {
        return '';
    }
};

const toAbsoluteUrlWithBase = (baseUrl, rawPath) => {
    const value = String(rawPath || '').trim();
    if (!value) return '';
    if (isPlaceholderToken(value)) return '';
    if (/^https?:\/\//i.test(value)) return value;
    const base = String(baseUrl || '').trim();
    if (!base) return value;
    try {
        return new URL(value, base.endsWith('/') ? base : `${base}/`).toString();
    } catch {
        return `${base}${value.startsWith('/') ? value : `/${value}`}`;
    }
};

const resolveInlineLogoAttachment = (logoSource) => {
    const raw = String(logoSource || '').trim();
    if (!raw) return { src: '', attachments: [] };
    if (/^https?:\/\//i.test(raw) || /^cid:/i.test(raw)) return { src: raw, attachments: [] };

    const clean = raw.split('?')[0].split('#')[0];
    const relativePath = clean.startsWith('/') ? clean.slice(1) : clean;
    const localFilePath = path.resolve(FRONT_PUBLIC_DIR, relativePath);
    const safeBase = path.resolve(FRONT_PUBLIC_DIR);
    if (!localFilePath.startsWith(safeBase)) return { src: raw, attachments: [] };
    if (!fs.existsSync(localFilePath)) return { src: raw, attachments: [] };

    const cid = 'forsaj-site-logo@inline';
    return {
        src: `cid:${cid}`,
        attachments: [{ filename: path.basename(localFilePath), path: localFilePath, cid }]
    };
};

const resolveSmtpSettings = async () => {
    const siteContent = await getContent('site-content', []);

    const enabled = toBoolean(resolveGeneralSettingValue(siteContent, 'SMTP_ENABLED', process.env.SMTP_ENABLED || '1'), true);
    const host = resolveGeneralSettingValue(siteContent, 'SMTP_HOST', process.env.SMTP_HOST || '');
    const portRaw = resolveGeneralSettingValue(siteContent, 'SMTP_PORT', process.env.SMTP_PORT || '');
    const port = Number(portRaw) || (toBoolean(resolveGeneralSettingValue(siteContent, 'SMTP_SECURE', process.env.SMTP_SECURE || '0')) ? 465 : 587);
    const secure = toBoolean(resolveGeneralSettingValue(siteContent, 'SMTP_SECURE', process.env.SMTP_SECURE || '0'), port === 465);
    const user = resolveGeneralSettingValue(siteContent, 'SMTP_USER', process.env.SMTP_USER || '');
    const pass = resolveGeneralSettingValue(siteContent, 'SMTP_PASS', process.env.SMTP_PASS || '');
    const from = resolveGeneralSettingValue(siteContent, 'SMTP_FROM', process.env.SMTP_FROM || user);
    const to = resolveGeneralSettingValue(
        siteContent,
        'SMTP_TO',
        process.env.SMTP_TO || resolveGeneralSettingValue(siteContent, 'CONTACT_EMAIL', process.env.NOTIFICATION_EMAIL || '')
    );
    const siteName = resolveGeneralSettingValue(siteContent, 'SEO_TITLE', process.env.SITE_NAME || 'Forsaj Club');
    const canonicalUrl = resolveGeneralSettingValue(siteContent, 'SEO_CANONICAL_URL', process.env.SITE_URL || '');
    const siteOrigin = getOriginFromUrl(canonicalUrl) || process.env.SITE_ORIGIN || '';
    const logoPath = resolveGeneralImagePath(siteContent, 'SITE_LOGO_LIGHT', process.env.SITE_LOGO_URL || '');
    const logoUrl = toAbsoluteUrlWithBase(siteOrigin, logoPath);

    return {
        enabled,
        host,
        port,
        secure,
        user,
        pass,
        from,
        toList: to.split(',').map((entry) => entry.trim()).filter(Boolean),
        siteName,
        siteUrl: canonicalUrl,
        logoUrl
    };
};

const formatApplicationMailContent = (content) => {
    const trimmed = String(content || '').trim();
    if (!trimmed) {
        return {
            text: 'Məzmun boşdur.',
            html: '<p style="margin:0;color:#d1d5db;font-size:14px;line-height:1.7;">Məzmun boşdur.</p>'
        };
    }

    const toParagraphHtml = (value) => {
        const lines = String(value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        if (!lines.length) return '<p style="margin:0;color:#d1d5db;font-size:14px;line-height:1.7;">Məzmun boşdur.</p>';
        return lines
            .map((line) => `<p style="margin:0 0 8px;color:#d1d5db;font-size:14px;line-height:1.7;">${escapeHtml(line)}</p>`)
            .join('');
    };

    const toKeyValueTable = (entries) => {
        if (!entries.length) return '<p style="margin:0;color:#d1d5db;font-size:14px;line-height:1.7;">Məzmun boşdur.</p>';
        const rows = entries.map(([key, value]) => {
            const safeKey = escapeHtml(String(key));
            const safeValue = escapeHtml(String(value ?? '-'));
            return `<tr><td style="padding:10px 0;color:#9ca3af;font-size:12px;width:170px;vertical-align:top;text-transform:uppercase;letter-spacing:0.06em;">${safeKey}</td><td style="padding:10px 0;color:#f9fafb;font-size:14px;font-weight:600;word-break:break-word;">${safeValue}</td></tr>`;
        }).join('');
        return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">${rows}</table>`;
    };

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                if (!parsed.length) {
                    return {
                        text: 'Məzmun boşdur.',
                        html: '<p style="margin:0;color:#d1d5db;font-size:14px;line-height:1.7;">Məzmun boşdur.</p>'
                    };
                }

                const normalizedTextLines = [];
                const itemBlocks = parsed.map((item, index) => {
                    if (isPlainObject(item)) {
                        const entries = Object.entries(item);
                        normalizedTextLines.push(`${index + 1}.`);
                        entries.forEach(([key, value]) => normalizedTextLines.push(`${key}: ${String(value ?? '')}`));
                        const itemTable = toKeyValueTable(entries);
                        return `<div style="margin:0 0 12px;padding:14px;border:1px solid #374151;border-radius:10px;background:#0b1220;"><div style="margin:0 0 10px;color:#f97316;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">Maddə ${index + 1}</div>${itemTable}</div>`;
                    }
                    const lineText = String(item ?? '').trim();
                    normalizedTextLines.push(`${index + 1}. ${lineText}`);
                    return `<div style="margin:0 0 10px;color:#d1d5db;font-size:14px;line-height:1.7;"><strong style="color:#f97316;">${index + 1}.</strong> ${escapeHtml(lineText)}</div>`;
                }).join('');

                return {
                    text: normalizedTextLines.join('\n'),
                    html: itemBlocks
                };
            }
            if (isPlainObject(parsed)) {
                const text = Object.entries(parsed).map(([key, value]) => `${key}: ${String(value ?? '')}`).join('\n');
                return {
                    text,
                    html: toKeyValueTable(Object.entries(parsed))
                };
            }
            const text = String(parsed);
            return {
                text,
                html: toParagraphHtml(text)
            };
        } catch {
            return {
                text: trimmed,
                html: toParagraphHtml(trimmed)
            };
        }
    }
    return {
        text: trimmed,
        html: toParagraphHtml(trimmed)
    };
};

const sendApplicationNotificationEmail = async ({ name, contact, type, content }) => {
    const smtp = await resolveSmtpSettings();
    if (!smtp.enabled) return { sent: false, reason: 'smtp_disabled' };
    if (!smtp.host || !smtp.toList.length) return { sent: false, reason: 'smtp_not_configured' };

    const transport = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined
    });

    const formattedContent = formatApplicationMailContent(content);
    const createdAt = new Date().toISOString();
    const subject = `[${smtp.siteName || 'Forsaj'}] Yeni müraciət: ${type}`;

    const textBody = [
        `${smtp.siteName || 'Forsaj Club'} - Yeni form müraciəti`,
        '',
        `Ad: ${name}`,
        `Əlaqə: ${contact}`,
        `Növ: ${type}`,
        `Tarix: ${createdAt}`,
        '',
        'Məzmun:',
        formattedContent.text
    ].join('\n');

    const siteUrlText = String(smtp.siteUrl || '').trim();
    const safeName = escapeHtml(name);
    const safeContact = escapeHtml(contact);
    const safeType = escapeHtml(type);
    const safeDate = escapeHtml(createdAt);
    const safeSiteName = escapeHtml(smtp.siteName || 'Forsaj Club');
    const safeSiteUrl = escapeHtml(siteUrlText);
    const hasPublicSiteUrl = /^https?:\/\//i.test(siteUrlText);
    const logoAsset = resolveInlineLogoAttachment(FORCED_MAIL_LOGO_URL || smtp.logoUrl);
    const headerLogo = logoAsset.src
        ? `<img src="${escapeHtml(logoAsset.src)}" alt="${safeSiteName}" style="height:46px;max-width:240px;width:auto;display:block;object-fit:contain;" />`
        : `<div style="font-size:22px;font-weight:900;letter-spacing:0.02em;color:#f9fafb;">${safeSiteName}</div>`;

    const htmlBody = `
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safeSiteName} yeni form müraciəti bildirişi</div>
      <div style="background:#020617;padding:28px 0;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:720px;margin:0 auto;background:#0b1220;border-radius:16px;overflow:hidden;border:1px solid #1e293b;">
          <tr>
            <td style="background:#020617;padding:0;">
              <div style="height:4px;background:linear-gradient(90deg,#f97316,#fb923c,#fdba74);"></div>
            </td>
          </tr>
          <tr>
            <td style="background:#050505;padding:24px 30px;border-bottom:1px solid #1f2937;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>${headerLogo}</td>
                  <td style="text-align:right;color:#f97316;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Yeni Form Müraciəti</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <h2 style="margin:0 0 18px;font-size:24px;line-height:1.3;color:#f9fafb;">Yeni müraciət daxil oldu</h2>
              <p style="margin:0 0 22px;color:#94a3b8;font-size:13px;line-height:1.6;">Bu bildiriş sayt formundan avtomatik yaradılıb. Aşağıdakı məlumatlar birbaşa istifadəçi müraciətindən götürülüb.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:18px;">
                <tr><td style="padding:8px 0;color:#9ca3af;font-size:12px;width:140px;text-transform:uppercase;letter-spacing:0.06em;">Ad Soyad</td><td style="padding:8px 0;color:#f9fafb;font-size:14px;font-weight:700;">${safeName}</td></tr>
                <tr><td style="padding:8px 0;color:#9ca3af;font-size:12px;width:140px;text-transform:uppercase;letter-spacing:0.06em;">Əlaqə</td><td style="padding:8px 0;color:#f9fafb;font-size:14px;font-weight:700;">${safeContact}</td></tr>
                <tr><td style="padding:8px 0;color:#9ca3af;font-size:12px;width:140px;text-transform:uppercase;letter-spacing:0.06em;">Form Növü</td><td style="padding:8px 0;color:#f9fafb;font-size:14px;font-weight:700;">${safeType}</td></tr>
                <tr><td style="padding:8px 0;color:#9ca3af;font-size:12px;width:140px;text-transform:uppercase;letter-spacing:0.06em;">Tarix</td><td style="padding:8px 0;color:#f9fafb;font-size:14px;font-weight:700;">${safeDate}</td></tr>
              </table>

              <div style="margin-top:8px;border:1px solid #1f2937;border-radius:12px;padding:16px;background:#111827;">
                <div style="font-size:12px;font-weight:800;letter-spacing:0.08em;color:#f97316;text-transform:uppercase;margin-bottom:12px;">Müraciət Məzmunu</div>
                ${formattedContent.html}
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#050505;border-top:1px solid #1f2937;padding:14px 30px;color:#9ca3af;font-size:12px;">
              ${safeSiteName}${hasPublicSiteUrl ? ` • <a href="${safeSiteUrl}" style="color:#f97316;text-decoration:none;">${safeSiteUrl}</a>` : ''} • Professional Notification
            </td>
          </tr>
        </table>
      </div>
    `;

    await transport.sendMail({
        from: smtp.from || smtp.user,
        to: smtp.toList.join(', '),
        subject,
        text: textBody,
        html: htmlBody,
        attachments: logoAsset.attachments
    });

    return { sent: true };
};

const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const toPlainText = (value) => String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getTextExcerpt = (value, limit = 180) => {
    const plain = toPlainText(value);
    if (!plain) return '';
    if (plain.length <= limit) return plain;
    return `${plain.slice(0, limit - 1).trimEnd()}…`;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const PHONE_DIGIT_REGEX = /\d+/g;

const normalizeSubscriberEmail = (value) => {
    const email = String(value || '').trim().toLowerCase();
    if (!email) return '';
    return EMAIL_REGEX.test(email) ? email : '';
};

const safeParseJsonObject = (raw) => {
    const source = String(raw || '').trim();
    if (!source.startsWith('{')) return null;
    try {
        const parsed = JSON.parse(source);
        return isPlainObject(parsed) ? parsed : null;
    } catch {
        return null;
    }
};

const isNewsletterType = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .includes('newsletter');

const normalizeLocaleCode = (value) => {
    const locale = String(value || '').trim().toUpperCase();
    if (locale === 'RU') return 'RU';
    if (locale === 'EN' || locale === 'ENG') return 'EN';
    return 'AZ';
};

const normalizeWhatsAppNumber = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    let cleaned = raw.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('00')) cleaned = `+${cleaned.slice(2)}`;
    if (!cleaned.startsWith('+')) {
        const digits = (cleaned.match(PHONE_DIGIT_REGEX) || []).join('');
        if (!digits) return '';
        if (digits.startsWith('994')) cleaned = `+${digits}`;
        else if (digits.startsWith('0')) cleaned = `+994${digits.slice(1)}`;
        else cleaned = `+${digits}`;
    }
    const digitCount = (cleaned.match(PHONE_DIGIT_REGEX) || []).join('').length;
    if (digitCount < 10 || digitCount > 15) return '';
    return cleaned;
};

const normalizeHubMsgRecipient = (value) => {
    const normalized = normalizeWhatsAppNumber(value);
    if (!normalized) return '';
    return (normalized.match(PHONE_DIGIT_REGEX) || []).join('');
};

const resolveWhatsAppSettings = async () => {
    const siteContent = await getContent('site-content', []);
    const enabled = toBoolean(resolveGeneralSettingValue(siteContent, 'WHATSAPP_ENABLED', process.env.WHATSAPP_ENABLED || '1'), true);
    const endpoint = String(resolveGeneralSettingValue(
        siteContent,
        'WHATSAPP_API_ENDPOINT',
        process.env.WHATSAPP_API_ENDPOINT || 'https://hubmsgpanel.octotech.az/api/message'
    ) || '').trim();
    const apiKey = String(resolveGeneralSettingValue(
        siteContent,
        'WHATSAPP_API_KEY',
        process.env.WHATSAPP_API_KEY || '037ed90b2bcc903c7f15d33003d6b99c'
    ) || '').trim();
    const organizerRaw = String(resolveGeneralSettingValue(
        siteContent,
        'WHATSAPP_ORGANIZER_TO',
        process.env.ORGANIZER_WHATSAPP_TO || ''
    ) || '').trim();
    const organizerTargets = organizerRaw
        .split(',')
        .map((item) => normalizeHubMsgRecipient(item))
        .filter(Boolean);

    return {
        enabled,
        endpoint,
        apiKey,
        organizerTargets
    };
};

const sendHubMsgWhatsAppMessage = async ({ endpoint, apiKey, recipient, message }) => {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        },
        body: JSON.stringify({
            recipient: String(recipient || '').trim(),
            message: String(message || '').trim()
        })
    });

    if (!response.ok) {
        const raw = await response.text().catch(() => '');
        throw new Error(`hubmsg_error_${response.status}${raw ? `:${raw}` : ''}`);
    }

    return response.json().catch(() => ({}));
};

const buildPilotWhatsAppMessage = ({ locale, toOrganizer, name, eventTitle, whatsapp }) => {
    const lang = normalizeLocaleCode(locale);
    const safeName = String(name || '').trim() || '-';
    const safeEventTitle = String(eventTitle || '').trim() || '-';

    if (toOrganizer) {
        if (lang === 'RU') {
            return `Новая заявка пилота получена.\nИмя: ${safeName}\nWhatsApp: ${whatsapp}\nСобытие: ${safeEventTitle}\nСтатус: Заявка принята, ожидает обратной связи.`;
        }
        if (lang === 'EN') {
            return `New pilot application received.\nName: ${safeName}\nWhatsApp: ${whatsapp}\nEvent: ${safeEventTitle}\nStatus: Application received, pending follow-up.`;
        }
        return `Yeni pilot müraciəti daxil oldu.\nAd: ${safeName}\nWhatsApp: ${whatsapp}\nTədbir: ${safeEventTitle}\nStatus: Müraciət qəbul edildi, geri əlaqə gözləyir.`;
    }

    if (lang === 'RU') {
        return `Здравствуйте, ${safeName}!\nМы получили вашу заявку.\nВаша заявка еще не подтверждена.\nОчень скоро мы свяжемся с вами в WhatsApp.\nСобытие: ${safeEventTitle}`;
    }
    if (lang === 'EN') {
        return `Hello ${safeName}!\nWe have received your application.\nYour application is not fully approved yet.\nWe will contact you very soon via WhatsApp.\nEvent: ${safeEventTitle}`;
    }
    return `Salam ${safeName}!\nBaşvurunuzu aldıq.\nMüraciətiniz hələ tam təsdiqlənməyib.\nÇox yaxında sizinlə WhatsApp üzərindən əlaqə saxlanılacaq.\nTədbir: ${safeEventTitle}`;
};

const sendPilotApplicationWhatsAppNotifications = async ({ name, whatsapp, eventTitle, locale }) => {
    const settings = await resolveWhatsAppSettings();
    if (!settings.enabled) return { sent: false, reason: 'whatsapp_disabled' };
    if (!settings.endpoint || !settings.apiKey) {
        return { sent: false, reason: 'whatsapp_not_configured' };
    }

    const candidatePhone = normalizeHubMsgRecipient(whatsapp);
    if (!candidatePhone) return { sent: false, reason: 'invalid_candidate_whatsapp' };

    const deliveries = [];

    try {
        await sendHubMsgWhatsAppMessage({
            endpoint: settings.endpoint,
            apiKey: settings.apiKey,
            recipient: candidatePhone,
            message: buildPilotWhatsAppMessage({
                locale,
                toOrganizer: false,
                name,
                eventTitle,
                whatsapp: candidatePhone
            })
        });
        deliveries.push({ target: 'candidate', to: candidatePhone, sent: true });
    } catch (error) {
        deliveries.push({ target: 'candidate', to: candidatePhone, sent: false, error: error?.message || 'candidate_send_failed' });
    }

    for (const organizerPhone of settings.organizerTargets) {
        try {
            await sendHubMsgWhatsAppMessage({
                endpoint: settings.endpoint,
                apiKey: settings.apiKey,
                recipient: organizerPhone,
                message: buildPilotWhatsAppMessage({
                    locale,
                    toOrganizer: true,
                    name,
                    eventTitle,
                    whatsapp: candidatePhone
                })
            });
            deliveries.push({ target: 'organizer', to: organizerPhone, sent: true });
        } catch (error) {
            deliveries.push({ target: 'organizer', to: organizerPhone, sent: false, error: error?.message || 'organizer_send_failed' });
        }
    }

    const sentCount = deliveries.filter((item) => item.sent).length;
    if (!sentCount) {
        return { sent: false, reason: 'whatsapp_send_failed', deliveries };
    }

    return {
        sent: true,
        sentCount,
        deliveries,
        organizerConfigured: settings.organizerTargets.length > 0
    };
};

const sanitizeSubscribers = (items) => {
    const list = Array.isArray(items) ? items : [];
    const dedupe = new Map();

    for (const item of list) {
        const email = normalizeSubscriberEmail(item?.email);
        if (!email) continue;
        const normalized = {
            email,
            name: String(item?.name || '').trim(),
            source: String(item?.source || '').trim() || 'site',
            active: item?.active !== false,
            subscribed_at: String(item?.subscribed_at || '').trim() || new Date().toISOString()
        };
        dedupe.set(email, normalized);
    }

    return Array.from(dedupe.values());
};

const getStoredSubscribers = async () => {
    const raw = await getContent('subscribers', []);
    return sanitizeSubscribers(raw);
};

const saveSubscribers = async (subscribers) => {
    const normalized = sanitizeSubscribers(subscribers);
    return saveContent('subscribers', normalized);
};

const upsertSubscriber = async ({ email, name = '', source = 'site' }) => {
    const normalizedEmail = normalizeSubscriberEmail(email);
    if (!normalizedEmail) return { ok: false, reason: 'invalid_email' };

    const current = await getStoredSubscribers();
    const byEmail = new Map(current.map((subscriber) => [subscriber.email, subscriber]));
    const existing = byEmail.get(normalizedEmail);

    byEmail.set(normalizedEmail, {
        email: normalizedEmail,
        name: String(name || existing?.name || '').trim(),
        source: String(source || existing?.source || 'site').trim() || 'site',
        active: true,
        subscribed_at: existing?.subscribed_at || new Date().toISOString()
    });

    const ok = await saveSubscribers(Array.from(byEmail.values()));
    return { ok, email: normalizedEmail };
};

const getLegacyNewsletterSubscribersFromApplications = async () => {
    if (!dbReady) return [];

    try {
        const [rows] = await pool.query('SELECT name, contact, type, content FROM applications ORDER BY id DESC LIMIT 5000');
        const emails = new Map();

        for (const row of Array.isArray(rows) ? rows : []) {
            const type = String(row?.type || '').trim();
            const content = String(row?.content || '').trim();
            const contact = String(row?.contact || '').trim();
            const parsed = safeParseJsonObject(content);
            const source = String(parsed?.source || '').trim().toLowerCase();
            const candidateEmail = normalizeSubscriberEmail(parsed?.email || contact);
            if (!candidateEmail) continue;

            if (!isNewsletterType(type) && !source.includes('newsletter')) continue;
            if (!emails.has(candidateEmail)) {
                emails.set(candidateEmail, {
                    email: candidateEmail,
                    name: String(row?.name || '').trim(),
                    source: source || 'applications',
                    active: true,
                    subscribed_at: new Date().toISOString()
                });
            }
        }

        return Array.from(emails.values());
    } catch (error) {
        console.warn('[subscribers] failed to read legacy newsletter applications:', error?.message || error);
        return [];
    }
};

const getAllActiveSubscriberEmails = async () => {
    const [stored, legacy] = await Promise.all([
        getStoredSubscribers(),
        getLegacyNewsletterSubscribersFromApplications()
    ]);

    const all = sanitizeSubscribers([...(stored || []), ...(legacy || [])]);
    return Array.from(new Set(
        all
            .filter((subscriber) => subscriber.active !== false)
            .map((subscriber) => normalizeSubscriberEmail(subscriber.email))
            .filter(Boolean)
    ));
};

const sendBulkSubscriberEmail = async ({ subject, introText, htmlContent, textContent }) => {
    const recipients = await getAllActiveSubscriberEmails();
    if (!recipients.length) return { sent: false, reason: 'no_subscribers', recipients: 0 };

    const smtp = await resolveSmtpSettings();
    if (!smtp.enabled) return { sent: false, reason: 'smtp_disabled', recipients: recipients.length };
    if (!smtp.host || !smtp.from) return { sent: false, reason: 'smtp_not_configured', recipients: recipients.length };

    const transport = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined
    });

    const safeSiteName = escapeHtml(smtp.siteName || 'Forsaj Club');
    const safeSubject = escapeHtml(subject || `${smtp.siteName || 'Forsaj Club'} bildirişi`);
    const safeIntro = escapeHtml(introText || 'Yeni bildiriş');
    const logoAsset = resolveInlineLogoAttachment(FORCED_MAIL_LOGO_URL || smtp.logoUrl);
    const headerLogo = logoAsset.src
        ? `<img src="${escapeHtml(logoAsset.src)}" alt="${safeSiteName}" style="height:44px;max-width:220px;width:auto;display:block;object-fit:contain;" />`
        : `<div style="font-size:22px;font-weight:900;letter-spacing:0.02em;color:#f9fafb;">${safeSiteName}</div>`;

    const htmlBody = `
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safeSubject}</div>
      <div style="background:#020617;padding:28px 0;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:720px;margin:0 auto;background:#0b1220;border-radius:16px;overflow:hidden;border:1px solid #1e293b;">
          <tr><td style="background:#020617;padding:0;"><div style="height:4px;background:linear-gradient(90deg,#f97316,#fb923c,#fdba74);"></div></td></tr>
          <tr>
            <td style="background:#050505;padding:24px 30px;border-bottom:1px solid #1f2937;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td>${headerLogo}</td><td style="text-align:right;color:#f97316;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Bildiriş</td></tr></table>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <h2 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#f9fafb;">${safeSubject}</h2>
              <p style="margin:0 0 18px;color:#94a3b8;font-size:13px;line-height:1.6;">${safeIntro}</p>
              <div style="margin-top:8px;border:1px solid #1f2937;border-radius:12px;padding:16px;background:#111827;color:#d1d5db;">
                ${htmlContent}
              </div>
            </td>
          </tr>
        </table>
      </div>
    `;

    const batchSize = 50;
    let sentBatches = 0;
    for (let index = 0; index < recipients.length; index += batchSize) {
        const batch = recipients.slice(index, index + batchSize);
        await transport.sendMail({
            from: smtp.from || smtp.user,
            to: smtp.from || smtp.user,
            bcc: batch.join(', '),
            subject,
            text: textContent,
            html: htmlBody,
            attachments: logoAsset.attachments
        });
        sentBatches += 1;
    }

    return { sent: true, recipients: recipients.length, batches: sentBatches };
};

const extractNewEvents = (previousList, nextList) => {
    const previous = Array.isArray(previousList) ? previousList : [];
    const next = Array.isArray(nextList) ? nextList : [];

    const previousIds = new Set(previous.map((item) => String(item?.id || '').trim()).filter(Boolean));
    const previousKeys = new Set(previous.map((item) => {
        const title = String(item?.title || '').trim().toLowerCase();
        const date = String(item?.date || '').trim();
        return `${title}|${date}`;
    }));

    return next.filter((item) => {
        const id = String(item?.id || '').trim();
        const title = String(item?.title || '').trim().toLowerCase();
        const date = String(item?.date || '').trim();
        const key = `${title}|${date}`;
        if (id && previousIds.has(id)) return false;
        if (previousKeys.has(key)) return false;
        return true;
    });
};

const parseEventDateStart = (rawValue) => {
    const value = String(rawValue || '').trim();
    if (!value) return null;

    // ISO-like: YYYY-MM-DD
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
        const year = Number(isoMatch[1]);
        const month = Number(isoMatch[2]);
        const day = Number(isoMatch[3]);
        const parsed = new Date(year, month - 1, day);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    // Dotted: DD.MM.YYYY or DD/MM/YYYY
    const dottedMatch = value.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
    if (dottedMatch) {
        const day = Number(dottedMatch[1]);
        const month = Number(dottedMatch[2]);
        const year = Number(dottedMatch[3]);
        const parsed = new Date(year, month - 1, day);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const isPastEventForNewsletter = (event) => {
    const status = String(event?.status || '').trim().toLowerCase();
    if (['past', 'kecmis', 'keçmiş'].includes(status)) return true;

    const eventDate = parseEventDateStart(event?.date);
    if (!eventDate) return false;

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return eventDate.getTime() < todayStart.getTime();
};

const notifySubscribersAboutNewEvents = async (addedEvents, req = null) => {
    const events = Array.isArray(addedEvents) ? addedEvents : [];
    if (!events.length) return { sent: false, reason: 'no_new_events' };

    const activeEvents = events.filter((event) => !isPastEventForNewsletter(event));
    if (!activeEvents.length) return { sent: false, reason: 'no_active_new_events', recipients: 0 };

    const baseUrl = req
        ? getRequestBaseUrl(req)
        : (String(process.env.PUBLIC_SITE_URL || process.env.SITE_URL || '').trim() || 'http://localhost:3005');

    const headline = activeEvents.length === 1
        ? `Yeni tədbir əlavə olundu: ${String(activeEvents[0]?.title || '').trim() || 'Tədbir'}`
        : `${activeEvents.length} yeni tədbir əlavə olundu`;

    const eventLines = activeEvents.map((event) => {
        const title = String(event?.title || 'Tədbir').trim();
        const date = String(event?.date || '').trim();
        const location = String(event?.location || '').trim();
        const eventUrl = `${baseUrl}/?view=events&id=${encodeURIComponent(String(event?.id || ''))}`;
        return `• ${title}${date ? ` — ${date}` : ''}${location ? ` (${location})` : ''}${event?.id ? `\n  ${eventUrl}` : ''}`;
    });

    const htmlList = activeEvents.map((event) => {
        const title = escapeHtml(String(event?.title || 'Tədbir').trim());
        const date = escapeHtml(String(event?.date || '').trim());
        const location = escapeHtml(String(event?.location || '').trim());
        const eventUrl = `${baseUrl}/?view=events&id=${encodeURIComponent(String(event?.id || ''))}`;
        const safeEventUrl = escapeHtml(eventUrl);
        const linkHtml = event?.id
            ? `<div style="margin-top:4px;"><a href="${safeEventUrl}" target="_blank" rel="noopener noreferrer" style="color:#f97316;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.02em;">Tədbir səhifəsini aç</a></div>`
            : '';
        return `<li style="margin:0 0 10px;"><strong style="color:#f9fafb;">${title}</strong>${date ? ` — <span style="color:#fdba74;">${date}</span>` : ''}${location ? ` <span style="color:#9ca3af;">(${location})</span>` : ''}${linkHtml}</li>`;
    }).join('');

    return sendBulkSubscriberEmail({
        subject: headline,
        introText: 'Tədbir təqvimi yeniləndi. Əlavə olunan tədbirləri aşağıda görə bilərsiniz.',
        htmlContent: `<ul style="margin:0;padding-left:18px;line-height:1.7;">${htmlList}</ul>`,
        textContent: [headline, '', ...eventLines].join('\n')
    });
};

const notifySubscribersAboutDriversRankingChange = async (note = '') => {
    const drivers = await getContent('drivers', []);
    const categories = Array.isArray(drivers) ? drivers : [];
    if (!categories.length) return { sent: false, reason: 'no_drivers_data' };

    const summaryLines = categories.map((category) => {
        const catName = String(category?.name || category?.id || 'Kateqoriya').trim();
        const topDrivers = (Array.isArray(category?.drivers) ? category.drivers : [])
            .slice()
            .sort((a, b) => Number(a?.rank || 9999) - Number(b?.rank || 9999))
            .slice(0, 3)
            .map((driver) => `#${driver?.rank || '-'} ${String(driver?.name || 'Sürücü').trim()}`)
            .join(', ');
        return `• ${catName}: ${topDrivers || 'Məlumat yoxdur'}`;
    });

    const htmlRows = categories.map((category) => {
        const catName = escapeHtml(String(category?.name || category?.id || 'Kateqoriya').trim());
        const topDrivers = (Array.isArray(category?.drivers) ? category.drivers : [])
            .slice()
            .sort((a, b) => Number(a?.rank || 9999) - Number(b?.rank || 9999))
            .slice(0, 3)
            .map((driver) => `<span style="display:inline-block;margin-right:6px;">#${escapeHtml(String(driver?.rank || '-'))} ${escapeHtml(String(driver?.name || 'Sürücü').trim())}</span>`)
            .join('');
        return `<li style="margin:0 0 8px;"><strong style="color:#f9fafb;">${catName}</strong><div style="margin-top:4px;color:#d1d5db;">${topDrivers || 'Məlumat yoxdur'}</div></li>`;
    }).join('');

    const cleanNote = String(note || '').trim();
    const header = 'Pilot sıralamasında yenilənmə';
    const textParts = [header];
    if (cleanNote) textParts.push(`Qeyd: ${cleanNote}`);
    textParts.push('', ...summaryLines);

    return sendBulkSubscriberEmail({
        subject: header,
        introText: cleanNote || 'Sürücü reytinqində yenilənmə edildi. Yeni top sıralama aşağıdadır.',
        htmlContent: `<ul style="margin:0;padding-left:18px;line-height:1.7;">${htmlRows}</ul>`,
        textContent: textParts.join('\n')
    });
};

const getRequestBaseUrl = (req) => {
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
    const protocol = forwardedProto || req.protocol || 'https';
    const host = forwardedHost || req.get('host') || '';
    return `${protocol}://${host}`;
};

const toAbsoluteUrl = (req, rawPath) => {
    const value = String(rawPath || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    const base = getRequestBaseUrl(req);
    return `${base}${value.startsWith('/') ? value : `/${value}`}`;
};

const migrateFilesToDB = async () => {
    const filesToMigrate = [
        { id: SITE_NEW_STRUCT_ID, path: SITE_NEW_STRUCT_PATH },
        { id: 'site-content', path: SITE_CONTENT_PATH },
        { id: 'events', path: EVENTS_FILE_PATH },
        { id: 'news', path: NEWS_FILE_PATH },
        { id: 'gallery-photos', path: GALLERY_PHOTOS_FILE_PATH },
        { id: 'videos', path: VIDEOS_FILE_PATH },
        { id: 'drivers', path: DRIVERS_FILE_PATH },
        { id: 'subscribers', path: SUBSCRIBERS_FILE_PATH }
    ];

    for (const file of filesToMigrate) {
        try {
            if (fs.existsSync(file.path)) {
                const data = await fsPromises.readFile(file.path, 'utf8');
                await saveContentToDB(file.id, JSON.parse(data));
                console.log(`[MIGRATION] ${file.id} data synced to database.`);
            }
        } catch (err) {
            console.error(`[MIGRATION] Failed for ${file.id}:`, err);
        }
    }
};

initDB();

// ------------------------------------------
// CORE ROUTES
// ------------------------------------------
app.get('/', (req, res) => {
    res.send('Admin Backend is running!');
});

app.get('/api', async (req, res) => {
    const users = await getUsers();
    let fileInfo = { exists: false, path: USERS_FILE_PATH };
    try {
        const stats = await fsPromises.stat(USERS_FILE_PATH);
        fileInfo.exists = true;
        fileInfo.mtime = stats.mtime;
        fileInfo.size = stats.size;
    } catch (e) { }
    res.json({
        status: 'ready',
        version: '1.2.6',
        port: PORT,
        userCount: users.length,
        database: fileInfo,
        adminEnabled: true,
        message: 'Forsaj API is fully operational'
    });
});

app.get('/api/ping', (req, res) => {
    res.json({ pong: true, time: new Date().toISOString() });
});

// API: Database Connectivity Check
app.get('/api/db-status', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT 1 as connected');
        connection.release();
        res.json({
            status: 'connected',
            details: 'Database is reachable',
            host: process.env.MYSQL_HOST || 'localhost',
            user: process.env.MYSQL_USER || 'forsaj_user'
        });
    } catch (e) {
        console.error('Database Status Check Failed:', e);
        res.status(500).json({
            status: 'error',
            message: 'Database connection failed',
            details: e.message,
            code: e.code,
            host: process.env.MYSQL_HOST || 'localhost'
        });
    }
});

app.get('/api/health', (req, res) => {
    const requireDbHealth = String(process.env.REQUIRE_DB_HEALTH || '').toLowerCase() === 'true';
    (async () => {
        let dbConnected = false;
        let dbError = '';
        try {
            const connection = await pool.getConnection();
            await connection.query('SELECT 1');
            connection.release();
            dbConnected = true;
        } catch (error) {
            dbError = error?.message || 'db_unreachable';
        }

        const payload = {
            status: dbConnected ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            db_pool: !!pool,
            db_connected: dbConnected,
            ...(dbError ? { db_error: dbError } : {})
        };

        if (requireDbHealth && !dbConnected) {
            return res.status(503).json(payload);
        }

        return res.json(payload);
    })();
});

app.get('/', (req, res) => {
    res.send('Forsaj Backend API is running. Use /api/health for details.');
});

// Serve uploads from primary and legacy locations to avoid 404 on migrated data.
const UPLOAD_STATIC_DIRS = Array.from(new Set([
    UPLOAD_DIR_PATH,
    path.join(WEB_DATA_DIR, 'uploads'),
    path.join(__dirname, '../front/public/uploads')
]));

UPLOAD_STATIC_DIRS.forEach((dirPath) => {
    app.use('/uploads', express.static(dirPath));
});

// API: Get Gallery Photos
app.get('/api/gallery-photos', async (req, res) => {
    try {
        const data = await getContent('gallery-photos', []);
        res.json(data);
    } catch (error) {
        console.error('Error reading gallery photos:', error);
        res.status(500).json({ error: 'Failed to read gallery photos' });
    }
});

// API: Save Gallery Photos
app.post('/api/gallery-photos', async (req, res) => {
    try {
        const photos = normalizeListPayload(req.body);
        if (!photos) return res.status(400).json({ error: 'Invalid gallery payload' });
        const ok = await saveContent('gallery-photos', photos);
        if (!ok) return res.status(500).json({ error: 'Failed to save gallery photos' });
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving gallery photos:', error);
        res.status(500).json({ error: 'Failed to save gallery photos' });
    }
});

// API: Subscribe Newsletter
app.post('/api/subscribers', async (req, res) => {
    try {
        const email = normalizeSubscriberEmail(req.body?.email);
        const name = String(req.body?.name || '').trim();
        const source = String(req.body?.source || 'site').trim() || 'site';
        if (!email) return res.status(400).json({ error: 'Düzgün email daxil edin' });

        const result = await upsertSubscriber({ email, name, source });
        if (!result.ok) return res.status(500).json({ error: 'Abunə saxlana bilmədi' });
        res.json({ success: true, email: result.email });
    } catch (error) {
        console.error('Error subscribing newsletter:', error);
        res.status(500).json({ error: 'Abunə zamanı xəta baş verdi' });
    }
});

// API: List Subscribers (Auth)
app.get('/api/subscribers', authenticateToken, async (req, res) => {
    try {
        const subscribers = await getStoredSubscribers();
        res.json(subscribers);
    } catch (error) {
        console.error('Error reading subscribers:', error);
        res.status(500).json({ error: 'Abunələr yüklənə bilmədi' });
    }
});

// Helper: Get Users
const getUsers = async () => {
    try {
        await fsPromises.access(USERS_FILE_PATH);
        const data = await fsPromises.readFile(USERS_FILE_PATH, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
};

// Helper: Save Users
const saveUsers = async (users) => {
    await fsPromises.writeFile(USERS_FILE_PATH, JSON.stringify(users, null, 2));
};

// API: Get Events
app.get('/api/events', async (req, res) => {
    try {
        const data = await getContent('events', []);
        res.json(normalizeEventItems(data));
    } catch (error) {
        console.error('Error reading events:', error);
        res.status(500).json({ error: 'Failed to read events' });
    }
});

// API: Save Events
app.post('/api/events', async (req, res) => {
    try {
        const previousEvents = await getContent('events', []);
        const eventsPayload = normalizeListPayload(req.body);
        if (!eventsPayload) return res.status(400).json({ error: 'Invalid events payload' });
        const events = normalizeEventItems(eventsPayload);
        const ok = await saveContent('events', events);
        if (!ok) return res.status(500).json({ error: 'Failed to save events' });

        const addedEvents = extractNewEvents(previousEvents, events);
        let mailStatus = { sent: false, reason: 'not_attempted' };
        if (addedEvents.length > 0) {
            try {
                mailStatus = await notifySubscribersAboutNewEvents(addedEvents, req);
                if (!mailStatus.sent) {
                    console.warn('[events] subscriber notification skipped:', mailStatus.reason);
                }
            } catch (mailError) {
                console.error('[events] subscriber notification failed:', mailError?.message || mailError);
                mailStatus = { sent: false, reason: 'mail_error' };
            }
        }

        res.json({
            success: true,
            addedEventsCount: addedEvents.length,
            mailSent: Boolean(mailStatus.sent),
            mailStatus
        });
    } catch (error) {
        console.error('Error saving events:', error);
        res.status(500).json({ error: 'Failed to save events' });
    }
});

// API: Get News
app.get('/api/news', async (req, res) => {
    try {
        const data = await getContent('news', []);
        res.json(data);
    } catch (error) {
        console.error('Error reading news:', error);
        res.status(500).json({ error: 'Failed to read news' });
    }
});

// Public share page with social preview metadata for a specific news item.
app.get('/api/share/news/:id', async (req, res) => {
    try {
        const requestedId = Number(req.params.id);
        const newsList = await getContent('news', []);
        const newsItems = Array.isArray(newsList) ? newsList : [];
        const selectedNews = Number.isFinite(requestedId)
            ? newsItems.find((item) => Number(item?.id) === requestedId)
            : null;

        const baseUrl = getRequestBaseUrl(req);
        const targetUrl = selectedNews
            ? `${baseUrl}/?view=news&id=${encodeURIComponent(String(selectedNews.id))}`
            : `${baseUrl}/?view=news`;

        const title = (selectedNews?.title || 'Forsaj Club Xəbərləri').toString().trim() || 'Forsaj Club Xəbərləri';
        const description = getTextExcerpt(
            selectedNews?.description || selectedNews?.desc || title,
            170
        );
        const imageUrl = toAbsoluteUrl(req, selectedNews?.img || '');

        const escapedTitle = escapeHtml(title);
        const escapedDescription = escapeHtml(description);
        const escapedTargetUrl = escapeHtml(targetUrl);
        const escapedImageUrl = escapeHtml(imageUrl);

        const html = `<!doctype html>
<html lang="az">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapedTitle}</title>
  <meta name="description" content="${escapedDescription}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Forsaj Club" />
  <meta property="og:title" content="${escapedTitle}" />
  <meta property="og:description" content="${escapedDescription}" />
  <meta property="og:url" content="${escapedTargetUrl}" />
  ${escapedImageUrl ? `<meta property="og:image" content="${escapedImageUrl}" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapedTitle}" />
  <meta name="twitter:description" content="${escapedDescription}" />
  ${escapedImageUrl ? `<meta name="twitter:image" content="${escapedImageUrl}" />` : ''}
  <link rel="canonical" href="${escapedTargetUrl}" />
  <meta http-equiv="refresh" content="0;url=${escapedTargetUrl}" />
</head>
<body>
  <noscript>
    <p>Yönləndirmə üçün bu linkə daxil olun: <a href="${escapedTargetUrl}">${escapedTargetUrl}</a></p>
  </noscript>
  <script>
    window.location.replace(${JSON.stringify(targetUrl)});
  </script>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (error) {
        console.error('Error rendering share page:', error);
        res.redirect('/?view=news');
    }
});
// API: Save News
app.post('/api/news', async (req, res) => {
    try {
        const news = normalizeListPayload(req.body);
        if (!news) return res.status(400).json({ error: 'Invalid news payload' });
        const ok = await saveContent('news', news);
        if (!ok) return res.status(500).json({ error: 'Failed to save news' });
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving news:', error);
        res.status(500).json({ error: 'Failed to save news' });
    }
});

// ==========================================
// CORE AUTH & SETUP ROUTES (Move to top)
// ==========================================

// API: Get Users (MySQL)
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, username, name, role, created_at FROM users ORDER BY created_at ASC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'İstifadəçiləri yükləmək mümkün olmadı' });
    }
});

// API: Save User (MySQL Create or Update)
app.post('/api/users', authenticateToken, async (req, res) => {
    const { id, username, name, role, password } = req.body;

    try {
        if (req.user.role !== 'master') {
            return res.status(403).json({ error: 'Yalnız Master Admin istifadəçi əlavə edə bilər' });
        }

        if (id) {
            // Update existing user
            let query = 'UPDATE users SET username = ?, name = ?, role = ? WHERE id = ?';
            let params = [username, name, role, id];

            if (password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                query = 'UPDATE users SET username = ?, name = ?, role = ?, password = ? WHERE id = ?';
                params = [username, name, role, hashedPassword, id];
            }

            await pool.query(query, params);
        } else {
            // Create new user
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(
                'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
                [username, hashedPassword, name, role || 'secondary']
            );
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving user:', error);
        res.status(500).json({ error: error.message || 'Xəta baş verdi' });
    }
});

// API: Delete User (MySQL)
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        if (req.user.role !== 'master') {
            return res.status(403).json({ error: 'İcazə yoxdur' });
        }

        // Check if last master admin
        const [users] = await pool.query('SELECT * FROM users WHERE role = ?', ['master']);
        const userToDelete = await pool.query('SELECT role FROM users WHERE id = ?', [id]);

        if (userToDelete[0][0]?.role === 'master' && users.length <= 1) {
            return res.status(400).json({ error: 'Sonuncu Master Admini silə bilməzsiniz' });
        }

        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: error.message || 'Silmək mümkün olmadı' });
    }
});

// API: Setup initial Master Admin
// API: Setup initial Master Admin
app.post('/api/setup', async (req, res) => {
    const { username, password, name } = req.body;

    try {
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM users');
        if (rows[0].count > 0) {
            return res.status(400).json({ error: 'Sistem artıq quraşdırılıb' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, name, 'master']
        );

        res.json({ success: true, message: 'Master Admin uğurla yaradıldı' });
    } catch (error) {
        console.error('Setup error:', error);
        res.status(500).json({
            error: 'Quraşdırma zamanı xəta baş verdi',
            details: error.message,
            code: error.code
        });
    }
});

// API: Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'İstifadəçi tapılmadı' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Şifrə yanlışdır' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, name: user.name },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Daxil olarkən xəta baş verdi' });
    }
});

// LEGACY SUPPORT /api/check-setup
// API: Check Setup
app.get('/api/check-setup', async (req, res) => {
    try {
        // Using pool.query directly to get count
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM users');
        res.json({ needsSetup: rows[0].count === 0 });
    } catch (e) {
        // If table doesn't exist yet, it needs setup
        res.json({ needsSetup: true });
    }
});

// ==========================================
// CONTENT API ROUTES
// ==========================================

// API: Get Videos
app.get('/api/videos', async (req, res) => {
    try {
        const data = await getContent('videos', []);
        res.json(data);
    } catch (error) {
        console.error('Error reading videos:', error);
        res.status(500).json({ error: 'Failed to read videos' });
    }
});

// API: Save Videos
app.post('/api/videos', async (req, res) => {
    try {
        const videos = normalizeListPayload(req.body);
        if (!videos) return res.status(400).json({ error: 'Invalid videos payload' });
        const ok = await saveContent('videos', videos);
        if (!ok) return res.status(500).json({ error: 'Failed to save videos' });
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving videos:', error);
        res.status(500).json({ error: 'Failed to save videos' });
    }
});


// ------------------------------------------
// API ENDPOINTS
// ------------------------------------------

app.get('/api/ping', (req, res) => {
    res.json({ success: true, message: 'API is working' });
});

// API: Upload Image
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR_PATH);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.post('/api/upload-image', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const relativePath = `/uploads/${req.file.filename}`;
    res.json({ url: relativePath });
});

// API: Save Content
app.post('/api/save-content', async (req, res) => {
    try {
        const content = normalizeListPayload(req.body);
        if (!content) return res.status(400).json({ error: 'Invalid site content payload' });
        const ok = await saveContent('site-content', content);
        if (!ok) return res.status(500).json({ error: 'Failed to save content' });
        res.json({ success: true });
    } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({ error: 'Failed to save content' });
    }
});

// API: Get unified site structure
app.get('/api/site-new-struct', async (req, res) => {
    try {
        const data = await getContent(SITE_NEW_STRUCT_ID, createDefaultSiteStruct());
        res.json(data);
    } catch (error) {
        console.error('Error reading site-new-struct:', error);
        res.status(500).json({ error: 'Failed to read site-new-struct' });
    }
});

// API: Save unified site structure (full or partial merge)
app.post('/api/site-new-struct', async (req, res) => {
    try {
        if (!isPlainObject(req.body)) {
            return res.status(400).json({ error: 'Invalid site-new-struct payload' });
        }

        const current = await getContent(SITE_NEW_STRUCT_ID, createDefaultSiteStruct());
        const incomingResources = isPlainObject(req.body.resources) ? req.body.resources : {};
        const merged = {
            ...current,
            ...req.body,
            resources: {
                ...(isPlainObject(current.resources) ? current.resources : {}),
                ...incomingResources
            }
        };

        const ok = await saveContent(SITE_NEW_STRUCT_ID, merged);
        if (!ok) return res.status(500).json({ error: 'Failed to save site-new-struct' });
        const latest = await getContent(SITE_NEW_STRUCT_ID, createDefaultSiteStruct());
        res.json({ success: true, data: latest });
    } catch (error) {
        console.error('Error saving site-new-struct:', error);
        res.status(500).json({ error: 'Failed to save site-new-struct' });
    }
});

// API: Get Site Content
app.get('/api/site-content', async (req, res) => {
    try {
        const data = await getContent('site-content', []);
        res.json(data);
    } catch (error) {
        console.error('Error reading site content:', error);
        res.status(500).json({ error: 'Failed to read site content' });
    }
});

// API: Get Drivers
app.get('/api/drivers', async (req, res) => {
    try {
        const data = await getContent('drivers', []);
        res.json(data);
    } catch (error) {
        console.error('Error reading drivers:', error);
        res.status(500).json({ error: 'Failed to read drivers' });
    }
});

// API: Save Drivers with Automatic Ranking
app.post('/api/drivers', async (req, res) => {
    try {
        let categories = normalizeListPayload(req.body);
        if (!categories) return res.status(400).json({ error: 'Invalid drivers payload' });

        // Automatic Ranking Logic
        if (Array.isArray(categories)) {
            categories = categories.map(cat => {
                if (cat.drivers && Array.isArray(cat.drivers)) {
                    // Sort drivers by points descending
                    cat.drivers.sort((a, b) => (b.points || 0) - (a.points || 0));

                    // Reassign ranks based on sorted order
                    cat.drivers = cat.drivers.map((driver, index) => ({
                        ...driver,
                        rank: index + 1
                    }));
                }
                return cat;
            });
        }

        const ok = await saveContent('drivers', categories);
        if (!ok) return res.status(500).json({ error: 'Failed to save drivers' });
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Error saving drivers:', error);
        res.status(500).json({ error: 'Failed to save drivers' });
    }
});

// API: Manual Drivers Ranking Notification (Auth)
app.post('/api/notifications/drivers-ranking', authenticateToken, async (req, res) => {
    try {
        const approved = req.body?.approved === true;
        if (!approved) {
            return res.status(400).json({
                success: false,
                error: 'Bildiriş göndərilməsi üçün admin təsdiqi tələb olunur'
            });
        }
        const note = String(req.body?.note || '').trim();
        const mailStatus = await notifySubscribersAboutDriversRankingChange(note);
        if (!mailStatus.sent) {
            return res.status(400).json({
                success: false,
                error: 'Bildiriş göndərilmədi',
                mailStatus
            });
        }
        res.json({ success: true, mailStatus });
    } catch (error) {
        console.error('Error sending drivers ranking notification:', error);
        res.status(500).json({ success: false, error: 'Bildiriş göndərilə bilmədi' });
    }
});

// API: Submit Application
app.post('/api/applications', async (req, res) => {
    const rawName = req.body?.name;
    const rawContact = req.body?.contact;
    const rawType = req.body?.type;
    const rawContent = req.body?.content;

    const name = String(rawName || '').trim();
    const contact = String(rawContact || '').trim();
    const type = String(rawType || '').trim();
    const content = String(rawContent || '').trim();
    const parsedContent = safeParseJsonObject(content);
    const isPilotType = type.toLowerCase().includes('pilot');
    let pilotPayload = null;

    if (!name || !contact || !type || !content) {
        return res.status(400).json({ error: 'Bütün sahələr doldurulmalıdır' });
    }

    if (name.length > 255 || contact.length > 255 || type.length > 100 || content.length > 10000) {
        return res.status(400).json({ error: 'Sahə uzunluğu limiti aşıldı' });
    }

    if (isPilotType && content.trim().startsWith('{')) {
        try {
            const payload = parsedContent || JSON.parse(content);
            pilotPayload = payload;
            const requiredPilotFields = ['event', 'car', 'tire', 'engine', 'club', 'whatsapp'];
            const hasAll = requiredPilotFields.every((key) => String(payload?.[key] || '').trim().length > 0);
            if (!hasAll) {
                return res.status(400).json({ error: 'Pilot müraciəti üçün bütün texniki sahələr məcburidir' });
            }
            const wpCandidate = normalizeWhatsAppNumber(payload?.whatsapp || contact);
            if (!wpCandidate) {
                return res.status(400).json({ error: 'Pilot müraciəti üçün düzgün WhatsApp nömrəsi məcburidir' });
            }
        } catch {
            return res.status(400).json({ error: 'Pilot müraciəti məlumatları yanlışdır' });
        }

        try {
            const events = normalizeEventItems(await getContent('events', []));
            const eventIdRaw = Number(pilotPayload?.eventId);
            const byId = Number.isFinite(eventIdRaw)
                ? events.find((event) => Number(event?.id) === eventIdRaw)
                : null;
            const requestedTitle = String(pilotPayload?.event || '').trim().toLocaleLowerCase('az');
            const byTitle = !byId && requestedTitle
                ? events.find((event) => String(event?.title || '').trim().toLocaleLowerCase('az') === requestedTitle)
                : null;
            const matchedEvent = byId || byTitle;

            if (matchedEvent && !isRegistrationEnabled(matchedEvent?.registrationEnabled, true)) {
                return res.status(403).json({ error: 'Bu tədbir üçün qeydiyyat müvəqqəti dayandırılıb' });
            }
        } catch (eventCheckError) {
            console.warn('[applications] registration status check failed:', eventCheckError?.message || eventCheckError);
        }
    }

    // Newsletter submissions are also persisted in subscribers store.
    try {
        const source = String(parsedContent?.source || '').trim().toLowerCase();
        const candidateEmail = normalizeSubscriberEmail(parsedContent?.email || contact);
        if ((isNewsletterType(type) || source.includes('newsletter')) && candidateEmail) {
            const subResult = await upsertSubscriber({
                email: candidateEmail,
                name,
                source: source || 'applications'
            });
            if (!subResult.ok) {
                console.warn('[applications] newsletter subscriber could not be saved:', candidateEmail);
            }
        }
    } catch (subscriberError) {
        console.warn('[applications] subscriber sync failed:', subscriberError?.message || subscriberError);
    }

    try {
        await pool.query(
            'INSERT INTO applications (name, contact, type, content) VALUES (?, ?, ?, ?)',
            [name, contact, type, content]
        );

        let mailStatus = { sent: false, reason: 'not_attempted' };
        let whatsappStatus = { sent: false, reason: 'not_attempted' };
        try {
            mailStatus = await sendApplicationNotificationEmail({ name, contact, type, content });
            if (!mailStatus.sent) {
                console.warn('[applications] notification email skipped:', mailStatus.reason);
            }
        } catch (mailError) {
            console.error('[applications] notification email failed:', mailError?.message || mailError);
            mailStatus = { sent: false, reason: 'mail_error' };
        }

        if (isPilotType) {
            try {
                const locale = normalizeLocaleCode(parsedContent?.locale || req.body?.locale || req.headers['x-site-language'] || 'AZ');
                const eventTitle = String(parsedContent?.event || '').trim();
                const whatsapp = String(parsedContent?.whatsapp || contact).trim();
                whatsappStatus = await sendPilotApplicationWhatsAppNotifications({
                    name,
                    whatsapp,
                    eventTitle,
                    locale
                });
                if (!whatsappStatus.sent) {
                    console.warn('[applications] whatsapp notification skipped:', whatsappStatus.reason);
                }
            } catch (whatsappError) {
                console.error('[applications] whatsapp notification failed:', whatsappError?.message || whatsappError);
                whatsappStatus = { sent: false, reason: 'whatsapp_error' };
            }
        }

        res.json({
            success: true,
            mailSent: Boolean(mailStatus.sent),
            whatsappSent: Boolean(whatsappStatus.sent),
            whatsappStatus
        });
    } catch (error) {
        console.error('Error submitting application:', error);
        res.status(500).json({ error: 'Müraciət göndərilərkən xəta baş verdi', code: error?.code || 'db_error' });
    }
});

// API: Get Applications (Auth)
app.get('/api/applications', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM applications ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ error: 'Müraciətlər yüklənərkən xəta baş verdi' });
    }
});

// API: Mark Application as Read (Auth)
app.post('/api/applications/:id/read', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE applications SET status = "read" WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking application as read:', error);
        res.status(500).json({ error: 'Xəta baş verdi' });
    }
});

// API: Delete Application (Auth)
app.delete('/api/applications/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM applications WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting application:', error);
        res.status(500).json({ error: 'Müraciəti silmək mümkün olmadı' });
    }
});

// API: Unread Count (Auth)
app.get('/api/applications/unread-count', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM applications WHERE status = "unread"');
        res.json({ count: rows[0].count });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ error: 'Xəta baş verdi' });
    }
});


// Logic from extractJsonMap.cjs
const isTrueText = (str) => {
    if (!str || typeof str !== 'string') return false;
    const trimmed = str.trim();
    if (trimmed.length < 2 || trimmed.length > 300) return false;

    // Must contain at least one letter (including Azerbaijani specific)
    if (!/[a-zA-ZəƏüÜöÖğĞıIçÇşŞ]/.test(trimmed)) return false;

    // Filter out common code characters/patterns
    if (/[{}<>;]/.test(trimmed)) return false;
    if (trimmed.includes('=>')) return false;
    if (trimmed.includes('=')) return false;
    if (trimmed.includes('(') && trimmed.includes(')')) return false; // functions/methods
    if (trimmed.startsWith('.') || trimmed.includes(' .')) return false; // method chaining
    if (trimmed.includes('/') && trimmed.split('/').length > 2) return false; // likely regex or path

    const technicalKeywords = [
        'return ', 'import ', 'export ', 'function', 'const ', 'let ', 'var ',
        'void', 'REZERV', 'replace', 'map', 'filter', 'join', 'split',
        'true', 'false', 'null', 'undefined', 'NaN', 'string', 'number', 'any',
        'async', 'await', 'console.', 'process.', 'fetch', 'failed', 'error',
        'API', 'HTTP', '404', '500', 'status', 'token', 'auth', 'database',
        'MYSQL', 'query', 'payload', 'res.', 'req.', 'next(', 'catch', 'throw'
    ];

    if (technicalKeywords.some(kw => trimmed.toLowerCase().includes(kw.toLowerCase()))) return false;

    return true;
};

// API: Extract Content (Scan Frontend)
app.all('/api/extract-content', async (req, res) => {
    console.log('Starting Clean Content Extraction...');
    try {
        const COMPONENTS_DIR = path.join(__dirname, '../front/components');
        const pagesMap = new Map();

        // Load existing to potentially preserve IDs if needed, 
        // BUT user asked to rebuild extraction. 
        // We will prioritize fresh clean extraction.

        try {
            await fsPromises.access(COMPONENTS_DIR);
            const compFiles = await fsPromises.readdir(COMPONENTS_DIR);

            // Add App.tsx from root if exists
            const FRONT_DIR = path.join(__dirname, '../front');
            const allFiles = compFiles.map(f => path.join(COMPONENTS_DIR, f));
            if (await fsPromises.access(path.join(FRONT_DIR, 'App.tsx')).then(() => true).catch(() => false)) {
                allFiles.push(path.join(FRONT_DIR, 'App.tsx'));
            }

            const tsxFiles = allFiles.filter(f => f.endsWith('.tsx'));

            for (const file of tsxFiles) {
                try {
                    const filePath = file;
                    const content = await fsPromises.readFile(filePath, 'utf8');
                    const pageId = path.basename(file, '.tsx').toLowerCase();
                    const filenameBase = path.basename(file, '.tsx');

                    const AZ_TITLES = {
                        'about': 'HAQQIMIZDA',
                        'news': 'XƏBƏRLƏR',
                        'newspage': 'Xəbər Səhifəsi',
                        'eventspage': 'Tədbirlər Səhifəsi',
                        'driverspage': 'Sürücülər Səhifəsi',
                        'gallerypage': 'Qalereya',
                        'rulespage': 'Qaydalar',
                        'privacypolicypage': 'Məxfilik Siyasəti',
                        'termsofservicepage': 'Xidmət Şərtləri',
                        'contactpage': 'Əlaqə Səhifəsi',
                        'categoryleaders': 'Kateqoriya Liderləri',
                        'footer': 'Sayt Sonu',
                        'hero': 'Giriş Hissəsi',
                        'marquee': 'Sürüşən Yazı',
                        'navbar': 'Naviqasiya',
                        'nextrace': 'Növbəti Yarış',
                        'partners': 'Tərəfdaşlar',
                        'socials': 'Sosial Media',
                        'videoarchive': 'Video Arxiv',
                        'whatisoffroad': 'Offroad Nədir?',
                        'home': 'ANA SƏHİFƏ',
                        'app': 'Ümumi Ayarlar'
                    };

                    const title = AZ_TITLES[pageId] || filenameBase;
                    const items = [];
                    const seenValues = new Set();
                    const seenImageKeys = new Set();
                    const actionUrlByKey = new Map();

                    // Strip noise
                    const clean = content
                        .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1')
                        .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
                        .replace(/style=\{\{[\s\S]*?\}\}/g, '')
                        .replace(/console\.(log|error|warn|info)\s*\([\s\S]*?\);?/g, '')
                        .replace(/throw\s+new\s+Error\s*\([\s\S]*?\);?/g, '');

                    // Map helper actions like handleAction('text-3', 'events') to URL targets.
                    const actionRegex = /handleAction\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g;
                    let actionMatch;
                    while ((actionMatch = actionRegex.exec(clean)) !== null) {
                        actionUrlByKey.set(actionMatch[1], actionMatch[2]);
                    }

                    let match;

                    // 1. JSX Text
                    const jsxRegex = />([^<{}]+)</g;
                    while ((match = jsxRegex.exec(clean)) !== null) {
                        let text = match[1].trim().replace(/\s+/g, ' ');
                        if (isTrueText(text) && !seenValues.has(text)) {
                            seenValues.add(text);

                            // Look for nearby URL context
                            const context = clean.slice(Math.max(0, match.index - 150), Math.min(clean.length, match.index + 150));
                            const urlMatch = context.match(/(?:onViewChange|onClick|handleViewChange|handleAction)\s*\(\s*['"]([^'"]+)['"]/i) ||
                                context.match(/(?:href|to|id|path|url)=['"]([^'"]+)['"]/i);
                            const url = urlMatch ? urlMatch[1] : undefined;

                            const slug = text.slice(0, 15).toLowerCase().replace(/[^a-z0-9]+/g, '-');

                            // Specific safeguard for navbar: only extract if it has a valid-looking URL 
                            // and isn't a known internal technical string.
                            if (pageId === 'navbar') {
                                const internalStrings = ['FORSAJ', 'CLUB', 'SITE_LOGO_LIGHT', 'AZ', 'RU', 'ENG'];
                                if (internalStrings.includes(text.toUpperCase()) || !url) {
                                    continue;
                                }
                            }

                            if (pageId === 'partners') {
                                const junkStrings = ['TITLE', 'OFFICIAL PARTNER', 'SECTION_TITLE', 'PARTNER_1', 'PARTNER_2', 'PARTNER_3', 'PARTNER_4'];
                                if (junkStrings.includes(text.toUpperCase())) {
                                    continue;
                                }
                            }

                            items.push({
                                pos: match.index,
                                item: {
                                    id: `txt-${slug}-${Math.floor(Math.random() * 1000)}`,
                                    type: 'text',
                                    label: text.length > 20 ? text.slice(0, 20) + '...' : text.toUpperCase(),
                                    value: text,
                                    url: url
                                }
                            });
                        }
                    }

                    // 2. Attributes
                    const attrRegex = /\s(placeholder|title|alt|label)=(['"])(.*?)\2/g;
                    while ((match = attrRegex.exec(clean)) !== null) {
                        const attr = match[1];
                        const text = match[3];
                        if (isTrueText(text) && !seenValues.has(text)) {
                            seenValues.add(text);
                            const slug = text.slice(0, 15).toLowerCase().replace(/[^a-z0-9]+/g, '-');
                            items.push({
                                pos: match.index,
                                item: {
                                    id: `attr-${slug}-${Math.floor(Math.random() * 1000)}`,
                                    type: 'text',
                                    label: `${attr.toUpperCase()}: ${text.slice(0, 15)}...`,
                                    value: text
                                }
                            });
                        }
                    }

                    // 3. getText and getUrl calls
                    const getTextRegex = /getText\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g;
                    while ((match = getTextRegex.exec(clean)) !== null) {
                        const key = match[1];
                        const text = match[2];
                        if (isTrueText(text) && !seenValues.has(text)) {
                            seenValues.add(text);

                            // Try to find a corresponding getUrl call for the same key
                            const getUrlRegex = new RegExp(`getUrl\\s*\\(\\s*['"]${key}['"]\\s*,\\s*['"]([^'"]+)['"]\\s*\\)`, 'g');
                            const urlMatch = getUrlRegex.exec(clean);
                            const url = urlMatch ? urlMatch[1] : actionUrlByKey.get(key);

                            items.push({
                                pos: match.index,
                                item: {
                                    id: key,
                                    type: 'text',
                                    label: `KEY: ${key}`,
                                    value: text,
                                    url: url
                                }
                            });
                        }
                    }

                    // 4. Quoted strings (Natural Language)
                    const quotedRegex = /(['"])([A-ZƏÜÖĞIÇŞ][^'"]{3,})\1/g;
                    while ((match = quotedRegex.exec(clean)) !== null) {
                        const text = match[2];
                        const isTechnical = /^[a-z]+[A-Z]/.test(text) || text.includes('/') || text.includes('{');
                        if (isTrueText(text) && !seenValues.has(text) && !isTechnical) {
                            seenValues.add(text);

                            // Look for nearby URL context
                            const context = clean.slice(Math.max(0, match.index - 100), Math.min(clean.length, match.index + 100));
                            const urlMatch = context.match(/(?:id|url|href|path|to|view)\s*[:=]\s*['"]([^'"]+)['"]/i);
                            const url = urlMatch ? urlMatch[1] : undefined;

                            const slug = text.slice(0, 15).toLowerCase().replace(/[^a-z0-9]+/g, '-');
                            items.push({
                                pos: match.index,
                                item: {
                                    id: `lbl-${slug}-${Math.floor(Math.random() * 1000)}`,
                                    type: 'text',
                                    label: text.length > 20 ? text.slice(0, 20) + '...' : text,
                                    value: text,
                                    url: url
                                }
                            });
                        }
                    }

                    // 5. Images
                    const imgRegex = /src\s*=\s*(['"])(.*?)\1/g;
                    while ((match = imgRegex.exec(clean)) !== null) {
                        const src = match[2];
                        if (src.match(/\.(png|jpg|jpeg|svg|webp|gif)/i) || src.startsWith('http')) {
                            const imageKey = `src:${src}`;
                            if (seenImageKeys.has(imageKey)) continue;
                            seenImageKeys.add(imageKey);
                            items.push({
                                pos: match.index,
                                item: {
                                    id: `img-${Math.floor(Math.random() * 1000)}`,
                                    path: src,
                                    alt: 'Bölmədəki Şəkil',
                                    type: 'local'
                                }
                            });
                        }
                    }

                    // 6. Dynamic image hooks: getImage('hero-bg', 'https://...')
                    const getImageRegex = /getImage\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]*)['"]\s*\)/g;
                    while ((match = getImageRegex.exec(clean)) !== null) {
                        const key = match[1];
                        const fallback = match[2] || '';
                        const imageKey = `getImage:${key}:${fallback}`;
                        if (seenImageKeys.has(imageKey)) continue;
                        seenImageKeys.add(imageKey);

                        items.push({
                            pos: match.index,
                            item: {
                                id: key,
                                path: fallback,
                                alt: key,
                                type: 'local'
                            }
                        });
                    }

                    items.sort((a, b) => a.pos - b.pos);
                    const sections = items
                        .filter(i => i.item.type === 'text')
                        .map((i, idx) => ({ ...i.item, order: idx }));
                    const images = items
                        .filter(i => i.item.path)
                        .map((i, idx) => ({ ...i.item, order: idx }));

                    if (sections.length > 0 || images.length > 0) {
                        pagesMap.set(pageId, {
                            id: pageId,
                            title: title,
                            sections: sections,
                            images: images
                        });
                    }
                } catch (fileErr) {
                    console.error(`Failed to scan file ${file}:`, fileErr);
                }
            }

        } catch (err) {
            console.error('Error reading components directory:', err);
        }

        const newContent = Array.from(pagesMap.values());

        // Custom Sort order for popular pages
        const orderWeight = {
            'home': 1, 'about': 2, 'news': 3, 'newspage': 4,
            'events': 5, 'eventspage': 6, 'drivers': 7,
            'driverspage': 8, 'gallery': 9, 'gallerypage': 10,
            'rules': 11, 'rulespage': 12, 'privacypolicypage': 13, 'termsofservicepage': 14,
            'contact': 15, 'contactpage': 16
        };

        newContent.sort((a, b) => (orderWeight[a.id] || 100) - (orderWeight[b.id] || 100));

        const syncOk = await saveContent('site-content', newContent);
        if (!syncOk) {
            throw new Error('Failed to persist extracted site content');
        }

        // GENERATE SITEMAP (Page-Based Grouping)
        const sitemap = [
            { title: 'DASHBOARD', icon: 'Layout', path: '/' },
            {
                title: 'ANA SƏHİFƏ',
                icon: 'Home',
                children: [
                    { title: 'Ümumi Görünüş', path: '/?page=home', icon: 'Layout' },
                    { title: 'Naviqasiya', path: '/?page=navbar', icon: 'Menu' },
                    { title: 'Giriş Hissəsi', path: '/?page=hero', icon: 'Maximize' },
                    { title: 'Sürüşən Yazı', path: '/?page=marquee', icon: 'Type' },
                    { title: 'Kateqoriya Liderləri', path: '/?page=categoryleaders', icon: 'Star' },
                    { title: 'Sayt Sonu', path: '/?page=footer', icon: 'Anchor' }
                ]
            },
            {
                title: 'HAQQIMIZDA',
                icon: 'Info',
                children: [
                    { title: 'Ümumi Məlumat', path: '/?page=about', icon: 'FileText' }
                ]
            },
            {
                title: 'XƏBƏRLƏR',
                icon: 'FileText',
                children: [
                    { title: 'Xəbər Siyahısı', path: '/?mode=news', icon: 'List' },
                    { title: 'Xəbər Səhifəsi', path: '/?page=newspage', icon: 'Layout' }
                ]
            },
            {
                title: 'TƏDBİRLƏR',
                icon: 'Calendar',
                children: [
                    { title: 'Tədbir Təqvimi', path: '/?mode=events', icon: 'Clock' },
                    { title: 'Tədbir Səhifəsi', path: '/?page=eventspage', icon: 'Layout' }
                ]
            },
            {
                title: 'SÜRÜCÜLƏR',
                icon: 'Trophy',
                children: [
                    { title: 'Sürücü Reytinqi', path: '/?mode=drivers', icon: 'Award' },
                    { title: 'Sürücülər Səhifəsi', path: '/?page=driverspage', icon: 'Layout' }
                ]
            },
            {
                title: 'QALEREYA',
                icon: 'Image',
                children: [
                    { title: 'Video Arxivi', path: '/?mode=videos', icon: 'Video' },
                    { title: 'Foto Arxiv', path: '/?mode=photos', icon: 'Image' },
                    { title: 'Qalereya Səhifəsi', path: '/?page=gallerypage', icon: 'Layout' }
                ]
            },
            {
                title: 'QAYDALAR',
                icon: 'Shield',
                children: [
                    { title: 'Qaydalar Səhifəsi', path: '/?page=rulespage', icon: 'Layout' },
                    { title: 'Məxfilik Siyasəti', path: '/?page=privacypolicypage', icon: 'FileText' },
                    { title: 'Xidmət Şərtləri', path: '/?page=termsofservicepage', icon: 'FileText' }
                ]
            },
            {
                title: 'ƏLAQƏ',
                icon: 'Phone',
                children: [
                    { title: 'Əlaqə Səhifəsi', path: '/?page=contactpage', icon: 'Layout' }
                ]
            },
            { title: 'ADMİN HESABLARI', icon: 'Users', path: '/users-management' },
            { title: 'SİSTEM AYARLARI', icon: 'Settings', path: '/general-settings' }
        ];

        try {
            await fsPromises.writeFile(ADMIN_SITEMAP_PATH, JSON.stringify(sitemap, null, 2));
            console.log('Sitemap generated successfully.');
        } catch (err) {
            console.error('Failed to write sitemap:', err);
        }

        const stats = {
            total: newContent.length,
            sections: newContent.reduce((acc, p) => acc + p.sections.length, 0),
            images: newContent.reduce((acc, p) => acc + p.images.length, 0)
        };

        console.log(`Extraction complete. Pages: ${stats.total}, Sections: ${stats.sections}, Images: ${stats.images}`);

        // Return structured data with stats
        res.json({
            pages: newContent,
            stats: stats,
            sitemap: sitemap
        });

    } catch (error) {
        console.error('Extraction error:', error);
        res.status(500).json({ error: 'Internal Server Error during extraction' });
    }
});

// API: Get Content
app.get('/api/get-content', async (req, res) => {
    try {
        const data = await getContent('site-content', []);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read content' });
    }
});

// API: Get Sitemap
app.get('/api/sitemap', async (req, res) => {
    try {
        let sitemap = [];
        try {
            await fsPromises.access(ADMIN_SITEMAP_PATH);
            const data = await fsPromises.readFile(ADMIN_SITEMAP_PATH, 'utf8');
            sitemap = JSON.parse(data);
        } catch {
            // Default sitemap if file doesn't exist
            sitemap = [
                { title: 'Dashboard', icon: 'Layout', path: '/' }
            ];
        }

        sitemap = sitemap.map((item) => {
            if (item?.path === '/frontend-settings') {
                return { ...item, path: '/general-settings' };
            }
            return item;
        });

        // Ensure Admin Management and Settings are always present for the frontend to filter
        const coreLinks = [
            { title: 'Admin Hesabları', icon: 'Users', path: '/users-management' },
            { title: 'Sistem Ayarları', icon: 'Settings', path: '/general-settings' }
        ];

        coreLinks.forEach(link => {
            if (!sitemap.find(item => item.path === link.path)) {
                sitemap.push(link);
            }
        });

        const normalizeNavText = (value) =>
            String(value || '')
                .toLocaleLowerCase('az')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim();

        const dedupedByTitle = new Map();
        sitemap.forEach((item) => {
            const titleKey = normalizeNavText(item?.title);
            if (!titleKey) return;
            const existing = dedupedByTitle.get(titleKey);
            if (!existing) {
                dedupedByTitle.set(titleKey, item);
                return;
            }
            dedupedByTitle.set(titleKey, {
                ...existing,
                path: existing.path || item.path,
                icon: existing.icon || item.icon,
                children: [...(existing.children || []), ...(item.children || [])]
            });
        });

        res.json(Array.from(dedupedByTitle.values()));
    } catch (error) {
        console.error('Sitemap read error:', error);
        res.status(500).json({ error: 'Failed to read sitemap' });
    }
});

// API: Get All Images
app.get('/api/all-images', (req, res) => {
    try {
        // Simple scan for images in public dir
        const scanDir = (dir, list = []) => {
            if (!fs.existsSync(dir)) return list;
            const files = fs.readdirSync(dir);
            for (const f of files) {
                const full = path.join(dir, f);
                const stat = fs.statSync(full);
                if (stat.isDirectory()) {
                    if (f !== 'node_modules' && f !== '.git') scanDir(full, list);
                } else if (/\.(png|jpe?g|svg|webp|gif)$/i.test(f)) {
                    list.push(full.replace(FRONT_PUBLIC_DIR, ''));
                }
            }
            return list;
        };
        const images = scanDir(FRONT_PUBLIC_DIR);
        res.json({ local: images });
    } catch (e) {
        res.json({ local: [] });
    }
});

app.post('/api/frontend/action', (req, res) => {
    res.json({ status: 'running' }); // Dummy for now
});

const os = require('os');

app.get('/api/frontend/status', (req, res) => {
    // CPU Load (approximate)
    const cpus = os.cpus();
    const load = os.loadavg()[0]; // 1 minute load average
    const cpuPercentage = Math.min(100, Math.round((load / cpus.length) * 100));

    // RAM Usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ramPercentage = Math.round((usedMem / totalMem) * 100);
    const usedGB = (usedMem / (1024 * 1024 * 1024)).toFixed(1);
    const totalGB = (totalMem / (1024 * 1024 * 1024)).toFixed(1);

    // Uptime
    const uptime = os.uptime();
    const days = Math.floor(uptime / (3600 * 24));
    const hours = Math.floor((uptime % (3600 * 24)) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const uptimeStr = `${days}d ${hours}h ${minutes}m`;

    res.json({
        status: 'running',
        port: 5173,
        stats: {
            cpu: cpuPercentage,
            ram: {
                total: parseFloat(totalGB),
                used: parseFloat(usedGB),
                percentage: ramPercentage
            },
            versions: {
                project: 'v1.1.0',
                node: process.version,
                vite: 'v5.1.4'
            },
            uptime: uptimeStr
        }
    });
});

// User management section above


// Final Catch-all for diagnostics
app.use((req, res) => {
    console.warn(`404 - Unmatched Request: ${req.method} ${req.originalUrl || req.url}`);
    res.status(404).json({
        error: `Route not found: ${req.method} ${req.originalUrl || req.url}`,
        suggestion: 'Check the URL or method. Available base: /api/check-setup, /api/login, /api/get-content',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Admin Backend running at http://0.0.0.0:${PORT}`);
});
