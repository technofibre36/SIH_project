const nodemailer = require('nodemailer');
const twilio = require('twilio');

class NotificationService {
  constructor() {
    // Email setup (Nodemailer)
    this.mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // SMS setup (Twilio)
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    this.twilioFrom = process.env.TWILIO_FROM_NUMBER;
    this.twilioClient = (twilioSid && twilioToken) ? twilio(twilioSid, twilioToken) : null;
  }

  async sendEmail(to, subject, text) {
    if (!to) return { success: false, error: 'Missing recipient email' };
    try {
      const info = await this.mailTransporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to,
        subject,
        text,
      });
      return { success: true, id: info.messageId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendSms(to, text) {
    if (!this.twilioClient) {
      return { success: false, error: 'Twilio not configured' };
    }
    if (!to) return { success: false, error: 'Missing recipient phone' };
    try {
      const msg = await this.twilioClient.messages.create({
        body: text,
        from: this.twilioFrom,
        to,
      });
      return { success: true, id: msg.sid };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendBulkNotifications(users, { subject, message, riskLevel }) {
    const results = [];

    for (const user of users) {
      const userResults = { userId: user._id.toString(), email: null, sms: null };

      if (user.notificationPreferences?.email && user.email) {
        userResults.email = await this.sendEmail(
          user.email,
          subject,
          `${message}\n\nUser: ${user.username}\nRisk Level: ${riskLevel}`
        );
      }

      if (user.notificationPreferences?.sms && user.phone) {
        userResults.sms = await this.sendSms(
          user.phone,
          `${message} | User: ${user.username} | Risk: ${riskLevel}`
        );
      }

      results.push(userResults);
    }

    return results;
  }

  async testNotification(email, phone) {
    const subject = 'RockfallAI Test Notification';
    const message = 'This is a test notification from RockfallAI.';
    const results = {};
    if (email) results.email = await this.sendEmail(email, subject, message);
    if (phone) results.sms = await this.sendSms(phone, message);
    return results;
  }
}

module.exports = NotificationService;
