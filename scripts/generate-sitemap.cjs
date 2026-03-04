const fs = require('fs');
const path = require('path');

const FRONT_PAGES_DIR = path.join(__dirname, '../../front/src/pages');
const SITEMAP_PATH = path.join(__dirname, '../public/sitemap.json');

function generateSitemap() {
    if (!fs.existsSync(FRONT_PAGES_DIR)) {
        console.log('Front pages directory not found at:', FRONT_PAGES_DIR);
        return;
    }

    const files = fs.readdirSync(FRONT_PAGES_DIR);
    const sitemap = files
        .filter(file => file.endsWith('.tsx') || file.endsWith('.jsx'))
        .map(file => {
            const name = file.replace(/\.(tsx|jsx)$/, '');
            const path = name === 'Home' ? '/' : `/${name.toLowerCase()}`;

            // Basic mapping for common names to icons
            let icon = 'Circle';
            if (name.toLowerCase().includes('home')) icon = 'Home';
            if (name.toLowerCase().includes('course')) icon = 'BookOpen';
            if (name.toLowerCase().includes('user') || name.toLowerCase().includes('profile')) icon = 'User';
            if (name.toLowerCase().includes('setting')) icon = 'Settings';
            if (name.toLowerCase().includes('login')) icon = 'LogIn';
            if (name.toLowerCase().includes('contact')) icon = 'Mail';
            if (name.toLowerCase().includes('about')) icon = 'Info';

            return {
                title: name,
                icon: icon,
                path: path
            };
        });

    fs.writeFileSync(SITEMAP_PATH, JSON.stringify(sitemap, null, 2));
    console.log('Sitemap generated successfully at:', SITEMAP_PATH);
}

generateSitemap();
