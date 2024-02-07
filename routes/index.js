const express = require("express");
const { registerEmail } = require("../handlers/email");
const router = express.Router();
var logger = require("../logs/logger");

router.post("/registerUser", async (req, res, next) => {
  logger.info("[registerUser]");
  const { email } = req.body;
  const dbRes = await registerEmail(email);

  res.json(dbRes).status(dbRes.status);
});

module.exports = router;
