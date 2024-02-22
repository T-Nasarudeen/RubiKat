const mongoose = require("mongoose");
require('dotenv').config()
const connectDB = async () => {
  try {
    mongoose.set("strictQuery", false);
    const conn = await mongoose.connect("mongodb+srv://tnasarudeen:uOPDHAJLx5ltP5Eb@cluster0.itopemf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
    console.log("database connected");
  } catch (error) {
    console.log(error);
  }
};
module.exports = connectDB;
