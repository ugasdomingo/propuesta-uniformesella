import { mkdir,writeFile,access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

try{await access('.env');throw new Error('Ya existe .env; no se ha sobrescrito ningún secreto.');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
await mkdir('.local',{recursive:true});
const password=randomBytes(18).toString('base64url');
const secret=randomBytes(48).toString('hex');
const email='equipo@demo.uniformesellas.local';
await writeFile('.env',`NODE_ENV=development\nPORT=4000\nMONGODB_URI=mongodb://127.0.0.1:27017/uniformes_ellas\nAPP_URL=http://localhost:3000\nSESSION_SECRET=${secret}\nDEMO_MODE=true\nORDER_NOTIFICATION_TO=ugasdomingo@gmail.com\nEMAIL_REDIRECT_TO=ugasdomingo@gmail.com\nEMAIL_FROM=\nEMAIL_API_KEY=\nDEMO_ADMIN_EMAIL=${email}\nDEMO_ADMIN_PASSWORD=${password}\n`);
await writeFile('.local/ACCESO.md',`# Acceso local privado\n\nPanel: http://localhost:3000/admin/solicitudes\n\nUsuario: ${email}\n\nContraseña: ${password}\n\nEste archivo está excluido de Git. No lo publiques ni lo copies a la web. Ejecuta npm run admin:create después de arrancar MongoDB.\n`);
console.log('Configuración local y credenciales creadas en .env y .local/ACCESO.md (ambos excluidos de Git). No se han impreso secretos.');
