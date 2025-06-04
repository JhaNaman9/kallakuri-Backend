const mongoose = require('mongoose');
const DamageClaim = require('./models/DamageClaim');
const fs = require('fs');
const path = require('path');

// Connect to MongoDB
async function connectDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/sports-academy');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

// Drop the problematic index if it exists
async function dropIndex() {
  try {
    console.log('Attempting to drop trackingId index...');
    await mongoose.connection.db.collection('damageclaims').dropIndex('trackingId_1');
    console.log('Index dropped successfully');
  } catch (error) {
    if (error.code === 27) {
      console.log('Index does not exist, continuing...');
    } else {
      console.error('Error dropping index:', error);
    }
  }
}

// Create a test damage claim
async function createTestClaim() {
  try {
    console.log('Creating test damage claim...');
    
    const uniqueId = Date.now();
    const damageClaimData = {
      distributorId: '68271f50e82cd9672f9a328f', // Use an existing distributor ID
      distributorName: 'NAMAN JHA',
      brand: 'FoodTest',
      variant: `Test Variant ${uniqueId}`,
      size: '250g',
      pieces: 10,
      manufacturingDate: new Date('2024-05-15'),
      batchDetails: `B12345-${uniqueId}`,
      damageType: 'Box Damage',
      reason: `Test reason ${uniqueId}`,
      createdBy: '68287dac192c912b0ecf2ee1', // Use an existing user ID
      status: 'Pending'
    };
    
    const damageClaim = new DamageClaim(damageClaimData);
    const savedClaim = await damageClaim.save();
    
    console.log('Damage claim created successfully:', savedClaim._id);
    return savedClaim;
  } catch (error) {
    console.error('Error creating damage claim:', error);
    return null;
  }
}

// Update a damage claim status
async function updateClaimStatus(claimId) {
  try {
    console.log(`Updating damage claim ${claimId} status...`);
    
    const updatedClaim = await DamageClaim.findByIdAndUpdate(
      claimId,
      {
        status: 'Approved',
        approvedBy: '68230648774d107a751cf052', // Admin user ID
        comment: 'Approved for testing',
        approvedPieces: 10
      },
      { new: true }
    );
    
    console.log('Damage claim updated successfully:', updatedClaim.status);
    console.log('Tracking ID generated:', updatedClaim.trackingId);
    return updatedClaim;
  } catch (error) {
    console.error('Error updating damage claim:', error);
    return null;
  }
}

// Run the tests
async function runTests() {
  try {
    await connectDB();
    await dropIndex();
    const claim = await createTestClaim();
    if (claim) {
      await updateClaimStatus(claim._id);
    }
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

runTests(); 