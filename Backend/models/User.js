import bcrypt from "bcryptjs"; 
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullName: { 
    type: String, 
    required: [true, "Full name is required"], 
    trim: true 
  },
  email: { 
    type: String, 
    required: [true, "Email is required"], 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  password: { 
    type: String, 
    required: [true, "Password is required"], 
    minlength: 6, 
    select: false 
  },
  role: { 
    type: String, 
    enum: ["citizen", "official"], 
    default: "citizen" 
  },
  isDemo: {
    type: Boolean,
    default: false,
  },
  profilePic: { 
    type: String, 
    default: null 
  },
  otp: { 
    type: String, 
    select: false 
  },
  otpExpiry: { 
    type: Date, 
    select: false 
  },
  isVerified: { 
    type: Boolean, 
    default: false,
    select: false 
  }
}, { 
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      ret.id = ret._id;
      delete ret._id;
      return ret;
    }
  }
});

// ✅ COMBINED pre-save hook: lowercase role AND hash password
userSchema.pre("save", async function (next) {
  try {
    // Always convert role to lowercase
    if (this.role) {
      this.role = this.role.toLowerCase();
    }

    // Hash password only if modified and not already hashed
    if (this.isModified("password")) {
      // Check if password is already hashed (bcrypt hashes start with $2a$ or $2b$)
      if (!this.password.startsWith("$2")) {
        console.log("🔒 Hashing password for:", this.email);
        this.password = await bcrypt.hash(this.password, 10);
      }
    }

    next();
  } catch (error) {
    console.error("❌ Error in User pre-save hook:", error);
    next(error);
  }
});

// ✅ Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

export const isDemoAccount = (user) =>
  user?.isDemo === true ||
  /^(?:admin[12]|citizen(?:0[1-9]|1\d|2[0-5]))@civix\.test$/i.test(
    user?.email || ""
  );

export default User;