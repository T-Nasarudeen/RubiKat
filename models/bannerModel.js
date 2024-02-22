const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema({
  image: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  titleColor: {
    type: String,
    required: true,
  },
  status: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("banner", bannerSchema);
