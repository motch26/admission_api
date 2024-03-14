const fs = require("fs").promises;
const pool = require("../config");
const nodemailer = require("nodemailer");
const logger = require("../logs/logger");
const { returnJSON } = require("../utils/normalizeReturn");
const sharp = require("sharp");
const dayjs = require("dayjs");
const { v4: uuidV4 } = require("uuid");
const { registerEmail } = require("./email");

const compressFiles = async (files) => {
  try {
    const picture = files.picture[0];
    const compressedPicture = await sharp(picture.path)
      .png({ quality: 50 })
      .toBuffer();

    await fs.writeFile(
      `public/uploads/picture/${picture.filename}`,
      compressedPicture
    );
    await fs.unlink(`tmp/picture/${picture.filename}`);
  } catch (error) {
    logger.error("[compressFiles]", error);
  }
};
const saveData = async (formData, slot) => {
  const { slotID } = slot;
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
      isReserved,
    } = formData;
    let sql = "";
    sql = `INSERT INTO 
                  entries(LRN, givenName,middleName, lastName, sexAtBirth, birthDate,
                  phoneNumber, email, campus, program, examCenter, slotID, isReserved)
                  VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      isReserved || 1,
    ];
    await conn.execute(sql, values);
  } catch (error) {
    logger.error("[saveData]", error);
  } finally {
    conn.release();
  }
};
const selectSlot = async (formData) => {
  const { examCenter, isReserved, selectedSlot, strategy, program } = formData;
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
  let code = map.find((center) => center.name === examCenter).code;
  let conn;
  try {
    /**
     * TODO:
     *      1. For walk-ins, allow them to select a slot even if it's full
     *      2. Disable cancelling of entries same day as the exam and the days before
     *      3.
     *
     */
    conn = await pool.getConnection();
    /**  slot segregation strategy
        1.  Search for latest slot with vacancy
         `LIKE '${code}%' AND slotsLeft != 0`
        2.  Search  by specific program slot

    */
    let sql = "";
    let rows = [];
    if (strategy && strategy === "programSlot") {
      sql = `SELECT slotID FROM slots WHERE full = LOWER(?) AND slotID LIKE '${code}%'`;
      [rows] = await conn.query(sql, [program.toLowerCase()]);
      if (rows.length) {
        code = rows[0].slotID;
      }
    }
    const condition =
      isReserved === 2
        ? `= '${selectedSlot}'`
        : `LIKE '${code}%' AND slotsLeft != 0 `; // supply strategy here
    sql = `SELECT * FROM slots WHERE slotID ${condition} ORDER BY slotID ASC LIMIT 1 `;
    [rows] = await conn.query(sql);
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
    await saveData(formData, slot);
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

module.exports.getEntries = async (campus) => {
  let conn;
  try {
    conn = await pool.getConnection();
    let sql = `SELECT entries.*, slots.timeSlot, emails.uuid FROM entries 
                                                INNER JOIN slots USING(slotID) 
                                                INNER JOIN emails USING(email)
              WHERE examCenter = ? ORDER BY slotID ASC, lastName ASC, givenName ASC`;
    let [rows] = await conn.query(sql, [campus]);
    return returnJSON(1, {
      entries: rows,
    });
  } catch (error) {
    logger.error("[getEntries]", error);
    return returnJSON(0, {
      error: `[getEntries]: ${error.message}`,
    });
  } finally {
    if (conn) conn.release();
  }
};
module.exports.editEntry = async (body) => {
  const { email } = body;
  let conn;
  try {
    conn = await pool.getConnection();

    let sql = `UPDATE entries SET isReserved = 0 WHERE email = ?`;
    await conn.query(sql, [email]);

    return returnJSON(1, {
      msg: "updated",
    });
  } catch (error) {
    logger.error("[editEntry]", error);
    return returnJSON(0, {
      error: `[editEntry]: ${error.message}`,
    });
  } finally {
    if (conn) conn.release();
  }
};
module.exports.addWalkInEntry = async (formData) => {
  let conn;
  try {
    conn = await pool.getConnection();
    formData.isReserved = 2;
    formData.email = uuidV4();
    const slot = await selectSlot(formData);
    if (slot.msg === "noSlot") {
      return slot;
    }
    await saveData(formData, slot);
    await registerEmail(formData.email, 2, true);
    return returnJSON(1, {
      slot,
    });
  } catch (error) {
    logger.error("[addWalkInEntry]", error);
    return returnJSON(0, {
      error: `[addWalkInEntry]: ${error.message}`,
    });
  } finally {
    if (conn) conn.release();
  }
};

module.exports.getProgramSlots = async () => {
  let conn;
  try {
    conn = await pool.getConnection();
    const sql = "SELECT * FROM slots WHERE slotsLeft > 0";
    const [rows] = await conn.query(sql);
    if (rows.length) {
      return returnJSON(1, {
        slots: rows,
      });
    } else {
      return returnJSON(1, {
        msg: "noSlots",
      });
    }
  } catch (error) {
    logger.error("[getProgramSlots]", error);
    return returnJSON(0, {
      error: `[getProgramSlots]: ${error}`,
    });
  } finally {
    if (conn) conn.release();
  }
};

module.exports.getTotalEmails = async () => {
  let conn;
  try {
    conn = await pool.getConnection();
    const sql = `SELECT COUNT(*) AS rowCount 
                  FROM emails
                  WHERE timestamp >= CONCAT(CURRENT_DATE(), ' 08:00:00') 
                  AND timestamp <= CONCAT(CURRENT_DATE(), ' 17:30:00');`;
    const [rows] = await conn.query(sql);
    if (rows.length) {
      const [timeRow] = await conn.query("SELECT NOW() as currentTime");
      return returnJSON(1, {
        count: rows[0].rowCount,
        time: timeRow[0].currentTime,
      });
    }
  } catch (error) {
    logger.error("[getTotalEmails]", error);
    return returnJSON(0, {
      error: `[getProggetTotalEmailsramSlots]: ${error}`,
    });
  } finally {
    if (conn) conn.release();
  }
};
