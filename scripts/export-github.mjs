import { cp, mkdir, readdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const destination=path.resolve(root,'artifacts','github-source');
if(!destination.startsWith(path.join(root,'artifacts')+path.sep))throw new Error('Invalid export destination');
await mkdir(destination,{recursive:true});
const allowed=['dist','scripts','tests','.github','package.json','package-lock.json','README.md','CHANGELOG.md','DESIGN.md','.gitignore','server.mjs'];
const present=new Set(await readdir(root));
for(const name of allowed){if(!present.has(name))continue;await cp(path.join(root,name),path.join(destination,name),{recursive:true,filter:source=>!source.endsWith('.env')&&!source.endsWith('.pem')&&!source.endsWith('.key')});}
console.log('Clean GitHub export prepared in artifacts/github-source. Existing deployment history is excluded.');
