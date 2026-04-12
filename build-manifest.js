const fs = require('fs');
const path = require('path');

const rootFiles = ['home.html', 'index.html', 'extras.html', 'settings.html', 'secret.html', 'main.js', 'package.json'];
const directoriesToScan = ['assets/css', 'assets/js', 'assets/media', 'assets/fonts'];

let generatedFileList = [...rootFiles];

function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            scanDirectory(fullPath);
        } else {
            if (file === 'data.json') return; 

            const isComicPage = /^p\d+-\d+\.\w+$/.test(file);
            
            if (!isComicPage) {
                generatedFileList.push(fullPath.replace(/\\/g, '/')); 
            }
        }
    });
}

directoriesToScan.forEach(dir => scanDirectory(dir));

const packagePath = path.join(__dirname, 'package.json');
const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

packageData.coreFiles = generatedFileList;

fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2));

console.log(`Successfully mapped ${generatedFileList.length} core app files.`);