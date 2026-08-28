// Standard response envelope, per API-Spec-V1.md
function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data, error: null });
}

function fail(res, code, message, status = 400) {
  return res.status(status).json({
    success: false,
    data: null,
    error: { code, message },
  });
}

module.exports = { ok, fail };
