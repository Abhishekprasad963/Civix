import jwt from "jsonwebtoken";
import User, { isDemoAccount } from "../models/User.js";

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Token missing" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    return res.status(401).json({ error: "Invalid token" });
  }

  try {
    const user = await User.findById(decoded.id).select("email role isDemo");
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = {
      ...decoded,
      email: user.email,
      role: user.role,
      isDemo: isDemoAccount(user),
    };

    next();
  } catch (err) {
    console.error("Failed to load authenticated user:", err);
    res.status(500).json({ error: "Unable to verify account permissions." });
  }
};

export default authMiddleware;
