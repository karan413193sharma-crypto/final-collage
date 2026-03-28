process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();

/* -------------------- STATIC -------------------- */
app.use(express.static(path.join(__dirname, "../SGGS-Collage")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../SGGS-Collage/index.html"));
});

/* -------------------- CORS -------------------- */
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(cors());

/* -------------------- BODY -------------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* -------------------- MongoDB -------------------- */
mongoose
  .connect("mongodb+srv://karansharma:kransiar@cluster0.umieigv.mongodb.net/myAppDB?retryWrites=true&w=majority")
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
  } catch (err) {
    console.error("JWT error:", err);
    res.status(403).json({ message: "Invalid token" });
  }
};

/* -------------------- MULTER (LOCAL) -------------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images allowed"));
  }
});

/* -------------------- LOGIN -------------------- */
const adminCredentials = { UserId: "karan", password: "12345678" };

app.post("/login", (req, res) => {
  const { UserId, password } = req.body;

  if (UserId === adminCredentials.UserId && password === adminCredentials.password) {
    const token = jwt.sign({ role: "admin" }, "SECRET_KEY", { expiresIn: "1h" });
    return res.json({ success: true, token });
  }

  res.status(401).json({ success: false, message: "Invalid credentials" });
});

/* -------------------- OTP -------------------- */
const ADMIN_EMAIL = "karan413193sharma@gmail.com";
let generatedOTP = null;
let otpExpiry = null;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: ADMIN_EMAIL,
    pass: "thoj lpeh zorn dcrm"
  }
});

app.post("/forgot", async (req, res) => {
  try {
    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    otpExpiry = Date.now() + 5 * 60 * 1000;

    await transporter.sendMail({
      from: "Admin Panel",
      to: ADMIN_EMAIL,
      subject: "OTP Verification",
      html: `<h1>${generatedOTP}</h1>`
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

app.post("/verify", (req, res) => {
  const { otp } = req.body;

  if (!generatedOTP || Date.now() > otpExpiry)
    return res.status(400).json({ message: "OTP expired" });

  if (otp !== generatedOTP)
    return res.status(400).json({ message: "Invalid OTP" });

  const token = jwt.sign({ role: "admin" }, "SECRET_KEY", { expiresIn: "1h" });

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
    image: `/uploads/${req.file.filename}`
  });

  res.status(201).json(news);
});

app.get("/news", async (req, res) => {
  res.json(await News.find().sort({ createdAt: -1 }).limit(5));
});

app.get("/news/:id", async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ message: "Not found" });
    res.json(news);
  } catch {
    res.status(500).json({ message: "Error" });
  }
});

app.delete("/news/:id", authMiddleware, async (req, res) => {
  const news = await News.findById(req.params.id);
  if (!news) return res.status(404).json({ message: "Not found" });

  if (news.image) {
  const filePath = path.join(process.cwd(), news.image);
    fs.unlink(filePath, (err) => {
      if (err) console.error("Delete error:", err);
    });
  }

  await News.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

/* -------------------- STATIC UPLOAD -------------------- */
app.use("/uploads", express.static("uploads"));

/* -------------------- SERVER -------------------- */
const PORT = process.env.PORT || 4005;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);