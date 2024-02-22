const mongoose = require("mongoose");
require('dotenv').config()
const connectDB = async () => {
  try {
    mongoose.set("strictQuery", false);
    const conn = await mongoose.connect(process.env.MONGOOSE_CONNECTION);
    console.log("database connected");
  } catch (error) {
    console.log(error);
  }
};
module.exports = connectDB;
