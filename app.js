require("dotenv").config({});
var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var cors = require("cors");

var app = express();

const indexRouter = require("./routes/");
const { corsOption } = require("./config/cors");

// view engine setup
app.use(cors(corsOption));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use("/", indexRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development

  // render the error page
  res.status(err.status || 500);
  res.json(err);
});
// Comment if DEV mode
app.set("port", process.env.PORT || 3001);

var server = app.listen(app.get("port"), () => {
  console.log("Admission system started!");
});

module.exports = app;
