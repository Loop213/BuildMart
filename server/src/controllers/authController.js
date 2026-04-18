import { User } from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function serializeUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status
  };
}

export const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error("User already exists");
  }

  const user = await User.create({ name, email, password, role: "customer" });

  res.status(201).json({
    token: generateToken(user._id),
    user: serializeUser(user),
    message: "Signup successful. Your account is under admin review."
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  res.json({
    token: generateToken(user._id),
    user: serializeUser(user),
    message:
      user.status === "pending"
        ? "Login successful. Your account is under admin review."
        : user.status === "rejected"
          ? "Login successful. Your account is marked as rejected."
          : "Login successful."
  });
});
