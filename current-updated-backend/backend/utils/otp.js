// In-memory OTP store. No real SMS — OTP is printed to the server console.
// Swap this for Firebase/Twilio later; the request/verify contract stays the same.
const otpStore = new Map(); // phone -> { code, expiresAt }

function requestOtp(phone) {
  const code = '123456'; // fixed code for demo speed; swap for random + real SMS later
  otpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
  console.log(`[MOCK SMS] OTP for ${phone}: ${code}`);
  return code;
}

function verifyOtp(phone, code) {
  const entry = otpStore.get(phone);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) return false;
  return entry.code === code;
}

module.exports = { requestOtp, verifyOtp };
