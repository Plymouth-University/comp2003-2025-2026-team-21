[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/xGnTrW1S)
[![Open in Codespaces](https://classroom.github.com/assets/launch-codespace-2972f46106e565e64193e422d61a12cf1da4916b45550586e14ef0a7c637dd04.svg)](https://classroom.github.com/open-in-codespaces?assignment_repo_id=21438486)

# Student Social App

A mobile social networking application built with React Native and Expo, allowing students to share posts with images and captions, connect with peers, and manage their profiles.

## 📱 Features

- **User Authentication**: Secure registration and login with JWT tokens
- **Username System**: Unique usernames for user identification
- **Social Feed**: View posts from all students in chronological order
- **Create Posts**: Share images with captions using camera or photo library
- **Profile Management**: View and edit student profiles
- **Event Feed**: Browse upcoming events
- **My Tickets**: Track event tickets
- **Real-time Updates**: Posts automatically sync with the database

## 🛠️ Tech Stack

### Frontend
- **React Native** with **Expo** (~54.0)
- **Expo Router** for file-based navigation
- **TypeScript** for type safety
- **expo-image-picker** for media selection
- **expo-secure-store** for secure token storage
- **Context API** for state management

### Backend
- **Node.js** with **Express.js**
- **TypeScript**
- **Prisma ORM** for database management
- **PostgreSQL** database (Neon DB)
- **JWT** for authentication
- **bcryptjs** for password hashing

## 📁 Project Structure

```
comp2003-2025-2026-team-21/
├── docs/                          # Documentation and design files
│   ├── design/                    # Design documents
│   └── trello/                    # Trello board snapshots
├── scripts/                       # Utility scripts
│   └── init-env.sh               # Environment initialization
└── SourceCode/
    ├── backend/                   # Node.js/Express backend
    │   ├── prisma/               # Database schema and migrations
    │   │   ├── schema.prisma     # Database models
    │   │   └── migrations/       # Migration history
    │   └── src/
    │       ├── controllers/      # Business logic
    │       ├── middleware/       # Auth & role middleware
    │       ├── routes/           # API routes
    │       ├── types/            # TypeScript definitions
    │       ├── utils/            # Utilities (Prisma client)
    │       └── server.ts         # Express server entry point
    └── frontend/                  # React Native/Expo app
        ├── app/                   # Expo Router pages
        │   ├── components/       # Reusable components
        │   ├── contexts/         # Context providers
        │   ├── createPost.tsx    # Post creation page
        │   ├── socialStudent.tsx # Social feed
        │   ├── profileStudent.tsx # Profile view
        │   └── ...
        ├── assets/               # Images and static files
        └── lib/                  # API helpers
            ├── api.ts            # API configuration
            ├── apiBase.ts        # Base URL handler
            └── postsApi.ts       # Posts API functions
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- PostgreSQL database (or Neon DB account)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd comp2003-2025-2026-team-21
   ```

2. **Backend Setup**
   ```bash
   cd SourceCode/backend
   npm install
   ```

3. **Configure Environment Variables**
   
   Create a `.env` file in the backend directory:
   ```env
   DATABASE_URL="your-postgres-connection-string"
   JWT_SECRET="your-secret-key"
   PORT=3001
   ```

4. **Run Database Migrations**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start Backend Server**
   ```bash
   npm run dev
   ```
   Server will run on `http://localhost:3001`

6. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```

7. **Start Expo App**
   ```bash
   npx expo start --tunnel
   ```
   
   Use the Expo Go app on your phone to scan the QR code, or:
   - Press `a` for Android emulator
   - Press `i` for iOS simulator
   - Press `w` for web

8. **Make 3001 Port Public if Need Be**
        -Right Click on Port 
        -Port Visability
        -Select Public

## 🗄️ Database Schema

### User
- `id`: UUID (primary key)
- `email`: String (unique)
- `username`: String (unique)
- `name`: String
- `password`: String (hashed)
- `role`: Enum (STUDENT, SOCIETY_ORGANIZER)
- Posts relationship (one-to-many)

### Posts
- `id`: UUID (primary key)
- `caption`: String
- `image`: Bytes (binary image data)
- `imageMimeType`: String
- `authorId`: String (foreign key to User)
- `createdAt`: DateTime
- User relationship (many-to-one)

## 🔐 Authentication

The app uses JWT-based authentication:

1. **Registration**: Users create an account with email, username, name, and password
2. **Login**: Returns a JWT token stored securely using expo-secure-store
3. **Protected Routes**: Backend routes use `authMiddleware` to verify tokens
4. **Token Storage**: Tokens persisted securely on the device

## 📡 API Endpoints

### Authentication
- `POST /auth/register` - Create new user account
- `POST /auth/login` - Login and receive JWT token
- `GET /auth/me` - Get current user information

### Posts
- `POST /posts` - Create a new post (requires auth)
- `GET /posts` - Get all posts with author information
- `GET /posts/user/:userId` - Get posts by specific user
- `DELETE /posts/:postId` - Delete a post (requires auth)

## 🧪 Development Tools

### Prisma Studio
View and edit database records:
```bash
cd SourceCode/backend
npx prisma studio
```

### Database Inspection
Check migration status:
```bash
npx prisma migrate status
```

Reset database (development only):
```bash
npx prisma migrate reset
```

## 📦 Key Dependencies

### Frontend
- `expo` - React Native framework
- `expo-router` - File-based routing
- `expo-image-picker` - Media selection
- `expo-secure-store` - Secure storage
- `expo-file-system` - File operations

### Backend
- `express` - Web framework
- `@prisma/client` - Database ORM
- `jsonwebtoken` - JWT authentication
- `bcryptjs` - Password hashing
- `cors` - Cross-origin requests

## 🐛 Troubleshooting

**Backend not connecting:**
- Verify DATABASE_URL in `.env`
- Check if PostgreSQL is running
- Ensure migrations are up to date: `npx prisma migrate dev`

**Frontend can't reach backend:**
- Use `--tunnel` flag with expo start for remote testing
- Check API_URL configuration in `lib/apiBase.ts`
- Verify backend is running on port 3001

**Image upload failing:**
- Check backend JSON limit (set to 10mb in server.ts)
- Verify image is being converted to base64 properly
- Check file permissions for camera/library access

## 📄 License

MIT

## 👥 Team

Team 21 - COMP2003 2025-2026

---

For more details, see documentation in the `docs/` directory.
