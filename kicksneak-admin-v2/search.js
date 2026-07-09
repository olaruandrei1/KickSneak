const fs = require('fs');
const path = require('path');

function searchFile(filePath, query) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(query)) {
      console.log(`Found in: ${filePath}`);
    }
  } catch(e) {}
}

function walkDir(dir, query) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git') continue;
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, query);
    } else {
      searchFile(fullPath, query);
    }
  }
}

walkDir('C:\\Users\\micro\\Desktop\\DavidLicenta', 'A support agent will respond shortly');
