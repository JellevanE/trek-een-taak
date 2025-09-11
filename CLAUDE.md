# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Task Tracker is a full-stack task management application with a React frontend and Node.js/Express backend. The application features:

- Task creation with priorities (low, medium, high)
- Subtask support with weighted progress tracking
- User authentication with JWT tokens
- Drag-and-drop task reordering
- RPG-style user profiles with XP and achievements
- Real-time progress visualization
- Theme switching (dark/light mode)

## Architecture

### Backend (`server/`)
- **Framework**: Express.js with CORS
- **Authentication**: JWT tokens with bcrypt for password hashing
- **Data Storage**: File-based JSON storage (`tasks.json`, `users.json`)
- **Key Files**:
  - `server.js` - Main Express server with all API routes
  - `tasks.json` - Task data persistence
  - `users.json` - User data and profiles
  - `__tests__/api.test.js` - API test suite using Jest + Supertest

### Frontend (`client/`)
- **Framework**: React (Create React App)
- **Key Components**:
  - `App.js` - Main application with task management logic
  - `Profile.js` - User authentication and profile management
  - `App.css` - All styling including dark/light themes

### Data Models
- **Tasks**: Include status tracking, priority weighting, drag-and-drop ordering, and nested subtasks
- **Users**: Support profile customization and RPG elements (level, XP, achievements)
- **Authentication**: Bearer token-based with user scoping for tasks

## Common Development Commands

### Server Development
```bash
cd server
npm install          # Install dependencies
npm start            # Start server (port 3001)
npm test             # Run Jest test suite with Supertest
```

### Client Development
```bash
cd client
npm install          # Install dependencies
npm start            # Start dev server (port 3000, proxies to backend)
npm run build        # Build for production
npm test             # Run React tests
```

### Full Development Setup
```bash
./start-dev.sh       # Start both server and client concurrently
```
This convenience script automatically:
- Installs missing dependencies
- Starts both services in background
- Tails combined logs
- Handles cleanup on Ctrl-C

## Key Implementation Details

### Data Persistence
- Uses atomic file writes with temporary files and rename operations
- Backend validates all writes and returns 500 status on persistence failures
- Tests modify live data files - consider using separate test fixtures for CI

### Progress Calculation
- Tasks support weighted progress based on subtask completion
- Priority influences task weights (low=1.0, medium=1.15, high=1.30)
- Global progress tracks today's tasks or all tasks if none match current date

### Authentication Flow
- Registration/login through `/api/users/register` and `/api/users/login`
- Tokens stored in localStorage and included in API requests as Bearer tokens
- Profile management through `/api/users/me` endpoints

### Task Management
- Drag-and-drop reordering with visual indicators
- Status transitions: todo → in_progress → done (with history tracking)
- Subtasks inherit parent task priority for weighting calculations
- Real-time visual feedback with pulse/glow animations

## API Endpoints

### Tasks
- `GET /api/tasks` - List tasks (user-scoped when authenticated)
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PATCH /api/tasks/:id/status` - Update task status
- `PUT /api/tasks/order` - Reorder tasks
- `GET /api/tasks/:id/history` - Get status history

### Subtasks
- `POST /api/tasks/:id/subtasks` - Create subtask
- `PUT /api/tasks/:id/subtasks/:subtask_id` - Update subtask
- `PATCH /api/tasks/:id/subtasks/:subtask_id/status` - Update subtask status

### Users
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User login
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update user profile

## File Structure Notes

- Server runs on port 3001, client on port 3000 (with proxy configuration)
- All styling consolidated in `client/src/App.css` with CSS custom properties for theming
- Test files use real persistence layer - ensure proper cleanup in test environments
- Environment variables: `JWT_SECRET`, `TASKS_FILE`, `USERS_FILE` for configuration