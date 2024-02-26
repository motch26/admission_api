require("dotenv").config();
const axios = require("axios");
const pool = require("./config");

const getEmailsWithNoEntries = async () => {
  let conn;

  try {
    const conn = await pool.getConnection();
    let sql =
      "SELECT * FROM emails WHERE email NOT IN (SELECT email FROM entries)";
    const [rows] = await conn.execute(sql);

    return rows;
  } catch (error) {
    console.error(error);
  } finally {
    if (conn) conn.release();
  }
};
const triggerEmail = async (email, uuid) => {
  await axios.post(`https://admission.chmsu.edu.ph/api/sendEmail.php`, {
    email,
    uuid,
    frontURL: "https://admission2024.chmsu.edu.ph",
  });
};
(async () => {
  const emails = await getEmailsWithNoEntries();
  emails.push({ email: "motch26@gmail.com", uuid: "new" });
  const extractedEmails = emails.slice(0, 5000);
  for (const email of extractedEmails) {
    await triggerEmail(email.email, email.uuid);
    console.log("email sent to", email);
  }
  console.log("Done");
})();
