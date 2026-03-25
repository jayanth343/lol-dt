// server/middleware/auth.js
const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = user;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
};

const requireOwnerOrAdmin = (req, res, next) => {
  if (!['admin', 'team_owner', 'captain'].includes(req.user?.role))
    return res.status(403).json({ error: 'Team owner, captain or admin only' });
  next();
};

module.exports = { auth, requireAdmin, requireOwnerOrAdmin };
