const jwt = require('jsonwebtoken');
const db = require('../db/database');

module.exports = function validateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'No token provided', code: 'NO_TOKEN' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.getUserById(decoded.userId);
    if (!user) return res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    req.user = user;
    req.userId = user.id;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ error: 'Session expired', code: 'TOKEN_EXPIRED' });
    return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
  }
};
