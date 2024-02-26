//const { default: mongoose } = require('mongoose')
const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  mobile: {
    type: Number,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  referralCode: {
    type: String,
    required: true,
  },
  is_admin: {
    type: Number,
    default: 0,
  },
  is_blocked: {
    type: Number,
    default: 0,
  },
  address: {
    type: Array,
  },
  wallet: {
    total: {
      type: Number,
      default: 0,
    },
    history: [
      {
        amount: {
          type: Number,
        },
        date: {
          type: Date,
        },
        transaction: {
          type: String,
        },
        orderId: {
          type: String,
        },
      },
    ],
  },
  wishlist: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
    },
  ],
});

module.exports = mongoose.model("user", userSchema);
