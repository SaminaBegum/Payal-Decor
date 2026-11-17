const corsOptions = {
  origin: true, // Allow all local dev origins (localhost:5173, localhost:3000, 127.0.0.1, etc.)
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
};

module.exports = corsOptions;

