const { createRemoteJWKSet, jwtVerify, SignJWT } = require("jose");

const base = process.env.NEON_AUTH_URL
  ? process.env.NEON_AUTH_URL.replace(/\/$/, "")
  : null;
const jwksUrl = base ? `${base}/.well-known/jwks.json` : null;
const rawLocalSecret = process.env.JWT_SECRET ||
  (process.env.NODE_ENV === "production" ? "" : "inkwrite-local-development-secret");
if (!base && rawLocalSecret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters when Neon Auth is disabled");
}
const localSecret = new TextEncoder().encode(rawLocalSecret);

if (base) {
  console.log(`Neon Auth enabled - JWKS: ${jwksUrl}`);
} else {
  console.warn(
    "NEON_AUTH_URL is not set - using local JWT authentication. Set JWT_SECRET for non-development environments.",
  );
}

const jwks = base ? createRemoteJWKSet(new URL(jwksUrl)) : null;

const verify = async (token) => {
  if (base && String(token).split(".").length === 3) {
    const { payload } = await jwtVerify(token, jwks);
    return { email: payload.email, name: payload.name, sub: payload.sub || payload.id };
  }

  if (!base) {
    const { payload } = await jwtVerify(token, localSecret, { algorithms: ["HS256"] });
    return { email: payload.email, name: payload.name, sub: payload.sub };
  }

  const res = await fetch (`${base}/get-session`, { headers: { Authorization: `Bearer ${token}` } });

  if (!res.ok) throw new Error(`neon get-session ${res.status}`);
  const data = await res.json();
  const user = data?.user;
  if (!user?.email) throw new Error("neon session has no user");
  return { email: user.email, name: user.name, sub: user.id };
};

const signLocalToken = (user) =>
  new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(localSecret);

module.exports = { verify, signLocalToken, neonEnabled: Boolean(base) };
