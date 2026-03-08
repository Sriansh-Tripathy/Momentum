import fs from 'fs';
import path from 'path';

function checkFileCasing(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            checkFileCasing(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const importRegex = /import\s+.*?\s+from\s+['"](.*?)['"]|import\s+['"](.*?)['"]/g;
            let match;
            while ((match = importRegex.exec(content)) !== null) {
                const importPath = match[1] || match[2];
                if (importPath && importPath.startsWith('.')) {
                    const absoluteImportPath = path.resolve(path.dirname(fullPath), importPath);
                    const ext = path.extname(absoluteImportPath);

                    let resolvedPath = absoluteImportPath;
                    if (!ext) {
                        if (fs.existsSync(resolvedPath + '.jsx')) resolvedPath += '.jsx';
                        else if (fs.existsSync(resolvedPath + '.js')) resolvedPath += '.js';
                        else if (fs.existsSync(resolvedPath + '/index.jsx')) resolvedPath += '/index.jsx';
                        else if (fs.existsSync(resolvedPath + '/index.js')) resolvedPath += '/index.js';
                        else if (fs.existsSync(resolvedPath + '.css')) resolvedPath += '.css';
                    }

                    if (fs.existsSync(resolvedPath)) {
                        const dirName = path.dirname(resolvedPath);
                        const baseName = path.basename(resolvedPath);
                        const actualFiles = fs.readdirSync(dirName);
                        if (!actualFiles.includes(baseName)) {
                            console.log('CASE MISMATCH in ' + fullPath + ' -> ' + importPath + ' (Expected: ' + actualFiles.find(f => f.toLowerCase() === baseName.toLowerCase()) + ')');
                        }
                    } else {
                        console.log('MISSING IMPORT in ' + fullPath + ' -> ' + importPath);
                    }
                }
            }
        }
    }
}
try {
    checkFileCasing(path.join(process.cwd(), 'src'));
    console.log('Check complete.');
} catch (e) {
    console.log(e);
}
