const pool = require("../config");
const { v4: uuidV4 } = require("uuid");
const nodemailer = require("nodemailer");
const createEmailTemplate = require("./createEmailTemplate");
const lggger = require("../logs/logger");
const registerEmail = async (email) => {
  const conn = await pool.getConnection();
  try {
    let sql = "";
    sql = "SELECT * FROM emails WHERE email = ?";
    const [rows] = await conn.query(sql, [email]);
    if (rows.length) {
      return { status: 400, msg: "duplicate", insertId: null };
    }

    sql = "INSERT INTO emails (email, uuid) VALUES(?,?)";
    const uuid = uuidV4();
    const [result] = await conn.execute(sql, [email, uuid]);
    if (result.insertId) {
      const html = createEmailTemplate({ uuid });
      const envelope = await sendMail({
        to: email,
        subject: "Admission",
        html,
      });

      console.log("[env]", envelope);
      return { status: 200, msg: "success", insertId: result.insertId };
    }
    return { status: 400, msg: "no insertId", insertId: null };
  } catch (error) {
    return { status: 400, msg: `[registerEmail]: ${error}`, insertId: null };
  } finally {
    conn.release();
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

    const envelope = await transporter.sendMail(mailOptions);
    logger.info("[env]", envelope);
  } catch (error) {
    console.log(`${error}`);
  }
};

module.exports = {
  registerEmail,
  sendMail,
};
