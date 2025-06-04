# Company Management API

A Node.js backend API for company management with multiple user roles and functionalities for order management, staff activity tracking, damage claims, and task management.

## Features

- **User Roles**: Admin, Marketing Staff, Mid-Level Manager, Godown Incharge
- **Authentication**: JWT-based authentication
- **Database**: MongoDB with Mongoose ORM
- **API Documentation**: Swagger UI at `/api-docs`
- **Features**:
  - Staff-wise daily activity tracking with Excel export
  - Order request management with approval workflow
  - Leakage and damage claim settlement
  - Task management system

## Technologies Used

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Swagger Documentation
- Excel4Node for Excel export
- Winston for logging

## Setup

### Prerequisites

- Node.js (v14 or higher)
- MongoDB

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd company-management-api
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/company-management
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRATION=86400
   NODE_ENV=development
   ```

4. Start the server:
   ```
   npm run dev
   ```

5. The API will be available at `http://localhost:3000` and the Swagger documentation at `http://localhost:3000/api-docs`.

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Distributors

- `POST /api/distributors` - Create a new distributor (Admin only)
- `GET /api/distributors` - Get all distributors
- `GET /api/distributors/:id` - Get a single distributor
- `PUT /api/distributors/:id` - Update a distributor (Admin only)
- `DELETE /api/distributors/:id` - Delete a distributor (Admin only)

### Staff Activity

- `POST /api/staff-activity` - Create a staff activity record (Marketing Staff)
- `GET /api/staff-activity` - Get staff activities by staff member and date (Mid-Level Manager)
- `GET /api/staff-activity/download` - Download staff activities as Excel (Mid-Level Manager)

### Orders

- `POST /api/orders` - Create a new order request (Marketing Staff)
- `GET /api/orders` - Get all orders with optional filters
- `GET /api/orders/:orderId` - Get a single order
- `GET /api/orders/track/:orderId` - Track order status
- `PATCH /api/orders/:orderId/approve` - Approve or reject an order (Mid-Level Manager)
- `PATCH /api/orders/:orderId/dispatch` - Dispatch an order (Godown Incharge)

### Damage Claims

- `POST /api/damage-claims` - Create a new damage claim (Marketing Staff)
- `GET /api/damage-claims` - Get all damage claims with optional filters
- `GET /api/damage-claims/:claimId` - Get a single damage claim
- `PATCH /api/damage-claims/:claimId/comment` - Add comments to a damage claim (Mid-Level Manager)

### Tasks

- `POST /api/tasks` - Create a new task (Marketing Staff)
- `GET /api/tasks` - Get all tasks with optional filters
- `GET /api/tasks/:taskId` - Get a single task
- `PATCH /api/tasks/:taskId` - Update task status (Marketing Staff)

## Role-Based Access

- **Admin**: Can manage distributors and users
- **Marketing Staff**: Can submit order requests, damage claims, and create tasks
- **Mid-Level Manager**: Can approve/reject orders, view staff activities, comment on damage claims, and view tasks
- **Godown Incharge**: Can update order dispatch status

## Project Structure

```
src/
├── config/           # Configuration files
├── controllers/      # Controller functions
├── middleware/       # Middleware (auth, error handling)
├── models/           # Mongoose models
├── routes/           # API routes
├── utils/            # Utility functions
└── server.js         # Main entry point
```

## License

This project is licensed under the MIT License. 