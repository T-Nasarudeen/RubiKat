require("dotenv").config();
const express = require("express");
const path = require("path");
const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter");
const errorHandler = require("./middleware/errorHandler");
const connectDB = require("./config/dbConnection");
connectDB();
const fileUpload = require("express-fileupload");
const session = require("express-session");
const nocache = require("nocache");
const bodyParser = require("body-parser");
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 24 * 10,
    },
  })
);
app.use(nocache());

// view engine setup
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

//Admin,User router
app.use("/", userRouter);
app.use("/admin", adminRouter);
app.use(errorHandler);

app.get("*", (req, res) => {
  res.status(404), res.render("404", { err: "404" });
});

app.listen(3000, () => {
  console.log("server running");
});
