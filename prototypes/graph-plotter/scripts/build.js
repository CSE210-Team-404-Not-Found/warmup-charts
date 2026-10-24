import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { URL } from 'node:url';

const destination = new URL('../dist/', import.meta.url);
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
for (const path of ['index.html', 'styles.css', 'src', 'demo', 'examples']) {
  await cp(new URL(`../${path}`, import.meta.url), new URL(path, destination), { recursive: true });
}
await writeFile(new URL('.nojekyll', destination), '');
console.log('Built static site in dist/.');
