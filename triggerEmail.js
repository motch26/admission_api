require("dotenv").config();
const entries = require("./email.json");
const axios = require("axios");
const pool = require("./config");

const getEmailsWithNoEntries = async () => {
  let conn;

  try {
    const conn = await pool.getConnection();
    let sql = `SELECT * FROM emails WHERE 
(email LIKE '%gmail.com' OR
email LIKE '%cpac.edu.ph' OR
email LIKE '%dbti-victorias.edu.ph' OR
email LIKE '%icloud.com' OR
email LIKE '%usls.edu.ph' OR
email LIKE '%yahoo.com' OR
email LIKE '%depedqc.ph' OR
email LIKE '%outlook.com' OR	
email LIKE '%deped.gov.ph' OR
email LIKE '%btths.edu.ph' OR
email LIKE '%cpu.edu.ph' OR
email LIKE '%csav.edu.ph' OR
email LIKE '%scssbacolod.edu.ph' OR
email LIKE '%hotmail.com' OR
email LIKE '%csab.edu.ph' OR
email LIKE '%depedmakati.ph' OR
email LIKE '%adventistacademy-bacolod.com' OR
email LIKE '%gov.com.ph' OR
email LIKE '%rocketmail.com' OR
email LIKE '%riversidestudent.edu.ph' OR
email LIKE '%megaworldcorp.com' OR
email LIKE '%pcaat.edu.ph' OR
email LIKE '%yeyinitiative.org' OR
email LIKE '%wnu.sti.edu.ph' OR
email LIKE '%mendez-dental.com' OR
email LIKE '%yandex.com' OR
email LIKE '%lccbonline.edu.ph' OR
 email LIKE '%ubiquity.com' OR
 email LIKE '%ncr2.deped.gov.ph' OR
 email LIKE '%lccb.edu.ph' OR
 email LIKE '%lccb.online.edu.ph' OR
 email LIKE '%mabinicolleges.edu.ph' OR
 email LIKE '%depedparanaquecity.com' OR
 email LIKE '%cvsu.edu.ph' OR
 email LIKE '%nwtf.org.ph' OR
 email LIKE '%outlook.ph' OR
 email LIKE '%student.uno-r.edu.ph' OR
 email LIKE '%fbc.com.ph' OR
 email LIKE '%csab.edu.com' 
) 
AND
email NOT IN (SELECT email FROM entries);`;
    const [rows] = await conn.execute(sql);

    return rows;
  } catch (error) {
    console.error(error);
  } finally {
    if (conn) conn.release();
  }
};
const triggerEmail = async (email, uuid) => {
  await axios.post(
    `https://admission.chmsu.edu.ph/api/sendEmailToChangeSchedule.php`,
    {
      email,
      uuid,
    }
  );
};
const sendEmailWithUpdates = async () => {
  for (const entry of entries) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await triggerEmail(entry.email, entry.uuid);
    console.log("email sent to", entry);
  }
};
sendEmailWithUpdates();
// (async () => {
//   const emails = await getEmailsWithNoEntries();
//   emails.push({ email: "motch26@gmail.com", uuid: "new" });
//   const extractedEmails = emails.slice(0, 5000);
//   for (const email of extractedEmails) {
//     await triggerEmail(email.email, email.uuid);
//     console.log("email sent to", email);
//   }
//   console.log("Done");
// })();
