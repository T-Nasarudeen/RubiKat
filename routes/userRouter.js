const express = require("express");
const multer = require("multer");
const userRouter = express();
const upload = multer();
const userController = require("../controllers/userController");
const cartController = require("../controllers/cartController");
const orderController = require("../controllers/orderController");
const auth = require("../middleware/userVerification");
userRouter.set("views", "./views/user");


////////////////////////user-signup-route/////////////////////
userRouter.get("/userSignup", userController.userSignup);
userRouter.post("/userSignup", upload.none(), userController.submitUserSignup);

////////////////////////user-login/logout-route/////////////////////
userRouter.get("/userLogin", auth.isLogout, userController.userLogin);
userRouter.post("/userLogin", userController.submitUserLogin);
userRouter.get("/userLogout", userController.userLogout);

////////////////////////user-home-route/////////////////////
userRouter.get("/", userController.home);
userRouter.get("/products", userController.products);
userRouter.post("/products", userController.products);
userRouter.get("/categories", userController.categories);
userRouter.get("/productDetails/:id", userController.productDetails);
userRouter.get("/searchSuggestions", userController.searchSuggestions);
userRouter.get("/contact", userController.contact);
userRouter.post("/contact", userController.submitContactForm);

////////////////////////user-profile-route/////////////////////
userRouter.get("/profile", auth.isLogin, userController.profile);
userRouter.post(
  "/profile",
  auth.isLogin,
  upload.none(),
  userController.profileEdit
);
userRouter.get("/address", auth.isLogin, userController.address);
userRouter.post(
  "/saveAddress",
  auth.isLogin,
  upload.none(),
  userController.saveAddress
);
userRouter.get("/wallet", auth.isLogin, userController.wallet);
userRouter.get(
  "/downloadInvoice",
  auth.isLogin,
  userController.downloadInvoice
);

////////////////////////user-wishlist-route/////////////////////
userRouter.get("/userWishlist", auth.isLogin, userController.userWishlist);
userRouter.get("/wishlist", auth.isLogin, userController.wishlist);

////////////////////////user-Cart-route/////////////////////
userRouter.post("/addToCart/:id", auth.isLogin, cartController.addToCart);
userRouter.get("/cart", auth.isLogin, cartController.goTocart);
userRouter.post("/removeItem/:id", auth.isLogin, cartController.removeItem);
userRouter.post(
  "/incrementQuantity/:id",
  auth.isLogin,
  cartController.incrementQuantity
);
userRouter.post(
  "/decreasQuantity/:id",
  auth.isLogin,
  cartController.decreasQuantity
);
userRouter.post("/cart", auth.isLogin, cartController.checkout);
userRouter.post(
  "/placeOrder",
  auth.isLogin,
  upload.none(),
  cartController.placeOrder
);
userRouter.post(
  "/paymentConfirm",
  auth.isLogin,
  upload.none(),
  cartController.paymentConfirm
);

////////////////////////user-order-route/////////////////////
userRouter.get("/orders", auth.isLogin, orderController.orders);
userRouter.get("/orderDetails", auth.isLogin, orderController.orderDetails);
userRouter.post("/orderStatus", auth.isLogin, orderController.orderStatus);

module.exports = userRouter;
