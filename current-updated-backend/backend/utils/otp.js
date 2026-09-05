// In-memory OTP store. No real SMS — OTP is printed to the server console.
// Swap this for Firebase/Twilio later; the request/verify contract stays the same.
const otpStore = new Map(); // normalized phone -> { code, expiresAt }

function getOtpKey(phone) {
  if (!phone) return '';
  const digits = phone.toString().replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function requestOtp(phone) {
  const code = '123456'; // fixed code for demo speed; swap for random + real SMS later
  const key = getOtpKey(phone);
  otpStore.set(key, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
  console.log(`[MOCK SMS] OTP for ${phone} (key: ${key}): ${code}`);
  return code;
}

function verifyOtp(phone, code) {
  const key = getOtpKey(phone);
  const entry = otpStore.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) return false;
  return entry.code === code.toString().trim();
}

module.exports = { requestOtp, verifyOtp };
