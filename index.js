require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require("path");
const axios = require("axios");   // ✅ Added axios to call Flask API
const NotificationService = require("./services/notificationService");
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const app = express();


const API_KEY = process.env.NEWS_API_KEY || "679b913ddb014617bcc93a0bb89ee1ee";

// Initialize notification service
const notificationService = new NotificationService();
// Helper: normalize probability (number 0..1 or string '75%')
function parseProbabilityToNumber(prob) {
  if (typeof prob === 'string') {
    const m = prob.trim().match(/([0-9]*\.?[0-9]+)\s*%/);
    if (m) return Math.min(1, Math.max(0, parseFloat(m[1]) / 100));
    const asNum = parseFloat(prob);
    if (!Number.isNaN(asNum)) {
      return asNum > 1 ? Math.min(1, asNum / 100) : Math.min(1, Math.max(0, asNum));
    }
    return 0;
  }
  if (typeof prob === 'number') {
    return prob > 1 ? Math.min(1, prob / 100) : Math.min(1, Math.max(0, prob));
  }
  return 0;
}
function formatProbability(percent0to1) {
  return `${Math.round(percent0to1 * 100)}%`;
}

// Alert function
async function sendRockfallAlert(riskLevel, probability, inputData) {
  try {
    // Get all active users who should receive alerts
    const users = await User.find({ 
      isActive: true,
      $or: [
        { 'notificationPreferences.email': true },
        { 'notificationPreferences.sms': true }
      ]
    });

    if (users.length === 0) {
      console.log('No users to notify');
      return;
    }

    // Create alert message
    const alertMessage = `Rockfall risk detected! Risk level: ${riskLevel}. Probability: ${(probability * 100).toFixed(1)}%. Immediate action required.`;
    const alertSubject = `Rockfall Alert - ${riskLevel} Risk Level`;

    // Send notifications
    const results = await notificationService.sendBulkNotifications(users, {
      subject: alertSubject,
      message: alertMessage,
      riskLevel: riskLevel
    });

    console.log('Alert sent:', results);

    // Update last notification time for users
    await User.updateMany(
      { _id: { $in: users.map(u => u._id) } },
      { lastNotification: new Date() }
    );

  } catch (error) {
    console.error('Error sending rockfall alert:', error);
  }
}

// ====== Middleware ======
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
  secret: "mysecretkey", // use a strong secret in production
  resave: false,
  saveUninitialized: false
}));

// ====== MongoDB Setup ======
mongoose.connect("mongodb://127.0.0.1:27017/loginDemo", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// ====== User Schema ======
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  phone: String,
  notificationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    riskThreshold: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'HIGH' }
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  isActive: { type: Boolean, default: true },
  lastNotification: Date
});
const User = mongoose.model("User", userSchema);

// ====== Routes ======

// Home page
app.get("/", (req, res) => {
  res.render("index");
});

// Register Page
app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const newUser = new User({ 
      username, 
      email, 
      password: hashedPassword,
      notificationPreferences: {
        email: true,
        sms: false,
        riskThreshold: 'HIGH'
      }
    });
    await newUser.save();
    req.session.userId = newUser._id;
    req.session.user = newUser; // Store user object in session
    res.redirect("/dashboard");
  } catch (err) {
    res.send("User already exists or error occurred.");
  }
});

// Login Page
app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (user && await bcrypt.compare(password, user.password)) {
    req.session.userId = user._id;
    req.session.user = user; // Store user object in session
    res.redirect("/dashboard");
  } else {
    res.send("Invalid username or password");
  }
});

// Dashboard
app.get("/dashboard", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }
    req.session.user = user; // Store user in session for other routes
    res.render("dashboard", { username: user.username, user: user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.redirect("/login");
  }
});

app.get("/news", async (req, res) => {
  try {
    const response = await axios.get(
      `https://newsapi.org/v2/top-headlines?country=in&apiKey=${API_KEY}`
    );
    const data = response.data;

    res.render("layout", { news: data.articles });
  } catch (error) {
    console.error("Error fetching news:", error.message);
    res.status(500).send("Error fetching news. Please try again later.");
  }
});

// Search news
app.get("/search", async (req, res) => {
  try {
    const searchTerm = req.query.search;
    const response = await axios.get(
      `https://newsapi.org/v2/everything?q=${searchTerm}&apiKey=${API_KEY}`
    );
    const data = response.data.articles;

    res.render("layout", { news: data });
  } catch (error) {
    console.error("Error fetching search results:", error.message);
    res.status(500).send("Error fetching search results. Please try again later.");
  }
});

// Sort by date
app.get("/sort-by-date", async (req, res) => {
  try {
    const response = await axios.get(
      `https://newsapi.org/v2/top-headlines?country=in&apiKey=${API_KEY}`
    );
    const data = response.data.articles;

    data.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    res.render("layout", { news: data });
  } catch (error) {
    console.error("Error sorting articles by date:", error.message);
    res.status(500).send("Error sorting articles by date. Please try again later.");
  }
});

// News by specific date
app.get("/news-by-date", async (req, res) => {
  try {
    const date = req.query.date; // format: YYYY-MM-DD
    const response = await axios.get(
      `https://newsapi.org/v2/everything?q=*&from=${date}&to=${date}&sortBy=popularity&apiKey=${API_KEY}`
    );
    const data = response.data.articles;

    res.render("layout", { news: data });
  } catch (error) {
    console.error("Error fetching news by date:", error.message);
    res.status(500).send("Error fetching news by date. Please try again later.");
  }
});


// ===== Location Page =====
app.get("/location", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  res.render("location");
});

// ===== Precaution Page =====
app.get("/precaution", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  res.render("precaution");
});

// ===== Prediction Page =====
app.get("/prediction", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  res.render("prediction", { result: null, imageResult: null });
});

// Handle Prediction Form
app.post("/prediction", async (req, res) => {
  try {
    const response = await axios.post("http://localhost:5000/predict", {
      Rainfall_mm: parseFloat(req.body.Rainfall_mm),
      Slope_Angle: parseFloat(req.body.Slope_Angle),
      Soil_Saturation: parseFloat(req.body.Soil_Saturation),
      Vegetation_Cover: parseFloat(req.body.Vegetation_Cover),
      Earthquake_Activity: parseFloat(req.body.Earthquake_Activity),
      Proximity_to_Water: parseFloat(req.body.Proximity_to_Water),
      Soil_Type_Gravel: parseInt(req.body.Soil_Type_Gravel),
      Soil_Type_Sand: parseInt(req.body.Soil_Type_Sand),
      Soil_Type_Silt: parseInt(req.body.Soil_Type_Silt)
    });

    const prediction = response.data;
    const probNum = parseProbabilityToNumber(prediction.probability);
    
    // Determine risk level based on probability
    let riskLevel = 'LOW';
    if (probNum >= 0.8) riskLevel = 'CRITICAL';
    else if (probNum >= 0.6) riskLevel = 'HIGH';
    else if (probNum >= 0.4) riskLevel = 'MEDIUM';

    // Send alerts if risk is high enough
    if (prediction.prediction === 1 && probNum >= 0.4) {
      await sendRockfallAlert(riskLevel, probNum, req.body);
    }

    res.render("prediction", { result: { ...prediction, displayProbability: formatProbability(probNum) }, riskLevel: riskLevel, imageResult: null });
  } catch (error) {
    console.error(error.message);
    res.render("prediction", { result: { error: "Prediction service unavailable" }, imageResult: null });
  }
});

// Image Prediction (upload image and get prediction)
app.post("/prediction/image", upload.single('image'), async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }

  try {
    if (!req.file) {
      return res.render("prediction", { result: null, imageResult: { error: "No image uploaded" } });
    }

    const imageBase64 = req.file.buffer.toString('base64');
    const response = await axios.post("http://localhost:5000/predict_image", {
      image_base64: imageBase64
    });

    const imagePrediction = response.data; // expected: { prediction, probability }
    const imgProbNum = parseProbabilityToNumber(imagePrediction.probability);

    let imageRiskLevel = 'LOW';
    if (imgProbNum >= 0.8) imageRiskLevel = 'CRITICAL';
    else if (imgProbNum >= 0.6) imageRiskLevel = 'HIGH';
    else if (imgProbNum >= 0.4) imageRiskLevel = 'MEDIUM';

    res.render("prediction", { result: null, imageResult: { ...imagePrediction, displayProbability: formatProbability(imgProbNum), probability: imgProbNum, riskLevel: imageRiskLevel } });
  } catch (error) {
    console.error('Image prediction error:', error.message);
    res.render("prediction", { result: null, imageResult: { error: "Image prediction service unavailable" } });
  }
});

// Notification Management Routes
app.get("/notifications", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }
    res.render("notifications", { user: user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.redirect("/login");
  }
});

app.post("/notifications/update", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }

  try {
    const { email, sms, riskThreshold, phone, latitude, longitude, address } = req.body;
    
    await User.findByIdAndUpdate(req.session.userId, {
      phone: phone,
      'notificationPreferences.email': email === 'on',
      'notificationPreferences.sms': sms === 'on',
      'notificationPreferences.riskThreshold': riskThreshold,
      location: {
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        address: address
      }
    });

    req.session.user = await User.findById(req.session.userId);
    res.redirect("/notifications?success=1");
  } catch (error) {
    console.error('Error updating notifications:', error);
    res.redirect("/notifications?error=1");
  }
});

app.post("/notifications/test", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }

  try {
    const user = await User.findById(req.session.userId);
    const results = await notificationService.testNotification(user.email, user.phone);
    
    res.json({ success: true, results: results });
  } catch (error) {
    console.error('Error testing notifications:', error);
    res.json({ success: false, error: error.message });
  }
});

// Manual alert trigger (for testing)
app.post("/admin/send-alert", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }

  try {
    const { riskLevel, message } = req.body;
    const testData = {
      Rainfall_mm: 50,
      Slope_Angle: 30,
      Soil_Saturation: 0.8,
      Vegetation_Cover: 0.3,
      Earthquake_Activity: 0.2,
      Proximity_to_Water: 0.7,
      Soil_Type_Gravel: 1,
      Soil_Type_Sand: 0,
      Soil_Type_Silt: 0
    };

    await sendRockfallAlert(riskLevel || 'HIGH', 0.75, testData);
    res.json({ success: true, message: 'Test alert sent successfully' });
  } catch (error) {
    console.error('Error sending test alert:', error);
    res.json({ success: false, error: error.message });
  }
});

// Setup Guide
app.get("/setup", (req, res) => {
  res.render("setup", { 
    title: "Setup Guide - RockfallAI",
    message: "Configure your notification system"
  });
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// ====== Start Server ======
app.listen(3000, () => console.log("Server running on http://localhost:3000"));
