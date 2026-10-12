import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';

// Utilidades compartidas por los tests de autorización: crear usuarios con un rol
// dado y obtener su cookie de sesión siguiendo el flujo real (registro → login).

const REGISTER = '/api/sessions/register';
const LOGIN = '/api/sessions/login';

const PASSWORD = 'Secreta123';

/**
 * Registra un usuario por la API (siempre nace `user`), le asigna el rol pedido
 * directamente en la base (como haría el script asignar-rol o la ruta admin) y
 * hace login para obtener la cookie currentUser.
 * @param {'user'|'organizer'|'admin'} role
 * @param {string} email
 * @returns {Promise<{ id: string, email: string, role: string, cookie: string }>}
 */
export async function crearUsuarioConRol(role, email = `${role}@mail.com`) {
  const registro = await request(app)
    .post(REGISTER)
    .send({ first_name: 'Usuario', last_name: role, email, password: PASSWORD });
  if (registro.status !== 201) {
    throw new Error(`No se pudo registrar ${email}: ${registro.status} ${JSON.stringify(registro.body)}`);
  }

  if (role !== 'user') {
    await User.updateOne({ email }, { role });
  }

  const login = await request(app).post(LOGIN).send({ email, password: PASSWORD });
  const setCookie = (login.headers['set-cookie'] ?? []).find((c) => c.startsWith('currentUser='));
  if (!setCookie) {
    throw new Error(`El login de ${email} no devolvió la cookie de sesión`);
  }

  return { id: registro.body.payload.id, email, role, cookie: setCookie.split(';')[0] };
}

// Evento válido para las pruebas de creación y modificación
export const eventoValido = {
  title: 'Cata de cafés de Colombia',
  description: 'Recorrido por tres orígenes con método V60.',
  date: '2027-03-15T19:00:00.000Z',
  location: 'Café Aurora, Providencia',
  capacity: 12,
  price: 15000,
};
