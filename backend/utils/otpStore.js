// In-memory OTP store — chave: username, valor: { code, expiresAt }
const store = new Map();

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutos

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function saveOtp(user) {
  const code = generateCode();
  store.set(user, { code, expiresAt: Date.now() + OTP_TTL_MS });
  return code;
}

function verifyOtp(user, code) {
  const entry = store.get(user);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    store.delete(user);
    return false;
  }
  if (entry.code !== code) return false;
  store.delete(user); // uso único
  return true;
}

module.exports = { saveOtp, verifyOtp };
