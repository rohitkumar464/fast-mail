require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  }),
);

app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const User = mongoose.model("User", UserSchema);

app.get("/", (req, res) => {
  res.send("Fast Mail API is running");
});

app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`),
);

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });

  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  if (user.password !== password) {
    return res.status(400).json({ message: "Invalid password" });
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  res.json({ token });
});

app.post("/send-mails", async (req, res) => {
  const { senderName, gmail, appPassword, subject, message, recipients } =
    req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmail,
        pass: appPassword,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
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
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to send emails" });
  }
});

app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`),
);
