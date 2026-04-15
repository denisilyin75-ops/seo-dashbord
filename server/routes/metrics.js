import { Router } from 'express';
const router = Router();

// Фаза 3: GA4 / GSC. Пока — заглушка.
router.get('/', (req, res) => {
  res.status(501).json({ error: 'Not implemented yet', phase: 3 });
});

export default router;
