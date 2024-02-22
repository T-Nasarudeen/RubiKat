const mongoose = require("mongoose");
//const Product = require('../models/productModel');
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  status: {
    type: Number,
    default: 0,
  },
  deliveryTime: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("product", productSchema);
