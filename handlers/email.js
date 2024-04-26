const pool = require("../config");
const fs = require("fs").promises;
const { v4: uuidV4 } = require("uuid");
const nodemailer = require("nodemailer");
const logger = require("../logs/logger");
const { returnJSON } = require("../utils/normalizeReturn");
const path = require("path");
const { default: axios } = require("axios");
const dayjs = require("dayjs");
const registerEmail = async (email, v, uuidEmail = false) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    if (v !== 2) {
      return returnJSON(1, {
        msg: "refresh",
      });
    }
    const isClose = dayjs().hour() < 8 || dayjs().hour() > 17;
    if (isClose) {
      await conn.rollback();
      return returnJSON(1, {
        msg: "full",
      });
    }
    let sql = "";
    sql = `SELECT COUNT(*) as count
          FROM emails
          WHERE timestamp >= CONCAT(CURRENT_DATE(), ' 08:00:00') 
            AND timestamp <= CONCAT(CURRENT_DATE(), ' 17:00:00');`;
    const [countRow] = await conn.query(sql);
    if (countRow[0].count >= 0) {
      await conn.rollback();
      return returnJSON(1, {
        msg: "full",
      });
    }
    sql = "SELECT * FROM emails WHERE email = ?";
    const [rows] = await conn.query(sql, [email]);

    if (rows.length) {
      await conn.rollback();
      return returnJSON(1, {
        msg: "duplicate",
        uuid: rows[0].uuid,
      });
    }

    sql = "INSERT INTO emails (email, uuid) VALUES(?,?)";
    const uuid = uuidV4();
    const [result] = await conn.execute(sql, [email, uuidEmail ? email : uuid]);
    if (result.insertId) {
      // const { FRONT_URL } = process.env;
      // await axios.post(`https://admission.chmsu.edu.ph/api/sendEmail.php`, {
      //   email,
      //   uuid,
      //   frontURL: FRONT_URL,
      // });
      await conn.commit();
    }
    return returnJSON(1, {});
  } catch (error) {
    await conn.rollback();
    logger.error({ ...error, from: "[registerEmail]" });
    return returnJSON(0, {
      error: `[registerEmail]: ${error}`,
    });
  } finally {
    if (conn) conn.release();
  }
};

const sendMail = async (mailContent) => {
  const { to, subject, text, html } = mailContent;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: true,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
    const mailOptions = {
      from: "no-reply@chmsu.edu.ph",
      to,
      subject,
      text,
      html,
    };
    transporter.verify((err, success) => {
      if (err) logger.error({ err, from: "[sendMail]" });
      logger.info("[sendMail success]");
    });
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log(`${error}`);
  }
};

const getEmailByCode = async (code) => {
  const conn = await pool.getConnection();
  try {
    let sql = "";
    sql = "SELECT * FROM emails WHERE uuid = ?";
    const [rows] = await conn.query(sql, [code]);
    if (!Boolean(rows.length)) {
      return returnJSON(1, {
        msg: "noemail",
      });
    }
    const row = rows[0];
    return returnJSON(1, {
      email: row.email,
    });
  } catch (error) {
    logger.error("[getEmailByCode]", error);
    return returnJSON(0, {
      error,
    });
  } finally {
    conn.release();
  }
};

const getEmailWithNoEntries = async () => {
  const conn = await pool.getConnection();
  try {
    let sql = "";
    sql = "SELECT * FROM emails WHERE email NOT IN (SELECT email FROM entries)";
    const [rows] = await conn.query(sql);

    for (const row of rows) {
      const { FRONT_URL } = process.env;
      await axios.post(`https://admission.chmsu.edu.ph/api/sendEmail.php`, {
        email: row.email,
        uuid: row.uuid,
        frontURL: FRONT_URL,
      });
    }
  } catch (error) {
    logger.error("[getEmailWithNoEntries]", error);
    return returnJSON(0, {
      error,
    });
  } finally {
    conn.release();
  }
};

module.exports = {
  registerEmail,
  getEmailByCode,
  getEmailWithNoEntries,
};
