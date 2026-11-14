
require("dotenv").config();

const readline = require("readline");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

const ask = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });

const askPassword = (question) =>
  new Promise((resolve, reject) => {
    const stdin = process.stdin;

    if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
      reject(new Error("Password input requires an interactive terminal."));
      return;
    }

    let password = "";

    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const cleanup = () => {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
    };

    const onData = (key) => {
      if (key === "\u0003") {
        cleanup();
        reject(new Error("Admin setup cancelled."));
        return;
      }

      if (key === "\r" || key === "\n") {
        cleanup();
        process.stdout.write("\n");
        resolve(password);
        return;
      }

      if (key === "\u007f" || key === "\b") {
        password = password.slice(0, -1);
        return;
      }

      if (key >= " " && key !== "\u007f") {
        password += key;
      }
    };

    stdin.on("data", onData);
  });

const createAdmin = async () => {
  try {
    const existingAdmin = await pool.query(
      "SELECT id FROM public.users WHERE role = $1 LIMIT 1",
      ["Admin"]
    );

    if (existingAdmin.rows.length > 0) {
      console.log("An Admin account already exists. Setup cancelled.");
      return;
    }

    const fullName = (await ask("Admin full name: ")).trim();
    const email = (await ask("Admin email: ")).trim().toLowerCase();

    if (
      !fullName ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      console.log("Please provide a valid name and email.");
      return;
    }

    const password = await askPassword("Admin password: ");

    if (password.length < 12) {
      console.log("Password must contain at least 12 characters.");
      return;
    }

    const confirmPassword = await askPassword("Confirm password: ");

    if (password !== confirmPassword) {
      console.log("Passwords do not match.");
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO public.users
        (full_name, email, password_hash, role, department)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, role, department`,
      [fullName, email, passwordHash, "Admin", "Administration"]
    );

    console.log("\nAdmin account created successfully!");
    console.log({
      id: result.rows[0].id,
      name: result.rows[0].full_name,
      email: result.rows[0].email,
      role: result.rows[0].role,
    });

  } catch (error) {
    if (error.code === "23505") {
      console.error("This email address is already registered.");
    } else {
      console.error("Admin setup failed:", error.message);
    }
  } finally {
    await pool.end();
  }
};

createAdmin();
