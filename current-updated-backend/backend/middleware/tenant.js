const { fail } = require('../utils/response');

/**
 * Tenant scoping middleware.
 * Guarantees that the authenticated admin has a valid federation_id
 * derived strictly from the verified JWT payload.
 * Client-provided federation_id parameters in body or query are overwritten
 * to prevent cross-tenant privilege escalation or parameter tampering.
 */
function requireTenant(req, res, next) {
  if (!req.user) {
    return fail(res, 'UNAUTHORIZED', 'Authentication required', 401);
  }

  if (req.user.role !== 'admin') {
    return fail(res, 'FORBIDDEN', 'Admin role required for tenant-scoped operations', 403);
  }

  const federationId = req.user.federation_id;
  if (!federationId) {
    return fail(res, 'FORBIDDEN', 'No federation assigned to this administrator', 403);
  }

  // Bind verified tenant ID to request object
  req.federationId = federationId;

  // Defensive sanitization: neutralize any client-supplied federation_id tampering
  if (req.body && typeof req.body === 'object') {
    req.body.federation_id = federationId;
  }
  if (req.query && typeof req.query === 'object') {
    req.query.federation_id = federationId;
  }

  next();
}

module.exports = { requireTenant };
