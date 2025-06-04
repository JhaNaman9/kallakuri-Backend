const logger = require('../utils/logger');

// Middleware to log all incoming requests and responses
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, ip, body } = req;
  
  // Log request data
  logger.info(`REQUEST: ${method} ${originalUrl} from ${ip}`);
  
  if (Object.keys(body).length > 0 && method !== 'GET') {
    logger.info(`REQUEST BODY: ${JSON.stringify(body)}`);
  }
  
  // Capture and log response data
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - start;
    const statusCode = res.statusCode;
    
    logger.info(`RESPONSE: ${method} ${originalUrl} - ${statusCode} - ${responseTime}ms`);
    
    if (statusCode >= 400) {
      try {
        // For error responses, log the response body
        const parsedData = JSON.parse(data);
        logger.error(`RESPONSE ERROR: ${JSON.stringify(parsedData)}`);
      } catch (e) {
        logger.error(`RESPONSE ERROR: ${data}`);
      }
    }
    
    originalSend.call(this, data);
    return this;
  };
  
  next();
};

module.exports = requestLogger; 