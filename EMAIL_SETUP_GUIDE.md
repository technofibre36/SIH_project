# 📧 Email Notification Setup Guide

## Quick Setup (5 minutes)

### Step 1: Get Gmail App Password

1. **Go to your Google Account**: https://myaccount.google.com/
2. **Security** → **2-Step Verification** (enable if not already)
3. **App passwords** → **Select app** → **Mail**
4. **Generate** a 16-character password (save this!)

### Step 2: Configure Your Email

1. **Open** `config.env` file in your project
2. **Replace** the email settings:
   ```env
   EMAIL_USER=your-actual-email@gmail.com
   EMAIL_PASS=your-16-character-app-password
   ```

### Step 3: Test the System

1. **Restart** the server: `node index.js`
2. **Go to** http://localhost:3000
3. **Register/Login** to your account
4. **Go to** Notifications page
5. **Click** "Test Email" button

## 🎯 What You'll Get

- ✅ **Instant email alerts** when rockfall risk is detected
- ✅ **Customizable risk thresholds** (LOW/MEDIUM/HIGH/CRITICAL)
- ✅ **Professional email templates** with risk details
- ✅ **Location-based alerts** (if you add location)

## 📱 Email Features

### Alert Types:
- **🔴 CRITICAL**: Probability ≥ 80% - Immediate action required
- **🟠 HIGH**: Probability ≥ 60% - High risk detected
- **🟡 MEDIUM**: Probability ≥ 40% - Moderate risk
- **🟢 LOW**: Probability < 40% - Low risk

### Email Content:
- Risk level and probability
- Geological data that triggered the alert
- Timestamp and location
- Safety recommendations
- Contact information

## 🔧 Troubleshooting

### "Authentication failed"
- ✅ Check your email address is correct
- ✅ Use App Password, not your regular password
- ✅ Make sure 2-Factor Authentication is enabled

### "Email not sending"
- ✅ Check internet connection
- ✅ Verify Gmail settings
- ✅ Check server logs for errors

### "User not found"
- ✅ Make sure you're logged in
- ✅ Check if user has email in profile

## 🚀 Advanced Configuration

### Custom SMTP (Other Email Providers)
Edit `services/notificationService.js`:
```javascript
this.emailTransporter = nodemailer.createTransport({
  host: 'smtp.your-provider.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
```

### Email Templates
Customize email content in `services/notificationService.js`:
- Subject lines
- Email body
- HTML formatting
- Risk level styling

## 📊 Testing Your Setup

1. **Test Email**: Send a test email to verify configuration
2. **Test Prediction**: Run a prediction with high-risk data
3. **Check Logs**: Monitor server console for email status
4. **Verify Delivery**: Check your email inbox

## 🎉 Success!

Once configured, your RockfallAI system will:
- Automatically send email alerts when high-risk conditions are detected
- Provide detailed geological analysis in each email
- Allow users to customize their notification preferences
- Support multiple users with individual settings

**Ready to save lives with AI-powered early warning!** 🚨

