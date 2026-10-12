import { esAdmin } from '../config/roles.config.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.util.js';
import { isNonEmptyString } from '../utils/validators.js';

// Campos que el cliente puede enviar al crear o modificar un evento. `organizer` y
// `status` no están: el organizador sale de la sesión y el estado se gestiona aparte.
const CAMPOS_EVENTO = ['title', 'description', 'date', 'location', 'capacity', 'price'];
const CAMPOS_OBLIGATORIOS = ['title', 'date', 'location', 'capacity'];

// Capa de negocio de eventos. No conoce HTTP ni Mongoose: recibe datos planos y el
// usuario de la sesión, aplica las reglas y lanza errores con código HTTP asociado.
export default class EventsService {
  constructor(repository) {
    this.repository = repository;
  }

  async listar() {
    return this.repository.getAll();
  }

  async obtenerPorId(id) {
    const evento = await this.repository.getById(id);
    if (!evento) {
      throw new NotFoundError(`No existe un evento con id ${id}`);
    }
    return evento;
  }

  /**
   * Crea un evento a nombre del usuario autenticado. El rol ya fue autorizado por el
   * middleware; aquí solo se valida el contenido y se fija el organizador desde la sesión.
   * @param {object} datos body de la petición
   * @param {{ id: string, role: string }} usuario req.user
   */
  async crear(datos, usuario) {
    const evento = this.#filtrarCampos(datos);

    const faltantes = CAMPOS_OBLIGATORIOS.filter((campo) => evento[campo] === undefined || evento[campo] === '');
    if (faltantes.length > 0) {
      throw new BadRequestError(`Faltan campos obligatorios: ${faltantes.join(', ')}`);
    }
    this.#validarValores(evento);

    // El organizador nunca viene del body: es quien está autenticado
    return this.repository.create({ ...evento, organizer: usuario.id });
  }

  /**
   * Modifica un evento. Regla de propiedad: un organizer solo modifica los eventos que
   * creó; un admin puede modificar cualquiera. Se verifica aquí porque hace falta el
   * evento ya cargado para saber de quién es (el token solo dice quién pide).
   * @param {string} id
   * @param {object} datos body de la petición
   * @param {{ id: string, role: string }} usuario req.user
   */
  async actualizar(id, datos, usuario) {
    const evento = await this.obtenerPorId(id);

    if (!esAdmin(usuario.role) && evento.organizer !== usuario.id) {
      throw new ForbiddenError('Solo puedes modificar tus propios eventos');
    }

    const cambios = this.#filtrarCampos(datos);
    if (Object.keys(cambios).length === 0) {
      throw new BadRequestError('No se enviaron campos modificables');
    }
    this.#validarValores(cambios);

    const actualizado = await this.repository.updateById(id, cambios);
    if (!actualizado) {
      // El evento desapareció entre la lectura y la escritura
      throw new NotFoundError(`No existe un evento con id ${id}`);
    }
    return actualizado;
  }

  // Whitelist: ignora cualquier campo fuera de CAMPOS_EVENTO (organizer, status, _id...)
  #filtrarCampos(datos) {
    const origen = datos && typeof datos === 'object' ? datos : {};
    const resultado = {};
    for (const campo of CAMPOS_EVENTO) {
      if (origen[campo] !== undefined) {
        resultado[campo] = origen[campo];
      }
    }
    return resultado;
  }

  // Reglas de contenido mínimas. La fecha debe llegar como texto (ISO 8601): un número
  // o un booleano también "son" una fecha para new Date() y guardarían 1970 sin aviso.
  #validarValores(evento) {
    for (const campo of ['title', 'location']) {
      if (evento[campo] !== undefined && !isNonEmptyString(evento[campo])) {
        throw new BadRequestError(`El campo ${campo} debe ser un texto no vacío`);
      }
    }
    if (evento.description !== undefined && typeof evento.description !== 'string') {
      throw new BadRequestError('El campo description debe ser un texto');
    }
    if (evento.date !== undefined && !(typeof evento.date === 'string' && !Number.isNaN(Date.parse(evento.date)))) {
      throw new BadRequestError('El campo date debe ser una fecha válida en formato ISO 8601');
    }
    if (evento.capacity !== undefined && !(Number.isInteger(evento.capacity) && evento.capacity > 0)) {
      throw new BadRequestError('El campo capacity debe ser un entero mayor que 0');
    }
    if (evento.price !== undefined && !(typeof evento.price === 'number' && evento.price >= 0)) {
      throw new BadRequestError('El campo price debe ser un número mayor o igual a 0');
    }
  }
}
