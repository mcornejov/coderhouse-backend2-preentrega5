// Validadores reutilizables, sin dependencias de HTTP ni de la base de datos.

// Formato mínimo de email: algo@dominio.tld, sin espacios
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_MIN_LENGTH = 8;

// bcrypt solo considera los primeros 72 bytes de la contraseña; más allá de eso
// las contraseñas se compararían truncadas, así que se rechazan en la frontera.
export const PASSWORD_MAX_BYTES = 72;

export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidEmail(value) {
  return typeof value === 'string' && EMAIL_REGEX.test(value.trim());
}

export function isPasswordTooLong(value) {
  return Buffer.byteLength(value, 'utf8') > PASSWORD_MAX_BYTES;
}

// Normaliza el email para que "  Ana@Mail.com " y "ana@mail.com" sean el mismo usuario
export function normalizeEmail(value) {
  return value.trim().toLowerCase();
}
