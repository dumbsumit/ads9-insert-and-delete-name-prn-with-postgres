const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose
  .connect("mongodb://127.0.0.1:27017/PRN_DB")
  .then(() => console.log("✅ MongoDB connected to PRN_DB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Mongoose Schema & Model
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
  },
  phoneNumber: { type: String, required: true, trim: true },
  prn: { type: String, required: true, unique: true, trim: true },
});

const User = mongoose.model("User", userSchema, "users");

// ✅ Helper: Check for duplicate username, email, or prn (excludes current ID for updates)
const checkDuplicates = async (username, email, prn, excludeId = null) => {
  const query = excludeId ? { _id: { $ne: excludeId } } : {};

  if (username) {
    const existingUsername = await User.findOne({ username, ...query });
    if (existingUsername)
      return { conflict: true, message: "Username already exists" };
  }

  if (email) {
    const existingEmail = await User.findOne({
      email: email.toLowerCase(),
      ...query,
    });
    if (existingEmail)
      return { conflict: true, message: "Email already exists" };
  }

  if (prn) {
    const existingPrn = await User.findOne({ prn, ...query });
    if (existingPrn)
      return { conflict: true, message: "PRN already exists" };
  }

  return { conflict: false };
};

// POST /add → Create a new user
app.post("/add", async (req, res) => {
  try {
    const { username, email, prn } = req.body;

    const duplicate = await checkDuplicates(username, email, prn);
    if (duplicate.conflict) {
      return res.status(409).json({ error: duplicate.message });
    }

    const user = new User(req.body);
    const savedUser = await user.save();
    res.status(201).json(savedUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /get → Fetch all users
app.get("/get", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /update/:id → Update a user by ID
app.put("/update/:id", async (req, res) => {
  try {
    const { username, email, prn } = req.body;

    const duplicate = await checkDuplicates(username, email, prn, req.params.id);
    if (duplicate.conflict) {
      return res.status(409).json({ error: duplicate.message });
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /delete/:id → Delete a user by ID
app.delete("/delete/:id", async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
