const fs = require('fs');
const path = require('path');

const hooks = /useState|useEffect|useRouter|usePathname|useStore|useRef|useCallback|useMemo/;

function walk(dir) {
  let files;
  try { files = fs.readdirSync(dir); } catch(e) { return; }
  for (const file of files) {
    const full = path.join(dir, file);
    try {
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const content = fs.readFileSync(full, 'utf8');
        const needsClient = hooks.test(content);
        const hasDirective = content.startsWith('"use client"') || content.startsWith("'use client'");
        if (needsClient && !hasDirective) {
          fs.writeFileSync(full, '"use client";\n\n' + content);
          console.log('Fixed:', full);
        }
      }
    } catch(e) {
      // skip
    }
  }
}

walk(path.join(__dirname, 'src', 'app'));
walk(path.join(__dirname, 'src', 'components'));
console.log('Done!');
