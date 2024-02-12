const { FRONT_URL } = process.env;
module.exports.corsOption = {
  origin: FRONT_URL,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "*",
};
