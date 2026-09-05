const { fail } = require('../utils/response');

/**
 * Tenant scoping middleware.
 * - For supervising_admin: Global access. If req.query.federation_id or req.body.federation_id is passed,
 *   sets req.federationId to that federation. Otherwise req.federationId is null (global).
 * - For federation_admin / admin: Bound strictly to req.user.federation_id from the verified JWT.
 *   Client-provided federation_id parameters that conflict with the admin's assigned federation are rejected with 403.
 */
function requireTenant(req, res, next) {
  if (!req.user) {
    return fail(res, 'UNAUTHORIZED', 'Authentication required', 401);
  }

  const role = req.user.role;
  if (!['admin', 'supervising_admin', 'federation_admin'].includes(role)) {
    return fail(res, 'FORBIDDEN', 'Admin role required for tenant-scoped operations', 403);
  }

  // Supervising Admin has global authority across federations
  if (role === 'supervising_admin') {
    const requestedFedId = req.query.federation_id || (req.body && req.body.federation_id) || null;
    req.federationId = requestedFedId;
    return next();
  }

  // Federation Admin: strictly enforce authenticated federation_id
  const federationId = req.user.federation_id;
  if (!federationId) {
    return fail(res, 'FORBIDDEN', 'No federation assigned to this administrator', 403);
  }

  // If client explicitly requested a different federation_id, reject with 403 FORBIDDEN
  const clientFedId = req.query.federation_id || (req.body && req.body.federation_id);
  if (clientFedId && clientFedId !== federationId) {
    return fail(res, 'FORBIDDEN', 'Cannot access or manipulate data of another federation', 403);
  }

  // Bind verified tenant ID to request object
  req.federationId = federationId;

  // Defensive sanitization: ensure body/query federation_id matches admin's federation
  if (req.body && typeof req.body === 'object') {
    req.body.federation_id = federationId;
  }
  if (req.query && typeof req.query === 'object') {
    req.query.federation_id = federationId;
  }

  next();
}

module.exports = { requireTenant };
