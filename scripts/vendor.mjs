import { copyFile, mkdir } from 'node:fs/promises';
const destination = new URL('../dist/vendor/', import.meta.url);
await mkdir(destination, { recursive: true });
for (const name of ['three.module.js', 'three.core.js']) await copyFile(new URL(`../node_modules/three/build/${name}`, import.meta.url), new URL(name, destination));
await copyFile(new URL('../node_modules/three/LICENSE', import.meta.url), new URL('THREE-LICENSE.txt', destination));
console.log('Three.js modules are ready in dist/vendor.');
