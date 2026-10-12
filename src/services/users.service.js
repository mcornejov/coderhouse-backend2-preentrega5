import { esRolValido, USER_ROLES } from '../config/roles.config.js';
import { BadRequestError, NotFoundError } from '../utils/errors.util.js';

// Capa de negocio de usuarios para la administración. El registro y el login no pasan
// por aquí (viven en las estrategias de Passport); esto es lo que hace un admin.
export default class UsersService {
  constructor(repository) {
    this.repository = repository;
  }

  async listar() {
    return this.repository.getAll();
  }

  /**
   * Cambia el rol de un usuario. El rol debe ser uno de los definidos en la matriz.
   * El cambio rige en el próximo login: el JWT ya emitido conserva el rol anterior
   * hasta que expire (sesión sin estado).
   * @param {string} id
   * @param {unknown} role
   */
  async asignarRol(id, role) {
    if (!esRolValido(role)) {
      throw new BadRequestError(`El rol debe ser uno de: ${USER_ROLES.join(', ')}`);
    }

    const usuario = await this.repository.updateRoleById(id, role);
    if (!usuario) {
      throw new NotFoundError(`No existe un usuario con id ${id}`);
    }
    return usuario;
  }
}
