const { createClient } = require("redis");

const client = createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: true,
    rejectUnauthorized: false,
  },
});

client.on("error", (err) => console.error("Redis Client Error", err));

(async () => {
  try {
    await client.connect();
    console.log("✅ Connected to Redis Cloud");
  } catch (err) {
    console.error("❌ Redis connection error:", err);
  }
})();

module.exports = client;
