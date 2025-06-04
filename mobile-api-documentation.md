# Mobile API Documentation

## Base URL
```
http://localhost:3000/api/mobile
```

## Authentication

### Login
```
POST /login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "YourPassword"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "your-jwt-token",
  "user": {
    "id": "user-id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "Marketing Staff"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

### Validate Token
```
GET /validate-token
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Token is valid"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Not authorized to access this route"
}
```

### How to use the token

Include the token in the Authorization header for all authenticated requests:

```
Authorization: Bearer your-jwt-token
```

## Profile

### Get Current User Profile
```
GET /me
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "Marketing Staff",
    "lastLogin": "2023-06-15T10:30:00.000Z"
  }
}
```

## Distributors

### Get All Distributors
```
GET /distributors
```

**Success Response (200):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "distributor-id-1",
      "name": "Distributor 1",
      "contact": "9876543210",
      "address": "123 Main St, City",
      "createdAt": "2023-06-15T10:30:00.000Z",
      "updatedAt": "2023-06-15T10:30:00.000Z"
    },
    {
      "_id": "distributor-id-2",
      "name": "Distributor 2",
      "contact": "9876543211",
      "address": "456 Oak St, City",
      "createdAt": "2023-06-15T10:30:00.000Z",
      "updatedAt": "2023-06-15T10:30:00.000Z"
    }
  ]
}
```

### Get Distributor by ID
```
GET /distributors/:id
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "distributor-id-1",
    "name": "Distributor 1",
    "contact": "9876543210",
    "address": "123 Main St, City",
    "createdAt": "2023-06-15T10:30:00.000Z",
    "updatedAt": "2023-06-15T10:30:00.000Z"
  }
}
```

### Get Comprehensive Distributor Details
```
GET /distributors/:id/details
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "distributor-id-1",
    "name": "ABC Distributors",
    "shopName": "ABC Enterprises",
    "contact": "9876543210",
    "phoneNumber": "9876543211",
    "address": "123 Main St, City",
    "retailShopCount": 5,
    "wholesaleShopCount": 2,
    "orderCount": 10,
    "shops": {
      "retailShops": [
        {
          "_id": "shop-id-1",
          "name": "Retail Shop 1",
          "ownerName": "Owner 1",
          "address": "456 Oak St, City",
          "type": "Retailer",
          "distributorId": "distributor-id-1",
          "isLegacy": false,
          "isActive": true
        }
      ],
      "wholesaleShops": [
        {
          "_id": "shop-id-2",
          "name": "Wholesale Shop 1",
          "ownerName": "Owner 2",
          "address": "789 Pine St, City",
          "type": "Whole Seller",
          "distributorId": "distributor-id-1",
          "isLegacy": false,
          "isActive": true
        }
      ]
    }
  }
}
```

## Tasks

### Get Assigned Tasks
```
GET /tasks/assigned
```

Query Parameters:
- `status`: Filter by status (Pending, In Progress, Completed)

**Success Response (200):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "task-id-1",
      "title": "Task 1",
      "description": "Description for task 1",
      "status": "Pending",
      "assignedTo": {
        "_id": "user-id",
        "name": "User Name"
      },
      "createdBy": {
        "_id": "admin-id",
        "name": "Admin User"
      },
      "createdAt": "2023-06-15T10:30:00.000Z",
      "updatedAt": "2023-06-15T10:30:00.000Z"
    },
    {
      "_id": "task-id-2",
      "title": "Task 2",
      "description": "Description for task 2",
      "status": "In Progress",
      "assignedTo": {
        "_id": "user-id",
        "name": "User Name"
      },
      "createdBy": {
        "_id": "admin-id",
        "name": "Admin User"
      },
      "createdAt": "2023-06-15T10:30:00.000Z",
      "updatedAt": "2023-06-15T10:30:00.000Z"
    }
  ]
}
```

## Supply Estimates

### Create Supply Estimate
```
POST /supply-estimates
```

**Request Body:**
```json
{
  "distributorId": "distributor-id",
  "items": [
    {
      "productName": "Product 1",
      "quantity": 100,
      "units": "kg",
      "notes": "Optional notes"
    },
    {
      "productName": "Product 2",
      "quantity": 50,
      "units": "boxes",
      "notes": "Optional notes"
    }
  ],
  "notes": "Overall notes for the estimate"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "estimate-id",
    "distributorId": "distributor-id",
    "submittedBy": "user-id",
    "status": "Pending",
    "items": [
      {
        "productName": "Product 1",
        "quantity": 100,
        "units": "kg",
        "notes": "Optional notes"
      },
      {
        "productName": "Product 2",
        "quantity": 50,
        "units": "boxes",
        "notes": "Optional notes"
      }
    ],
    "notes": "Overall notes for the estimate",
    "createdAt": "2023-06-15T10:30:00.000Z",
    "updatedAt": "2023-06-15T10:30:00.000Z"
  }
}
```

### Get My Supply Estimates
```
GET /supply-estimates/my-submissions
```

Query Parameters:
- `status`: Filter by status (Pending, Approved, Rejected)

**Success Response (200):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "estimate-id-1",
      "distributorId": {
        "_id": "distributor-id-1",
        "name": "Distributor 1"
      },
      "submittedBy": {
        "_id": "user-id",
        "name": "User Name"
      },
      "status": "Pending",
      "items": [
        {
          "productName": "Product 1",
          "quantity": 100,
          "units": "kg",
          "notes": "Optional notes"
        }
      ],
      "notes": "Notes for estimate 1",
      "createdAt": "2023-06-15T10:30:00.000Z",
      "updatedAt": "2023-06-15T10:30:00.000Z"
    },
    {
      "_id": "estimate-id-2",
      "distributorId": {
        "_id": "distributor-id-2",
        "name": "Distributor 2"
      },
      "submittedBy": {
        "_id": "user-id",
        "name": "User Name"
      },
      "status": "Approved",
      "items": [
        {
          "productName": "Product 2",
          "quantity": 50,
          "units": "boxes",
          "notes": "Optional notes"
        }
      ],
      "notes": "Notes for estimate 2",
      "createdAt": "2023-06-15T10:30:00.000Z",
      "updatedAt": "2023-06-15T10:30:00.000Z"
    }
  ]
}
```

## Password Management

### Change Password
```
PATCH /change-password
```

**Request Body:**
```json
{
  "currentPassword": "OldPassword",
  "newPassword": "NewPassword"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "new-jwt-token",
  "user": {
    "id": "user-id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "Marketing Staff"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Current password is incorrect"
}
```

## Error Handling

All API endpoints follow a consistent error format:

```json
{
  "success": false,
  "error": "Error message"
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request (invalid input)
- 401: Unauthorized (invalid or missing authentication)
- 403: Forbidden (authenticated but not authorized)
- 404: Not Found
- 429: Too Many Requests (rate limiting)
- 500: Internal Server Error 

## Marketing Staff Activity APIs

### Punch In

**Endpoint:** `POST /api/mobile/marketing-activity/punch-in`

**Authentication:** Required (Bearer token)

**Description:** Record a new marketing staff activity with punch-in information

**Request Body:**
```json
{
  "retailShop": "Shyam ji foods",
  "distributor": "Shyam Chaudhary",
  "areaName": "223/23, Ramesh Nagar, Delhi",
  "tripCompanion": {
    "category": "Distributor Staff",
    "name": "Nitin"
  },
  "modeOfTransport": "Vehicle",
  "selfieImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA...", 
  "shopTypes": ["Retailer", "Whole Seller"],
  "shops": [
    {
      "name": "Nandu Shop",
      "type": "Retailer"
    },
    {
      "name": "Chandu Shop",
      "type": "Retailer"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "60f7b0b3c9d4a84e8c9d4a84",
    "marketingStaffId": "60f7b0b3c9d4a84e8c9d4a84",
    "retailShop": "Shyam ji foods",
    "distributor": "Shyam Chaudhary",
    "areaName": "223/23, Ramesh Nagar, Delhi",
    "tripCompanion": {
      "category": "Distributor Staff",
      "name": "Nitin"
    },
    "modeOfTransport": "Vehicle",
    "meetingStartTime": "2023-07-21T10:30:00.000Z",
    "selfieImage": "/uploads/selfies/selfie_60f7b0b3c9d4a84e8c9d4a84_1689939000000.jpg",
    "shopTypes": ["Retailer", "Whole Seller"],
    "shops": [
      {
        "name": "Nandu Shop",
        "type": "Retailer"
      },
      {
        "name": "Chandu Shop",
        "type": "Retailer"
      }
    ],
    "status": "Punched In",
    "createdAt": "2023-07-21T10:30:00.000Z",
    "updatedAt": "2023-07-21T10:30:00.000Z"
  }
}
```

### Punch Out

**Endpoint:** `PATCH /api/mobile/marketing-activity/:id/punch-out`

**Authentication:** Required (Bearer token)

**Description:** Update an existing activity with punch-out information

**Request Body:**
```json
{
  "shops": [
    {
      "name": "Anand Shop",
      "type": "Retailer"
    },
    {
      "name": "Piyush Shop",
      "type": "Retailer"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "60f7b0b3c9d4a84e8c9d4a84",
    "marketingStaffId": "60f7b0b3c9d4a84e8c9d4a84",
    "retailShop": "Shyam ji foods",
    "distributor": "Shyam Chaudhary",
    "areaName": "223/23, Ramesh Nagar, Delhi",
    "tripCompanion": {
      "category": "Distributor Staff",
      "name": "Nitin"
    },
    "modeOfTransport": "Vehicle",
    "meetingStartTime": "2023-07-21T10:30:00.000Z",
    "meetingEndTime": "2023-07-21T12:45:00.000Z",
    "selfieImage": "/uploads/selfies/selfie_60f7b0b3c9d4a84e8c9d4a84_1689939000000.jpg",
    "shopTypes": ["Retailer", "Whole Seller"],
    "shops": [
      {
        "name": "Nandu Shop",
        "type": "Retailer"
      },
      {
        "name": "Chandu Shop",
        "type": "Retailer"
      },
      {
        "name": "Anand Shop",
        "type": "Retailer"
      },
      {
        "name": "Piyush Shop",
        "type": "Retailer"
      }
    ],
    "status": "Punched Out",
    "createdAt": "2023-07-21T10:30:00.000Z",
    "updatedAt": "2023-07-21T12:45:00.000Z"
  }
}
```

### Get My Activities

**Endpoint:** `GET /api/mobile/marketing-activity/my-activities`

**Authentication:** Required (Bearer token)

**Description:** Get the logged-in marketing staff's activities

**Query Parameters:**
- `date` (optional): Filter by date in YYYY-MM-DD format

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "60f7b0b3c9d4a84e8c9d4a84",
      "marketingStaffId": {
        "_id": "60f7b0b3c9d4a84e8c9d4a84",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "retailShop": "Shyam ji foods",
      "distributor": "Shyam Chaudhary",
      "areaName": "223/23, Ramesh Nagar, Delhi",
      "tripCompanion": {
        "category": "Distributor Staff",
        "name": "Nitin"
      },
      "modeOfTransport": "Vehicle",
      "meetingStartTime": "2023-07-21T10:30:00.000Z",
      "meetingEndTime": "2023-07-21T12:45:00.000Z",
      "durationMinutes": 135,
      "selfieImage": "/uploads/selfies/selfie_60f7b0b3c9d4a84e8c9d4a84_1689939000000.jpg",
      "shopTypes": ["Retailer", "Whole Seller"],
      "shops": [
        {
          "name": "Nandu Shop",
          "type": "Retailer"
        },
        {
          "name": "Chandu Shop",
          "type": "Retailer"
        },
        {
          "name": "Anand Shop",
          "type": "Retailer"
        },
        {
          "name": "Piyush Shop",
          "type": "Retailer"
        }
      ],
      "shopsVisitedCount": 4,
      "brandSupplyEstimates": [
        {
          "_id": "60d21b4667d0d8992e610c10",
          "name": "KG Brand",
          "variants": [
            {
              "_id": "60d21b4667d0d8992e610c11",
              "name": "pouch",
              "sizes": [
                {
                  "_id": "60d21b4667d0d8992e610c12",
                  "name": "100g",
                  "openingStock": 50,
                  "proposedMarketRate": 45.5
                },
                {
                  "_id": "60d21b4667d0d8992e610c13",
                  "name": "200g",
                  "openingStock": 30,
                  "proposedMarketRate": 85.75
                }
              ]
            }
          ]
        }
      ],
      "status": "Punched Out",
      "createdAt": "2023-07-21T10:30:00.000Z",
      "updatedAt": "2023-07-21T12:45:00.000Z"
    },
    {
      "_id": "60f7b0b3c9d4a84e8c9d4a85",
      "marketingStaffId": {
        "_id": "60f7b0b3c9d4a84e8c9d4a84",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "retailShop": "Vijay Stores",
      "distributor": "Mohan Enterprises",
      "areaName": "45/B, Lajpat Nagar, Delhi",
      "tripCompanion": {
        "category": "Marketing Staff",
        "name": "Suresh"
      },
      "modeOfTransport": "Auto",
      "meetingStartTime": "2023-07-22T09:15:00.000Z",
      "selfieImage": "/uploads/selfies/selfie_60f7b0b3c9d4a84e8c9d4a84_1690024500000.jpg",
      "shopTypes": ["Retailer"],
      "shops": [
        {
          "name": "Sagar Shop",
          "type": "Retailer"
        }
      ],
      "shopsVisitedCount": 1,
      "brandSupplyEstimates": [
        {
          "_id": "60d21b4667d0d8992e610c15",
          "name": "ABC Brand",
          "variants": [
            {
              "_id": "60d21b4667d0d8992e610c16",
              "name": "tin",
              "sizes": [
                {
                  "_id": "60d21b4667d0d8992e610c17",
                  "name": "500g",
                  "openingStock": 25,
                  "proposedMarketRate": 120.5
                }
              ]
            }
          ]
        }
      ],
      "status": "Punched In",
      "createdAt": "2023-07-22T09:15:00.000Z",
      "updatedAt": "2023-07-22T09:15:00.000Z"
    }
  ]
} 