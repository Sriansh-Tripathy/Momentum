const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'src'));
files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
        const match = line.match(/import\s+.*from\s+['"](.+)['"]/);
        if (match) {
            const importPath = match[1];
            if (importPath.startsWith('.')) { // relative import
                const dir = path.dirname(file);
                // check if it maps to a real file (.js, .jsx, .css)
                const fullPath = path.resolve(dir, importPath);
                let exists = false;
                if (fs.existsSync(fullPath)) exists = true;
                if (fs.existsSync(fullPath + '.js')) exists = true;
                if (fs.existsSync(fullPath + '.jsx')) exists = true;
                if (fs.existsSync(fullPath + '.css')) exists = true;

                if (!exists) {
                    console.log(`BROKEN IMPORT: ${file}:${i + 1} -> ${importPath}`);
                }
            }
        }
    });
});
console.log('Import check complete.');
