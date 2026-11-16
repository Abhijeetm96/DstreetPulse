import { readdirSync, statSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = ['src', 'tests'];
let errorCount = 0;
let fileCount = 0;

function walk(dir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
    } else if (extname(full) === '.js') {
      fileCount++;
      const res = spawnSync(process.execPath, ['--check', full], { encoding: 'utf8' });
      if (res.status !== 0) {
        console.error(`Syntax Error in ${full}:\n${res.stderr}`);
        errorCount++;
      }
    }
  }
}

for (const r of roots) {
  walk(resolve(process.cwd(), r));
}

if (errorCount > 0) {
  console.error(`Syntax check failed with ${errorCount} error(s) across ${fileCount} files.`);
  process.exit(1);
} else {
  console.log(`Syntax check passed for all ${fileCount} JavaScript files.`);
}
