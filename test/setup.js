import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Base de datos en memoria para los tests: no requiere MongoDB instalado ni Atlas.
let mongod;

export async function iniciarBaseDePrueba() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

export async function limpiarBaseDePrueba() {
  const colecciones = await mongoose.connection.db.collections();
  await Promise.all(colecciones.map((coleccion) => coleccion.deleteMany({})));
}

export async function detenerBaseDePrueba() {
  await mongoose.disconnect();
  await mongod.stop();
}
