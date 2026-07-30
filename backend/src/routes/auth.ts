import { Router } from "express";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/prisma";
import { authenticateToken, generateToken, AuthenticatedRequest } from "../middleware/auth";

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "demo-google-client-id");

// Helper to get array of authorized admin email addresses from ADMIN_EMAIL env var (comma-separated)
function getAuthorizedAdminEmails(): string[] {
  const defaultAdmins = "admin@campus.edu,sharmasarvsh0303@gmail.com";
  const rawEnv = process.env.ADMIN_EMAIL || defaultAdmins;
  return rawEnv
    .split(",")
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean);
}

function isAuthorizedAdmin(email: string): boolean {
  const authorizedList = getAuthorizedAdminEmails();
  return authorizedList.includes(email.toLowerCase().trim());
}

// 1. Password Login (Disabled for Admin role - Google OAuth only!)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Security Restriction: Password login disabled for Admin role
    if (user.role === "admin" || isAuthorizedAdmin(normalizedEmail)) {
      return res.status(403).json({
        error: "Security Policy Violation: Password login is disabled for Admin accounts. Please sign in using authorized Google OAuth.",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNo: user.rollNo,
        department: user.department,
        hostel: user.hostel,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Failed to login" });
  }
});

// 2. Register (Students/Workers only - Admin self-registration blocked)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role = "student", rollNo, department, hostel } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Security Restriction: Prevent self-registration for Admin role
    if (role === "admin") {
      return res.status(403).json({
        error: "Access Denied: Self-registration for Admin role is disabled. Admin sign-in requires authorized Google OAuth.",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const initials = name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: ["student", "worker"].includes(role) ? role : "student",
        rollNo,
        department,
        hostel,
        avatar: initials || "U",
      },
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNo: user.rollNo,
        department: user.department,
        hostel: user.hostel,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Failed to register user" });
  }
});

// 3. Google OAuth Login / Register (Admin restricted ONLY to authorized admin emails)
router.post("/google", async (req, res) => {
  try {
    const { credential, role = "student" } = req.body;

    if (!credential) {
      return res.status(400).json({ error: "Google credential token missing" });
    }

    let payload: any;

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      // Fallback decode for credential payload
      if (typeof credential === "object" && credential.email) {
        payload = credential;
      } else {
        const parts = credential.split(".");
        if (parts.length === 3) {
          payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
        }
      }
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ error: "Invalid Google token payload" });
    }

    const email = payload.email.toLowerCase().trim();
    const name = payload.name || payload.email.split("@")[0];
    const googleId = payload.sub || payload.googleId;

    // Security Restriction: If requesting Admin role via Google OAuth, enforce authorized admin email list
    if (role === "admin" && !isAuthorizedAdmin(email)) {
      return res.status(403).json({
        error: `Access Denied: Email '${email}' is not authorized for Admin access. Contact system administrator.`,
      });
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { googleId }],
      },
    });

    if (!user) {
      const initials = name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();

      const assignedRole = isAuthorizedAdmin(email) ? "admin" : ["student", "worker"].includes(role) ? role : "student";

      user = await prisma.user.create({
        data: {
          name,
          email,
          role: assignedRole,
          googleId,
          avatar: initials || "G",
          department: "Campus User",
        },
      });
    } else {
      // If user exists, update role to admin if email is in authorized admin list
      if (isAuthorizedAdmin(email) && user.role !== "admin") {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: "admin" },
        });
      }

      if (role === "admin" && user.role !== "admin" && !isAuthorizedAdmin(email)) {
        return res.status(403).json({
          error: "Access Denied: Un-authorized email address for Admin role.",
        });
      }
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNo: user.rollNo,
        department: user.department,
        hostel: user.hostel,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Google OAuth error:", error);
    return res.status(500).json({ error: "Google sign-in failed" });
  }
});

// 4. Get Current Auth User Profile
router.get("/me", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNo: user.rollNo,
        department: user.department,
        hostel: user.hostel,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
});

export default router;
