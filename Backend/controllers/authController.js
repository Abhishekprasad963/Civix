
import bcrypt from "bcryptjs";
import crypto from "crypto";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import User, { isDemoAccount } from "../models/User.js";

dotenv.config();

// Generate a six-digit OTP for password reset only
const generateOTP = () => crypto.randomInt(100000, 1000000).toString();

// --------------------
// SIGNUP (WITHOUT OTP)
// --------------------
export const signup = async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    console.log("Signup attempt:", {
      email,
      role: role || "citizen",
    });

    if (!fullName?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        error: "All fields are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        error: "User already exists with this email",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured.");
    }

    // Create the account directly without sending an OTP
    const user = new User({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password,
      role: (role || "citizen").toLowerCase(),
      isVerified: true,
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("Account created successfully:", normalizedEmail);

    return res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: user._id,
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isDemo: isDemoAccount(user),
      },
    });
  } catch (err) {
    console.error("Signup error:", {
      message: err.message,
      code: err.code || "No code",
    });

    if (err.code === 11000) {
      return res.status(400).json({
        error: "Email already exists",
      });
    }

    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map(
        (e) => e.message
      );

      return res.status(400).json({
        error: errors.join(", "),
      });
    }

    return res.status(500).json({
      error: "Server error during registration. Please try again.",
    });
  }
};

// --------------------
// LOGIN
// --------------------
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Login attempt:", email);

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select("+password");

    if (!user) {
      return res.status(400).json({
        error: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        error: "Invalid credentials",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured.");
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("Login successful:", email);

    return res.json({
      token,
      user: {
        id: user._id,
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isDemo: isDemoAccount(user),
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);

    return res.status(500).json({
      error: "Server error",
    });
  }
};

// --------------------
// FORGOT PASSWORD
// OTP email is still required for this feature
// --------------------
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email is required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({
      email: normalizedEmail,
    });

    // Do not reveal whether an account exists
    if (!user) {
      return res.json({
        message:
          "If this email is registered, you will receive an OTP.",
      });
    }

    return res.status(503).json({
      error:
        "Password reset by email is temporarily unavailable. Please contact the CIVIX administrator.",
    });
  } catch (err) {
    console.error("Forgot password error:", err.message);

    return res.status(500).json({
      error: "An error occurred while processing your request.",
    });
  }
};

// --------------------
// VERIFY OTP
// Signup OTP verification is no longer needed.
// This endpoint remains for compatibility with existing routes.
// --------------------
export const verifyOtp = async (req, res) => {
  return res.status(410).json({
    error:
      "OTP verification is no longer required for signup. Please log in with your email and password.",
  });
};

// --------------------
// RESET PASSWORD
// Temporarily disabled because email OTP is unavailable.
// --------------------
export const resetPassword = async (req, res) => {
  return res.status(503).json({
    error:
      "Password reset is temporarily unavailable. Please contact the CIVIX administrator.",
  });
};
