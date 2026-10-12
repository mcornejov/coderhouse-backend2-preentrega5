import Event from '../models/Event.js';

// DAO de eventos: única capa que conoce Mongoose y el modelo Event.
// Devuelve objetos planos; la conversión a DTO la hace el repositorio.
export default class EventsDao {
  async create(eventData) {
    const evento = await Event.create(eventData);
    return evento.toObject();
  }

  async getAll() {
    return Event.find().sort({ date: 1 }).lean();
  }

  async getById(id) {
    return Event.findById(id).lean();
  }

  // runValidators: los cambios parciales también pasan por las reglas del esquema
  async updateById(id, cambios) {
    return Event.findByIdAndUpdate(id, cambios, { returnDocument: 'after', runValidators: true }).lean();
  }
}
