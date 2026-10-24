
import bcrypt from "bcryptjs";
import crypto from "crypto";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { Resend } from "resend";
import User from "../models/User.js";

dotenv.config();

// Generate a six-digit OTP
const generateOTP = () => crypto.randomInt(100000, 1000000).toString();

// Send OTP email using Resend API
const sendOtpEmail = async ({
  email,
  fullName,
  otp,
  purpose = "signup",
}) => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured on the server.");
  }

  const resend = new Resend(apiKey);
  const isSignup = purpose === "signup";

  console.log("Sending OTP email using Resend API...");

  const { data, error } = await resend.emails.send({
    from: "CIVIX <onboarding@resend.dev>",
    to: [email],
    subject: isSignup
      ? "Verify your CIVIX account"
      : "Your CIVIX Password Reset OTP",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #222;">
        <h2>${isSignup ? "Welcome to CIVIX!" : "Password Reset Request"}</h2>
        ${fullName ? `<p>Hello ${fullName},</p>` : ""}
        <p>Your One-Time Password (OTP) is:</p>
        <h1 style="color: #10b981; letter-spacing: 5px;">${otp}</h1>
        <p>This OTP is valid for <strong>10 minutes</strong>.</p>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend email API error:", {
      message: error.message,
      name: error.name,
    });

    throw new Error(error.message || "Resend failed to send the email.");
  }

  console.log("Resend accepted the email request.", {
    emailId: data?.id || "No ID returned",
  });

  return data;
};

// --------------------
// SIGNUP (with OTP)
// --------------------
export const signup = async (req, res) => {
  let user;

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

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({
        error: "User already exists with this email",
      });
    }

    const otp = generateOTP();

    user = new User({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password,
      role: (role || "citizen").toLowerCase(),
      isVerified: false,
      otp,
      otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
    });

    await user.save();

    console.log("Unverified signup user created:", normalizedEmail);

    try {
      await sendOtpEmail({
        email: normalizedEmail,
        fullName: fullName.trim(),
        otp,
        purpose: "signup",
      });
    } catch (emailError) {
      console.error("OTP email delivery failed:", {
        message: emailError.message,
      });

      // Delete the unverified account if email sending fails
      try {
        await User.deleteOne({ _id: user._id });
        console.log("Unverified signup account removed after email failure.");
      } catch (deleteError) {
        console.error(
          "Could not remove unverified account:",
          deleteError.message
        );
      }

      return res.status(500).json({
        error: "Failed to send verification email. Please try again later.",
      });
    }

    return res.status(201).json({
      message: "OTP sent to email",
      email: normalizedEmail,
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
      const errors = Object.values(err.errors).map((e) => e.message);

      return res.status(400).json({
        error: errors.join(", "),
      });
    }

    if (err.message?.includes("RESEND_API_KEY is not configured")) {
      return res.status(500).json({
        error: "Email service is not configured on the server.",
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
    const user = await User.findOne({ email: normalizedEmail });

    // Do not reveal whether an account exists
    if (!user) {
      return res.json({
        message: "If this email is registered, you will receive an OTP.",
      });
    }

    const otp = generateOTP();

    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();

    try {
      await sendOtpEmail({
        email: normalizedEmail,
        fullName: user.fullName,
        otp,
        purpose: "forgot-password",
      });
    } catch (emailError) {
      console.error("Password reset email failed:", {
        message: emailError.message,
      });

      return res.status(500).json({
        error: "Failed to send the password reset email. Please try again later.",
      });
    }

    return res.json({
      message: "OTP sent to email successfully.",
    });
  } catch (err) {
    console.error("Forgot password error:", err.message);

    return res.status(500).json({
      error: "An error occurred while trying to send the reset email.",
    });
  }
};

// --------------------
// VERIFY OTP
// --------------------
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp, action } = req.body;

    console.log("OTP verification attempt:", {
      email,
      action: action || "unspecified",
    });

    if (!email || !otp) {
      return res.status(400).json({
        error: "Email and OTP are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select("+otp +otpExpiry +isVerified +password +role");

    if (!user || !user.otp || !user.otpExpiry) {
      return res.status(400).json({
        error: "Invalid OTP request.",
      });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({
        error: "OTP has expired",
      });
    }

    if (String(user.otp) !== String(otp).trim()) {
      return res.status(400).json({
        error: "Invalid OTP",
      });
    }

    if (action === "signup") {
      user.isVerified = true;
      user.otp = undefined;
      user.otpExpiry = undefined;

      await user.save();

      console.log("User account verified:", email);

      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured.");
      }

      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        message: "Account verified successfully",
        token,
        user: {
          id: user._id,
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
      });
    }

    return res.json({
      message: "OTP verified successfully",
      email: user.email,
    });
  } catch (err) {
    console.error("OTP verification error:", err.message);

    return res.status(500).json({
      error: "Server error",
    });
  }
};

// --------------------
// RESET PASSWORD
// --------------------
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        error: "All fields are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select("+otp +otpExpiry +password");

    if (!user || !user.otp || !user.otpExpiry) {
      return res.status(400).json({
        error: "Invalid OTP request.",
      });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({
        error: "OTP has expired",
      });
    }

    if (String(user.otp) !== String(otp).trim()) {
      return res.status(400).json({
        error: "Invalid OTP",
      });
    }

    user.password = newPassword;
    user.otp = undefined;
    user.otpExpiry = undefined;

    await user.save();

    console.log("Password reset successful:", email);

    return res.json({
      message: "Password reset successfully",
    });
  } catch (err) {
    console.error("Reset password error:", err.message);

    return res.status(500).json({
      error: "Server error",
    });
  }
};
