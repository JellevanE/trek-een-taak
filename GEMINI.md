# GEMINI.md

This file provides guidance when working with code in this repository.

## Project Overview

Task Tracker is a full-stack task management application with a React frontend and Node.js/Express backend. Key features include task creation with priorities, subtasks, user authentication, drag-and-drop reordering, and RPG-style user profiles.

## Architecture

### Backend (`server/`)
- **Framework**: Express.js
- **Authentication**: JWT tokens
- **Data Storage**: JSON files (`tasks.json`, `users.json`)

### Frontend (`client/`)
- **Framework**: React (Create React App)

## Common Development Commands

### Server
```bash
cd server
npm install
npm start
npm test
```

### Client
```bash
cd client
npm install
npm start
npm run build
npm test
```

### Full Setup
```bash
./start-dev.sh
```

## API Endpoints

### Tasks
- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`

### Users
- `POST /api/users/register`
- `POST /api/users/login`
- `GET /api/users/me`
- `PUT /api/users/me`
