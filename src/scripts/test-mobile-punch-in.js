/**
 * Test script to simulate a mobile app's punch-in request with empty ID fields
 * 
 * Run with: node src/scripts/test-mobile-punch-in.js
 */

const axios = require('axios');
const config = require('../config/config');

// API URL - same machine
const API_URL = `http://localhost:${config.port}`;

// JWT token obtained from login with nisha@gmail.com
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MjMxODVhMWVhMDczMGUxNWIwNWVkNyIsInJvbGUiOiJNYXJrZXRpbmcgU3RhZmYiLCJpYXQiOjE3NDczODM3NzMsImV4cCI6MTc0NzQ3MDE3M30.oM8V16mQyefWJABDisjRQmdnrVk55mFgJhO7aiP8jGw';

// Sample data simulating what a mobile app might send
const mobileAppRequest = {
  retailShop: "Mobile Test Shop",
  distributor: "Mobile Test Distributor",
  areaName: "Mobile Test Area",
  tripCompanion: {
    category: "Marketing Staff",
    name: "Mobile Test Companion"
  },
  modeOfTransport: "Car",
  selfieImage: "data:image/jpeg;base64,/9j/4AAQSkZJRg==", // Minimal base64 data
  shopTypes: ["Retailer"],
  shops: [
    {
      name: "Mobile Shop 1",
      type: "Retailer"
    }
  ],
  // Using the hierarchical structure with brands, variants, and sizes
  brandSupplyEstimates: [
    {
      "_id": "", // Empty ID that will be auto-generated
      "name": "KG Brand",
      "variants": [
        {
          "_id": "", // Empty ID that will be auto-generated
          "name": "pouch",
          "sizes": [
            {
              "_id": "", // Empty ID that will be auto-generated
              "name": "100g",
              "openingStock": 50,
              "proposedMarketRate": 45.5
            }
          ]
        }
      ]
    },
    {
      "_id": "", // Empty ID that will be auto-generated
      "name": "XYZ Brand",
      "variants": [
        {
          "_id": "", // Empty ID that will be auto-generated
          "name": "bottle",
          "sizes": [
            {
              "_id": "", // Empty ID that will be auto-generated
              "name": "500ml",
              "openingStock": 40,
              "proposedMarketRate": 75.0
            }
          ]
        }
      ]
    }
  ]
};

/**
 * Test the punch-in API with a mobile-like request
 */
async function testMobilePunchIn() {
  try {
    console.log('Testing mobile punch-in API with empty ID fields...');
    
    const response = await axios.post(
      `${API_URL}/api/mobile/marketing-activity/punch-in`,
      mobileAppRequest,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JWT_TOKEN}`
        }
      }
    );
    
    console.log('API Response Status:', response.status);
    console.log('API Response:', JSON.stringify(response.data, null, 2));
    console.log('Test successful! The updated API can handle empty ID fields.');
  } catch (error) {
    console.error('Test failed with error:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
console.log('Starting mobile punch-in API test...');
testMobilePunchIn(); 