// Import required modules
const express = require("express");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const { v4: uuidv4 } = require("uuid");
const { Readable } = require("stream");

// Initialize Express app
const app = express();
app.use(express.json());

// MongoDB Setup
mongoose.connect("mongodb://localhost:27017/events", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define Event model
const Event = mongoose.model(
  "Event",
  new mongoose.Schema({
    _id: { type: String, default: uuidv4 },
    user: String,
    data: Object,
    timestamp: Date,
  })
);

// Redis Setup
const redis = new Redis();

// Event Stream Setup
const eventStream = new Readable({ objectMode: true, read() {} });
const MAX_RETRIES = 5;
const BACKOFF_FACTOR = 1000;

// Event Stream Data Handler
eventStream.on("data", async (event) => {
  const key = `rate-limit:${event.user}`;
  
  // Rate limiting
  if ((await redis.incr(key)) > 5) {
    console.log("Rate limit exceeded:", event.user);
    return;
  }
  await redis.expire(key, 10);

  let attempt = 0;
  const processEvent = async () => {
    try {
      // Save event to MongoDB
      await Event.create({ ...event, timestamp: new Date() });
      console.log("Processed:", event);
    } catch (error) {
      // Retry logic with exponential backoff
      if (++attempt <= MAX_RETRIES) {
        setTimeout(processEvent, BACKOFF_FACTOR * Math.pow(2, attempt));
      } else {
        console.error("Failed after retries:", event._id);
      }
    }
  };
  processEvent();
});

// REST API Endpoints

// Get recent events
app.get("/events", async (req, res) => {
  const events = await Event.find().sort({ timestamp: -1 }).limit(10);
  res.json(events);
});

// Submit a new event
app.post("/process", (req, res) => {
  eventStream.push({ user: req.body.user, data: req.body.data, _id: uuidv4() });
  res.json({ message: "Event submitted" });
});

// Get metrics
app.get("/metrics", async (req, res) => {
  const totalEvents = await Event.countDocuments();
  const uniqueUsers = await Event.distinct("user");
  const mostRecentEvent = await Event.findOne().sort({ timestamp: -1 });
  res.json({
    processedEvents: totalEvents,
    uniqueUsers: uniqueUsers.length,
    mostRecentEvent: mostRecentEvent?.timestamp || null,
  });
});

// Start the server
app.listen(3000, () => console.log("Server running on port 3000"));

// Export the app for testing
module.exports = app;
