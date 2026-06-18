import { Router } from 'express';

export function createProvidersRouter({ reputationService }) {
  const router = Router();

  router.get('/', (req, res) => {
    const { serviceType, minReputation, availableOnly, sortBy } = req.query;
    const providers = reputationService.listProviders({
      serviceType,
      minReputation: minReputation ? parseFloat(minReputation) : 0,
      availableOnly: availableOnly === 'true',
      sortBy: sortBy || 'reputation',
    });
    res.json({ providers, total: providers.length });
  });

  router.get('/:id', (req, res) => {
    const provider = reputationService.getProvider(req.params.id);
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    res.json(provider);
  });

  return router;
}
