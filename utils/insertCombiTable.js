require("dotenv").config();
const pool = require("../config");
const { campuses } = require("../programs2024.json");

const insertCombiTable = async () => {
  const combis = [];
  for (const campusObj of campuses) {
    const { campus, colleges } = campusObj;
    for (const collegeObj of colleges) {
      const { courses, college, full: collegeFull } = collegeObj;
      for (const courseObj of courses) {
        const { full } = courseObj;
        combis.push({
          campus,
          course: `${college} - ${collegeFull}`,
          full,
        });
      }
    }
  }
  let conn;
  try {
    conn = await pool.getConnection();
    for (const combi of combis) {
      const { campus, full, course } = combi;
      const sql = `INSERT INTO programcounts(campus, course, program) VALUES(?, ?, ?)`;
      await conn.execute(sql, [campus, course, full]);
      console.log(`Inserted: ${campus} - ${full}`);
    }
  } catch (error) {
    console.error(error);
  } finally {
    if (conn) conn.release();
  }
};

insertCombiTable();
