/**
 * Test script for the updated punch-in API with hierarchical brand, variant, size structure
 * 
 * Run this script with:
 * node src/scripts/test-punch-in-api.js
 */

const axios = require('axios');
const mongoose = require('mongoose');
const config = require('../config/config');
const Product = require('../models/Product');
const User = require('../models/User');

// Test data for a punch-in request
const testPunchInData = {
  retailShop: "Test Shop",
  distributor: "Test Distributor",
  areaName: "Test Area",
  tripCompanion: {
    category: "Marketing Staff",
    name: "Test Companion"
  },
  modeOfTransport: "Car",
  selfieImage: "data:image/jpeg;base64,/9j/4AAQSkZJRg==", // Minimal base64 data for testing
  shopTypes: ["Retailer"],
  shops: [
    {
      name: "Shop 1",
      type: "Retailer"
    }
  ],
  // brandSupplyEstimates will be populated dynamically from database
  brandSupplyEstimates: []
};

// Set up the base URL for API requests
const API_URL = `http://localhost:${config.port}`;
let authToken = '';

/**
 * Main test function
 */
async function runTest() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoURI);
    console.log('Connected to MongoDB');

    // Get a valid JWT token for authentication
    await getAuthToken();

    // Get product data from the database to populate the test data
    await populateTestData();

    // Make the punch-in API request
    await testPunchInAPI();

    console.log('Test completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response && error.response.data) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

/**
 * Get authentication token for API requests
 */
async function getAuthToken() {
  try {
    // Find a marketing staff user to use for testing
    const marketingStaff = await User.findOne({ role: 'Marketing Staff' });
    
    if (!marketingStaff) {
      throw new Error('No marketing staff user found. Create one first.');
    }
    
    // Use a known password for testing - in a real environment, this would be retrieved differently
    const password = 'password123'; // This is just for testing
    
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: marketingStaff.email,
      password: password
    });
    
    authToken = response.data.token;
    console.log('Authentication successful');
  } catch (error) {
    console.error('Authentication failed:', error.message);
    throw error;
  }
}

/**
 * Populate test data with real products from the database
 */
async function populateTestData() {
  try {
    // Get products from the database
    const products = await Product.find({ isActive: true }).limit(3);
    
    if (products.length === 0) {
      throw new Error('No products found in the database. Add some products first.');
    }
    
    // Populate brandSupplyEstimates with actual database data
    testPunchInData.brandSupplyEstimates = products.map(product => {
      const brandEstimate = {
        _id: product._id,
        name: product.brandName,
        variants: []
      };
      
      // Include variants if they exist
      if (product.variants && product.variants.length > 0) {
        brandEstimate.variants = product.variants.map(variant => {
          const variantEstimate = {
            _id: variant._id,
            name: variant.name,
            sizes: []
          };
          
          // Include sizes if they exist
          if (variant.sizes && variant.sizes.length > 0) {
            variantEstimate.sizes = variant.sizes.map(size => ({
              _id: size._id,
              name: size.name,
              openingStock: Math.floor(Math.random() * 100), // Random stock
              proposedMarketRate: Math.floor(Math.random() * 1000) / 10 // Random rate
            }));
          }
          
          return variantEstimate;
        });
      }
      
      return brandEstimate;
    });
    
    console.log(`Test data populated with ${testPunchInData.brandSupplyEstimates.length} brands`);
    console.log('Brand structure example:', JSON.stringify(testPunchInData.brandSupplyEstimates[0], null, 2));
  } catch (error) {
    console.error('Failed to populate test data:', error.message);
    throw error;
  }
}

/**
 * Test the punch-in API with the hierarchical data structure
 */
async function testPunchInAPI() {
  try {
    const response = await axios.post(
      `${API_URL}/api/mobile/marketing-activity/punch-in`,
      testPunchInData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    console.log('Punch-in API response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    // Validate the response structure contains brandSupplyEstimates
    if (!response.data.data.brandSupplyEstimates) {
      throw new Error('Response does not contain brandSupplyEstimates');
    }
    
    console.log('Punch-in API test successful');
  } catch (error) {
    console.error('Punch-in API test failed:', error.message);
    throw error;
  }
}

// Run the test
runTest(); 