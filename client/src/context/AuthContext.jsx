import { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { request } from "../api/http";

const AuthContext = createContext(null);
const PASSWORD_KEY = "buildmart_password_store";
const PROFILE_KEY = "buildmart_profile_store";

function getPasswordStore() {
  return JSON.parse(localStorage.getItem(PASSWORD_KEY) || "{}");
}

function getProfileStore() {
  return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
}

function saveProfileStore(store) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(store));
}

function mergeStoredProfile(user) {
  if (!user?._id) {
    return user;
  }

  const profileStore = getProfileStore();
  return {
    ...user,
    ...(profileStore[user._id] || {})
  };
}

function getStatusMessage(status) {
  if (status === "pending") {
    return "Your account is under admin review.";
  }
  if (status === "rejected") {
    return "Your account is marked as rejected.";
  }
  return "Your account is approved.";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("buildmart_user");
    return stored ? mergeStoredProfile(JSON.parse(stored)) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem("buildmart_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("buildmart_user");
    }
  }, [user]);

  async function login(payload) {
    setLoading(true);
    try {
      const data = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      localStorage.setItem("buildmart_token", data.token);
      const mergedUser = mergeStoredProfile(data.user);
      setUser(mergedUser);
      toast.success(data.message || `Welcome back, ${mergedUser.name}`);
      return mergedUser;
    } finally {
      setLoading(false);
    }
  }

  async function signup(payload) {
    setLoading(true);
    try {
      const data = await request("/auth/signup", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      localStorage.setItem("buildmart_token", data.token);
      const mergedUser = mergeStoredProfile(data.user);
      setUser(mergedUser);
      toast.success(data.message || "Account created successfully");
      return mergedUser;
    } finally {
      setLoading(false);
    }
  }

  function updateProfile(partialProfile) {
    setUser((current) => {
      if (!current?._id) {
        return current;
      }

      const nextUser = { ...current, ...partialProfile };
      const profileStore = getProfileStore();
      profileStore[current._id] = {
        ...(profileStore[current._id] || {}),
        ...partialProfile
      };
      saveProfileStore(profileStore);
      toast.success("Profile updated");
      return nextUser;
    });
  }

  function updateAvatar(avatar) {
    updateProfile({ avatar });
  }

  function changePassword({ currentPassword, nextPassword }) {
    if (!user?.email) {
      throw new Error("You need to be logged in");
    }

    const passwordStore = getPasswordStore();
    const savedPassword = passwordStore[user.email];

    if (savedPassword && savedPassword !== currentPassword) {
      throw new Error("Current password is incorrect");
    }

    passwordStore[user.email] = nextPassword;
    localStorage.setItem(PASSWORD_KEY, JSON.stringify(passwordStore));
    toast.success("Password updated");
  }

  function logout() {
    localStorage.removeItem("buildmart_token");
    setUser(null);
    toast.success("Logged out");
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, logout, updateProfile, updateAvatar, changePassword, getStatusMessage }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
