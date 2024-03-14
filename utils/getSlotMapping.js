const dayjs = require("dayjs");

module.exports.getSlotMapping = (slotID) => {
  const map = [
    {
      key: "ALI",
      position: 2,
      campus: "Alijis",
    },
    {
      key: "BIN",
      position: 2,
      campus: "Binalbagan",
    },
    {
      key: "FT",
      position: 1,
      campus: "Fortune Towne",
    },
    {
      key: "TAL",
      position: 2,
      campus: "Talisay",
    },
  ];

  const result = map.find((item) => slotID.includes(item.key));
  if (result) {
    let start = 0;
    if ([13, 14].includes(slotID.length)) {
      start = 5;
    }
    const date = slotID.split(result.key)[1].slice(start, start + 4);
    const month = date.slice(0, 2);
    const day = date.slice(2);
    return {
      date: dayjs(`${month}-${day}-2024`).format("MMMM DD, YYYY"),
      campus: result.campus,
    };
  }
  return null;
};
