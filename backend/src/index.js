import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
const JWT_EXPIRES_IN = "7d";

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Simple input validation helpers
const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const createToken = (user) =>
  jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

const authenticate = (req, res, next) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = header.replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};

app.post("/auth/register", async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    if (
      !isNonEmptyString(fullName) ||
      !isNonEmptyString(email) ||
      !isNonEmptyString(password)
    ) {
      return res.status(400).json({ error: "Invalid registration data" });
    }

    if (role !== "ADMIN" && role !== "WORKER") {
      return res.status(400).json({ error: "Invalid role" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        role,
      },
    });

    const token = createToken(user);
    res.status(201).json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("POST /auth/register error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({ error: "Invalid login data" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = createToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("POST /auth/login error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/workers", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const workers = await prisma.user.findMany({
      where: { role: "WORKER" },
      select: { id: true, fullName: true, email: true },
      orderBy: { id: "asc" },
    });
    res.json(workers);
  } catch (error) {
    console.error("GET /workers error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/calls", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const calls = await prisma.call.findMany({
      include: { assignedWorker: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(calls);
  } catch (error) {
    console.error("GET /calls error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/calls/my", authenticate, requireRole("WORKER"), async (req, res) => {
  try {
    const calls = await prisma.call.findMany({
      where: { assignedWorkerId: req.user.userId },
      include: { assignedWorker: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(calls);
  } catch (error) {
    console.error("GET /calls/my error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/calls/:id", authenticate, async (req, res) => {
  try {
    const callId = parsePositiveInt(req.params.id);
    if (!callId) {
      return res.status(400).json({ error: "Invalid call id" });
    }

    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: { assignedWorker: true },
    });

    if (!call) {
      return res.status(404).json({ error: "Call not found" });
    }

    if (req.user.role === "WORKER" && call.assignedWorkerId !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(call);
  } catch (error) {
    console.error("GET /calls/:id error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/calls", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const { fullName, address, age, diagnosis, assignedWorkerId } = req.body;

    if (
      !isNonEmptyString(fullName) ||
      !isNonEmptyString(address) ||
      !isNonEmptyString(diagnosis)
    ) {
      return res.status(400).json({ error: "Invalid text fields" });
    }

    const parsedAge = parsePositiveInt(age);
    const parsedWorkerId = parsePositiveInt(assignedWorkerId);

    if (!parsedAge || !parsedWorkerId) {
      return res.status(400).json({ error: "Invalid age or worker" });
    }

    const worker = await prisma.user.findFirst({
      where: { id: parsedWorkerId, role: "WORKER" },
    });

    if (!worker) {
      return res.status(400).json({ error: "Worker not found" });
    }

    const createdCall = await prisma.call.create({
      data: {
        fullName: fullName.trim(),
        address: address.trim(),
        age: parsedAge,
        diagnosis: diagnosis.trim(),
        assignedWorkerId: parsedWorkerId,
      },
      include: { assignedWorker: true },
    });

    res.status(201).json(createdCall);
  } catch (error) {
    console.error("POST /calls error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/calls/:id", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const callId = parsePositiveInt(req.params.id);
    const { fullName, address, age, diagnosis, assignedWorkerId } = req.body;

    if (!callId) {
      return res.status(400).json({ error: "Invalid call id" });
    }

    if (
      !isNonEmptyString(fullName) ||
      !isNonEmptyString(address) ||
      !isNonEmptyString(diagnosis)
    ) {
      return res.status(400).json({ error: "Invalid text fields" });
    }

    const parsedAge = parsePositiveInt(age);
    const parsedWorkerId = parsePositiveInt(assignedWorkerId);

    if (!parsedAge || !parsedWorkerId) {
      return res.status(400).json({ error: "Invalid age or worker" });
    }

    const existingCall = await prisma.call.findUnique({
      where: { id: callId },
    });

    if (!existingCall) {
      return res.status(404).json({ error: "Call not found" });
    }

    // Calls in final status cannot be edited
    if (existingCall.status !== "NEW") {
      return res.status(400).json({ error: "Call already finalized" });
    }

    const worker = await prisma.user.findFirst({
      where: { id: parsedWorkerId, role: "WORKER" },
    });

    if (!worker) {
      return res.status(400).json({ error: "Worker not found" });
    }

    const updatedCall = await prisma.call.update({
      where: { id: callId },
      data: {
        fullName: fullName.trim(),
        address: address.trim(),
        age: parsedAge,
        diagnosis: diagnosis.trim(),
        assignedWorkerId: parsedWorkerId,
      },
      include: { assignedWorker: true },
    });

    res.json(updatedCall);
  } catch (error) {
    console.error("PATCH /calls/:id error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.patch(
  "/calls/:id/status",
  authenticate,
  async (req, res) => {
    try {
      const callId = parsePositiveInt(req.params.id);
      const { status } = req.body;

      if (!callId) {
        return res.status(400).json({ error: "Invalid call id" });
      }

      if (status !== "COMPLETED" && status !== "CANCELLED") {
        return res.status(400).json({ error: "Invalid status" });
      }

      const existingCall = await prisma.call.findUnique({
        where: { id: callId },
      });

      if (!existingCall) {
        return res.status(404).json({ error: "Call not found" });
      }

      if (
        req.user.role === "WORKER" &&
        existingCall.assignedWorkerId !== req.user.userId
      ) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Status is immutable after first change
      if (existingCall.status !== "NEW") {
        return res.status(400).json({ error: "Call already finalized" });
      }

      const updatedCall = await prisma.call.update({
        where: { id: callId },
        data: {
          status,
          statusUpdatedAt: new Date(),
        },
        include: { assignedWorker: true },
      });

      res.json(updatedCall);
    } catch (error) {
      console.error("PATCH /calls/:id/status error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
