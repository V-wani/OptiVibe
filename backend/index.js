const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { uploadFromBuffer } = require('./cloudinary');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5001;

// Trust Proxy (Essential for Rate Limiting behind Nginx/Heroku)
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "res.cloudinary.com", "blob:"],
      connectSrc: ["'self'", "http://localhost:5001", "https://res.cloudinary.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
    },
  },
}));

// Restricted CORS
const allowedOrigins = [
  'http://localhost:5173', // Dev
  'http://localhost:5001', // Prod
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // More restrictive for image processing
  message: { error: 'Too many optimization requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(compression()); // Compress responses
app.use(morgan('combined')); // Detailed logging
app.use(express.json());

// Multer setup for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'AI Image Optimizer Node.js API is running' });
});

app.post('/api/optimize', limiter, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { quality = 'auto', format_type = 'auto', width, height } = req.body;

    // Build transformation options
    const options = {
      fetch_format: format_type,
      quality: quality,
      flags: 'strip_profile', // Strip metadata
      resource_type: 'auto'
    };

    if (width) options.width = parseInt(width);
    if (height) options.height = parseInt(height);
    if (width || height) options.crop = 'scale';

    // Check for missing credentials and return mock data if so
    if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME.trim() === '') {
      console.log('--- Mock Mode Activated (No Cloudinary Credentials) ---');
      const originalSize = req.file.size;
      const optimizedSize = Math.round(originalSize * 0.4); // 60% savings
      const compressionRatio = 60;
      
      // Use the original file data as a data URL for the "optimized" version
      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

      return res.json({
        success: true,
        original_size: originalSize,
        optimized_size: optimizedSize,
        compression_ratio: compressionRatio,
        optimized_url: base64Image,
        format: req.file.mimetype.split('/')[1],
        width: 800,
        height: 600,
        public_id: 'mock_id',
        is_mock: true
      });
    }

    // Upload to Cloudinary
    const result = await uploadFromBuffer(req.file.buffer, options);

    const originalSize = req.file.size;
    const optimizedSize = result.bytes;
    const compressionRatio = Math.round((1 - (optimizedSize / originalSize)) * 100 * 100) / 100;

    res.json({
      success: true,
      original_size: originalSize,
      optimized_size: optimizedSize,
      compression_ratio: compressionRatio,
      optimized_url: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      public_id: result.public_id
    });

  } catch (error) {
    console.error('Optimization error:', error);
    const isProd = process.env.NODE_ENV === 'production';
    
    res.status(error.http_code || 500).json({ 
      error: isProd ? 'Optimization failed' : (error.message || 'Internal Server Error'),
      details: error.http_code === 401 ? 'Invalid Cloudinary credentials' : (isProd ? null : error)
    });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Server is running on port ${port} [Mode: ${process.env.NODE_ENV || 'development'}]`);
});
