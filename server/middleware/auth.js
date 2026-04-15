// Простой bearer-auth. Если AUTH_TOKEN не задан — auth отключён (dev).
export function auth(req, res, next) {
  const token = process.env.AUTH_TOKEN;
  if (!token) return next();
  const header = req.headers.authorization || '';
  const [scheme, value] = header.split(' ');
  if (scheme === 'Bearer' && value === token) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}
