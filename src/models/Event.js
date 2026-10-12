import mongoose from 'mongoose';

// Modelo base de evento. Campos mínimos para la Plataforma de Eventos e
// Inscripciones de Café Aurora (catas, talleres de barismo, música en vivo).
const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    date: { type: Date, required: true },
    location: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    price: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['draft', 'published', 'cancelled', 'finished'],
      default: 'draft',
    },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Categoría del evento (cata, taller, charla, música). Se gestiona con el CRUD de eventos.
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  },
  { timestamps: true }
);

const Event = mongoose.model('Event', eventSchema);

export default Event;
