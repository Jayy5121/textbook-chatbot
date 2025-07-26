const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS for all routes
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    console.log('Headers:', req.headers);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('Body:', req.body);
    }
    next();
});

// Test route
app.get('/', (req, res) => {
    res.json({ 
        message: 'ML Textbook Assistant API is running!',
        timestamp: new Date().toISOString(),
        endpoints: {
            'GET /': 'This message',
            'GET /test': 'Simple test endpoint',
            'POST /search': 'Search endpoint (mock for now)',
            'GET /search/debug': 'Debug information'
        }
    });
});

// Simple test endpoint
app.get('/test', (req, res) => {
    res.json({ 
        status: 'success',
        message: 'Server is working correctly!',
        timestamp: new Date().toISOString()
    });
});

// Mock search endpoint for testing
app.post('/search', (req, res) => {
    console.log('=== SEARCH REQUEST RECEIVED ===');
    console.log('Query:', req.body.query);
    console.log('Top K:', req.body.top_k);
    
    const { query, top_k = 5 } = req.body;
    
    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Query is required and must be a non-empty string'
        });
    }

    // Mock response that matches your expected format
    const mockResponse = `========================================
SEARCH RESULTS FOR MACHINE LEARNING TEXTBOOK
QUERY: "${query.trim()}"
FOUND: 3 relevant chunks
TIMESTAMP: ${new Date().toISOString()}
========================================

----------------------------------------
RANK 1
ID: chunk_001 WORDS: 150
TEXT:
Machine learning is a subset of artificial intelligence (AI) that focuses on the development of algorithms and statistical models that enable computers to improve their performance on a specific task through experience. The key characteristic of machine learning is that it allows systems to automatically learn and improve from experience without being explicitly programmed for every possible scenario.

----------------------------------------
RANK 2
ID: chunk_002 WORDS: 180
TEXT:
Supervised learning is one of the main paradigms in machine learning where algorithms learn from labeled training data. In supervised learning, we have input-output pairs, and the goal is to learn a mapping function from inputs to outputs. Common examples include classification tasks (predicting categories) and regression tasks (predicting continuous values).

----------------------------------------
RANK 3
ID: chunk_003 WORDS: 165
TEXT:
Neural networks are computing systems inspired by biological neural networks. They consist of interconnected nodes (neurons) organized in layers. Each connection has an associated weight that adjusts as learning proceeds. Neural networks are particularly effective for pattern recognition, classification, and function approximation tasks.`;

    console.log('=== SENDING MOCK RESPONSE ===');
    res.status(200).send(mockResponse);
});

// Debug endpoint
app.get('/search/debug', (req, res) => {
    res.json({
        message: 'Debug endpoint working',
        server_info: {
            node_version: process.version,
            platform: process.platform,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cwd: process.cwd()
        },
        request_info: {
            headers: req.headers,
            method: req.method,
            url: req.url,
            ip: req.ip
        },
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        available_routes: [
            'GET /',
            'GET /test', 
            'POST /search',
            'GET /search/debug'
        ],
        timestamp: new Date().toISOString()
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', (err) => {
    if (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
    
    console.log('='.repeat(50));
    console.log(`🚀 ML Textbook Assistant API Server Started`);
    console.log(`📅 Time: ${new Date().toISOString()}`);
    console.log(`🌐 Port: ${PORT}`);
    console.log(`🔗 Base URL: http://localhost:${PORT}`);
    console.log('='.repeat(50));
    console.log('Available endpoints:');
    console.log(`  GET  http://localhost:${PORT}/`);
    console.log(`  GET  http://localhost:${PORT}/test`);
    console.log(`  POST http://localhost:${PORT}/search`);
    console.log(`  GET  http://localhost:${PORT}/search/debug`);
    console.log('='.repeat(50));
    console.log('🎯 Ready to receive requests!');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

module.exports = app;