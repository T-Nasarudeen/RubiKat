const express = require("express");
const adminRouter = express();
const adminController = require("../controllers/adminController");
const auth = require("../middleware/adminVerification");
const upload = require("../middleware/multer");
adminRouter.set("views", "./views/admin");
const path = require("path");

////////////////////////admin-login/logout-route/////////////////////
adminRouter.get("/login", auth.isLogout, adminController.loadLogin);
adminRouter.post("/login", adminController.verifyLogin);
adminRouter.post("/submitOTP", adminController.submitOTP);
adminRouter.get("/logout", adminController.logout);
adminRouter.get("/forgetPassword", adminController.forgetPassword);
adminRouter.post("/forgetPassword", adminController.verifyForgetPassword);

////////////////////////admin-home-route/////////////////////
adminRouter.get("/", auth.isLogin, adminController.home);
adminRouter.get("/viewSales", auth.isLogin, adminController.viewSales);

////////////////////////product-management-route/////////////////////
adminRouter.get("/viewProducts", auth.isLogin, adminController.viewProducts);
adminRouter.post(
  "/addProduct",
  auth.isLogin,
  upload.single("image"),
  adminController.addProduct
);
adminRouter.post(
  "/editProduct",
  auth.isLogin,
  upload.single("image"),
  adminController.editProduct
);
adminRouter.get("/listProduct", auth.isLogin, adminController.listProduct);

////////////////////////user-management-route/////////////////////
adminRouter.get("/viewUser", auth.isLogin, adminController.viewUser);
adminRouter.post("/addUser", auth.isLogin, adminController.addUser);
adminRouter.get("/blockUser", auth.isLogin, adminController.blockUser);

////////////////////////category-management-route/////////////////////
adminRouter.get("/viewCategory", auth.isLogin, adminController.viewCategory);
adminRouter.post("/addCategory", auth.isLogin, adminController.addCategory);
adminRouter.get("/listCategory", auth.isLogin, adminController.listCategory);
adminRouter.post("/editCategory", auth.isLogin, adminController.editCategory);

////////////////////////order-management-route/////////////////////
adminRouter.get("/viewOrders", auth.isLogin, adminController.viewOrders);
adminRouter.post("/orderStatus", auth.isLogin, adminController.orderStatus);

////////////////////////coupen-management-route/////////////////////
adminRouter.get("/viewCoupons", auth.isLogin, adminController.viewCoupons);
adminRouter.post("/addCoupon", auth.isLogin, adminController.addCoupon);
adminRouter.get("/listCoupon", auth.isLogin, adminController.listCoupon);
adminRouter.post("/editCoupon", auth.isLogin, adminController.editCoupon);

////////////////////////banner-management-route/////////////////////
adminRouter.get("/viewBanners", auth.isLogin, adminController.viewBanners);
adminRouter.post(
  "/addBanner",
  auth.isLogin,
  upload.single("image"),
  adminController.addBanner
);
adminRouter.get("/listBanner", auth.isLogin, adminController.listBanner);
adminRouter.post(
  "/editBanner",
  auth.isLogin,
  upload.single("image"),
  adminController.editBanner
);

adminRouter.get(
  "/searchSuggestions/:field",
  auth.isLogin,
  adminController.searchSuggestions
);
adminRouter.get("/search/:field", auth.isLogin, adminController.search);

module.exports = adminRouter;
