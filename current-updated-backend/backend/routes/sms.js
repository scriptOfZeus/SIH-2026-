/**
 * SMS Fallback & Offline Webhook Routes (V2 Feature #7)
 *
 * Provides:
 *  - POST /api/v1/sms/webhook — Inbound telco webhook handler (Twilio/MSG91/Gupshup compatible)
 *  - GET  /api/v1/sms/logs    — Tenant-scoped SMS audit logs for federation admins
 */

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { ok, fail } = require('../utils/response');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireTenant } = require('../middleware/tenant');
const smsService = require('../services/smsService');

// POST /sms/webhook — Inbound SMS Webhook
router.post('/webhook', async (req, res) => {
  // Extract provider fields: support both standard JSON body and x-www-form-urlencoded
  const from = req.body.From || req.body.from || req.body.sender || req.query.from;
  const body = req.body.Body || req.body.body || req.body.message || req.query.body;
  const messageSid = req.body.MessageSid || req.body.messageSid || req.body.id || req.query.messageSid;
  const token = req.headers['x-sms-webhook-token'] || req.query.token || req.body.token;

  try {
    const result = await smsService.processInboundWebhook({
      from,
      body,
      messageSid,
      token,
    });

    return ok(res, result);
  } catch (err) {
    return fail(res, err.code || 'SMS_ERROR', err.message, err.statusCode || 400);
  }
});

// GET /sms/logs — Tenant-scoped SMS audit log for Federation Admins
router.get('/logs', requireAuth, requireRole('admin'), requireTenant, async (req, res) => {
  const limit = Math.min(100, parseInt(req.query.limit || '50', 10));
  const logs = await db.all(`
    SELECT * FROM sms_logs
    WHERE federation_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `, [req.federationId, limit]);

  return ok(res, logs);
});

module.exports = router;
