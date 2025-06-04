const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test the damage claim API flow
console.log('Testing damage claim API flow');

// 1. Login as marketing staff
console.log('\n1. Logging in as marketing staff...');
const loginResponse = JSON.parse(execSync(`
  curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"chachi@gmail.com","password":"Test@1234"}'
`).toString());

if (!loginResponse.success) {
  console.error('Login failed:', loginResponse);
  process.exit(1);
}

const token = loginResponse.token;
console.log('Login successful. Token:', token.substring(0, 20) + '...');

// 2. Get list of distributors
console.log('\n2. Getting distributors list...');
const distributorsResponse = JSON.parse(execSync(`
  curl -s -X GET http://localhost:3000/api/damage-claims/distributors -H "Authorization: Bearer ${token}"
`).toString());

if (!distributorsResponse.success) {
  console.error('Failed to get distributors:', distributorsResponse);
  process.exit(1);
}

console.log(`Found ${distributorsResponse.count} distributors`);
const distributor = distributorsResponse.data[0];

// 3. Create a damage claim with a unique tracking ID to avoid duplicate key error
console.log('\n3. Creating a damage claim...');
const uniqueId = Date.now();
const createResponse = JSON.parse(execSync(`
  curl -s -X POST http://localhost:3000/api/damage-claims -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -d '{
    "distributorId": "${distributor._id}",
    "distributorName": "${distributor.name}",
    "brand": "FoodTest",
    "variant": "Spicy Test ${uniqueId}",
    "size": "250g",
    "pieces": 10,
    "manufacturingDate": "2024-05-15",
    "batchDetails": "B12345-${uniqueId}",
    "damageType": "Box Damage",
    "reason": "Boxes were damaged during testing ${uniqueId}"
  }'
`).toString());

if (!createResponse.success) {
  console.error('Failed to create damage claim:', createResponse);
  process.exit(1);
}

const claimId = createResponse.data._id;
console.log('Damage claim created successfully with ID:', claimId);

// 4. Retrieve user's damage claims
console.log('\n4. Getting user damage claims...');
const claimsResponse = JSON.parse(execSync(`
  curl -s -X GET http://localhost:3000/api/damage-claims/user -H "Authorization: Bearer ${token}"
`).toString());

if (!claimsResponse.success) {
  console.error('Failed to get user claims:', claimsResponse);
  process.exit(1);
}

console.log(`Found ${claimsResponse.count} claims for the user`);

// 5. Get specific damage claim
console.log('\n5. Getting specific damage claim...');
const claimResponse = JSON.parse(execSync(`
  curl -s -X GET http://localhost:3000/api/damage-claims/${claimId} -H "Authorization: Bearer ${token}"
`).toString());

if (!claimResponse.success) {
  console.error('Failed to get specific claim:', claimResponse);
  process.exit(1);
}

console.log('Successfully retrieved damage claim with status:', claimResponse.data.status);

console.log('\nAPI Test completed successfully!'); 