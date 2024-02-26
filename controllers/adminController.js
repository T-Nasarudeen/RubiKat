const product = require("../models/productModel");
const user = require("../models/userModel");
const category = require("../models/categoryModel");
const cart = require("../models/cartModel");
const order = require("../models/orderModel");
const coupon = require("../models/couponModel");
const banner = require("../models/bannerModel");
const { ObjectId } = require("mongodb");
const express = require("express");
const nodemailer = require("nodemailer");
const randomstring = require("randomstring");

const app = express();
//app.use(express.json());

const generatedOTP = randomstring.generate({
  length: 6,
  charset: "numeric",
});
const bcrypt = require("bcrypt");
let meassge;
let validate = 0;
let adminEmail;
let adminPassword;
//....Bcrypt...\\
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (err) {
    console.log(err.message);
  }
};

////////////////////////admin-login/logout/////////////////////
const loadLogin = (req, res, next) => {
  try {
    res.render("adminLogin", { validate, otpExpireTime: "" });
  } catch (err) {
    next(err);
  }
};
var otpExpireTime;

const verifyLogin = async (req, res, next) => {
  try {
    adminEmail = req.body.email;
    adminPassword = req.body.password;
    const userData = await user.findOne({ email: adminEmail });
    if (userData) {
      const passwordMatch = await bcrypt.compare(
        adminPassword,
        userData.password
      );
      if (passwordMatch) {
        if (userData.is_admin === 0) {
          res.render("adminLogin", {
            message: "You are not a admin",
            validate,
            otpExpireTime,
          });
        } else {
          const transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASSWORD,
            },
          });
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: adminEmail,
            subject: "Login OTP",
            text: `Your OTP for login is: ${generatedOTP}`,
          };
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.log(error);
              res.status(500).send("Failed to send OTP");
            } else {
              console.log("Email sent: " + info.response);
              res.status(200).send("OTP sent successfully");
            }
          });
          otpExpireTime = new Date(Date.now() + 0.5 * 60 * 1000);
          res.render("adminLogin", {
            validate: 1,
            adminEmail,
            adminPassword,
            otpExpireTime,
          });
        }
      } else {
        res.render("adminLogin", {
          message: "Password is incorrect",
          validate,
          adminEmail,
          adminPassword,
          otpExpireTime: "",
        });
      }
    } else {
      res.render("adminLogin", {
        message: "email does not not exist",
        validate,
        adminEmail,
        adminPassword,
        otpExpireTime: "",
      });
    }
  } catch (err) {
    next(err);
  }
};

const submitOTP = (req, res, next) => {
  try {
    if (req.body.otp === generatedOTP) {
      req.session.adminUser = true;
      res.redirect("/admin");
    } else {
      res.render("adminLogin", {
        message: "OTP is incorrect",
        validate: 1,
        adminEmail,
        adminPassword,
        otpExpireTime,
      });
    }
  } catch (err) {
    next(err);
  }
};

const logout = (req, res, next) => {
  try {
    req.session.adminUser = null;
    res.redirect("/");
  } catch (err) {
    next(err);
  }
};

const forgetPassword = (req, res, next) => {
  try {
    res.render("forgetPassword", { message: "", validate: 0, otpExpireTime });
  } catch (err) {
    next(err);
  }
};

const verifyForgetPassword = async (req, res, next) => {
  try {
    if (req.body.otp) {
      if (req.body.otp === generatedOTP) {
        const spassword = await securePassword(req.body.password);
        await user.updateOne(
          { email: req.body.email },
          { $set: { password: spassword } }
        );
        res.render("forgetPassword", {
          validate: "otp validated",
          otpExpireTime,
        });
      } else {
        res.render("forgetPassword", {
          message: "OTP is incorrect",
          validate: "email validated",
          otpExpireTime,
          usermail: req.body.email,
        });
      }
    } else {
      const userData = await user.findOne({ email: req.body.email });
      if (userData) {
        const transporter = nodemailer.createTransport({
          service: "Gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
        });
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: req.body.email,
          subject: "Password reset OTP",
          text: `Your OTP for resetting password is: ${generatedOTP}`,
        };
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log(error);
            res.status(500).send("Failed to send OTP");
          } else {
            console.log("Email sent: " + info.response);
            res.status(200).send("OTP sent successfully");
          }
        });
        otpExpireTime = new Date(Date.now() + 0.5 * 60 * 1000);
        res.render("forgetPassword", {
          message: "",
          validate: "email validated",
          otpExpireTime,
          usermail: req.body.email,
        });
      } else {
        res.render("forgetPassword", {
          message: "Could not find the email ID ",
          validate: 0,
          otpExpireTime,
        });
      }
    }
  } catch (err) {
    next(err);
  }
};

////////////////////////admin-home/////////////////////
const home = async (req, res, next) => {
  try {
    const currentDate = new Date();
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    let revenueValues,
      revenueFilter,
      orderValues,
      cancelOrders,
      returnOrders,
      orderFilter;
    if (req.query.revenueFilter == "week") {
      const currentDayOfWeek = currentDate.getDay();
      currentDate.setDate(
        currentDate.getDate() -
          currentDayOfWeek +
          (currentDayOfWeek === 0 ? -6 : 1)
      );
      currentDate.setHours(0, 0, 0, 0);
      const sales = await order.find(
        { start_date: { $gte: currentDate, $lte: endDate } },
        { totalAmount: 1, start_date: 1 }
      );
      revenueValues = new Array(
        currentDayOfWeek === 0 ? 7 : currentDayOfWeek
      ).fill(0);
      sales.forEach((sale) => {
        const startDate = new Date(sale.start_date);
        const dayOfWeek = startDate.getDay();
        const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        revenueValues[index] += sale.totalAmount;
      });
      revenueFilter = "week";
    } else if (req.query.revenueFilter == "year") {
      currentDate.setMonth(0);
      currentDate.setDate(1);
      currentDate.setHours(0, 0, 0, 0);
      const sales = await order.find(
        { start_date: { $gte: currentDate, $lte: endDate } },
        { totalAmount: 1, start_date: 1 }
      );
      revenueValues = new Array(currentDate.getMonth() + 2).fill(0);
      sales.forEach((sale) => {
        const startDate = new Date(sale.start_date);
        const month = startDate.getMonth();
        revenueValues[month] += sale.totalAmount;
      });
      revenueFilter = "year";
    } else {
      currentDate.setDate(1);
      currentDate.setHours(0, 0, 0, 0);
      const sales = await order.find(
        { start_date: { $gte: currentDate, $lte: endDate } },
        { totalAmount: 1, start_date: 1 }
      );
      revenueValues = new Array(new Date().getDate()).fill(0);
      sales.forEach((sale) => {
        const startDate = new Date(sale.start_date);
        const dayOfMonth = startDate.getDate() - 1;
        revenueValues[dayOfMonth] += sale.totalAmount;
      });
      revenueFilter = "month";
    }
    const orderCurrentDate = new Date();
    const orderEndDate = new Date();
    orderEndDate.setHours(23, 59, 59, 999);
    if (req.query.orderFilter == "week") {
      const currentDayOfWeek = orderCurrentDate.getDay();
      orderCurrentDate.setDate(
        orderCurrentDate.getDate() -
          currentDayOfWeek +
          (currentDayOfWeek === 0 ? -6 : 1)
      );
      orderCurrentDate.setHours(0, 0, 0, 0);
      const orders = await order.aggregate([
        {
          $match: {
            start_date: { $gte: orderCurrentDate, $lte: orderEndDate },
          },
        },
        { $project: { items: 1, start_date: 1 } },
        { $unwind: "$items" },
      ]);
      orderValues = new Array(
        currentDayOfWeek === 0 ? 7 : currentDayOfWeek
      ).fill(0);
      cancelOrders = new Array(
        currentDayOfWeek === 0 ? 7 : currentDayOfWeek
      ).fill(0);
      returnOrders = new Array(
        currentDayOfWeek === 0 ? 7 : currentDayOfWeek
      ).fill(0);
      orders.forEach((order) => {
        const startDate = new Date(order.start_date);
        const dayOfWeek = startDate.getDay();
        const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        if (
          order.items.orderStatus == "adminCancelled" ||
          order.items.orderStatus == "userCancelled"
        ) {
          cancelOrders[index] += 1;
        } else if (order.items.orderStatus == "returned") {
          returnOrders[index] += 1;
        } else {
          orderValues[index] += 1;
        }
      });
      orderFilter = "week";
    } else if (req.query.orderFilter == "year") {
      orderCurrentDate.setMonth(0);
      orderCurrentDate.setDate(1);
      orderCurrentDate.setHours(0, 0, 0, 0);
      const orders = await order.aggregate([
        {
          $match: {
            start_date: { $gte: orderCurrentDate, $lte: orderEndDate },
          },
        },
        { $project: { items: 1, start_date: 1 } },
        { $unwind: "$items" },
      ]);
      orderValues = new Array(orderCurrentDate.getMonth() + 2).fill(0);
      cancelOrders = new Array(orderCurrentDate.getMonth() + 2).fill(0);
      returnOrders = new Array(orderCurrentDate.getMonth() + 2).fill(0);
      orders.forEach((order) => {
        const startDate = new Date(order.start_date);
        const month = startDate.getMonth();
        if (
          order.items.orderStatus == "adminCancelled" ||
          order.items.orderStatus == "userCancelled"
        ) {
          cancelOrders[month] += 1;
        } else if (order.items.orderStatus == "returned") {
          returnOrders[month] += 1;
        } else {
          orderValues[month] += 1;
        }
      });
      orderFilter = "year";
    } else {
      orderCurrentDate.setDate(1);
      orderCurrentDate.setHours(0, 0, 0, 0);
      const orders = await order.aggregate([
        {
          $match: {
            start_date: { $gte: orderCurrentDate, $lte: orderEndDate },
          },
        },
        { $project: { items: 1, start_date: 1 } },
        { $unwind: "$items" },
      ]);
      orderValues = new Array(new Date().getDate()).fill(0);
      cancelOrders = new Array(new Date().getDate()).fill(0);
      returnOrders = new Array(new Date().getDate()).fill(0);
      orders.forEach((order) => {
        const startDate = new Date(order.start_date);
        const dayOfMonth = startDate.getDate() - 1;
        if (
          order.items.orderStatus == "adminCancelled" ||
          order.items.orderStatus == "userCancelled"
        ) {
          cancelOrders[dayOfMonth] += 1;
        } else if (order.items.orderStatus == "returned") {
          returnOrders[dayOfMonth] += 1;
        } else {
          orderValues[dayOfMonth] += 1;
        }
      });
      orderFilter = "month";
    }
    const [totalRequest] = await order.aggregate([
      {
        $match: {
          "items.orderStatus": {
            $in: ["cancelRequest", "returnRequest"],
          },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);
    const totalSignup = await user.countDocuments();
    const [orderDetails] = await order.aggregate([
      { $unwind: "$items" },
      { $project: { items: 1 } },
      {
        $match: {
          "items.orderStatus": {
            $nin: ["adminCancelled", "userCancelled", "returned"],
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$items.price" },
          count: { $sum: 1 },
        },
      },
    ]);
    res.render("adminHome", {
      totalRequest,
      totalSignup,
      orderDetails,
      revenueValues,
      revenueFilter,
      orderFilter,
      orderValues,
      cancelOrders,
      returnOrders,
    });
  } catch (err) {
    next(err);
  }
};

const viewSales = async (req, res, next) => {
  try {
    let message = req.session.message || "";
    req.session.message = null;
    const currentDay = new Date();
    currentDay.setDate(currentDay.getDate() - 30);
    let searchFilter = { start_date: { $gte: currentDay } },
      dateFilter = { startDate: "", endDate: "" };
    if (req.query.startDate) {
      const { startDate, endDate } = req.query;
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      searchFilter = {
        $and: [
          { start_date: { $gte: new Date(startDate) } },
          { start_date: { $lte: endOfDay } },
        ],
      };
      dateFilter.startDate = startDate;
      dateFilter.endDate = endDate;
    } else {
      dateFilter.startDate = currentDay.toISOString().split("T")[0];
      dateFilter.endDate = new Date().toISOString().split("T")[0];
    }
    const orderData = await order.aggregate([
      { $match: searchFilter },
      { $unwind: "$items" },
      {
        $match: {
          $or: [
            { "items.orderStatus": "delivered" },
            { "items.orderStatus": "returnRquestRejected" },
          ],
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userId",
        },
      },
      { $unwind: "$userId" },
      {
        $project: {
          "userId.name": 1,
          "userId.mobile": 1,
          "items.price": 1,
          "items.status_date": 1,
          start_date: 1,
          paymentType: 1,
          orderId: 1,
        },
      },
    ]);
    if (orderData.length < 1) {
      message = "Sorry, no order found!";
    }
    const [totalRequest] = await order.aggregate([
      {
        $match: {
          "items.orderStatus": {
            $in: ["cancelRequest", "returnRequest"],
          },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);
    res.render("viewSales", {
      orderData,
      message,
      totalRequest: totalRequest,
      dateFilter,
    });
  } catch (err) {
    next(err);
  }
};
////////////////////////product-Management/////////////////////
const viewProducts = async (req, res, next) => {
  try {
    let message = req.session.message || "";
    req.session.message = null;
    const pageSize = 10;
    let skipValue,
      limitValue,
      pageNumber,
      searchFilter = {},
      searchInput = "";
    if (req.query.query) {
      searchFilter = { name: { $regex: req.query.query, $options: "gi" } };
      searchInput = req.query.query;
    }
    if (req.query.page) {
      skipValue = (req.query.page - 1) * 10;
      limitValue = 10;
      pageNumber = parseInt(req.query.page);
    } else {
      skipValue = 0;
      limitValue = 10;
      pageNumber = 1;
    }
    const [categories, productData] = await Promise.all([
      category.find({}),
      product
        .find(searchFilter)
        .sort({ _id: -1 })
        .skip(skipValue)
        .limit(limitValue),
    ]);
    if (productData.length < 1) {
      message = "Sorry, no product found!";
    }
    const [totalRequest] = await order.aggregate([
      {
        $match: {
          "items.orderStatus": {
            $in: ["cancelRequest", "returnRequest"],
          },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);
    const totalDocuments = await product.countDocuments(searchFilter);
    const totalPage = Math.ceil(totalDocuments / pageSize);
    res.render("viewProducts", {
      categories,
      message,
      productData,
      totalPage,
      pageNumber,
      searchInput,
      totalRequest: totalRequest,
    });
  } catch (err) {
    next(err);
  }
};

const addProduct = async (req, res, next) => {
  try {
    const addproduct = new product({
      name: req.body.name,
      category: req.body.category,
      author: req.body.author,
      price: req.body.price,
      quantity: req.body.quantity,
      deliveryTime: req.body.deliveryTime,
      description: req.body.description,
      image: "/images/product/" + req.file.filename,
    });
    const productData = await addproduct.save();
    if (productData) {
      req.session.message = "Product added successfully";
      res.redirect("/admin/viewProducts");
    } else {
      req.session.message = "Product adding failed";
      res.redirect("/admin/viewProducts");
    }
  } catch (error) {
    console.error("Error adding product:", error);
    req.session.message = "Product adding failed";
    res.redirect("/admin/viewProducts");
  }
};

const editProduct = async (req, res, next) => {
  try {
    const { productId, page } = req.query;
    const updateData = {
      name: req.body.name,
      category: req.body.category,
      author: req.body.author,
      price: req.body.price,
      quantity: req.body.quantity,
      deliveryTime: req.body.deliveryTime,
      description: req.body.description,
    };
    if (req.file) {
      updateData.image = "/images/product/" + req.file.filename;
    }
    const productData = await product.updateOne(
      { _id: productId },
      { $set: updateData }
    );
    if (productData) {
      req.session.message = "Product edited successfully";
      res.redirect(
        `/admin/viewProducts?page=${req.query.page}&query=${req.query.query}`
      );
    } else {
      req.session.message = "Product editing failed";
      res.redirect(
        `/admin/viewProducts?page=${req.query.page}&query=${req.query.query}`
      );
    }
  } catch (err) {
    console.error("Error editing product:", err);
    req.session.message = "Product editing failed";
    res.redirect(
      `/admin/viewProducts?page=${req.query.page}&query=${req.query.query}`
    );
  }
};

const listProduct = async (req, res, next) => {
  try {
    const { productId, page } = req.query;
    const productData = await product.findOne({ _id: productId });
    if (productData.status === 0) {
      await product.updateOne({ _id: productId }, { $set: { status: 1 } });
      req.session.message = "Product unlisted";
    } else {
      await product.updateOne({ _id: productId }, { $set: { status: 0 } });
      req.session.message = "Product listed";
    }
    res.redirect(
      `/admin/viewProducts?page=${req.query.page}&query=${req.query.query}`
    );
  } catch (err) {
    next(err);
  }
};
///////////////////////user-Management/////////////////////
const viewUser = async (req, res, next) => {
  try {
    let message = req.session.message || "";
    req.session.message = null;
    const pageSize = 10;
    let skipValue,
      limitValue,
      pageNumber,
      searchFilter = {},
      searchInput = "";
    if (req.query.query) {
      searchFilter = { email: { $regex: req.query.query, $options: "gi" } };
      searchInput = req.query.query;
    }
    if (req.query.page) {
      skipValue = (req.query.page - 1) * 10;
      limitValue = 10;
      pageNumber = parseInt(req.query.page);
    } else {
      skipValue = 0;
      limitValue = 10;
      pageNumber = 1;
    }
    const users = await user
      .find(searchFilter)
      .sort({ _id: -1 })
      .skip(skipValue)
      .limit(limitValue);
    if (users.length < 1) {
      message = "Sorry, no user found!";
    }
    const totalDocuments = await user.countDocuments(searchFilter);
    const totalPage = Math.ceil(totalDocuments / pageSize);
    const [totalRequest] = await order.aggregate([
      {
        $match: {
          "items.orderStatus": {
            $in: ["cancelRequest", "returnRequest"],
          },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);
    res.render("viewUser", {
      users,
      message,
      totalPage,
      pageNumber,
      searchInput,
      totalRequest: totalRequest,
    });
  } catch (err) {
    next(err);
  }
};

const blockUser = async (req, res, next) => {
  try {
    const id = req.query.userId;
    const userData = await user.findOne({ _id: id });
    if (userData.is_blocked === 0) {
      await user.updateOne({ _id: id }, { $set: { is_blocked: 1 } });
      req.session.message = "User Blocked";
    } else {
      await user.updateOne({ _id: id }, { $set: { is_blocked: 0 } });
      req.session.message = "User Unlocked";
    }
    res.redirect(
      `/admin/viewUser?page=${req.query.page}&query=${req.query.query}`
    );
  } catch (err) {
    next(err);
  }
};

const addUser = async (req, res, next) => {
  try {
    const [usermail, usermobile] = await Promise.all([
      user.findOne({ email: { $regex: new RegExp(req.body.email, "i") } }),
      user.findOne({ mobile: req.body.mobile }),
    ]);
    if (usermail) {
      req.session.message = "Mail Id already exist";
      res.redirect("/admin/viewUser");
    } else if (usermobile) {
      req.session.message = "Mobile Number already exist";
      res.redirect("/admin/viewUser");
    } else {
      const spassword = await securePassword(req.body.password);
      const addUser = new user({
        name: req.body.name,
        email: req.body.email,
        mobile: req.body.mobile,
        password: spassword,
      });
      const userData = await addUser.save();
      req.session.message = "User Added succesfully";
      res.redirect("/admin/viewUser");
    }
  } catch (err) {
    next(err);
  }
};

////////////////////////category-Management/////////////////////
const viewCategory = async (req, res, next) => {
  try {
    let message = req.session.message || "";
    req.session.message = null;
    const pageSize = 10;
    let skipValue,
      limitValue,
      pageNumber,
      searchFilter = {},
      searchInput = "";
    if (req.query.query) {
      searchFilter = { name: { $regex: req.query.query, $options: "gi" } };
      searchInput = req.query.query;
    }
    if (req.query.page) {
      skipValue = (req.query.page - 1) * 10;
      limitValue = 10;
      pageNumber = parseInt(req.query.page);
    } else {
      skipValue = 0;
      limitValue = 10;
      pageNumber = 1;
    }
    const categories = await category
      .find(searchFilter)
      .sort({ _id: -1 })
      .skip(skipValue)
      .limit(limitValue);
    if (categories.length < 1) {
      message = "Sorry, no category found!";
    }
    const totalDocuments = await category.countDocuments(searchFilter);
    const totalPage = Math.ceil(totalDocuments / pageSize);
    const [totalRequest] = await order.aggregate([
      {
        $match: {
          "items.orderStatus": {
            $in: ["cancelRequest", "returnRequest"],
          },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);
    res.render("viewCategory", {
      categories,
      message,
      totalPage,
      pageNumber,
      searchInput,
      totalRequest: totalRequest,
    });
  } catch (err) {
    next(err);
  }
};

const addCategory = async (req, res, next) => {
  try {
    const data = await category.findOne({
      name: { $regex: new RegExp(req.body.name, "i") },
    });
    if (data) {
      req.session.message = "Category already exist";
      res.redirect("/admin/viewCategory");
    } else {
      const newCategory = new category({
        name: req.body.name,
      });
      const data = await newCategory.save();
      if (data) {
        req.session.message = "Category added successfully";
        res.redirect("/admin/viewCategory");
      } else {
        req.session.message = "Category adding failed";
        res.redirect("/admin/viewCategory");
      }
    }
  } catch (err) {
    next(err);
  }
};

const listCategory = async (req, res, next) => {
  try {
    const id = req.query.categoryId;
    const categoryData = await category.findOne({ _id: id });
    if (categoryData.status === 0) {
      await category.updateOne({ _id: id }, { $set: { status: 1 } });
      req.session.message = "Category unlisted";
    } else {
      await category.updateOne({ _id: id }, { $set: { status: 0 } });
      req.session.message = "Category listed";
    }
    res.redirect(
      `/admin/viewCategory?page=${req.query.page}&query=${req.query.query}`
    );
  } catch (err) {
    next(err);
  }
};

const editCategory = async (req, res, next) => {
  try {
    const id = req.query.categoryId;
    const data = await category.findOne({
      name: { $regex: new RegExp(req.body.name, "i") },
    });
    if (data) {
      req.session.message = "This category alraedy exist";
      res.redirect("/admin/viewCategory");
    } else {
      await category.findOneAndUpdate(
        { _id: id },
        { $set: { name: req.body.name } }
      );
      req.session.message = "This category edited successfully";
      res.redirect(
        `/admin/viewCategory?page=${req.query.page}&query=${req.query.query}`
      );
    }
  } catch (err) {
    next(err);
  }
};

////////////////////////order-Management/////////////////////
const viewOrders = async (req, res, next) => {
  try {
    let message = req.session.message || "";
    req.session.message = null;
    const pageSize = 10;
    let skipValue,
      limitValue,
      pageNumber,
      searchFilter = {},
      searchInput = "";
    if (req.query.query) {
      searchFilter = { orderId: { $regex: req.query.query, $options: "gi" } };
      searchInput = req.query.query;
    }
    if (req.query.page) {
      skipValue = (req.query.page - 1) * 10;
      limitValue = 10;
      pageNumber = parseInt(req.query.page);
    } else {
      skipValue = 0;
      limitValue = 10;
      pageNumber = 1;
    }
    const orderData = await order
      .find(searchFilter)
      .sort({ start_date: -1 })
      .skip(skipValue)
      .limit(limitValue)
      .populate("userId")
      .populate("items.product");
    if (orderData.length < 1) {
      message = "Sorry, no order found!";
    }
    const totalDocuments = await order.countDocuments(searchFilter);
    const totalPage = Math.ceil(totalDocuments / pageSize);
    const [totalRequest] = await order.aggregate([
      {
        $match: {
          "items.orderStatus": {
            $in: ["cancelRequest", "returnRequest"],
          },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);
    res.render("viewOrder", {
      orderData,
      message,
      totalPage,
      pageNumber,
      searchInput,
      totalRequest: totalRequest,
    });
  } catch (err) {
    next(err);
  }
};

const orderStatus = async (req, res, next) => {
  try {
    const orderId = new ObjectId(req.query.order_id);
    const itemId = new ObjectId(req.query.item_id);
    const unitId = new ObjectId(req.query.unit_id);
    const userId = new ObjectId(req.body.userId);
    const filter = {
      _id: orderId,
      "items._id": unitId,
    };
    const updatedOrder=await order.findOneAndUpdate(filter, {
      $set: {
        "items.$.orderStatus": req.body.status,
        "items.$.status_date": Date.now(),
      },
    },{ projection: { orderId: 1 }, returnOriginal: false });
    if (
      req.body.status == "adminCancelled" ||
      req.body.status == "userCancelled" ||
      req.body.status == "returned"
    ) {
      if (req.body.reason != "Defective Product") {
        await product.updateOne({ _id: itemId }, { $inc: { quantity: 1 } });
      }      
      if (req.body.payment != "COD" || req.body.status == "returned") {
        const history = {
          amount: req.body.price,
          date: Date.now(),
          transaction: req.body.status,
          orderId: updatedOrder.orderId,
        };
        await user.updateOne(
          { _id: userId },
          {
            $inc: { "wallet.total": req.body.price },
            $push: { "wallet.history": history },
          }
        );
      }
    }
    req.session.message = "Order status changed successfully";
    res.redirect(
      `/admin/viewOrders?page=${req.query.page}&query=${req.query.query}`
    );
  } catch (err) {
    next(err);
  }
};

////////////////////////coupon-Management/////////////////////
const viewCoupons = async (req, res, next) => {
  try {
    let message = req.session.message || "";
    const pageSize = 10;
    let skipValue,
      limitValue,
      pageNumber,
      searchFilter = {},
      searchInput = "";
    if (req.query.query) {
      searchFilter = {
        couponCode: { $regex: req.query.query, $options: "gi" },
      };
      searchInput = req.query.query;
    }
    if (req.query.page) {
      skipValue = (req.query.page - 1) * 10;
      limitValue = 10;
      pageNumber = parseInt(req.query.page);
    } else {
      skipValue = 0;
      limitValue = 10;
      pageNumber = 1;
    }
    const coupons = await coupon
      .find(searchFilter)
      .sort({ _id: -1 })
      .skip(skipValue)
      .limit(limitValue);
    if (coupons.length < 1) {
      message = "Sorry, no coupon found!";
    }
    const totalDocuments = await coupon.countDocuments(searchFilter);
    const totalPage = Math.ceil(totalDocuments / pageSize);
    req.session.message = null;
    const [totalRequest] = await order.aggregate([
      {
        $match: {
          "items.orderStatus": {
            $in: ["cancelRequest", "returnRequest"],
          },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);
    res.render("viewCoupons", {
      coupons,
      message,
      totalPage,
      pageNumber,
      searchInput,
      totalRequest,
    });
  } catch (err) {
    next(err);
  }
};

const addCoupon = async (req, res, next) => {
  try {
    const couponData = await coupon.findOne({
      couponCode: { $regex: new RegExp(req.body.code, "i") },
    });
    if (couponData) {
      req.session.message = "Coupon code already exist";
    } else {
      const addCoupon = new coupon({
        couponCode: req.body.code,
        percentage: req.body.percentage,
        maxDiscount: req.body.maxDiscount,
        minAmount: req.body.minAmount,
        endDate: req.body.edate,
      });
      await addCoupon.save();
      req.session.message = "Coupon added successfully";
    }
    res.redirect("/admin/viewCoupons");
  } catch (err) {
    next(err);
  }
};

const listCoupon = async (req, res, next) => {
  try {
    const { couponId, status, page } = req.query;
    if (status == 0) {
      await coupon.updateOne({ _id: couponId }, { $set: { status: 1 } });
      req.session.message = "Coupon unlisted";
    } else {
      await coupon.updateOne({ _id: couponId }, { $set: { status: 0 } });
      req.session.message = "Coupon listed";
    }
    res.redirect(
      `/admin/viewCoupons?page=${req.query.page}&query=${req.query.query}`
    );
  } catch (err) {
    next(err);
  }
};

const editCoupon = async (req, res, next) => {
  try {
    let couponData = await coupon.findOne({ _id: req.body.couponId }),
      update = true;
    if (couponData.couponCode != req.body.code) {
      couponData = await coupon.find({
        couponCode: { $regex: new RegExp(req.body.code, "i") },
      });
      if (couponData) {
        update = false;
      }
    }
    if (update) {
      await coupon.updateOne(
        { _id: req.body.couponId },
        {
          couponCode: req.body.code,
          percentage: req.body.percentage,
          maxDiscount: req.body.maxDiscount,
          minAmount: req.body.minAmount,
          endDate: req.body.edate,
        }
      );
      req.session.message = "Coupon edited successfully";
    } else {
      req.session.message = "Coupon code already exist";
    }
    res.redirect(
      `/admin/viewCoupons?page=${req.query.page}&query=${req.query.query}`
    );
  } catch (err) {
    next(err);
  }
};

////////////////////////banner-Management/////////////////////
const viewBanners = async (req, res, next) => {
  try {
    let message = req.session.message || "";
    req.session.message = null;
    const pageSize = 10;
    let skipValue,
      limitValue,
      pageNumber,
      searchFilter = {},
      searchInput = "";
    if (req.query.query) {
      searchFilter = { title: { $regex: req.query.query, $options: "gi" } };
      searchInput = req.query.query;
    }
    if (req.query.page) {
      skipValue = (req.query.page - 1) * 10;
      limitValue = 10;
      pageNumber = parseInt(req.query.page);
    } else {
      skipValue = 0;
      limitValue = 10;
      pageNumber = 1;
    }
    const bannerData = await banner
      .find(searchFilter)
      .sort({ _id: -1 })
      .skip(skipValue)
      .limit(limitValue);
    if (bannerData.length < 1) {
      message = "Sorry, no banner found!";
    }
    const totalDocuments = await banner.countDocuments(searchFilter);
    const totalPage = Math.ceil(totalDocuments / pageSize);
    const [totalRequest] = await order.aggregate([
      {
        $match: {
          "items.orderStatus": {
            $in: ["cancelRequest", "returnRequest"],
          },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);
    res.render("viewBanners", {
      message,
      bannerData,
      totalPage,
      pageNumber,
      searchInput,
      totalRequest: totalRequest,
    });
  } catch (err) {
    next(err);
  }
};

const addBanner = async (req, res, next) => {
  try {
    const addBanner = new banner({
      image: "/images/product/" + req.file.filename,
      title: req.body.title,
      titleColor: req.body.titleColor,
    });
    const bannerData = await addBanner.save();
    if (bannerData) {
      req.session.message = "Banner added successfully";
      res.redirect("/admin/viewBanners");
    } else {
      req.session.message = "Banner adding failed";
      res.redirect("/admin/viewBanners");
    }
  } catch (error) {
    console.error("Error adding banner:", error);
    req.session.message = "Banner adding failed";
    res.redirect("/admin/viewBanners");
  }
};

const listBanner = async (req, res, next) => {
  try {
    const { bannerId, page } = req.query;
    const bannerData = await banner.findOne({ _id: bannerId });
    if (bannerData.status === 0) {
      await banner.updateOne({ _id: bannerId }, { $set: { status: 1 } });
      req.session.message = "Banner unlisted";
    } else {
      await banner.updateOne({ _id: bannerId }, { $set: { status: 0 } });
      req.session.message = "Banner listed";
    }
    res.redirect(
      `/admin/viewBanners?page=${req.query.page}&query=${req.query.query}`
    );
  } catch (err) {
    next(err);
  }
};

const editBanner = async (req, res, next) => {
  try {
    const { bannerId, page } = req.query;
    const updateData = {
      title: req.body.title,
      titleColor: req.body.titleColor,
    };
    if (req.file) {
      updateData.image = "/images/product/" + req.file.filename;
    }
    const bannerData = await banner.updateOne(
      { _id: bannerId },
      { $set: updateData }
    );
    if (bannerData) {
      req.session.message = "Banner edited successfully";
      res.redirect(
        `/admin/viewBanners?page=${req.query.page}&query=${req.query.query}`
      );
    } else {
      req.session.message = "Banner editing failed";
      res.redirect(
        `/admin/viewBanners?page=${req.query.page}&query=${req.query.query}`
      );
    }
  } catch (err) {
    console.error("Error adding banner:", err);
    req.session.message = "Banner adding failed";
    res.redirect(
      `/admin/viewBanners?page=${req.query.page}&query=${req.query.query}`
    );
  }
};

const searchSuggestions = async (req, res, next) => {
  try {
    const userInput = req.query.query;
    const searchFeild = req.params.field;
    let searchData;
    if (searchFeild == "category") {
      searchData = await category
        .find(
          { name: { $regex: userInput, $options: "gi" } },
          { name: 1, _id: 0 }
        )
        .limit(10);
    } else if (searchFeild == "user") {
      searchData = await user
        .find(
          { email: { $regex: userInput, $options: "gi" } },
          { email: 1, _id: 0 }
        )
        .limit(10);
    } else if (searchFeild == "coupon") {
      searchData = await coupon
        .find(
          { couponCode: { $regex: userInput, $options: "gi" } },
          { couponCode: 1, _id: 0 }
        )
        .limit(10);
    } else if (searchFeild == "order") {
      searchData = await order
        .find(
          { orderId: { $regex: userInput, $options: "gi" } },
          { orderId: 1 }
        )
        .limit(10);
    } else if (searchFeild == "product") {
      searchData = await product
        .find(
          { name: { $regex: userInput, $options: "gi" } },
          { name: 1, _id: 0 }
        )
        .limit(10);
    } else if (searchFeild == "banner") {
      searchData = await banner
        .find(
          { title: { $regex: userInput, $options: "gi" } },
          { title: 1, _id: 0 }
        )
        .limit(10);
    }
    res.json({ searchresult: searchData });
  } catch (err) {
    next(err);
  }
};

const search = async (req, res, next) => {
  try {
    const userInput = req.query.query;
    const searchFeild = req.params.field;
    if (searchFeild == "category") {
      res.redirect(`/admin/viewCategory?query=${userInput}`);
    } else if (searchFeild == "user") {
      res.redirect(`/admin/viewUser?query=${userInput}`);
    } else if (searchFeild == "coupon") {
      res.redirect(`/admin/viewCoupons?query=${userInput}`);
    } else if (searchFeild == "order") {
      res.redirect(`/admin/viewOrders?query=${userInput}`);
    } else if (searchFeild == "product") {
      res.redirect(`/admin/viewProducts?query=${userInput}`);
    } else if (searchFeild == "banner") {
      res.redirect(`/admin/viewBanners?query=${userInput}`);
    }
  } catch (err) {
    next(err);
  }
};

module.exports = {
  loadLogin,
  verifyLogin,
  submitOTP,
  logout,
  forgetPassword,
  verifyForgetPassword,
  home,
  viewSales,
  addProduct,
  viewProducts,
  editProduct,
  listProduct,
  blockUser,
  viewUser,
  addUser,
  viewCategory,
  addCategory,
  listCategory,
  editCategory,
  viewOrders,
  orderStatus,
  viewCoupons,
  addCoupon,
  listCoupon,
  editCoupon,
  viewBanners,
  addBanner,
  listBanner,
  editBanner,
  searchSuggestions,
  search,
};
