const user = require("../models/userModel");
const product = require("../models/productModel");
const order = require("../models/orderModel");
const category = require("../models/categoryModel");
const cart = require("../models/cartModel");
const banner = require("../models/bannerModel");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const randomstring = require("randomstring");
const { ObjectId } = require("mongodb");
const PDFDocument = require("pdfkit");

const generatedOTP = randomstring.generate({
  length: 6,
  charset: "numeric",
});
//....Bcrypt...\\
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (err) {
    console.log(err.message);
  }
};

////////////////////////user-signup/////////////////////
var otpExpireTime;
const userSignup = (req, res, next) => {
  try {
    res.render("userSignup", { userData: "", otpExpireTime, searchInput: "" });
  } catch (err) {
    next(err);
  }
};

const submitUserSignup = async (req, res, next) => {
  try {
    if (req.body.otp) {
      if (req.body.otp == generatedOTP) {
        const { name, email, mobile, password } = req.session.tempUser;
        const spassword = await securePassword(password);
        const addUser = new user({
          name: name,
          email: email,
          mobile: mobile,
          password: spassword,
        });
        const userData = await addUser.save();
        req.session.tempUser = "";
        const userDetails = {
          userID: userData._id,
          name: userData.name,
          email: userData.email,
          cartCount: 0,
        };
        req.session.userDetails = userDetails;
        res.json({ message: "Signup success" });
      } else {
        res.json({ message: "Entered otp is incorrect" });
      }
    } else {
      const [usermail, usermobile] = await Promise.all([
        user.findOne({ email: req.body.email }),
        user.findOne({ mobile: req.body.mobile }),
      ]);
      if (!usermail) {
        if (!usermobile) {
          req.session.tempUser = req.body;
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
            subject: "Login OTP",
            text: `Your OTP for Signup is: ${generatedOTP}`,
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
          res.json({ message: "Signup success", otpExpireTime });
        } else {
          res.json({ message: "Entered Mobile number already exist" });
        }
      } else {
        res.json({ message: "Entered mail ID already exist" });
      }
    }
  } catch (err) {
    next(err);
  }
};

////////////////////////user-login/logout/////////////////////
const userLogin = (req, res, next) => {
  try {
    res.render("userLogin", { message: "", userData: "", searchInput: "" });
  } catch (err) {
    next(err);
  }
};

const submitUserLogin = async (req, res, next) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const userData = await user.findOne(
      { email: email },
      { wallet: 0, wishlist: 0, address: 0 }
    );
    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password);
      if (passwordMatch) {
        if (userData.is_blocked === 0) {
          const cartData = await cart.aggregate([
            { $match: { userId: userData._id } },
            { $unwind: "$items" },
            { $count: "totalItems" },
          ]);
          const cartCount = cartData.length > 0 ? cartData[0].totalItems : 0;
          const userDetails = {
            userID: userData._id,
            name: userData.name,
            email: userData.email,
            cartCount: cartCount,
          };
          req.session.userDetails = userDetails;
          res.redirect("/");
        } else {
          res.render("userLogin", {
            message: "blocked",
            userData: "",
            searchInput: "",
          });
        }
      } else {
        res.render("userLogin", {
          message: "Entered password is wrong",
          userData: "",
          searchInput: "",
        });
      }
    } else {
      res.render("userLogin", {
        message: "not exist",
        userData: "",
        searchInput: "",
      });
    }
  } catch (err) {
    next(err);
  }
};

const userLogout = (req, res, next) => {
  try {
    req.session.userDetails = null;
    res.redirect("/");
  } catch (err) {
    next(err);
  }
};
////////////////////////user-home/////////////////////
const home = async (req, res, next) => {
  try {
    const userData = req.session.userDetails || null;
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );
    const productData = await product.find({}).sort({ _id: -1 }).limit(3);
    const bannerData = await banner.find({ status: 0 }).limit(4);
    res.render("home", { userData, productData, searchInput: "", bannerData });
  } catch (err) {
    next(err);
  }
};

const products = async (req, res, next) => {
  try {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );
    let userData = null;
    if (req.session.userDetails) {
      const { userID, cartCount } = req.session.userDetails;
      userData = await user.findOne({ _id: userID }, { wishlist: 1, name: 1 });
      userData.cartCount = cartCount;
    }
    const pageSize = 12;
    let skipValue, limitValue, pageNumber, sortFilter, sorting;
    if (req.query.page) {
      skipValue = (req.query.page - 1) * 12;
      limitValue = 12;
      pageNumber = parseInt(req.query.page);
    } else {
      skipValue = 0;
      limitValue = 12;
      pageNumber = 1;
    }
    if (req.query.sort) {
      if (req.query.sort == "lowToHigh") {
        sortFilter = {
          price: 1,
        };
        sorting = "lowToHigh";
      } else if (req.query.sort == "highToLow") {
        sortFilter = {
          price: -1,
        };
        sorting = "highToLow";
      } else {
        sortFilter = {
          _id: -1,
        };
        sorting = "newest";
      }
    } else {
      sortFilter = {
        _id: -1,
      };
      sorting = "newest";
    }
    let appliedFilter = {};
    let filter = [];
    const userInput = req.query.search;
    let searchInput = "";
    if (userInput) {
      searchInput = userInput;
      const seatchFilter = {
        $or: [
          { name: { $regex: userInput, $options: "gi" } },
          { category: { $regex: userInput, $options: "gi" } },
          { author: { $regex: userInput, $options: "gi" } },
          { description: { $regex: userInput, $options: "gi" } },
        ],
      };
      filter.push(seatchFilter);
    }
    if (req.body) {
      if (req.body.categoryFilter) {
        const { categoryFilter } = req.body;
        appliedFilter.category = categoryFilter;
        if (categoryFilter.length > 1) {
          const orCategoryFilter = [];
          categoryFilter.forEach((category) => {
            orCategoryFilter.push({ category: { $eq: category } });
          });
          filter.push({ $or: orCategoryFilter });
        } else {
          categoryFilter.forEach((category) => {
            filter.push({ category: { $eq: category } });
          });
        }
      }
      if (req.body.authorFilter) {
        const { authorFilter } = req.body;
        appliedFilter.author = authorFilter;
        if (authorFilter.length > 1) {
          const orauthorFilter = [];
          authorFilter.forEach((author) => {
            orauthorFilter.push({ author: { $eq: author } });
          });
          filter.push({ $or: orauthorFilter });
        } else {
          authorFilter.forEach((author) => {
            filter.push({ author: { $eq: author } });
          });
        }
      }
      if (req.body.priceFilter) {
        const { priceFilter } = req.body;
        appliedFilter.price = priceFilter;
        if (priceFilter.length > 1) {
          const orpriceFilter = [];
          priceFilter.forEach((price) => {
            if (price == 0) {
              orpriceFilter.push({ price: { $lte: 199 } });
            } else if (price == 200) {
              orpriceFilter.push({ price: { $gte: 200, $lte: 399 } });
            } else if (price == 400) {
              orpriceFilter.push({ price: { $gte: 400, $lte: 599 } });
            } else {
              orpriceFilter.push({ price: { $gte: 600 } });
            }
          });
          filter.push({ $or: orpriceFilter });
        } else {
          priceFilter.forEach((price) => {
            if (price == 0) {
              filter.push({ price: { $lte: 199 } });
            } else if (price == 200) {
              filter.push({ price: { $gte: 200, $lte: 399 } });
            } else if (price == 400) {
              filter.push({ price: { $gte: 400, $lte: 599 } });
            } else {
              filter.push({ price: { $gte: 600 } });
            }
          });
        }
      }
    }
    if (filter.length < 1) {
      filter.push({});
    }
    const productData = await product
      .find({ status: 0, $and: filter })
      .sort(sortFilter)
      .skip(skipValue)
      .limit(limitValue);
    const categoryData = await product.distinct("category");
    const authors = await product.distinct("author");
    const totalDocuments = await product.countDocuments({
      status: 0,
      $and: filter,
    });
    const totalPage = Math.ceil(totalDocuments / pageSize);
    res.render("products", {
      userData,
      productData,
      totalPage,
      pageNumber,
      searchInput,
      sorting,
      categoryData,
      authors,
      appliedFilter,
    });
  } catch (err) {
    next(err);
  }
};

const productDetails = async (req, res, next) => {
  try {
    const productId = req.params.id;
    let userData,
      cartItem = null;
    const productData = await product.findOne({ _id: productId });
    if (req.session.userDetails) {
      const { userID, cartCount } = req.session.userDetails;
      userData = await user.findOne({ _id: userID }, { wishlist: 1, name: 1 });
      cartItem = await cart.findOne({
        userId: userID,
        items: { $elemMatch: { product: productId } },
      });
      userData.cartCount = cartCount;
    }
    res.render("productDetails", {
      userData,
      productData,
      cartItem,
      searchInput: "",
    });
  } catch (err) {
    next(err);
  }
};

const categories = async (req, res, next) => {
  try {
    let userData = null;
    const categoryData = await category
      .aggregate([
        {
          $lookup: {
            from: "products",
            localField: "name",
            foreignField: "category",
            as: "products",
          },
        },
        {
          $match: {
            products: { $ne: [] },
          },
        },
        {
          $addFields: {
            products: {
              $slice: ["$products", 4],
            },
          },
        },
        {
          $sort: {
            "products._id": -1,
          },
        },
      ])
      .limit(4);
    if (req.session.userDetails) {
      const { userID, cartCount } = req.session.userDetails;
      userData = await user.findOne({ _id: userID }, { wishlist: 1, name: 1 });
      userData.cartCount = cartCount;
    }
    res.render("categories", { userData, categoryData, searchInput: "" });
  } catch (err) {
    next(err);
  }
};

const searchSuggestions = async (req, res, next) => {
  try {
    const userInput = req.query.query;
    const productData = await product
      .find(
        {
          $or: [
            { name: { $regex: userInput, $options: "gi" } },
            { category: { $regex: userInput, $options: "gi" } },
            { author: { $regex: userInput, $options: "gi" } },
            { description: { $regex: userInput, $options: "gi" } },
          ],
        },
        { name: 1, _id: 0 }
      )
      .limit(10);
    res.json({ searchresult: productData });
  } catch (err) {
    next(err);
  }
};

const contact = async (req, res, next) => {
  try {
    const userData = req.session.userDetails || null;
    res.render("contactUs", { userData, searchInput: "" });
  } catch (err) {
    next(err);
  }
};

////////////////////////user-profile/////////////////////
const profile = async (req, res, next) => {
  try {
    const { userID, cartCount } = req.session.userDetails;
    const userData = await user.findOne(
      { _id: userID },
      { name: 1, email: 1, mobile: 1 }
    );
    userData.cartCount = cartCount;
    res.render("userProfile", { userData, searchInput: "" });
  } catch (err) {
    next(err);
  }
};

const profileEdit = async (req, res, next) => {
  try {
    const { userID } = req.session.userDetails;
    if (req.body.name) {
      const userData = await user.findOneAndUpdate(
        { _id: userID },
        { $set: { name: req.body.name } },
        { new: true }
      );
      res.json({ name: userData.name });
    } else if (req.body.password) {
      const { password, newPass } = req.body;
      const userData = await user.findOne({ _id: userID }, { password: 1 });
      const passwordMatch = await bcrypt.compare(password, userData.password);
      if (passwordMatch) {
        const spassword = await securePassword(newPass);
        await user.findOneAndUpdate(
          { _id: userID },
          { $set: { password: spassword } }
        );
        res.json({ message: "Success" });
      } else {
        res.json({ message: "failed" });
      }
    }
  } catch (err) {
    next(err);
  }
};

const address = async (req, res, next) => {
  try {
    const { userID, cartCount } = req.session.userDetails;
    const userData = await user.findOne(
      { _id: userID },
      { name: 1, email: 1, address: 1 }
    );
    userData.cartCount = cartCount;
    res.render("userAddress", { userData, searchInput: "" });
  } catch (err) {
    next(err);
  }
};

const saveAddress = async (req, res, next) => {
  try {
    const { userID } = req.session.userDetails;
    if (req.body.delete) {
      const index = req.body.delete;
      await user.findOneAndUpdate(
        { _id: userID },
        { $unset: { [`address.${index}`]: "" } },
        { new: true }
      );
      const userData = await user.findOneAndUpdate(
        { _id: userID },
        { $pull: { address: null } },
        { new: true }
      );
      res.json({ addresses: userData.address });
    } else if (req.body.edit) {
      const index = req.body.edit;
      const { name, locality, city, house, landmark, state, pin, mobile } =
        req.body;
      const address = {
        name: name,
        locality: locality,
        city: city,
        house: house,
        landmark: landmark,
        state: state,
        pin: pin,
        mobile: mobile,
      };
      userData = await user.findOneAndUpdate(
        { _id: userID },
        { $set: { [`address.${index}`]: address } },
        { new: true }
      );
      res.json({ addresses: userData.address });
    } else {
      const { name, locality, city, house, landmark, state, pin, mobile } =
        req.body;
      const address = {
        name: name,
        locality: locality,
        city: city,
        house: house,
        landmark: landmark,
        state: state,
        pin: pin,
        mobile: mobile,
      };
      userData = await user.findOneAndUpdate(
        { _id: userID },
        { $push: { address: address } },
        { new: true }
      );
      res.json({ addresses: userData.address });
    }
  } catch (err) {
    next(err);
  }
};

const wallet = async (req, res, next) => {
  try {
    const { userID, cartCount } = req.session.userDetails;
    const userData = await user.findOne(
      { _id: userID },
      { name: 1, email: 1, wallet: 1 }
    );
    userData.cartCount = cartCount;
    res.render("userWallet", { userData, searchInput: "" });
  } catch (err) {
    next(err);
  }
};

const downloadInvoice = async (req, res, next) => {
  try {
    const orders = await order.find({}, { _id: 1 });
    const orderId = new ObjectId(req.query.order_id);
    const unitId = new ObjectId(req.query.unit_id);
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
    const doc = new PDFDocument({ font: "Times-Roman" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachement;filename="Order invoice-${orderItem.orderId}.pdf"`
    );
    doc.pipe(res);
    doc.fontSize(18).text(`RUBIKAT ORDER INVOICE`, { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Order ID: ${orderItem.orderId}`, { align: "left" });
    doc.lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.25);
    doc.fontSize(12).text("Product Name", { align: "left", continued: true });
    doc.fontSize(12).text("Qty", { align: "center", continued: true });
    doc.fontSize(12).text("Price", { align: "right" });
    doc.moveDown(0.25);
    doc.lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    doc.moveDown();
    doc
      .fontSize(12)
      .text(`${orderItem.items[0].product.name}`, {
        align: "left",
        continued: true,
      });
    doc.fontSize(12).text(`1`, { align: "center", continued: true });
    doc.fontSize(12).text(`Rs.${orderItem.items[0].price}`, { align: "right" });
    doc.moveDown();
    doc.moveDown();
    doc.lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.25);
    doc.fontSize(12).text("Total", { align: "left", continued: true });
    doc.fontSize(12).text(`Rs.${orderItem.items[0].price}`, { align: "right" });
    doc.moveDown(0.25);
    doc.lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    doc.moveDown();
    doc
      .fontSize(12)
      .text(`Ordered Date: ${orderItem.start_date.toLocaleDateString()}`);
    doc.moveDown();
    doc.fontSize(12).text(`Payment Method: ${orderItem.paymentType}`);
    doc.moveDown();
    const [address] = orderItem.address;
    doc
      .fontSize(12)
      .text(
        `Shipping Address: ${address.name},${address.locality},${address.city},${address.house},${address.landmark},${address.state},${address.pin},${address.mobile}`,
        { width: 300 }
      );
    doc.moveDown();
    doc.moveDown();
    doc.moveDown();
    doc.moveDown();
    doc.lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.25);
    doc
      .fontSize(14)
      .text("Thank you for shopping with us!", { align: "center" });
    doc.end();
  } catch (err) {
    next(err);
  }
};

////////////////////////user-wishlist/////////////////////
const userWishlist = async (req, res, next) => {
  try {
    const { userID, cartCount } = req.session.userDetails;
    const userData = await user
      .findOne({ _id: userID }, { wishlist: 1, name: 1 })
      .populate("wishlist");
    userData.cartCount = cartCount;
    res.render("wishlist", { userData, searchInput: "" });
  } catch (err) {
    next(err);
  }
};

const wishlist = async (req, res, next) => {
  try {
    const { userID } = req.session.userDetails;
    const { productId, status } = req.query;
    if (status == "add") {
      await user.updateOne({ _id: userID }, { $push: { wishlist: productId } });
      res.json({ message: "added" });
    } else {
      await user.updateOne({ _id: userID }, { $pull: { wishlist: productId } });
      res.json({ message: "removed" });
    }
  } catch (err) {
    next(err);
  }
};

module.exports = {
  userSignup,
  submitUserSignup,
  userLogin,
  submitUserLogin,
  userLogout,
  home,
  products,
  categories,
  searchSuggestions,
  contact,
  profile,
  profileEdit,
  address,
  productDetails,
  saveAddress,
  wallet,
  downloadInvoice,
  userWishlist,
  wishlist,
};
