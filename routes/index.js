const express = require("express");
const { registerEmail, getEmailByCode } = require("../handlers/email");
const router = express.Router();
const upload = require("../utils/multer");
var logger = require("../logs/logger");
const {
  submitEntry,
  getEntryInfo,
  getEntries,
  editEntry,
  addWalkInEntry,
  getProgramSlots,
} = require("../handlers/entry");

router.post("/registerUser", async (req, res, next) => {
  const { email } = req.body;
  const resp = await registerEmail(email);
  if (resp.status === 200) res.json(resp).status(resp.status);
  else next(resp.error);
});
router.post(
  "/submitEntry",
  upload.fields([{ name: "picture" }, { name: "ID" }]),
  async (req, res, next) => {
    const resp = await submitEntry(req.body, req.files);
    if (resp.status === 200) res.json(resp).status(resp.status);
    else next(resp.error);
  }
);
router.get("/getEntryInfo", async (req, res, next) => {
  const { code } = req.query;
  const resp = await getEntryInfo(code);
  if (resp.status === 200) res.json(resp).status(resp.status);
  else next(resp.error);
});

router.get("/getEntries", async (req, res, next) => {
  const { campus } = req.query;
  const resp = await getEntries(campus);
  if (resp.status === 200) res.json(resp).status(resp.status);
  else next(resp.error);
});
router.post("/editEntry", async (req, res, next) => {
  const resp = await editEntry(req.body);
  if (resp.status === 200) res.json(resp).status(resp.status);
  else next(resp.error);
});
router.post("/addWalkInEntry", async (req, res, next) => {
  const resp = await addWalkInEntry(req.body);
  if (resp.status === 200) res.json(resp).status(resp.status);
  else next(resp.error);
});
router.get("/getProgramSlots", async (req, res, next) => {
  const resp = await getProgramSlots();
  if (resp.status === 200) res.json(resp).status(resp.status);
  else next(resp.error);
});
module.exports = router;
