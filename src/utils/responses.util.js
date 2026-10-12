// Helpers de respuesta para mantener un formato uniforme en toda la API:
// éxito → { status: 'success', payload } · confirmación → { status: 'success', message }
// error → { status: 'error', message }
export function responderExito(res, payload, status = 200) {
  return res.status(status).json({ status: 'success', payload });
}

export function responderCreado(res, payload) {
  return responderExito(res, payload, 201);
}

export function responderMensaje(res, message, status = 200) {
  return res.status(status).json({ status: 'success', message });
}

export function responderError(res, status, message) {
  return res.status(status).json({ status: 'error', message });
}
