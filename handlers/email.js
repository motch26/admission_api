const pool = require("../config");
const fs = require("fs").promises;
const { v4: uuidV4 } = require("uuid");
const nodemailer = require("nodemailer");
const logger = require("../logs/logger");
const { returnJSON } = require("../utils/normalizeReturn");
const path = require("path");
const { default: axios } = require("axios");
const registerEmail = async (email) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    let sql = "";
    sql = "SELECT * FROM emails WHERE email = ?";
    const [rows] = await conn.query(sql, [email]);
    if (rows.length) {
      await conn.rollback();
      return returnJSON(1, {
        msg: "duplicate",
      });
    }

    sql = "INSERT INTO emails (email, uuid) VALUES(?,?)";
    const uuid = uuidV4();
    const [result] = await conn.execute(sql, [email, uuid]);
    if (result.insertId) {
      // const { FRONT_URL } = process.env;
      // const template = await fs.readFile(
      //   path.join(__dirname, "../templates/emailTemplate.html"),
      //   "utf8"
      // );
      // let html = template.replace(/UUID/g, uuid);
      // html = html.replace(/APIURL/g, FRONT_URL);
      await conn.commit();
      // // await axios.post(`https://admission.chmsu.edu.ph/api/sendEmail.php`, {
      // //   email,
      // //   uuid,
      // // });
      // await sendMail({
      //   to: email,
      //   subject: "CHMSU Admission AY 2024-2025",
      //   html,
      // });

      return returnJSON(1, {
        insertId: result.insertId,
        uuid,
      });
    }
  } catch (error) {
    await conn.rollback();
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
      if (err) logger.error("[sendMail]", err);
      logger.info("[sendMail success]", success);
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

module.exports = {
  registerEmail,
  getEmailByCode,
};
