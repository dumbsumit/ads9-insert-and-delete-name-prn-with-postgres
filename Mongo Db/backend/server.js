require("dotenv").config();
const express = require("express");
const { Sequelize, DataTypes, Op } = require("sequelize");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL Connection via Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    logging: false, // Set to console.log to see SQL queries
  }
);

sequelize
  .authenticate()
  .then(() => console.log(`✅ PostgreSQL connected to ${process.env.DB_NAME}`))
  .catch((err) => console.error("❌ PostgreSQL connection error:", err));

// Sequelize Model
const User = sequelize.define(
  "User",
  {
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: { msg: "Please enter a valid email address" },
      },
    },
    phoneNumber: { type: DataTypes.STRING, allowNull: false },
    prn: { type: DataTypes.STRING, allowNull: false, unique: true },
  },
  {
    tableName: "users",
    timestamps: false,
  }
);

// Sync database
sequelize.sync().then(() => console.log("✅ Database synced"));

// ✅ Helper: Check for duplicate username, email, or prn (excludes current ID for updates)
const checkDuplicates = async (username, email, prn, excludeId = null) => {
  const whereClause = excludeId ? { id: { [Op.ne]: excludeId } } : {};

  if (username) {
    const existingUsername = await User.findOne({
      where: { username, ...whereClause },
    });
    if (existingUsername)
      return { conflict: true, message: "Username already exists" };
  }

  if (email) {
    const existingEmail = await User.findOne({
      where: { email: email.toLowerCase(), ...whereClause },
    });
    if (existingEmail)
      return { conflict: true, message: "Email already exists" };
  }

  if (prn) {
    const existingPrn = await User.findOne({
      where: { prn, ...whereClause },
    });
    if (existingPrn) return { conflict: true, message: "PRN already exists" };
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

    // Force lowercase email
    const userData = { ...req.body };
    if (userData.email) userData.email = userData.email.toLowerCase();

    const savedUser = await User.create(userData);
    res.status(201).json(savedUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /get → Fetch all users
app.get("/get", async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /update/:id → Update a user by ID
app.put("/update/:id", async (req, res) => {
  try {
    const { username, email, prn } = req.body;

    const duplicate = await checkDuplicates(
      username,
      email,
      prn,
      req.params.id
    );
    if (duplicate.conflict) {
      return res.status(409).json({ error: duplicate.message });
    }

    const userData = { ...req.body };
    if (userData.email) userData.email = userData.email.toLowerCase();

    const [updatedCount] = await User.update(userData, {
      where: { id: req.params.id },
    });

    if (updatedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch the updated user to return it
    const updatedUser = await User.findByPk(req.params.id);
    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /delete/:id → Delete a user by ID
app.delete("/delete/:id", async (req, res) => {
  try {
    const deletedCount = await User.destroy({
      where: { id: req.params.id },
    });
    
    if (deletedCount === 0) {
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
