
const { clearHash } = require('../services/cache')

// so frigging cool!
// clears cache AFTER request is handled instead of BEFORE
module.exports = async (req, res, next) => {
  await next();
  clearHash(req.user.id)
};
