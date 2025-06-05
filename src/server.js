const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const path = require('path');
const config = require('./config/config');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const logger = require('./utils/logger');
const { swaggerDocs } = require('./utils/swagger');

// Debugging: Log configuration values to verify they are loaded from .env
console.log('Configuration Loaded:');
// Port and other config values are managed globally via config.js and .env
console.log('PORT:', config.port);
console.log('MONGO_URI:', config.mongoURI);
console.log('JWT_SECRET:', config.jwtSecret);
console.log('JWT_EXPIRATION:', config.jwtExpiration);
console.log('NODE_ENV:', config.nodeEnv);
// Remove duplicate/confusing config.PORT and config.NODE_ENV logs

// Import routes
const authRoutes = require('./routes/authRoutes');
const distributorRoutes = require('./routes/distributorRoutes');
const staffActivityRoutes = require('./routes/staffActivityRoutes');
const orderRoutes = require('./routes/orderRoutes');
const damageClaimRoutes = require('./routes/damageClaimRoutes');
const taskRoutes = require('./routes/taskRoutes');
const staffRoutes = require('./routes/staffRoutes');
const supplyEstimateRoutes = require('./routes/supplyEstimateRoutes');
const mobileAppRoutes = require('./routes/mobileAppRoutes');
const brandRoutes = require('./routes/brandRoutes');
const variantRoutes = require('./routes/variantRoutes');
const productRoutes = require('./routes/productRoutes');
const { apiRouter: shopRoutes, mobileRouter: mobileShopRoutes } = require('./routes/shopRoutes');
const { apiRouter: marketingActivityRoutes, mobileRouter: mobileMarketingActivityRoutes } = require('./routes/marketingStaffActivityRoutes');
const { apiRouter: retailerShopActivityRoutes, mobileRouter: mobileRetailerShopActivityRoutes } = require('./routes/retailerShopActivityRoutes');
const salesInquiryRoutes = require('./routes/salesInquiryRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

// Create Express app
const app = express();

// Serve uploads directory as static to allow image access via URL
app.use('/uploads', express.static(path.join(__dirname, '../../uploads'))); // <-- Added for image access

// Trust proxy for X-Forwarded-For headers (needed for rate limiting behind proxies)
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// Security middleware
// Add Helmet for security headers
// app.use(helmet());  // Temporarily disabled for testing

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // increased from 100 to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

// Apply rate limiting to all routes
app.use(apiLimiter);

// Stricter rate limits for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes instead of 1 hour
  max: 30, // limit each IP to 30 login attempts per 15 minutes
  message: {
    success: false,
    error: 'Too many login attempts from this IP, please try again after 15 minutes'
  }
});

// Standard middleware
app.use(express.json({ limit: '10kb' })); // Body limit of 10kb
app.use(express.urlencoded({ extended: false }));
app.use(cors({
  origin: '*',  // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-panel', 'Access-Control-Allow-Origin'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Enable pre-flight requests for all routes
app.options('*', cors());

// Add request logger middleware
app.use(requestLogger);

// Reorganize route mounting to ensure mobile routes are properly accessible
app.use('/api/auth/login', authLimiter); // Apply stricter rate limiting to login route
app.use('/api/auth', authRoutes);

// Mount mobile routes first to ensure they take precedence
app.use('/api/mobile', mobileAppRoutes);
app.use('/api/mobile/marketing-activity', mobileMarketingActivityRoutes);
app.use('/api/mobile/shops', mobileShopRoutes);
app.use('/api/mobile/retailer-shop-activity', mobileRetailerShopActivityRoutes);

// Mount other API routes
app.use('/api/distributors', distributorRoutes);
app.use('/api/staff-activity', staffActivityRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/damage-claims', damageClaimRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/supply-estimates', supplyEstimateRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/variants', variantRoutes);
app.use('/api/products', productRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/marketing-activity', marketingActivityRoutes);
app.use('/api/retailer-shop-activity', retailerShopActivityRoutes);
app.use('/api/sales-inquiries', salesInquiryRoutes);
app.use('/api/analytics', analyticsRoutes);

// Setup Swagger documentation
swaggerDocs(app);

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../..', 'build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.url.startsWith('/api/')) {
    return next();
  }
  
  // Try to send the index.html file, but handle potential errors
  try {
    const indexPath = path.join(__dirname, '../..', 'build', 'index.html');
    if (require('fs').existsSync(indexPath)) {
      return res.sendFile(indexPath);
    } else {
      // If file doesn't exist and it's a mobile client request (likely API), treat as API route
      if (req.headers['user-agent'] && req.headers['user-agent'].toLowerCase().includes('mobile')) {
        return next();
      }
      // Otherwise return a 404 for web clients
      return res.status(404).send('Build files not found. Please run npm build first.');
    }
  } catch (err) {
    logger.error(`Error serving index.html: ${err.message}`);
    return next();
  }
});

// Import auth middleware for direct endpoint handler
const { protect } = require('./middleware/authMiddleware');

// Direct handler for mobile app /tasks endpoint
app.get('/tasks', protect, async (req, res) => {
  try {
    // If this is a mobile app request (has assignedTo parameter), handle it directly
    if (req.query.assignedTo) {
      logger.info(`Handling mobile request for /tasks: ${req.url}`);
      
      // This is a direct implementation of the taskController.getTasks logic
      const { status, assignedTo, staffRole, type, creatorRole } = req.query;
      
      // Build query
      const query = {};
      
      if (status) {
        query.status = status;
      }
      
      if (assignedTo) {
        query.assignedTo = assignedTo;
      }
      
      if (staffRole) {
        query.staffRole = staffRole;
      }
      
      // Get tasks with populated fields
      const Task = require('./models/Task');
      const tasks = await Task.find(query)
        .populate('assignedTo', 'name role')
        .populate('createdBy', 'name role')
        .populate('distributorId', 'name shopName contact address')
        .sort({ createdAt: -1 });
      
      return res.status(200).json({
        success: true,
        count: tasks.length,
        data: tasks
      });
    }
    
    // If not a mobile request, try to serve static files
    const indexPath = path.join(__dirname, '../..', 'build', 'index.html');
    if (require('fs').existsSync(indexPath)) {
      return res.sendFile(indexPath);
    } else {
      return res.status(404).send('Build files not found. Please run npm build first.');
    }
  } catch (error) {
    logger.error(`Error handling /tasks endpoint: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API 404 route handler
app.use('/api/*', (req, res) => {
  logger.error(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: 'API route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
// Always use config.port for the server port
const server = app.listen(config.port, '0.0.0.0', () => {
  logger.info(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Later in the file, after mounting routes
console.log('Routes mounted:');
console.log('- Auth routes mounted at /api/auth');
console.log('- Staff routes mounted at /api/staff');
console.log('- Distributor routes mounted at /api/distributors');
console.log('- Damage claim routes mounted at /api/damage-claims');
console.log('- Mobile app routes mounted at /api/mobile');
console.log('- Swagger docs available at /api-docs');
console.log('- Sales inquiry routes mounted at /api/sales-inquiries');

module.exports = app;