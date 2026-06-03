# Backend Architecture

The project structure:

```text
src/
├── config/
│   ├── db.js             # Operational: MongoDB Cloud Host Connector
│   ├── redis.js          # Operational: Upstash Redis RAM Socket Pool
│   ├── cloudinary.js     # Operational: Cloudinary Media SDK Initialization
│   └── process_engine.py # Operational: 11-Algorithm DIP Python Engine Pipeline
├── controllers/
│   ├── authController.js # Operational: Simple OTP & JIT Registration Engine
│   ├── imageController.js# Operational: Cloudinary Media Stream Controller
│   └── processController.js # Operational: Computational DIP Process Spawn Guard Controller
├── middleware/
│   ├── auth.js           # Operational: Stateless JWT Security Route Guard
│   ├── rateLimiter.js    # Operational: Anti-DDoS Application Firewalls
│   └── upload.js         # Operational: Multer RAM Memory Storage Config
├── models/
│   ├── User.js           # Operational: User Profile Validation Schema
│   └── ImageProject.js   # Operational: 12-Algorithm DIP Project Tracking Document
├── routes/
│   ├── authRoutes.js     # Operational: Authentication Endpoint Mappings
│   └── imageRoutes.js    # Operational: Protected File Ingestion & Transformation Mappings
└── server.js             # Operational: Central App Entry Gateway & Core Middlewares
```

# Frontend Architecture

```text
frontend/src/
├── assets/           # Global images, logos, and custom CSS styles
├── components/       # Reusable UI parts
│   ├── Sidebar.jsx        # Sidebar control module containing DIP suit category lists
│   └── AnalyticsPanel.jsx # Side data metrics panel presenting entropy size and processing logs
├── context/          # Global state management
│   └── AuthContext.jsx    # Session Authentication & State Provider
├── hooks/            # Custom reusable logic
│   └── useDipEngine.js    # State controller executing DIP pipeline uploads and runs
├── pages/            # Main complete views
│   ├── Login.jsx     # The frictionless OTP entry page
│   └── Dashboard.jsx # The 11-algorithm interactive image laboratory
├── services/         # API connection modules (Axios network calls to backend)
│   ├── api.js             # Basic Axios networking instance setup
│   └── imageService.js    # Ingest and Transformation API network wrappers
├── App.jsx           # Main router config mapping endpoints to pages
└── main.jsx          # App root configuration entry gate
```
