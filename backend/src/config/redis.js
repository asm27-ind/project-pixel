const { createClient } = require("redis");

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("connect", () =>
  console.log("[Redis Connected]: Cloud Cache Cluster Active"),
);
redisClient.on("error", (err) =>
  console.error("[Redis Handshake Error]:", err.message),
);

(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error("[Redis Core Critical Failure]:", error.message);
  }
})();

module.exports = redisClient;
