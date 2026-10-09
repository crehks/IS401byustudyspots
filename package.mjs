// Rebuild a portable ZIP from an explicit allowlist. Never package .env or secrets.
import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {deflateRawSync} from 'node:zlib';
import {parseEnv} from '../server.mjs';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const template=await readFile(path.join(root,'.env.example'),'utf8');
const templateSettings=parseEnv(template);
if(templateSettings.SUPABASE_URL||templateSettings.SUPABASE_PUBLISHABLE_KEY)throw new Error('Refusing to package nonblank connection settings in .env.example. Keep real values only in .env.');
const files=['.gitignore','.env.example','package.json','package-lock.json','server.mjs','database.js','index.html','styles.css','app.js','wsc-plans.js','README.md'];
async function walk(directory){
  for(const entry of await readdir(path.join(root,directory),{withFileTypes:true})){
    if(entry.name.startsWith('.') || entry.name.endsWith('.log') || entry.name==='node_modules' || entry.name==='__pycache__')continue;
    const name=`${directory}/${entry.name}`;
    if(entry.isDirectory())await walk(name);
    else if(entry.isFile())files.push(name);
  }
}
for(const directory of ['assets','docs','supabase','tests','tools'])await walk(directory);
const crcTable=Array.from({length:256},(_,value)=>{
  for(let bit=0;bit<8;bit++)value=(value&1)?0xedb88320^(value>>>1):value>>>1;
  return value>>>0;
});
function crc32(data){let value=0xffffffff;for(const byte of data)value=crcTable[(value^byte)&255]^(value>>>8);return (value^0xffffffff)>>>0;}
const date=new Date();
const dosTime=(date.getHours()<<11)|(date.getMinutes()<<5)|(date.getSeconds()>>1);
const dosDate=((date.getFullYear()-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate();
const chunks=[],central=[];let offset=0;
for(const relative of files){
  if(relative!=='.env.example'&&relative.split('/').some(part=>part.startsWith('.env')))throw new Error('Refusing to package environment credentials.');
  const name=Buffer.from(`study-byu/${relative}`),data=await readFile(path.join(root,relative)),compressed=deflateRawSync(data),checksum=crc32(data);
  const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(8,8);local.writeUInt16LE(dosTime,10);local.writeUInt16LE(dosDate,12);local.writeUInt32LE(checksum,14);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);
  chunks.push(local,name,compressed);
  const header=Buffer.alloc(46);header.writeUInt32LE(0x02014b50,0);header.writeUInt16LE(20,4);header.writeUInt16LE(20,6);header.writeUInt16LE(0x800,8);header.writeUInt16LE(8,10);header.writeUInt16LE(dosTime,12);header.writeUInt16LE(dosDate,14);header.writeUInt32LE(checksum,16);header.writeUInt32LE(compressed.length,20);header.writeUInt32LE(data.length,24);header.writeUInt16LE(name.length,28);header.writeUInt32LE(offset,42);
  central.push(header,name);offset+=local.length+name.length+compressed.length;
}
const directory=Buffer.concat(central),end=Buffer.alloc(22);
end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
await mkdir(path.join(root,'dist'),{recursive:true});
await writeFile(path.join(root,'dist','study-byu.zip'),Buffer.concat([...chunks,directory,end]));
console.log(`Created dist/study-byu.zip with ${files.length} files; .env excluded.`);
