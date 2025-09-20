// Test Email Configuration
require('dotenv').config();
const NotificationService = require('./services/notificationService');

async function testEmail() {
  console.log('🧪 Testing Email Configuration...\n');
  
  // Check environment variables
  console.log('📋 Configuration Check:');
  console.log(`EMAIL_USER: ${process.env.EMAIL_USER ? '✅ Set' : '❌ Not set'}`);
  console.log(`EMAIL_PASS: ${process.env.EMAIL_PASS ? '✅ Set' : '❌ Not set'}`);
  console.log('');
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('❌ Email configuration missing!');
    console.log('📝 Please update config.env file with your Gmail credentials');
    console.log('📖 See EMAIL_SETUP_GUIDE.md for detailed instructions');
    return;
  }
  
  try {
    // Initialize notification service
    const notificationService = new NotificationService();
    
    // Test email
    console.log('📧 Sending test email...');
    const result = await notificationService.sendEmailNotification(
      process.env.EMAIL_USER, // Send to yourself
      'RockfallAI Test Email',
      'This is a test email from your RockfallAI system. If you receive this, your email configuration is working correctly!',
      'TEST'
    );
    
    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log('📬 Check your inbox for the test email');
    } else {
      console.log('❌ Email failed:', result.error);
    }
    
  } catch (error) {
    console.log('❌ Error testing email:', error.message);
  }
}

// Run the test
testEmail();

