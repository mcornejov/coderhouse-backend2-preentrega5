import { HttpError } from '../utils/errors.util.js';
import { responderError } from '../utils/responses.util.js';

// Manejador global de errores. Traduce los errores de la aplicación a códigos
// HTTP y evita filtrar detalles internos del servidor al cliente.
export function errorHandler(error, req, res, next) {
  if (error instanceof HttpError) {
    return responderError(res, error.status, error.message);
  }

  // express.json() lanza este error cuando el body no es JSON válido
  if (error.type === 'entity.parse.failed') {
    return responderError(res, 400, 'El cuerpo de la petición no es un JSON válido');
  }

  // Express lanza URIError al decodificar una URL con caracteres mal codificados
  if (error instanceof URIError) {
    return responderError(res, 400, 'La URL contiene caracteres mal codificados');
  }

  // Validaciones del esquema de Mongoose (segunda barrera detrás del servicio)
  if (error.name === 'ValidationError') {
    return responderError(res, 400, 'Los datos enviados no son válidos');
  }

  // Mongoose no pudo convertir un valor (por ejemplo, un id con formato inválido)
  if (error.name === 'CastError') {
    return responderError(res, 400, 'El identificador enviado no es válido');
  }

  // Índice único violado (por ejemplo, dos registros simultáneos con el mismo email)
  if (error.code === 11000) {
    return responderError(res, 409, 'El email ya está registrado');
  }

  console.error(error);
  return responderError(res, 500, 'Error interno del servidor');
}
