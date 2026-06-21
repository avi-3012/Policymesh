import { Router } from 'express';

export function createSwapRouter({ saucerSwapService }) {
  const router = Router();

  router.get('/quote', async (req, res) => {
    try {
      const from = req.query.from ?? 'HBAR';
      const to = req.query.to ?? 'USDC';
      const amount = parseFloat(req.query.amount);

      if (!amount || Number.isNaN(amount)) {
        return res.status(400).json({ error: 'amount query parameter is required' });
      }

      const quote = await saucerSwapService.getSwapQuote(from, to, amount);
      res.json(quote);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/quote', async (req, res) => {
    try {
      const { from = 'HBAR', to = 'USDC', amount } = req.body;
      if (amount == null || Number.isNaN(Number(amount))) {
        return res.status(400).json({ error: 'amount is required' });
      }

      const quote = await saucerSwapService.getSwapQuote(from, to, Number(amount));
      res.json(quote);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}
