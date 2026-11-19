require("dotenv").config();

const validateEnv = require("./config/envValidator");
validateEnv();

const mongoose = require("mongoose");
const connectDB = require("./database/db");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middlewares/error.middleware");

const authRoutes = require("./routes/auth.routes");
const courseRoutes = require("./routes/course.routes");
const enrollmentRoutes = require("./routes/enrollment.routes");
const subCourseRoutes = require("./routes/subCourse.routes");
const chapterRoutes = require("./routes/chapter.routes");
const topicRoutes = require("./routes/topic.routes");
const lessonRoutes = require("./routes/lesson.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();

// Trust reverse proxy for correct client IP detection behind load balancers / cloud hosts
app.set("trust proxy", 1);

// Resolve allowed CORS origins
const getAllowedOrigins = () => {
    const origins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "https://acemlms-client.vercel.app",
       "http://acemacademy.com",
    "https://www.acemacademy.com",
    ];
    const configuredOrigins = process.env.CLIENT_URL || process.env.CORS_ORIGIN;

    if (configuredOrigins) {
        configuredOrigins
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean)
            .forEach((o) => {
                if (!origins.includes(o)) {
                    origins.push(o);
                }
            });
    }

    return origins;
};

const allowedOrigins = getAllowedOrigins();

// Middlewares
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps, curl, server-to-server)
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(null, false);
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With"],
        exposedHeaders: ["Set-Cookie", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
    })
);

app.use(helmet());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(cookieParser());

// Health Check Routes
const healthCheckHandler = (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    const statusCode = isDbConnected ? 200 : 503;

    return res.status(statusCode).json({
        success: isDbConnected,
        status: isDbConnected ? "healthy" : "unhealthy",
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
            status: isDbConnected ? "connected" : "disconnected",
            readyState: mongoose.connection.readyState,
        },
    });
};

// Legacy root message preserved for monitoring compatibility
app.get("/", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "🚀 ACEM Academy LMS Backend is Running Successfully",
    });
});

app.get("/health", healthCheckHandler);
app.get("/api/v1/health", healthCheckHandler);

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/enrollments", enrollmentRoutes);
app.use("/api/v1/sub-courses", subCourseRoutes);
app.use("/api/v1/chapters", chapterRoutes);
app.use("/api/v1/topics", topicRoutes);
app.use("/api/v1/lessons", lessonRoutes);
app.use("/api/v1/admin", adminRoutes);

// 404 Route
app.use((req, res) => {
    return res.status(404).json({
        success: false,
        message: "Route Not Found",
    });
});

// Global Error Handler (Always Last)
app.use(errorHandler);

connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

// Graceful Shutdown Handlers
let isShuttingDown = false;

const gracefulShutdown = (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);

    const forceExitTimer = setTimeout(() => {
        console.error("[Server] Graceful shutdown timed out after 10s. Forcing exit.");
        process.exit(1);
    }, 10000);
    forceExitTimer.unref();

    if (server) {
        server.close(async () => {
            console.log("[Server] HTTP listeners closed.");
            try {
                if (mongoose.connection.readyState !== 0) {
                    await mongoose.disconnect();
                    console.log("[Server] MongoDB connection closed.");
                }
                process.exit(0);
            } catch (err) {
                console.error("[Server] Error during database disconnect:", err.message);
                process.exit(1);
            }
        });
    } else {
        process.exit(0);
    }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
