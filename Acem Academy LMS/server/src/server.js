require("dotenv").config();

const connectDB = require("./database/db");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const app = express();
const errorHandler = require("./middlewares/error.middleware");

const authRoutes = require("./routes/auth.routes");
const courseRoutes = require("./routes/course.routes");
const enrollmentRoutes = require("./routes/enrollment.routes");
const subCourseRoutes = require("./routes/subCourse.routes");
const chapterRoutes = require("./routes/chapter.routes");
const topicRoutes = require("./routes/topic.routes");
const lessonRoutes = require("./routes/lesson.routes");

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(helmet());
app.use(morgan("dev"));
app.use(cookieParser());

// Health Check Route
app.get("/", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "🚀 ACEM Academy LMS Backend is Running Successfully"
    });
});

// Routes

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/enrollments", enrollmentRoutes);
app.use("/api/v1/sub-courses", subCourseRoutes);
app.use("/api/v1/chapters", chapterRoutes);
app.use("/api/v1/topics", topicRoutes);
app.use("/api/v1/lessons", lessonRoutes);

// 404 Route
app.use((req, res) => {
    return res.status(404).json({
        success: false,
        message: "Route Not Found"
    });
});

// Global Error Handler (Always Last)
app.use(errorHandler);

connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

