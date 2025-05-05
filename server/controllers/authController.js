const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.registerUser = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    userType,
    dateOfBirth,
    gender,
    institution,
    fieldOfStudy,
  } = req.body;

  // Updated input validation for all required fields
  if (
    !firstName ||
    !lastName ||
    !email ||
    !password ||
    !userType ||
    !dateOfBirth ||
    !gender ||
    !institution ||
    !fieldOfStudy
  ) {
    return res.status(400).json({
      message: "All fields are required",
      missingFields: Object.entries({
        firstName,
        lastName,
        email,
        password,
        userType,
        dateOfBirth,
        gender,
        institution,
        fieldOfStudy,
      })
        .filter(([_, value]) => !value)
        .map(([key]) => key),
    });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      userType,
      dateOfBirth,
      gender,
      institution,
      fieldOfStudy,
    });

    return res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password, role } = req.body;

  // Validate input
  if (!email || !password || !role) {
    return res
      .status(400)
      .json({ message: "Email, password and role are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user || user.userType !== role) {
      return res.status(400).json({ message: "Invalid credentials or role" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      token,
      userType: user.userType,
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
