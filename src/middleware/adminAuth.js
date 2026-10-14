function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD not set on server' });
  }

  // Accept password from header OR body
  const headerPass = req.headers['x-admin-password'];
  const bodyPass = req.body && req.body.adminPassword;
  const provided = headerPass || bodyPass;

  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'Unauthorized. Wrong admin password.' });
  }
  next();
}

module.exports = { requireAdmin };
