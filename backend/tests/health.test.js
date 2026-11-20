const request = require("supertest");
const app = require("../app");

describe("API Health & Routing Tests", () => {
  it("GET /api/health returns 200 with service status", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("message", "Payal Decor API is running");
  });

  it("GET /api/auth/ping returns 200 from auth router", async () => {
    const response = await request(app).get("/api/auth/ping");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("message", "Authentication router is working");
  });

  it("GET /api/auth/me-test returns 200", async () => {
    const response = await request(app).get("/api/auth/me-test");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("message", "The /me route is reachable");
  });
});
