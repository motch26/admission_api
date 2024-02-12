module.exports.returnJSON = (returnCode, toAdd) => {
  if (returnCode) {
    return {
      status: 200,
      msg: "success",
      error: null,
      ...toAdd,
    };
  } else {
    return {
      status: 400,
      msg: "error",
      ...toAdd,
    };
  }
};
