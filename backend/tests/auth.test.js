
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "test-jwt-secret-key-for-testing-12345";

const request = require("supertest");
const app = require("../app");

describe("Authentication Endpoint Security & Validation Tests", () => {
  it("POST /api/auth/login rejects empty payload with 400", async () => {
    const response = await request(app).post("/api/auth/login").send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("success", false);
    expect(response.body.message).toContain("Email and password are required");
  });

  it("POST /api/auth/login rejects request without password with 400", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.com" });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("success", false);
  });

  it("POST /api/auth/login rejects request without email with 400", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ password: "somepassword123" });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("success", false);
  });

  it("GET /api/auth/me rejects request without Bearer token with 401", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("success", false);
    expect(response.body.message).toContain("Authentication token is required");
  });

  it("GET /api/auth/me rejects invalid bearer token with 401", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid-dummy-token-xyz");

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("success", false);
  });

  it("POST /api/auth/change-password rejects missing authentication with 401", async () => {
    const response = await request(app)
      .post("/api/auth/change-password")
      .send({
        currentPassword: "dummy-current-password",
        newPassword: "dummy-new-password",
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("success", false);
    expect(response.body.message).toContain("Authentication token is required");
  });

  it("POST /api/auth/change-password rejects invalid bearer token with 401", async () => {
    const response = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", "Bearer invalid-dummy-token-xyz")
      .send({
        currentPassword: "dummy-current-password",
        newPassword: "dummy-new-password",
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("success", false);
  });
});
