import { Router } from 'express';

export function createAgentRouter({ langChainService }) {
  const router = Router();

  router.get('/status', (_req, res) => {
    res.json(langChainService.getStatus());
  });

  router.post('/chat', async (req, res) => {
    try {
      const { message, threadId } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'message is required' });
      }
      const result = await langChainService.chat(message, threadId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
