import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'.');
const ignored=new Set(['.git','node_modules','artifacts','.openai','.codex','.agents','.aws','.sites-local','.sites-runtime']);
const rules=[[/[A-Z]:[\\/](?:Users|project)[\\/]/i,'personal absolute path'],[/appgprj_[a-z0-9]+/i,'private hosting identifier'],[/gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/,'GitHub credential'],[/AKIA[A-Z0-9]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,'private key'],[/(?:api[_-]?key|password|access[_-]?token)\s*[:=]\s*["'][A-Za-z0-9_+\/-]{16,}["']/i,'embedded credential']];
const failures=[];
async function scan(folder){for(const entry of await readdir(folder,{withFileTypes:true})){if(ignored.has(entry.name))continue;const file=path.join(folder,entry.name),relative=path.relative(root,file);if(entry.isSymbolicLink()){failures.push(relative+': symbolic link');continue;}if(entry.isDirectory()){await scan(file);continue;}if(/^\.env(?:\.|$)|\.(pem|key|pfx|p12)$/i.test(entry.name)){failures.push(relative+': sensitive file');continue;}if(relative.startsWith('dist'+path.sep+'vendor'+path.sep))continue;const text=await readFile(file,'utf8');for(const [pattern,label] of rules)if(pattern.test(text))failures.push(relative+': '+label);}}
await scan(root);
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}else console.log('Privacy check passed: no personal paths, hosting IDs, credentials or private keys in publishable source.');
