import { MongoMemoryServer } from 'mongodb-memory-server-core';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const dbPath=resolve('.local/mongodb');
await mkdir(dbPath,{recursive:true});
// This launches a REAL mongod with WiredTiger on disk, not an in-memory substitute.
const server=await MongoMemoryServer.create({instance:{port:27017,dbPath,storageEngine:'wiredTiger',dbName:'uniformes_ellas'},binary:{version:'7.0.14',downloadDir:resolve('.local/mongodb-binaries')}});
console.log('MongoDB local persistente: mongodb://127.0.0.1:27017/uniformes_ellas');
console.log(`Datos: ${dbPath}. Ctrl+C detiene el proceso y conserva los datos.`);
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>void server.stop({doCleanup:false}).then(()=>process.exit(0)));
setInterval(()=>{},60000);
