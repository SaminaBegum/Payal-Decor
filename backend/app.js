// const express = require("express");
// const cors = require("cors");
// const helmet = require("helmet");
// const rateLimit = require("express-rate-limit");

// const app = express();

// <<<<<<< HEAD
// // Security HTTP headers
// app.use(helmet());

// // CORS configuration supporting Vite dev server, local preview, and production env
// const allowedOrigins = [
//   process.env.FRONTEND_URL,
//   "http://localhost:5173",
//   "http://localhost:8080",
//   "http://localhost:3000",
// ].filter(Boolean);

// app.use(
//   cors({
//     origin: (origin, callback) => {
//       // Allow requests with no origin (like mobile apps, curl, or server-to-server)
//       if (!origin || allowedOrigins.includes(origin)) {
//         return callback(null, true);
//       }
//       return callback(null, true); // Fallback to true in development
//     },
//     credentials: true,
//   })
// );
// =======
// // Import authentication routes
// const authRoutes = require("./routes/authRoutes");
// const operationsRoutes = require("./routes/operationsRoutes");
// const employeeRoutes = require("./routes/employeeRoutes");
// app.use(cors({
//   origin: process.env.FRONTEND_URL || "http://localhost:8080"
// }));
// >>>>>>> 39bdb3b (feat: add employee and operations API)

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Rate limiting for authentication routes (prevent brute force)
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 20, // limit each IP to 20 requests per windowMs
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: {
//     success: false,
//     message: "Too many authentication attempts, please try again after 15 minutes.",
//   },
// });

// // Import authentication routes
// const authRoutes = require("./routes/authRoutes");

// // Health check endpoint
// app.get("/api/health", (req, res) => {
//   res.status(200).json({
//     success: true,
//     message: "Payal Decor API is running",
//     environment: process.env.NODE_ENV || "development",
//     timestamp: new Date().toISOString(),
//   });
// });

// <<<<<<< HEAD
// // Authentication routes with rate limiter
// app.use(
//   "/api/auth",
//   authLimiter,
//   (req, res, next) => {
//     if (process.env.NODE_ENV !== "test") {
//       console.log("AUTH PREFIX REACHED:", req.method, req.originalUrl);
//     }
//     next();
//   },
//   authRoutes
// );
// =======
// // Authentication routes
// app.use("/api/auth", (req, res, next) => {
//   console.log("AUTH PREFIX REACHED:", req.method, req.originalUrl);
//   next();
// }, authRoutes);
// app.use("/api/operations", operationsRoutes);
// app.use("/api/employees", employeeRoutes);
// >>>>>>> 39bdb3b (feat: add employee and operations API)

// module.exports = app;

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Import routes
const authRoutes = require("./routes/authRoutes");
const operationsRoutes = require("./routes/operationsRoutes");
const employeeRoutes = require("./routes/employeeRoutes");

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Preserve the existing development fallback.
      return callback(null, true);
    },
    credentials: true,
  })
);

// Request body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many authentication attempts, please try again after 15 minutes.",
  },
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Payal Decor API is running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes with rate limiter
app.use(
  "/api/auth",
  authLimiter,
  (req, res, next) => {
    if (process.env.NODE_ENV !== "test") {
      console.log("AUTH PREFIX REACHED:", req.method, req.originalUrl);
    }
    next();
  },
  authRoutes
);

// Operations API routes
app.use("/api/operations", operationsRoutes);

// Employee API routes
app.use("/api/employees", employeeRoutes);

module.exports = app;
