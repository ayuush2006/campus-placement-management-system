# Middleware Directory

Middleware functions run between the incoming request and the final controller handler.

Examples of upcoming files:
- `authMiddleware.js`: Verifies JWT tokens to protect routes for logged-in students or admins.
- `roleMiddleware.js`: Ensures only admins can access admin routes.
