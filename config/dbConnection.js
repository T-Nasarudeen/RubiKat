const mongoose = require("mongoose");
const dbUrl = "mongodb://127.0.0.1:27017/ecomDB";

const connectDB = async () => {
  try {
    mongoose.set("strictQuery", false);
    const conn = await mongoose.connect(dbUrl);
    console.log("database connected");
  } catch (error) {
    console.log(error);
  }
};
module.exports = connectDB;
