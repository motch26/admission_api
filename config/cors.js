const { FRONT_URL } = process.env;
console.log(FRONT_URL);
module.exports.corsOption = {
  origin: FRONT_URL,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "*",
};
