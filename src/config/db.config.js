import mongoose from 'mongoose';
import config from './env.config.js';

// Conexión a MongoDB. Desde esta entrega la base es obligatoria: si la conexión
// falla, server.js detiene el arranque (Fail-Fast) para no servir una API rota.
export async function conectarDB() {
  await mongoose.connect(config.mongoUrl, { serverSelectionTimeoutMS: 10000 });
  console.log('Conexión a MongoDB establecida.');
}
