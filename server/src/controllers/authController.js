const crypto = require("crypto");
const { query } = require("../config/db");
const { neonEnabled, signLocalToken } = require("../config/neonAuth");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

const verifyPassword = (password, stored) => {
  const [salt, expected] = String(stored || "").split(":");
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString("hex");
  return expected.length === actual.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
};

const ensureLocalAuth = () => {
  if (neonEnabled) {
    throw ApiError.badRequest("Local authentication is disabled while Neon Auth is configured");
  }
};

const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url || null });

const register = asyncHandler(async (req, res) => {
  ensureLocalAuth();
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (name.length < 1 || name.length > 100) throw ApiError.badRequest("Name must be between 1 and 100 characters");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw ApiError.badRequest("A valid email is required");
  if (password.length < 8) throw ApiError.badRequest("Password must be at least 8 characters");

  try {
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
       RETURNING id, name, email, avatar_url`,
      [name, email, hashPassword(password)],
    );
    const user = publicUser(rows[0]);
    res.status(201).json({ user, token: await signLocalToken(user) });
  } catch (err) {
    if (err.code === "23505") throw ApiError.conflict("An account with that email already exists");
    throw err;
  }
});

const login = asyncHandler(async (req, res) => {
  ensureLocalAuth();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const { rows } = await query("SELECT id, name, email, avatar_url, password_hash FROM users WHERE email = $1", [email]);
  const user = rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) throw ApiError.unauthorized("Invalid email or password");
  const safeUser = publicUser(user);
  res.json({ user: safeUser, token: await signLocalToken(safeUser) });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

module.exports = { register, login, me };
