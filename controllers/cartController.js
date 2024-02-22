const user = require("../models/userModel");
const product = require("../models/productModel");
const cart = require("../models/cartModel");
const coupon = require("../models/couponModel");
const order = require("../models/orderModel");
const { ObjectId } = require("mongodb");
const { findOneAndUpdate } = require("../models/couponModel");
const Razorpay = require("razorpay");
var instance = new Razorpay({
  key_id: "rzp_test_3tJjWBWKaIhuvL",
  key_secret: "NKGvnTO6aIRBWt7iuGqh8JSs",
});

const addToCart = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const { userID } = req.session.userDetails;
    const [productData, userCart] = await Promise.all([
      product.findOne({ _id: productId }),
      cart.findOne({ userId: userID }),
    ]);
    if (userCart) {
      await cart.updateOne(
        { userId: userID },
        {
          $push: {
            items: {
              product: productId,
              price: productData.price,
              quantity: 1,
            },
          },
          $inc: { totalPrice: productData.price },
        }
      );
    } else {
      const userCart = new cart({
        userId: userID,
        items: [
          {
            product: productId,
            price: productData.price,
            quantity: 1,
          },
        ],
        totalPrice: productData.price * 1,
      });
      await userCart.save();
    }
    req.session.userDetails.cartCount++;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const goTocart = async (req, res, next) => {
  try {
    const userData = req.session.userDetails;
    const userID = new ObjectId(userData.userID);
    const cartData = await cart.aggregate([
      { $match: { userId: userID } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "itemdetails",
        },
      },
    ]);
    res.render("cart", { userData, cartData, searchInput: "" });
  } catch (err) {
    next(err);
  }
};

const removeItem = async (req, res, next) => {
  try {
    const userId = new ObjectId(req.session.userDetails.userID);
    const productId = new ObjectId(req.params.id);
    const [removingItem] = await cart.aggregate([
      { $match: { userId: userId } },
      { $unwind: "$items" },
      { $match: { "items.product": productId } },
      {
        $project: {
          _id: 0,
          quantity: "$items.quantity",
          price: "$items.price",
        },
      },
    ]);
    const { quantity, price } = removingItem;
    await cart.updateOne(
      { userId: userId },
      {
        $pull: { items: { product: productId } },
        $inc: { totalPrice: -(quantity * price) },
      }
    );
    req.session.userDetails.cartCount--;
    res.redirect("/cart");
  } catch (err) {
    next(err);
  }
};

const incrementQuantity = async (req, res, next) => {
  try {
    const userID = new ObjectId(req.session.userDetails.userID);
    const productId = new ObjectId(req.params.id);
    const productData = await product.findOne({ _id: productId });
    const cartData = await cart.findOne({ userId: userID });
    const { quantity } = cartData.items.find(
      (item) => item.product == req.params.id
    );
    if (quantity + 1 <= productData.quantity) {
      const cartData = await cart.findOneAndUpdate(
        { userId: userID, "items.product": productId },
        { $inc: { "items.$.quantity": 1, totalPrice: productData.price } },
        { new: true }
      );
      const { quantity } = cartData.items.find(
        (item) => item.product == req.params.id
      );
      res.json({
        message: true,
        subTotal: cartData.totalPrice,
        quantity,
        productTotal: quantity * productData.price,
      });
    } else {
      res.json({ message: false });
    }
  } catch (err) {
    next(err);
  }
};

const decreasQuantity = async (req, res, next) => {
  try {
    const userID = new ObjectId(req.session.userDetails.userID);
    const productId = new ObjectId(req.params.id);
    const productData = await product.findOne({ _id: productId });
    const cartData = await cart.findOneAndUpdate(
      { userId: userID, "items.product": productId },
      { $inc: { "items.$.quantity": -1, totalPrice: -productData.price } },
      { new: true }
    );
    const { quantity } = cartData.items.find(
      (item) => item.product == req.params.id
    );
    res.json({
      message: true,
      subTotal: cartData.totalPrice,
      quantity,
      totalStock: productData.quantity,
      deliveryTime: productData.deliveryTime,
      productTotal: quantity * productData.price,
    });
  } catch (err) {
    next(err);
  }
};

const checkout = async (req, res, next) => {
  try {
    const { userID, cartCount } = req.session.userDetails;
    const userId = new ObjectId(userID);
    const cartData = await cart.findOne({ userId: userId });
    if (!cartData || cartData.items == "") {
      res.redirect("/cart");
    } else {
      const userData = await user.findOne(
        { _id: userId },
        { name: 1, address: 1, wallet: 1 }
      );
      const coupons = await coupon.find({
        $and: [
          { endDate: { $gte: new Date() } },
          { minAmount: { $lte: cartData.totalPrice } },
          { status: 0 },
          { users: { $nin: [userId] } },
        ],
      });
      userData.cartCount = cartCount;
      res.render("checkOut", { userData, cartData, coupons, searchInput: "" });
    }
  } catch (err) {
    next(err);
  }
};

const placeOrder = async (req, res, next) => {
  try {
    const userId = new ObjectId(req.session.userDetails.userID);
    const cartData = await cart
      .findOne({ userId: userId })
      .populate("items.product");
    var Availabilty = true;
    cartData.items.forEach((data) => {
      if (data.quantity > data.product.quantity) {
        Availabilty = false;
      }
    });
    if (!Availabilty) {
      res.json({ message: "notAvailable" });
    } else {
      if (req.body.paymentMethod == "COD") {
        orderUpdate(req.body, req.session.userDetails.userID);
        req.session.userDetails.cartCount = 0;
        res.json({ message: "orderSuccess" });
      } else if (req.body.paymentMethod == "onlinePayment") {
        req.session.orderDetails = req.body;
        const userData = await user.findOne({ _id: userId });
        var balanceAmount = req.body.totalAmount;
        var onlinePayment = false;
        if (req.body.walletUse == 1 && userData.wallet.total > 0) {
          if (userData.wallet.total <= req.body.totalAmount) {
            balanceAmount = req.body.totalAmount - userData.wallet.total;
            onlinePayment = true;
          } else {
            orderUpdate(req.body, req.session.userDetails.userID);
            req.session.userDetails.cartCount = 0;
            res.json({ message: "orderSuccess" });
          }
        } else {
          onlinePayment = true;
        }
        if (onlinePayment) {
          var options = {
            amount: balanceAmount * 100,
            currency: "INR",
            receipt: cartData._id,
          };
          instance.orders.create(options, (err, order) => {
            if (err) {
              res.json({ message: "paymentFailed" });
            } else {
              res.json({ message: "onlinePayment", order });
            }
          });
        }
      }
    }
  } catch (err) {
    next(err);
  }
};

async function orderUpdate(orderDetails, userID) {
  const userId = new ObjectId(userID);
  const userData = await user.findOne({ _id: userId });
  const cartData = await cart
    .findOne({ userId: userId })
    .populate("items.product");
  const orderItems = [];
  for (const data of cartData.items) {
    await product.updateOne(
      { _id: data.product._id },
      { $inc: { quantity: -data.quantity } }
    );
    for (let i = 0; i < data.quantity; i++) {
      orderItems.push({
        product: data.product._id,
        price: data.price,
        deliveryTime: data.product.deliveryTime,
      });
    }
  }
  var walletUse = false;
  var walletAmount;
  var balanceAmount = orderDetails.totalAmount;
  var paymentMethod = orderDetails.paymentMethod;
  if (orderDetails.walletUse == 1 && userData.wallet.total > 0) {
    if (userData.wallet.total <= orderDetails.totalAmount) {
      balanceAmount = orderDetails.totalAmount - userData.wallet.total;
      walletAmount = -userData.wallet.total;
    } else {
      balanceAmount = 0;
      walletAmount = -orderDetails.totalAmount;
      paymentMethod = "wallet";
    }
    walletUse = true;
  }
  const userOrder = new order({
    userId: userId,
    items: orderItems,
    totalAmount: orderDetails.totalAmount,
    isWalletApplied: walletUse,
    balanceAmount: balanceAmount,
    couponSave: orderDetails.couponSave,
    address: userData.address[orderDetails.selectedAddress],
    paymentType: paymentMethod,
  });
  const orderData = await userOrder.save();
  await order.updateOne(
    { _id: orderData._id },
    { $set: { orderId: orderData._id.toString().slice(-10) } }
  );
  if (walletUse) {
    const history = {
      amount: Math.abs(walletAmount),
      date: Date.now(),
      transaction: "purchase",
      orderId: orderData._id,
    };
    await user.updateOne(
      { _id: userId },
      {
        $inc: { "wallet.total": walletAmount },
        $push: { "wallet.history": history },
      }
    );
  }
  await cart.deleteOne({ userId: userId });
  if (orderDetails.couponSave > 0) {
    await coupon.updateOne(
      { _id: orderDetails.couponId },
      { $push: { users: userId } }
    );
  }
}

const paymentConfirm = async (req, res, next) => {
  const crypto = require("crypto");
  const { payment, order } = req.body;
  let hmac = crypto.createHmac("sha256", "NKGvnTO6aIRBWt7iuGqh8JSs");
  hmac.update(payment.razorpay_order_id + "|" + payment.razorpay_payment_id);
  hmac = hmac.digest("hex");
  if (hmac == payment.razorpay_signature) {
    orderUpdate(req.session.orderDetails, req.session.userDetails.userID);
    req.session.userDetails.cartCount = 0;
    res.json({ message: "orderSuccess" });
  } else {
    res.json({ message: "paymentFailed" });
  }
};

module.exports = {
  addToCart,
  goTocart,
  removeItem,
  incrementQuantity,
  decreasQuantity,
  checkout,
  placeOrder,
  paymentConfirm,
};
