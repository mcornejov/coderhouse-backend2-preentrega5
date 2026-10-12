import { Router } from 'express';
import healthRouter from './health.router.js';
import eventsRouter from './events.router.js';
import sessionsRouter from './sessions.router.js';
import usersRouter from './users.router.js';

// Router principal de la API: agrupa todos los recursos bajo /api
const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/events', eventsRouter);
apiRouter.use('/sessions', sessionsRouter);
apiRouter.use('/users', usersRouter);

export default apiRouter;
