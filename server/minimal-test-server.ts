// MINIMAL TEST SERVER - Absolute bare minimum to test deployment
import express from "express";

const app = express();
const port = parseInt(process.env.PORT || "5000", 10);

// Minimal health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Minimal root route
app.get('/', (req, res) => {
  res.send('<h1>Minimal Server Test</h1><p>Server is running</p>');
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Minimal server running on port ${port}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`REPLIT_DEPLOYMENT: ${process.env.REPLIT_DEPLOYMENT}`);
});