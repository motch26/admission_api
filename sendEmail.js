require("dotenv").config();
const entries = require("./email.json");
const axios = require("axios");
const pool = require("./config");

const getEmailsWithNoEntries = async () => {
  let conn;

  try {
    const conn = await pool.getConnection();

    let sql = `SELECT email, uuid
                FROM emails
                WHERE timestamp >= CONCAT(CURRENT_DATE(), ' 08:00:00') 
                AND timestamp <= CONCAT(CURRENT_DATE(), ' 17:00:00')
                AND isSent = 0
                AND DATE(timestamp) = CURDATE();`;
    const [rows] = await conn.query(sql);

    return rows;
  } catch (error) {
    console.error("[getEmailsWithNoEntries]");
    console.error(error);
  } finally {
    if (conn) conn.release();
  }
};
const triggerEmail = async (entry) => {
  const { email, uuid } = entry;
  let conn;
  try {
    conn = await pool.getConnection();
    const res = await axios.post(
      `https://admission.chmsu.edu.ph/api/sendEmail.php`,
      {
        email,
        uuid,
        frontURL: "https://admission2024.chmsu.edu.ph",
      }
    );
    const sql = `UPDATE emails SET isSent = 1 WHERE email = '${email}'`;
    await conn.execute(sql);
    return res.data;
  } catch (error) {
    console.error("[triggerEmail]", error);
  }
};
const sendEmailWithUpdates = async () => {
  for (const entry of entries) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const res = await triggerEmail(entry);
    console.log(res);
    console.log("email sent to", entry);
  }
};
// sendEmailWithUpdates();
(async () => {
  const emails = await getEmailsWithNoEntries();
  console.log("Count:", emails.length);
  //   emails.unshift({ email: "motch26@gmail.com", uuid: "new" });
  //   const extractedEmails = emails.slice(0, 5000);
  for (const email of emails) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const res = await triggerEmail(email);
    // console.log(res);
    console.log("email sent to", email.email);
  }
  console.log("Done");
  return;
})();
