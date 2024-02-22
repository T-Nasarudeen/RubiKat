const mongoose = require("mongoose");
const couponSchema = new mongoose.Schema({
  couponCode: {
    type: String,
    required: true,
  },
  percentage: {
    type: Number,
    required: true,
  },
  maxDiscount: {
    type: Number,
    required: true,
  },
  minAmount: {
    type: Number,
    required: true,
  },
  status: {
    type: Number,
    default: 0,
  },
  endDate: {
    type: Date,
    required: true,
  },
  users: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  ],
});

module.exports = mongoose.model("coupon", couponSchema);
