import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
if (!uri || !/^mongodb(?:\+srv)?:\/\//.test(uri)) {
  console.error('Configura MONGODB_URI en el entorno privado. No se imprime su contenido.');
  process.exit(1);
}

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  if (!db || ['admin', 'local', 'config', 'test'].includes(db.databaseName)) {
    throw new Error('dedicated_database_required');
  }
  await db.command({ ping: 1 });
  const [products, requests, users, files] = await Promise.all([
    db.collection('products').countDocuments(),
    db.collection('requests').countDocuments(),
    db.collection('users').countDocuments(),
    db.collection('privateLogos.files').countDocuments(),
  ]);
  console.log(JSON.stringify({ connected: true, database: db.databaseName, products, requests, users, privateFiles: files }));
} catch (error) {
  const dedicated = error instanceof Error && error.message === 'dedicated_database_required';
  console.error(dedicated
    ? 'Indica una base exclusiva de la demo en MONGODB_URI; no uses admin, local, config ni test.'
    : 'No se pudo comprobar MongoDB. Revisa la URI, el usuario, sus permisos y la lista de IP de Atlas. La URI y las credenciales no se imprimen.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
