import { Router } from 'express';

export function createPoliciesRouter({ policyEngine }) {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(policyEngine.getAllPolicies());
  });

  router.post('/', (req, res) => {
    const updates = req.body;
    const validation = policyEngine.updatePolicies(updates);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error, validation });
    }
    res.json({
      updated: true,
      policies: policyEngine.getAllPolicies(),
      validation,
    });
  });

  return router;
}
