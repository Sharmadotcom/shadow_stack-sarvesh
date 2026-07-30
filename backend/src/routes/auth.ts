import { Router } from "express";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/prisma";
import { authenticateToken, generateToken, AuthenticatedRequest } from "../middleware/auth";

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "demo-google-client-id");

// 1. Password Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid email or password" });
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

// 2. Register (Students/Workers/Admin)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role = "student", rollNo, department, hostel } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
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
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: ["student", "worker", "admin"].includes(role) ? role : "student",
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

// 3. Google OAuth Login / Register
router.post("/google", async (req, res) => {
  try {
    const { credential, role = "student" } = req.body;

    if (!credential) {
      return res.status(400).json({ error: "Google credential token missing" });
    }

    let payload: any;

    try {
      // Try verifying with google-auth-library
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      // For demo fallback (if frontend mock credential or testing)
      if (typeof credential === "object" && credential.email) {
        payload = credential;
      } else {
        // Decode jwt token header/payload for hackathon flexibility
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

      user = await prisma.user.create({
        data: {
          name,
          email,
          role: ["student", "worker", "admin"].includes(role) ? role : "student",
          googleId,
          avatar: initials || "G",
          department: "Campus User",
        },
      });
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
