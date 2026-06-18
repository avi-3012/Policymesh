import { Router } from 'express';

export function createAuditRouter({ hcsService }) {
  const router = Router();

  router.get('/', (req, res) => {
    const { limit, offset, eventType, startDate, endDate } = req.query;
    const result = hcsService.query({
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
      eventType,
      startDate,
      endDate,
    });
    res.json(result);
  });

  return router;
}
