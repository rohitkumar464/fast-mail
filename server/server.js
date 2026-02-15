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
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  }),
);

app.use(express.json());

// MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// User schema
const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
});
const User = mongoose.model("User", UserSchema);

// Login route
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

// Send email route using OAuth2 token
app.post("/send-mails", async (req, res) => {
  const { senderName, gmail, accessToken, subject, message, recipients } =
    req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: gmail,
        accessToken,
      },
    });

    const emailList = recipients
      .split(/[\n,]+/)
      .map((email) => email.trim())
      .filter((email) => email);

    await transporter.sendMail({
      from: `"${senderName}" <${gmail}>`,
      bcc: emailList,
      subject,
      text: message,
    });

    res.json({
      success: true,
      message: `Sent to ${emailList.length} emails successfully!`,
    });
  } catch (error) {
    console.error("Email send error:", error.response || error);
    res.status(500).json({ success: false, message: "Failed to send emails" });
  }
});

// Route to get OAuth2 URL
app.get("/auth-url", (req, res) => {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.CLIENT_URL}/oauth2callback`,
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.send"],
    prompt: "consent",
  });

  res.json({ url: authUrl });
});

// Exchange code for token
app.post("/get-token", async (req, res) => {
  const { code } = req.body;
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.CLIENT_URL}/oauth2callback`,
  );

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    res.json(tokens); // access_token, refresh_token
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to get access token" });
  }
});

app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`),
);
