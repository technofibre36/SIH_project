# RockfallAI Notification System Setup Guide

## Overview
The RockfallAI system now includes comprehensive early warning notifications through SMS and email. This guide will help you set up the notification services.

## Features
- ✅ Email notifications with rich HTML templates
- ✅ SMS notifications via Twilio
- ✅ Customizable risk thresholds
- ✅ User location tracking
- ✅ Test notification functionality
- ✅ Bulk alert system

## Setup Instructions

### 1. Email Configuration (Gmail)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. **Set Environment Variables**:
   ```bash
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-character-app-password
   ```

### 2. SMS Configuration (Twilio)

1. **Create Twilio Account**:
   - Sign up at [twilio.com](https://www.twilio.com)
   - Verify your phone number
2. **Get Credentials**:
   - Account SID (from dashboard)
   - Auth Token (from dashboard)
   - Phone Number (purchase a Twilio number)
3. **Set Environment Variables**:
   ```bash
   TWILIO_ACCOUNT_SID=your-account-sid
   TWILIO_AUTH_TOKEN=your-auth-token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

### 3. Environment Variables

Create a `.env` file in your project root:

```env
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/rockfall-ai

# Server Configuration
PORT=3000
FLASK_PORT=5000
```

### 4. Install dotenv (Optional)

For automatic environment variable loading:

```bash
npm install dotenv
```

Then add to the top of `index.js`:
```javascript
require('dotenv').config();
```

## How It Works

### 1. Risk Assessment
- The AI model predicts rockfall probability (0-1)
- Risk levels are determined based on probability:
  - **LOW**: 40-59% probability
  - **MEDIUM**: 60-79% probability
  - **HIGH**: 80-89% probability
  - **CRITICAL**: 90%+ probability

### 2. Alert Triggers
- Alerts are sent when:
  - Prediction = 1 (rockfall predicted)
  - Probability ≥ 40%
  - User's risk threshold is met

### 3. Notification Types

#### Email Notifications
- Rich HTML templates with safety instructions
- Professional design with risk level indicators
- Detailed information about the threat
- Emergency action steps

#### SMS Notifications
- Concise text messages
- Immediate delivery
- Critical information only
- Emergency contact format

### 4. User Management
- Users can configure notification preferences
- Set risk thresholds
- Add phone numbers and locations
- Test notification settings

## Usage

### 1. User Registration
- Users register with email and optional phone
- Default settings: Email enabled, SMS disabled
- Risk threshold: HIGH

### 2. Notification Settings
- Access via `/notifications` route
- Configure email/SMS preferences
- Set risk threshold
- Add location information
- Test notifications

### 3. Automatic Alerts
- System monitors predictions continuously
- Sends alerts when conditions are met
- Tracks notification history
- Prevents spam with cooldown periods

## Testing

### 1. Test Individual Notifications
- Use the test buttons in notification settings
- Verify email delivery
- Check SMS delivery

### 2. Test Alert System
- Use the admin test alert endpoint
- Simulate high-risk conditions
- Verify bulk notification delivery

### 3. Monitor Logs
- Check console for notification status
- Monitor delivery success rates
- Track error messages

## Customization

### 1. Email Templates
- Modify `generateEmailTemplate()` in `notificationService.js`
- Customize HTML/CSS styling
- Add company branding

### 2. SMS Messages
- Update message format in `sendSMSNotification()`
- Add custom information
- Modify character limits

### 3. Risk Thresholds
- Adjust probability thresholds in prediction route
- Customize risk level definitions
- Add new risk categories

## Troubleshooting

### Common Issues

1. **Email Not Sending**
   - Check Gmail app password
   - Verify 2FA is enabled
   - Check firewall settings

2. **SMS Not Sending**
   - Verify Twilio credentials
   - Check phone number format
   - Ensure sufficient Twilio balance

3. **Database Errors**
   - Check MongoDB connection
   - Verify user schema updates
   - Check field validation

### Debug Mode
Enable detailed logging by setting:
```javascript
console.log('Notification results:', results);
```

## Security Considerations

1. **Environment Variables**
   - Never commit `.env` files
   - Use secure credential storage
   - Rotate passwords regularly

2. **Rate Limiting**
   - Implement notification cooldowns
   - Monitor spam prevention
   - Set daily limits

3. **Data Privacy**
   - Encrypt sensitive information
   - Comply with GDPR/CCPA
   - Secure user data storage

## Support

For technical support or questions:
- Check the console logs
- Review error messages
- Test with minimal configuration
- Contact system administrator

## Future Enhancements

- Push notifications
- WhatsApp integration
- Voice call alerts
- Mobile app notifications
- Advanced scheduling
- Geographic targeting
- Multi-language support

