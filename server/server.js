require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { google } = require("googleapis");
const nodemailer = require("nodemailer");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json());

/* =========================
   DATABASE
========================= */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  gmail: String,
  refreshToken: String,
});

const User = mongoose.model("User", UserSchema);

/* =========================
   JWT MIDDLEWARE
========================= */

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

/* =========================
   LOGIN
========================= */

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ message: "User not found" });
  if (user.password !== password)
    return res.status(400).json({ message: "Invalid password" });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  res.json({ token });
});

/* =========================
   GOOGLE OAUTH2 SETUP
========================= */

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://fast-mail.onrender.com/oauth2callback",
);

/* =========================
   STEP 1: CONNECT GMAIL
========================= */

app.get("/auth/google", async (req, res) => {
  const token = req.query.token;

  if (!token) {
    return res.status(401).json({ message: "No token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const url = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/gmail.send"],
      prompt: "consent",
      state: user._id.toString(),
    });

    res.redirect(url);
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
});

/* =========================
   STEP 2: CALLBACK
========================= */

app.get("/oauth2callback", async (req, res) => {
  const { code, state } = req.query;

  console.log("State received:", state); // Log the state to make sure it matches user ID

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    const user = await User.findById(state);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    user.refreshToken = tokens.refresh_token;
    await user.save();

    res.send(" Gmail connected successfully! You can close this tab.");
  } catch (error) {
    console.error("Error in /oauth2callback:", error);
    res.status(500).send("Authentication failed");
  }
});

/* =========================
   SEND EMAIL
========================= */

app.post("/send-mails", authMiddleware, async (req, res) => {
  const { senderName, subject, message, recipients } = req.body;

  try {
    if (!req.user.refreshToken) {
      return res.status(400).json({ message: "Please connect Gmail first." });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: req.user.gmail,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: req.user.refreshToken,
      },
    });

    const emailList = recipients
      .split(/[\n,]+/)
      .map((email) => email.trim())
      .filter((email) => email);

    await transporter.sendMail({
      from: `"${senderName}" <${req.user.gmail}>`,
      bcc: emailList,
      subject,
      text: message,
    });

    res.json({
      success: true,
      message: `Sent to ${emailList.length} emails successfully!`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send emails" });
  }
});

/* =========================
   START SERVER
========================= */

app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`),
);
