# Backend Architecture

The project structure (no architectural changes):

```text
src/
├── config/
│   ├── db.js             # Operational: MongoDB Cloud Host Connector
│   ├── redis.js          # Operational: Upstash Redis RAM Socket Pool
│   └── cloudinary.js     # Operational: Cloudinary Media SDK Initialization
├── controllers/
│   ├── authController.js # Operational: Simple OTP & JIT Registration Engine
│   └── imageController.js# Operational: Cloudinary Media Stream Controller
├── middleware/
│   ├── auth.js           # Operational: Stateless JWT Security Route Guard
│   ├── rateLimiter.js    # Operational: Anti-DDoS Application Firewalls
│   └── upload.js         # Operational: Multer RAM Memory Storage Config
├── models/
│   ├── User.js           # Operational: User Profile Validation Schema
│   └── ImageProject.js   # Operational: 12-Algorithm DIP Project Tracking Document
├── routes/
│   ├── authRoutes.js     # Operational: Authentication Endpoint Mappings
│   └── imageRoutes.js    # Operational: Protected File Ingestion Mappings
└── server.js             # Operational: Central App Entry Gateway & Core Middlewares
```

# Frontend Architecture

```text
frontend/src/
├── assets/           # Global images, logos, and custom CSS styles
├── components/       # Reusable UI parts (Buttons, Navbar, Image comparison sliders)
├── context/          # Global state management (User auth data, active image states)
├── hooks/            # Custom reusable logic (e.g., useAuth, useDipEngine)
├── pages/            # Main complete views
│   ├── Login.jsx     # The frictionless OTP entry page
│   └── Dashboard.jsx # The 12-algorithm interactive image laboratory
├── services/         # API connection modules (Axios network calls to backend)
├── App.jsx           # Main router config mapping endpoints to pages
└── main.jsx          # App root configuration entry gate
```
