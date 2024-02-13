const fs = require("fs").promises;
const pool = require("../config");
const nodemailer = require("nodemailer");
const logger = require("../logs/logger");
const { returnJSON } = require("../utils/normalizeReturn");
const sharp = require("sharp");
const dayjs = require("dayjs");
const compressFiles = async (files) => {
  try {
    const picture = files.picture[0];
    const ID = files.ID[0];
    const compressedPicture = await sharp(picture.path)
      .png({ quality: 50 })
      .toBuffer();
    const compressedID = await sharp(ID.path).png({ quality: 50 }).toBuffer();

    await fs.writeFile(
      `public/uploads/picture/${picture.filename}`,
      compressedPicture
    );
    await fs.unlink(`tmp/picture/${picture.filename}`);
    await fs.writeFile(`public/uploads/ID/${ID.filename}`, compressedID);
    await fs.unlink(`tmp/ID/${ID.filename}`);
  } catch (error) {
    logger.error("[compressFiles]", error);
  }
};
const saveData = async (formData, slotID) => {
  const conn = await pool.getConnection();
  try {
    const {
      email,
      lrn,
      givenName,
      middleName,
      lastName,
      sexAtBirth,
      birthDate,
      phoneNumber,
      campus,
      program,
      examCenter,
    } = formData;
    let sql = "";
    sql = `INSERT INTO 
                  entries(LRN, givenName,middleName, lastName, sexAtBirth, birthDate,
                  phoneNumber, email, campus, program, examCenter, slotID)
                  VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
    let values = [];
    values = [
      lrn,
      givenName,
      middleName,
      lastName,
      sexAtBirth,
      dayjs(birthDate).format("YYYY-MM-DD"),
      phoneNumber,
      email,
      campus,
      program,
      examCenter,
      slotID,
    ];
    await conn.execute(sql, values);
  } catch (error) {
    logger.error("[saveData]", error);
  } finally {
    conn.release();
  }
};
const selectSlot = async (formData) => {
  const { examCenter } = formData;
  const map = [
    {
      name: "Talisay",
      code: "TAL",
    },
    {
      name: "Binalbagan",
      code: "BIN",
    },
    {
      name: "Alijis",
      code: "ALI",
    },
    {
      name: "Fortune Towne",
      code: "FT",
    },
  ];
  const code = map.find((center) => center.name === examCenter).code;
  let conn;
  try {
    conn = await pool.getConnection();
    let sql = `SELECT * FROM slots WHERE slotID LIKE '${code}%' AND slotsLeft != 0 ORDER BY slotID ASC LIMIT 1 `;
    let [rows] = await conn.query(sql);
    if (rows.length) {
      const { slotID, timeSlot, venueID } = rows[0];
      const slot = {
        slotID,
        timeSlot,
      };

      sql = `SELECT venue, campus FROM venues WHERE venueID = ?`;
      [rows] = await conn.query(sql, [venueID]);

      const { venue, campus } = rows[0];
      slot.venue = venue;
      slot.campus = campus;

      sql = "UPDATE slots SET slotsLeft = slotsLeft - 1 WHERE slotID = ?";
      await conn.execute(sql, [slotID]);
      return slot;
    } else {
      return returnJSON(1, {
        msg: "noSlot",
      });
    }
  } catch (error) {
    logger.error("[selectSlot]", error);
    return returnJSON(0, {
      error: `[selectSlot]: ${error}`,
    });
  } finally {
    if (conn) conn.release();
  }
};
const checkDuplicate = async (formData) => {
  const { lastName, givenName } = formData;
  const conn = await pool.getConnection();
  try {
    let sql = `SELECT * FROM entries WHERE LOWER(givenName) = LOWER(?) AND LOWER(lastName) = LOWER(?)`;
    const [rows] = await conn.query(sql, [givenName, lastName]);
    if (rows.length) {
      return returnJSON(1, {
        msg: "duplicate",
      });
    } else {
      return returnJSON(1, {
        msg: "noDuplicate",
      });
    }
  } catch (error) {
    logger.error("[checkDuplicate]", error);
    return returnJSON(0, {
      error: `[checkDuplicate]: ${error}`,
    });
  } finally {
    conn.release();
  }
};
module.exports.submitEntry = async (formData, files) => {
  try {
    const duplicate = await checkDuplicate(formData);
    if (duplicate.msg === "duplicate") {
      return duplicate;
    }
    const slot = await selectSlot(formData);
    if (slot.msg === "noSlot") {
      return slot;
    }

    await compressFiles(files);
    await saveData(formData, slot.slotID);
    return returnJSON(1, {
      slot,
    });
  } catch (error) {
    logger.error("[submitEntry]", error);
    return returnJSON(0, {
      error: `[submitEntry]: ${error}`,
    });
  }
};

module.exports.getEntryInfo = async (code) => {
  let conn;
  try {
    conn = await pool.getConnection();
    let sql = `SELECT email FROM emails WHERE uuid = ?`;
    let [rows] = await conn.query(sql, [code]);

    if (!Boolean(rows.length)) {
      return returnJSON(1, {
        msg: "noEmail",
      });
    }
    const { email } = rows[0];
    sql = `SELECT * FROM entries WHERE email = ?`;
    [rows] = await conn.query(sql, [email]);
    if (rows.length) {
      const { givenName, middleName, lastName, LRN, slotID, examCenter } =
        rows[0];
      const entry = {
        givenName,
        middleName,
        lastName,
        lrn: LRN,
        slot: {
          slotID,
          campus: examCenter,
        },
      };

      sql = `SELECT venueID, timeSlot FROM slots WHERE slotID = ?`;
      [rows] = await conn.query(sql, [slotID]);

      const { venueID, timeSlot } = rows[0];

      sql = `SELECT venue FROM venues WHERE venueID = ?`;
      [rows] = await conn.query(sql, [venueID]);

      const { venue } = rows[0];

      entry.slot.timeSlot = timeSlot;
      entry.slot.venue = venue;

      return returnJSON(1, {
        msg: "withEntry",
        entry,
        email,
      });
    } else {
      // no entries
      return returnJSON(1, {
        msg: "noEntry",
        email,
      });
    }
  } catch (error) {
    if (error)
      logger.error("[getEntryInfo]", JSON.stringify(error, undefined, 4));
    return returnJSON(0, {
      error: `[getEntryInfo]: ${error.message}`,
    });
  } finally {
    if (conn) conn.release();
  }
};
