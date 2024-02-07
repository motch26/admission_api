const mysql = require("mysql2/promise");
const { DB_HOST, DB_NAME, DB_USER, DB_PASS } = process.env;
module.exports = mysql.createPool({
  host: DB_HOST,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASS,
  timezone: "local",
});
