const fs = require('fs');
const path = require('path');

const FRONT_DIR = path.join(__dirname, '../front');
const CONTENT_PATH = path.join(FRONT_DIR, 'public/site-content.json');
const IMAGES_LIST_PATH = path.join(FRONT_DIR, 'public/all-images.json');

function extractContent() {
    const componentsDir = path.join(FRONT_DIR, 'components');
    const content = [];

    const targetDirs = [FRONT_DIR, componentsDir];

    // Create public directory if not exists
    const frontPublicDir = path.join(FRONT_DIR, 'public');
    if (!fs.existsSync(frontPublicDir)) {
        fs.mkdirSync(frontPublicDir, { recursive: true });
    }

    // Scanned image registry
    const localImages = [];
    const scanImages = (dir, prefix = '') => {
        if (!fs.existsSync(dir)) return;
        const items = fs.readdirSync(dir);
        items.forEach(item => {
            const fullPath = path.join(dir, item);
            if (fs.statSync(fullPath).isDirectory()) {
                if (item !== 'node_modules' && item !== '.git') {
                    scanImages(fullPath, path.join(prefix, item));
                }
            } else if (/\.(png|jpe?g|svg|webp|gif)$/i.test(item)) {
                localImages.push(path.join(prefix, item));
            }
        });
    };

    scanImages(frontPublicDir, '/');

    const filesToProcess = [];
    targetDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
                    filesToProcess.push(path.join(dir, file));
                }
            });
        }
    });

    filesToProcess.forEach(filePath => {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const fileName = path.basename(filePath);
        const pageName = fileName.replace(/\.(tsx|jsx)$/, '');
        const sections = [];

        // Label Mapping for better UX
        const labelMap = {
            'title': 'Başlıq',
            'desc': 'Təsvir',
            'label': 'Etiket',
            'value': 'Dəyər',
            'content': 'Məzmun',
            'text': 'Mətn',
            'placeholder': 'İpucu',
            'date': 'Tarix',
            'duration': 'Müddət',
            'subtitle': 'Alt Başlıq',
            'heading': 'Başlıq',
            'caption': 'İmza',
            'H1': 'Əsas Başlıq',
            'H2': 'Bölmə Başlığı',
            'H3': 'Alt Başlıq',
            'H4': 'Kiçik Başlıq',
            'H5': 'Kiçik Başlıq',
            'H6': 'Kiçik Başlıq',
            'P': 'Paraqraf',
            'SPAN': 'Mətn',
            'DIV': 'Blok Mətni',
            'BUTTON': 'Düymə Mətni',
            'A': 'Link Mətni',
            'LI': 'Siyahı Elementi'
        };

        // 1. Extract specific object keys with their labels: title, desc, label, etc.
        const keyRegex = /(title|desc|label|value|content|text|placeholder|date|duration|subtitle|heading|caption):\s*['"`]([^'"`]+)['"`]/gi;
        let match;
        while ((match = keyRegex.exec(fileContent)) !== null) {
            const rawLabel = match[1].toLowerCase();
            const value = match[2];
            if (value.length > 1 && !value.startsWith('http') && !value.startsWith('/') && !value.includes('.com')) {
                sections.push({
                    id: `text-${sections.length}`,
                    type: 'text',
                    label: labelMap[rawLabel] || rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1),
                    value: value
                });
            }
        }

        // 2. Extract JSX Text (if not already captured by keys)
        const jsxTextMatches = fileContent.match(/>([^<>{}\n]+)</g) || [];
        jsxTextMatches.forEach(m => {
            const value = m.slice(1, -1).trim();
            if (value.length > 2 && !value.includes('{') && !value.includes('}') && !sections.find(s => s.value === value)) {
                // Try to guess label from tag
                const tagMatch = fileContent.substring(0, fileContent.indexOf(m)).match(/<([a-zA-Z0-9]+)[^>]*$/);
                const rawTag = tagMatch ? tagMatch[1].toUpperCase() : 'Bölmə';
                sections.push({
                    id: `text-${sections.length}`,
                    type: 'text',
                    label: labelMap[rawTag] || 'Mətn',
                    value: value
                });
            }
        });

        // 3. Extract Images (Local and Remote)
        const usedLocalImages = [];
        localImages.forEach(img => {
            if (fileContent.includes(path.basename(img))) {
                usedLocalImages.push({ id: path.basename(img), path: img, type: 'local' });
            }
        });

        // Find remote images (URLs)
        const remoteImageMatches = fileContent.match(/(url|src|href)(?::|=)\s*['"`](https?:\/\/[^'"`]+)['"`]/gi) || [];
        const usedRemoteImages = remoteImageMatches.map((m, i) => {
            const parts = m.match(/['"`](https?:\/\/[^'"`]+)['"`]/i);
            return parts ? { id: `remote-${i}`, path: parts[1], type: 'remote' } : null;
        }).filter(Boolean);

        const allImages = [...usedLocalImages, ...usedRemoteImages];

        if (sections.length > 0 || allImages.length > 0) {
            content.push({
                id: pageName.toLowerCase(),
                title: pageName,
                sections: sections,
                images: allImages.map((img, i) => ({ id: img.id || `img-${i}`, path: img.path, type: img.type, alt: pageName })),
                filePath: filePath.replace(FRONT_DIR, '')
            });
        }
    });

    fs.writeFileSync(CONTENT_PATH, JSON.stringify(content, null, 2));

    // Also save the list of ALL available images for the selection UI
    const allImagesData = {
        local: localImages
    };
    fs.writeFileSync(IMAGES_LIST_PATH, JSON.stringify(allImagesData, null, 2));

    console.log(`Successfully extracted ${content.length} components/pages to site-content.json`);
}

extractContent();
