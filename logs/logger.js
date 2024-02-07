const log4js = require("log4js");
log4js.configure({
  appenders: {
    console: { type: "console" },
    file: { type: "file", filename: "admission.log" },
  },
  categories: {
    default: { appenders: ["console", "file"], level: "info" },
  },
});

module.exports = log4js.getLogger();
