const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: "dbcnoncz2",
  api_key: "565745529828312",
  api_secret: "Of5s4_19Md0GCINZRmkXXKWKe4M"
});

const app = express();
app.use(cors());
app.use(express.json());
  
/* -------------------- MongoDB -------------------- */
mongoose
  .connect( "mongodb+srv://karansharma:kransiar@cluster0.umieigv.mongodb.net/myAppDB?retryWrites=true&w=majority"
)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));


/* -------------------- Schemas -------------------- */
const adminSchema = new mongoose.Schema({
  name: String,
  phone: Number,
  email: String,
  program: String,
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  fullName: String,
  dob: Date,
  gender: String,
  category: String,
  fatherName: String,
  motherName: String,
  previousSchool: String,
  course: String,
  createdAt: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  name: String,
  email: String,
  subject: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});

const newsSchema = new mongoose.Schema({
  title: String,
  description: String,
  image: String,
  public_id:String,
  createdAt: { type: Date, default: Date.now }
});

/* -------------------- Models -------------------- */
const Admin = mongoose.model("Admin", adminSchema);
const User = mongoose.model("User", userSchema);
const Message = mongoose.model("Message", messageSchema);
const News = mongoose.model("News", newsSchema);

/* -------------------- Auth Middleware -------------------- */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token" });

  const token = authHeader.split(" ")[1];
  try {
    req.admin = jwt.verify(token, "SECRET_KEY");
    next();
  } catch {
    res.status(403).json({ message: "Invalid token" });
  }
};

/* -------------------- Multer -------------------- */
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Cloudinary
cloudinary.config({
  cloud_name: "YOUR_CLOUD_NAME",
  api_key: "YOUR_API_KEY",
  api_secret: "YOUR_API_SECRET"
});

// Multer storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "news_images",          // folder in Cloudinary
    allowed_formats: ["jpg", "png", "jpeg"],
    transformation: [{ width: 800, crop: "limit" }] // optional image resizing
  }
});

// Multer upload using Cloudinary storage
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith("image/")
      ? cb(null, true)
      : cb(new Error("Only images allowed"))
});

/* -------------------- LOGIN -------------------- */
const adminCredentials = { UserId: "karan", password: "12345678" };
app.post("/login", (req, res) => {
  const { UserId, password } = req.body;

  if (
    UserId === adminCredentials.UserId &&
    password === adminCredentials.password
  ) {
    const token = jwt.sign({ role: "admin" }, "SECRET_KEY", {
      expiresIn: "1h"
    });
    return res.json({ success: true, token });
  }

  res.status(401).json({ success: false, message: "Invalid credentials" });
});

/* -------------------- FORGOT PASSWORD (OTP) -------------------- */
const ADMIN_EMAIL = "karan413193sharma@gmail.com"; // fixed email
let generatedOTP = null;
let otpExpiry = null;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "karan413193sharma@gmail.com",
    pass: "thoj lpeh zorn dcrm"
  }
});

app.post("/forgot", async (req, res) => {
  try {
    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    otpExpiry = Date.now() + 5 * 60 * 1000; // 5 min

    await transporter.sendMail({
      from: "Admin Panel <karan413193sharma@gmail.com>",
      to: ADMIN_EMAIL,
      subject: "Admin OTP Verification",
      html: `<h2>Your OTP</h2><h1>${generatedOTP}</h1>`
    }); 
    res.json({ success: true, message: "OTP sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

/* -------------------- VERIFY OTP -------------------- */
app.post("/verify", (req, res) => {
  const { otp } = req.body;

  if (!generatedOTP || Date.now() > otpExpiry) {
    return res.status(400).json({ success: false, message: "OTP expired" });
  }

  if (otp !== generatedOTP) {
    return res.status(400).json({ success: false, message: "Invalid OTP" });
  }

  const token = jwt.sign({ role: "admin" }, "SECRET_KEY", {
    expiresIn: "1h"
  });

  generatedOTP = null;
  otpExpiry = null;

  res.json({ success: true, token });
});

/* -------------------- CRUD -------------------- */
app.post("/admins", async (req, res) => {
  await Admin.create(req.body);
  res.json({ message: "Admin saved" });
});

app.post("/users", async (req, res) => {
  await User.create(req.body);
  res.json({ message: "User saved" });
});

app.post("/messages", async (req, res) => {
  await Message.create(req.body);
  res.json({ message: "Message saved" });
});

app.get("/admins", authMiddleware, async (req, res) => {
  res.json(await Admin.find().sort({ createdAt: -1 }));
});

app.get("/users", authMiddleware, async (req, res) => {
  res.json(await User.find().sort({ createdAt: -1 }));
});

app.get("/messages", authMiddleware, async (req, res) => {
  res.json(await Message.find().sort({ createdAt: -1 }));
});

/* -------------------- NEWS -------------------- */
app.post("/news", authMiddleware, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Image required" });

  const news = await News.create({
    title: req.body.title,
    description: req.body.description,
    image: req.file.path,
    public_id: req.file.filename
  });

  res.status(201).json(news);
});

app.get("/news", async (req, res) => {
  res.json(await News.find().sort({ createdAt: -1 }).limit(5));
});

// Get single news by ID
app.get("/news/:id", async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ message: "News not found" });
    res.json(news);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch news" });
  }
});

app.delete("/news/:id", authMiddleware, async (req, res) => {
  const news = await News.findById(req.params.id);
  if (!news) return res.status(404).json({ message: "Not found" });

  
  if (news.public_id) {
    try {
      await cloudinary.uploader.destroy(news.public_id);
    } catch (err) {
      console.error("Cloudinary delete error:", err);
    }
  }

  await News.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

/* -------------------- SERVER -------------------- */
const PORT = process.env.PORT || 4005;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
