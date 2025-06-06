const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// The server URL will be dynamically updated in the swaggerDocs function
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Company Management API',
      version: '1.0.0',
      description: 'API documentation for Company Management System',
    },
    paths: {
      // All paths are now documented via JSDoc in route files for Swagger UI

    },
    servers: [
      {
        url: '{protocol}://{hostname}:{port}',
        description: 'Dynamic server',
        variables: {
          protocol: {
            enum: ['http', 'https'],
            default: 'http'
          },
          hostname: {
            default: 'localhost'
          },
          port: {
            default: '3000'
          }
        }
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        DamageClaim: {
          type: 'object',
          required: [
            'distributorId',
            'distributorName',
            'brand',
            'variant',
            'size',
            'pieces',
            'manufacturingDate',
            'batchDetails',
            'damageType',
            'reason'
          ],
          properties: {
            _id: {
              type: 'string',
              description: 'Damage claim ID'
            },
            distributorId: {
              type: 'string',
              description: 'Distributor ID'
            },
            distributorName: {
              type: 'string',
              description: 'Distributor name'
            },
            brand: {
              type: 'string',
              description: 'Brand name'
            },
            variant: {
              type: 'string',
              description: 'Product variant'
            },
            size: {
              type: 'string',
              description: 'Product size'
            },
            pieces: {
              type: 'number',
              description: 'Number of damaged pieces'
            },
            manufacturingDate: {
              type: 'string',
              format: 'date',
              description: 'Manufacturing date'
            },
            batchDetails: {
              type: 'string',
              description: 'Batch details'
            },
            damageType: {
              type: 'string',
              enum: ['Box Damage', 'Quality Issue', 'Expiry Date Issue', 'Other'],
              description: 'Type of damage'
            },
            reason: {
              type: 'string',
              description: 'Reason for damage'
            },
            images: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Array of image URLs'
            },
            status: {
              type: 'string',
              enum: ['Pending', 'Commented', 'Approved', 'Partially Approved', 'Rejected'],
              description: 'Current status of the claim'
            },
            approvedPieces: {
              type: 'number',
              description: 'Number of pieces approved for replacement'
            },
            trackingId: {
              type: 'string',
              description: 'Tracking ID for approved claims'
            },
            createdBy: {
              type: 'string',
              description: 'ID of the user who created the claim'
            },
            mlmId: {
              type: 'string',
              description: 'ID of the mid-level manager who commented on the claim'
            },
            mlmComment: {
              type: 'string',
              description: 'Comment from the mid-level manager'
            },
            adminId: {
              type: 'string',
              description: 'ID of the admin who processed the claim'
            },
            comment: {
              type: 'string',
              description: 'Admin comment on approval/rejection'
            },
            approvedDate: {
              type: 'string',
              format: 'date-time',
              description: 'Date when the claim was approved or rejected'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Date when the claim was created'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Date when the claim was last updated'
            }
          }
        },
        SalesInquiry: {
          type: 'object',
          required: [
            'distributorId',
            'distributorName',
            'products'
          ],
          properties: {
            _id: {
              type: 'string',
              description: 'Sales inquiry ID'
            },
            distributorId: {
              type: 'string',
              description: 'Distributor ID'
            },
            distributorName: {
              type: 'string',
              description: 'Distributor name'
            },
            products: {
              type: 'array',
              description: 'Array of products for the inquiry',
              items: {
                type: 'object',
                properties: {
                  brand: {
                    type: 'string',
                    description: 'Brand name'
                  },
                  variant: {
                    type: 'string',
                    description: 'Variant of the product'
                  },
                  size: {
                    type: 'string',
                    description: 'Size of the product'
                  },
                  quantity: {
                    type: 'number',
                    description: 'Quantity requested'
                  }
                }
              }
            },
            status: {
              type: 'string',
              enum: ['Pending', 'Processing', 'Completed', 'Rejected'],
              description: 'Current status of the inquiry'
            },
            createdBy: {
              type: 'string',
              description: 'ID of the user who created the inquiry'
            },
            processedBy: {
              type: 'string',
              description: 'ID of the user who processed the inquiry'
            },
            processedDate: {
              type: 'string',
              format: 'date-time',
              description: 'Date when the inquiry was processed'
            },
            notes: {
              type: 'string',
              description: 'Processing notes'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Date when the inquiry was created'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Date when the inquiry was last updated'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'API endpoints for user authentication'
      },
      {
        name: 'Damage Claims',
        description: 'API endpoints for damage claims management'
      },
      {
        name: 'Sales Inquiries',
        description: 'API endpoints for sales inquiries management'
      },
      {
        name: 'Mobile',
        description: 'API endpoints for mobile application'
      }
    ]
  },
  apis: ['./src/routes/*.js'],
};

const specs = swaggerJsdoc(options);

const swaggerDocs = (app) => {
  // Custom middleware to update Swagger UI with the correct host
  app.use('/api-docs', (req, res, next) => {
    // Clone the specs object to avoid modifying the original
    const currentSpecs = JSON.parse(JSON.stringify(specs));
    
    // Get the host from the request
    const host = req.get('host');
    const protocol = req.protocol;
    
    // Update the server URL with the current host
    if (currentSpecs.servers && currentSpecs.servers.length > 0) {
      currentSpecs.servers[0].url = `${protocol}://${host}`;
    }
    
    // Attach the updated specs to the request for swagger-ui to use
    req.swaggerDoc = currentSpecs;
    next();
  }, swaggerUi.serve, swaggerUi.setup(null, {
    swaggerOptions: {
      docExpansion: 'none', // Collapse all endpoints by default
      persistAuthorization: true // Persist auth between page refreshes
    },
    explorer: true
  }));
  
  // Also update the JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    // Clone the specs object
    const currentSpecs = JSON.parse(JSON.stringify(specs));
    
    // Get the host from the request
    const host = req.get('host');
    const protocol = req.protocol;
    
    // Update the server URL
    if (currentSpecs.servers && currentSpecs.servers.length > 0) {
      currentSpecs.servers[0].url = `${protocol}://${host}`;
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.send(currentSpecs);
  });
};

module.exports = { swaggerDocs }; 