const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  if (err.name === "ValidationError") {
    res.status(400).render("404", { err: "400" });
  } else {
    res.status(500).render("404", { err: "500" });
  }
};

module.exports = errorHandler;
