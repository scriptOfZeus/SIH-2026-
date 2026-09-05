const jwt = require('jsonwebtoken');
const { fail } = require('../utils/response');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

function sign(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return fail(res, 'UNAUTHORIZED', 'Missing or malformed Authorization header', 401);
  }
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, SECRET); // { id, role, ... }
    next();
  } catch (e) {
    return fail(res, 'UNAUTHORIZED', 'Invalid or expired token', 401);
  }
}

function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, 'UNAUTHORIZED', 'Authentication required', 401);
    }
    const userRole = req.user.role;
    const isMatched = allowed.includes(userRole) ||
      (allowed.includes('admin') && (userRole === 'supervising_admin' || userRole === 'federation_admin' || userRole === 'admin'));

    if (!isMatched) {
      return fail(res, 'FORBIDDEN', `Requires one of [${allowed.join(', ')}] role`, 403);
    }
    next();
  };
}

module.exports = { sign, requireAuth, requireRole, SECRET };
