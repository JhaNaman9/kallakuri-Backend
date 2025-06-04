const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load environment variables
dotenv.config({ path: './.env' });

// API URL
const API_URL = process.env.API_URL || 'http://localhost:3000';

// Authentication token
let authToken;

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
    
    console.log(`Using marketing staff user: ${marketingStaff.email}`);
    
    // Use a known password for testing - in a real environment, this would be retrieved differently
    const password = 'password123'; // This is just for testing
    
    const response = await axios.post(`${API_URL}/api/mobile/login`, {
      email: marketingStaff.email,
      password: password
    });
    
    authToken = response.data.token;
    console.log('Authentication successful');
    return marketingStaff._id;
  } catch (error) {
    console.error('Authentication failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * Test punch-in API
 */
async function testPunchIn() {
  try {
    console.log('\n--- Testing Punch In API ---');
    
    const punchInData = {
      retailShop: "Test Retail Shop",
      distributor: "Test Distributor",
      areaName: "Test Area, Delhi",
      tripCompanion: {
        category: "Distributor Staff",
        name: "Test Companion"
      },
      modeOfTransport: "Auto",
      selfieImage: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9U6KKKADmiiigD//Z",
      shopTypes: ["Retailer", "Whole Seller"],
      shops: [
        {
          name: "Test Shop 1",
          type: "Retailer"
        },
        {
          name: "Test Shop 2",
          type: "Whole Seller"
        }
      ],
      brandSupplyEstimates: [
        {
          name: "Test Brand",
          variants: [
            {
              name: "pouch",
              sizes: [
                {
                  name: "100g",
                  openingStock: 50,
                  proposedMarketRate: 45.5
                },
                {
                  name: "200g",
                  openingStock: 30,
                  proposedMarketRate: 85.75
                }
              ]
            }
          ]
        }
      ]
    };
    
    const response = await axios.post(
      `${API_URL}/api/mobile/marketing-activity/punch-in`,
      punchInData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Punch In successful');
    console.log('Activity ID:', response.data.data._id);
    
    return response.data.data._id;
  } catch (error) {
    console.error('Punch In failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * Test punch-out API
 */
async function testPunchOut(activityId) {
  try {
    console.log('\n--- Testing Punch Out API ---');
    
    const punchOutData = {
      shops: [
        {
          name: "Test Shop 3",
          type: "Retailer"
        },
        {
          name: "Test Shop 4",
          type: "Whole Seller"
        }
      ]
    };
    
    const response = await axios.patch(
      `${API_URL}/api/mobile/marketing-activity/${activityId}/punch-out`,
      punchOutData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Punch Out successful');
    return response.data.data;
  } catch (error) {
    console.error('Punch Out failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * Test my-activities API
 */
async function testMyActivities() {
  try {
    console.log('\n--- Testing My Activities API ---');
    
    const response = await axios.get(
      `${API_URL}/api/mobile/marketing-activity/my-activities`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    console.log('My Activities fetched successfully');
    console.log(`Found ${response.data.count} activities`);
    
    // Verify that all required fields are present in the response
    if (response.data.data.length > 0) {
      const activity = response.data.data[0];
      
      // Check for essential fields
      const requiredFields = [
        'marketingStaffId', 'retailShop', 'distributor', 'areaName',
        'tripCompanion', 'modeOfTransport', 'selfieImage', 'shopTypes',
        'shops', 'status', 'createdAt', 'updatedAt'
      ];
      
      const missingFields = requiredFields.filter(field => !activity[field]);
      
      if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
      } else {
        console.log('All required fields are present');
      }
      
      // Check if marketingStaffId is populated
      if (typeof activity.marketingStaffId === 'object' && activity.marketingStaffId.name) {
        console.log('Marketing staff is properly populated');
      } else {
        console.error('Marketing staff is not properly populated');
      }
      
      // Check for brandSupplyEstimates
      if (activity.brandSupplyEstimates && Array.isArray(activity.brandSupplyEstimates)) {
        console.log('Brand supply estimates are present');
      }
      
      // Check for additional calculated fields
      if (activity.meetingEndTime && activity.durationMinutes) {
        console.log('Duration is calculated correctly:', activity.durationMinutes, 'minutes');
      }
      
      if (activity.shopsVisitedCount) {
        console.log('Shops visited count is present:', activity.shopsVisitedCount);
      }
      
      return activity;
    } else {
      console.log('No activities found');
      return null;
    }
  } catch (error) {
    console.error('My Activities fetch failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * Main test function
 */
async function runTests() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Get auth token
    const staffId = await getAuthToken();
    
    // Test punch-in
    const activityId = await testPunchIn();
    
    // Test punch-out
    await testPunchOut(activityId);
    
    // Test my-activities
    await testMyActivities();
    
    console.log('\nAll tests completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the tests
runTests(); 