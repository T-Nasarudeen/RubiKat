const user = require("../models/userModel");
const product = require("../models/productModel");
const order = require("../models/orderModel");
const cart = require("../models/cartModel");
const { ObjectId } = require("mongodb");

////////////////////////user-order/////////////////////
const orders = async (req, res, next) => {
  try {
    const { userID, cartCount } = req.session.userDetails;
    const pageSize = 10;
    let skipValue, limitValue, pageNumber;
    skipValue = (req.query.page - 1) * 10 || 0;
    pageNumber = parseInt(req.query.page) || 1;
    limitValue = 10;
    const userData = await user.findOne({ _id: userID });
    const orderData = await order
      .find({ userId: userID })
      .sort({ _id: -1 })
      .skip(skipValue)
      .limit(limitValue)
      .populate("items.product");
    const totalDocuments = await order.countDocuments({ userId: userID });
    const totalPage = Math.ceil(totalDocuments / pageSize);
    userData.cartCount = cartCount;
    res.render("userOrders", {
      userData,
      orderData,
      totalPage,
      pageNumber,
      searchInput: "",
    });
  } catch (err) {
    next(err);
  }
};

const orderDetails = async (req, res, next) => {
  try {
    const orderId = new ObjectId(req.query.order_id);
    const itemId = new ObjectId(req.query.item_id);
    const unitId = new ObjectId(req.query.unit_id);
    const userData = req.session.userDetails;
    const orderItem = await order
      .findOne(
        { _id: orderId, "items._id": unitId },
        {
          userId: 1,
          start_date: 1,
          "items.$": 1,
          address: 1,
          paymentType: 1,
          orderId: 1,
        }
      )
      .populate("items.product");
    res.render("orderDetails", { userData, orderItem, searchInput: "" });
  } catch (err) {
    next(err);
  }
};

const orderStatus = async (req, res, next) => {
  try {
    const orderId = new ObjectId(req.query.order_id);
    const itemId = new ObjectId(req.query.item_id);
    const unitId = new ObjectId(req.query.unit_id);
    const filter = {
      _id: orderId,
      "items._id": unitId,
    };
    await order.updateOne(filter, {
      $set: {
        "items.$.orderStatus": req.body.action,
        "items.$.status_date": Date.now(),
        "items.$.reason": req.body.reason,
      },
    });
    res.redirect(
      `/orderDetails?order_id=${req.query.order_id}&item_id=${req.query.item_id}&unit_id=${req.query.unit_id}`
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  orders,
  orderDetails,
  orderStatus,
};
