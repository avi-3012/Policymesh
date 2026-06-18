import { Router } from 'express';

export function createNotificationsRouter({ notificationStore }) {
  const router = Router();

  router.get('/', (req, res) => {
    const { limit, type } = req.query;
    const events = notificationStore.list({
      limit: limit ? parseInt(limit, 10) : 50,
      type,
    });
    res.json({ events, total: events.length });
  });

  return router;
}
