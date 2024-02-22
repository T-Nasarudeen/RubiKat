const isLogin = (req, res, next) => {
  try {
    if (req.session.adminUser) {
      next();
    } else {
      res.redirect("/");
    }
  } catch (err) {
    console.log(err.message);
  }
};

const isLogout = async (req, res, next) => {
  try {
    if (req.session.adminUser) {
      res.redirect("/admin");
    } else {
      next();
    }
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  isLogin,
  isLogout,
};
