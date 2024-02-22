const mongoose = require("mongoose");
const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  orderId: {
    type: String,
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "product",
      },
      price: {
        type: Number,
        require: true,
      },
      deliveryTime: {
        type: Number,
        required: true,
      },
      status_date: {
        type: Date,
        default: Date.now(),
      },
      orderStatus: {
        type: String,
        default: "placed",
      },
      reason: {
        type: String,
      },
    },
  ],
  start_date: {
    type: Date,
    default: Date.now(),
  },
  totalAmount: {
    type: Number,
  },
  isWalletApplied: {
    type: Boolean,
  },
  balanceAmount: {
    type: Number,
  },
  couponSave: {
    type: Number,
    default: 0,
  },
  address: {
    type: Array,
  },
  paymentType: {
    type: String,
  },
});

module.exports = mongoose.model("order", orderSchema);
