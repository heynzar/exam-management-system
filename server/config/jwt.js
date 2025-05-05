import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;

export function generateToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: "1d" });
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}
