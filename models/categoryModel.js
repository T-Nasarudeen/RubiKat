const mongoose = require("mongoose");
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  status: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("category", categorySchema);
