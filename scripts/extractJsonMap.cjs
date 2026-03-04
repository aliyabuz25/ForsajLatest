
const fs = require('fs');
const path = require('path');

const FRONT_DIR = path.join(__dirname, '../front');
const COMPONENTS_DIR = path.join(FRONT_DIR, 'components');
const CONTENT_FILE = path.join(FRONT_DIR, 'public/site-content.json');

// Helper: specific ID generation from text
const generateId = (text, prefix) => {
    const slug = text.slice(0, 20)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    return `${prefix}-${slug}-${Math.floor(Math.random() * 1000)}`;
};

const isTrueText = (str) => {
    // 1. MUST contain at least one letter (Latin or Cyrillic/Azeri extras)
    if (!/[a-zA-ZəƏüÜöÖğĞıIçÇşŞ]/.test(str)) return false;

    // 2. MUST NOT contain code syntax characters
    if (/[{}<>;]/.test(str)) return false; // Braces, tags, semicolons
    if (str.includes('=>')) return false; // Arrow functions
    if (str.includes('=')) return false;  // Assignments
    if (str.includes('return ')) return false;
    if (str.includes('import ')) return false;
    if (str.includes('export ')) return false;
    if (str.includes('function')) return false;
    if (str.includes('const ')) return false;
    if (str.includes('console.')) return false;
    if (str.includes('void')) return false;

    // 3. MUST NOT be a solitary reserved word (even if no syntax)
    const reserved = ['true', 'false', 'null', 'undefined', 'NaN', 'string', 'number', 'any'];
    if (reserved.includes(str.trim())) return false;

    // 4. Length checks
    if (str.length < 2) return false;
    if (str.length > 300) return false; // Too long is likely valid text, but code blocks can be huge. 
    // 300 chars is a generous paragraph.

    // 5. User specific blocks
    if (str.includes('REZERV')) return false;

    return true;
};

const extractFromContent = (fileContent, pageId) => {
    const sections = [];
    const images = [];

    // CLEANING PHASE
    // Remove comments
    let cleanContent = fileContent.replace(/\/\*[\s\S]*?\*\//g, ''); // /* ... */
    cleanContent = cleanContent.replace(/\/\/.*/g, ''); // // ...

    // 1. Match Text between tags >TEXT<
    // We strictly look for > followed by NOT <, {, } until <
    const jsxTextRegex = />([^<{}]+)</g;

    let match;
    while ((match = jsxTextRegex.exec(cleanContent)) !== null) {
        let text = match[1].trim();

        // Clean up newlines/tabs
        text = text.replace(/\s+/g, ' ');

        if (isTrueText(text)) {
            const id = generateId(text, 'txt');
            sections.push({
                id: id,
                type: 'text',
                label: text.slice(0, 30).toUpperCase() + (text.length > 30 ? '...' : ''),
                value: text
            });
        }
    }

    // 2. Match Specific Attributes: placeholder="TEXT", title="TEXT", alt="TEXT"
    // We ONLY trust double or single quotes. No {expressions}.
    const attrRegex = /\s(placeholder|title|alt|label)=(['"])(.*?)\2/g;
    while ((match = attrRegex.exec(cleanContent)) !== null) {
        const attr = match[1];
        const text = match[3];

        if (isTrueText(text)) {
            const id = generateId(text, attr);
            sections.push({
                id: id,
                type: 'text',
                label: `${attr.toUpperCase()}: ${text.slice(0, 20)}...`,
                value: text
            });
        }
    }

    // 3. Match Images (src="...")
    // Only static strings.
    const imgRegex = /\ssrc=(['"])(.*?)\1/g;
    while ((match = imgRegex.exec(cleanContent)) !== null) {
        const src = match[2];
        // Must look like a file path or URL
        if (src.match(/\.(png|jpg|jpeg|svg|webp|gif)/i) || src.startsWith('http')) {
            if (!src.includes('{') && !src.includes('}')) {
                const id = generateId('image', 'img');
                images.push({
                    id: id,
                    path: src,
                    alt: 'Extracted Image',
                    type: 'local'
                });
            }
        }
    }

    // 4. Match getText('KEY', 'DEFAULT') calls
    const getTextRegex = /getText\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g;
    let textMatch;
    while ((textMatch = getTextRegex.exec(cleanContent)) !== null) {
        const key = textMatch[1];
        const defaultText = textMatch[2];

        // Use the key as the ID if possible, or generate one
        // We prefer the explicit key used in code
        sections.push({
            id: key,
            type: 'text',
            label: defaultText.slice(0, 30).toUpperCase() + (defaultText.length > 30 ? '...' : ''),
            value: defaultText
        });
    }

    return { sections, images };
};

const run = () => {
    console.log('Starting Clean Extraction (Text Only)...');

    try {
        const pagesMap = new Map();
        if (!fs.existsSync(COMPONENTS_DIR)) {
            console.error('Components dir not found');
            process.exit(1);
        }

        const files = fs.readdirSync(COMPONENTS_DIR).filter(f => f.endsWith('.tsx'));
        let totalStats = 0;

        for (const file of files) {
            const content = fs.readFileSync(path.join(COMPONENTS_DIR, file), 'utf8');
            const pageId = path.basename(file, '.tsx').toLowerCase();
            const filenameBase = path.basename(file, '.tsx');

            const TITLE_MAP = {
                'About': 'Haqqımızda',
                'CategoryLeaders': 'Kateqoriya Liderləri',
                'ContactPage': 'Əlaqə',
                'DriversPage': 'Sürücülər',
                'EventsPage': 'Tədbirlər',
                'Footer': 'Footer',
                'GalleryPage': 'Qalereya',
                'Navbar': 'Naviqasiya',
                'News': 'Xəbərlər',
                'NewsPage': 'Xəbərlər Səhifəsi',
                'NextRace': 'Növbəti Yarış',
                'Partners': 'Tərəfdaşlar',
                'RulesPage': 'Qaydalar',
                'VideoArchive': 'Video Arxiv',
                'WhatIsOffroad': 'Offroad Nədir?'
            };

            const defaultTitle = filenameBase.replace(/([A-Z])/g, ' $1').trim();
            const title = TITLE_MAP[filenameBase] || defaultTitle;

            const extracted = extractFromContent(content, pageId);

            if (extracted.sections.length > 0 || extracted.images.length > 0) {
                // De-duplicate within the page
                const uniqueSections = [];
                const seenIds = new Set();

                extracted.sections.forEach(s => {
                    if (!seenIds.has(s.id)) {
                        seenIds.add(s.id);
                        uniqueSections.push(s);
                    }
                });

                extracted.images.forEach(img => {
                    // Check existing images if needed, for now just push
                });

                // Since we are REBUILDING from scratch as requested, 
                // we might wipe old data for this page or merge?
                // The user said "extractoru sıfırdan yap" (make extractor from scratch).
                // I will create a fresh map.

                pagesMap.set(pageId, {
                    id: pageId,
                    title: title,
                    sections: uniqueSections,
                    images: extracted.images
                });
                totalStats += uniqueSections.length + extracted.images.length;
                console.log(`Scanned ${file}: Found ${uniqueSections.length} texts.`);
            }
        }

        const newContent = Array.from(pagesMap.values());
        fs.writeFileSync(CONTENT_FILE, JSON.stringify(newContent, null, 2));

        console.log('-----------------------------------');
        console.log(`Clean Extraction Complete.`);
        console.log(`Total items: ${totalStats}`);
        console.log(`File: ${CONTENT_FILE}`);

    } catch (error) {
        console.error('Extraction failed:', error);
        process.exit(1);
    }
};

run();
