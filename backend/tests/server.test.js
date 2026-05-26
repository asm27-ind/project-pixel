const request = require("supertest");
const app = require("../src/server");

describe("System Baseline Integrity Tests", () => {
  it("should successfully hit the health check route", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toBe("healthy");
  });

  it("should actively return HTTP 429 when heavy endpoints are spammed", async () => {
    // Fire 5 requests immediately to hit the limit ceiling
    for (let i = 0; i < 5; i++) {
      await request(app).post("/api/v1/image/process-test");
    }
    // The 6th request must trigger our firewall rule
    const blockedRes = await request(app).post("/api/v1/image/process-test");
    expect(blockedRes.statusCode).toEqual(429);
  });
});
