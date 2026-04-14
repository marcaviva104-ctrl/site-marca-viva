const fs = require('fs');
const path = require('path');

const mojibakeMap = {
    'á': 'á',
    'â': 'â',
    'ã': 'ã',
    'ç': 'ç',
    'é': 'é',
    'ê': 'ê',
    'Ã\u00AD': 'í',
    'í': 'í',
    'ó': 'ó',
    'ô': 'ô',
    'õ': 'õ',
    'ú': 'ú',
    'Ã‡': 'Ç',
    'Ã‰': 'É',
    'Ãƒ': 'Ã',
    'Ã•': 'Õ',
    'Ã“': 'Ó',
    'Ã”': 'Ô',
    'ÃŠ': 'Ê',
    'Ã‚': 'Â',
    'Ã€': 'À',
    'Ã ': 'à',
    'ü': 'ü',
    'Ã\u0087': 'Ç',
    'Ã\u0089': 'É',
    'Ã\u0083': 'Ã',
    'Ã\u0095': 'Õ',
    'Ã\u0093': 'Ó',
    'Ã\u0094': 'Ô',
    'Ã\u008A': 'Ê',
    'Ã\u0082': 'Â',
    'Ã\u0080': 'À'
};

const regex = new RegExp(Object.keys(mojibakeMap).join('|'), 'g');

function fixFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let newContent = content.replace(regex, match => mojibakeMap[match]);
        
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`[FIXED] ${filePath}`);
            return true;
        }
    } catch (e) {
        console.error(`[ERROR] ${filePath}:`, e);
    }
    return false;
}

function walkDir(dir) {
    let fixedCount = 0;
    fs.readdirSync(dir).forEach(file => {
        let fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!['node_modules', '.git', '.gemini'].includes(file)) {
                fixedCount += walkDir(fullPath);
            }
        } else if (fullPath.endsWith('.html') || fullPath.endsWith('.js') || fullPath.endsWith('.css') || fullPath.endsWith('.md')) {
            if (fixFile(fullPath)) fixedCount++;
        }
    });
    return fixedCount;
}

const targetDirs = ['pages', 'scripts', 'admin', 'styles'];
let totalFixed = 0;

targetDirs.forEach(dir => {
    const rootPath = path.join(__dirname, '..', '..', dir);
    if (fs.existsSync(rootPath)) {
        console.log(`Scanning /${dir}...`);
        totalFixed += walkDir(rootPath);
    }
});

console.log(`\nDONE! Total files fixed: ${totalFixed}`);
