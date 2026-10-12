import { toEventDTO } from '../dto/event.dto.js';

// Repositorio de eventos: abstrae el acceso a datos y entrega DTOs hacia el servicio,
// de modo que ninguna capa superior manipule documentos ni ObjectId de Mongoose.
export default class EventsRepository {
  constructor(dao) {
    this.dao = dao;
  }

  async create(eventData) {
    const evento = await this.dao.create(eventData);
    return toEventDTO(evento);
  }

  async getAll() {
    const eventos = await this.dao.getAll();
    return eventos.map(toEventDTO);
  }

  async getById(id) {
    const evento = await this.dao.getById(id);
    return evento ? toEventDTO(evento) : null;
  }

  async updateById(id, cambios) {
    const evento = await this.dao.updateById(id, cambios);
    return evento ? toEventDTO(evento) : null;
  }
}
