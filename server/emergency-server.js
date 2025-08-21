// EMERGENCY MINIMAL SERVER - Absolute bare minimum for deployment testing
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// Absolute minimal static file serving
app.use(express.static('dist/public'));

// Absolute minimal API endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    port: port
  });
});

// Catch all for SPA
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(process.cwd(), 'dist/public', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Emergency server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'undefined'}`);
  console.log(`Static files: ${path.join(process.cwd(), 'dist/public')}`);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Emergency server error:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Emergency server rejection:', reason);
});