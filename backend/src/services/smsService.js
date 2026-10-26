/**
 * SMS Dispatch Service for QuickShare
 * 
 * Supports:
 * 1. Fast2SMS (Free signup credits, delivers real SMS to Indian mobile numbers)
 * 2. Twilio (Worldwide SMS dispatch)
 * 3. Secure Server-Side Logging (for zero-cost self-hosted evaluation without third-party accounts)
 * 
 * NOTE: For strict security, the OTP is NEVER returned to the client browser.
 */

export async function sendSmsOtp(phoneNumber, otp) {
  const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '').trim();
  const digitsOnly = cleanPhone.replace(/[^0-9]/g, '');

  // 1. Try Fast2SMS if API key is provided (popular 100% free signup credits in India)
  const fast2smsKey = process.env.FAST2SMS_API_KEY;
  if (fast2smsKey) {
    try {
      // 10-digit phone number for India
      const targetPhone = digitsOnly.slice(-10);
      const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(fast2smsKey)}&route=otp&variables_values=${encodeURIComponent(otp)}&flash=0&numbers=${encodeURIComponent(targetPhone)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'cache-control': 'no-cache' }
      });
      const data = await response.json();
      if (data.return) {
        console.log(`[Fast2SMS] ✅ Real SMS successfully dispatched to ${targetPhone}`);
        return { success: true, provider: 'fast2sms' };
      } else {
        console.warn(`[Fast2SMS] Provider error:`, data.message);
      }
    } catch (err) {
      console.error(`[Fast2SMS] Failed to send SMS:`, err.message);
    }
  }

  // 2. Try Twilio if credentials are provided
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
  if (twilioSid && twilioToken && twilioFrom) {
    try {
      const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const bodyParams = new URLSearchParams();
      bodyParams.append('To', cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`);
      bodyParams.append('From', twilioFrom);
      bodyParams.append('Body', `Your QuickShare verification code is: ${otp}. Valid for 5 minutes.`);

      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: bodyParams.toString()
        }
      );
      if (twilioRes.ok) {
        console.log(`[Twilio] ✅ Real SMS successfully dispatched to ${cleanPhone}`);
        return { success: true, provider: 'twilio' };
      }
    } catch (err) {
      console.error(`[Twilio] Failed to dispatch SMS:`, err.message);
    }
  }

  // 3. Secure Server-Side Notification
  // The OTP is logged ONLY in the server terminal for the system operator.
  // It is NEVER transmitted over the wire to the frontend browser, preventing unauthorized access.
  console.log(`\n========================================================`);
  console.log(`📱 [QuickShare SMS Gateway]`);
  console.log(`Recipient Mobile : ${cleanPhone}`);
  console.log(`Secure OTP Code  : ${otp}`);
  console.log(`Valid Duration   : 5 Minutes`);
  console.log(`(To deliver directly to physical cellular phones, set FAST2SMS_API_KEY in backend/.env)`);
  console.log(`========================================================\n`);

  return { success: true, provider: 'console_secure' };
}
