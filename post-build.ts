import { readdirSync, renameSync, rmSync } from 'fs';
import { join, basename } from 'path';

function removeAllFiles(dirPath: string) {
  const files = readdirSync(dirPath, { withFileTypes: true })
    .filter(f => f.isFile())
    .map(f => join(f.parentPath, f.name));
  files.forEach(file => {
    rmSync(file, { recursive: true, force: true });
  });
}

function moveAndRename(srcDir: string, destDir: string, newExt: string) {
  const files = readdirSync(srcDir, { withFileTypes: true })
    .filter(f => f.isFile())
    .map(f => join(f.parentPath, f.name));
  files.forEach(file => {
    const destFilePath = join(
      destDir,
      basename(file)
        .replace(/\.js\.map$/, `${newExt}.map`)
        .replace(/\.js$/, newExt),
    );

    renameSync(file, destFilePath);
  });

  rmSync(srcDir, { recursive: true, force: true });
}

const srcDirCjs = join(import.meta.dirname, './dist/cjs');
const srcDirEsm = join(import.meta.dirname, './dist/esm');
const destDir = join(import.meta.dirname, './dist');

removeAllFiles(destDir);
moveAndRename(srcDirCjs, destDir, '.js');
moveAndRename(srcDirEsm, destDir, '.mjs');
