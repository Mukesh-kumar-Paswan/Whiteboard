# ArchBoard — Real-Time Collaborative System Design Whiteboard

ArchBoard is a browser-based, real-time collaborative whiteboard tailored for software architecture and system design diagrams. Built with the MERN stack, `react-konva`, and `Socket.io`, it lets teams sketch architectures, connect system components with smart arrows, animate data flow, and collaborate live with cursors, chat, and voice notes.

---

## Features

### System Design & Canvas Engine
- **Interactive Infinite Canvas:** Smooth pan, mouse-wheel zoom, and responsive dotted grid powered by `react-konva`.
- **System Design Tech Nodes:** One-click presets for **Client**, **API Gateway**, **App Server**, **Database**, **Redis Cache**, and **Message Queue** with double-click inline title and subtitle editing.
- **Smart Connector Arrows:** Arrows automatically snap to the edges of shapes and tech nodes, staying dynamically attached as you drag elements around.
- **Animated Data Flow (`Play Flow`):** Toggle live animated data packets traveling along every connector arrow to visualize request/response paths.
- **Drawing & Formatting Tools:** Freehand pencil, rectangles, circles, text labels, customizable stroke/fill colors, stroke widths, resize handles, undo/redo history, and high-resolution **PNG export**.
- **Multi-Page Workspaces:** Organize complex architectures across multiple canvas tabs within a single room.

### Real-Time Collaboration & Room Management
- **Live Multiplayer Sync:** Instant canvas state synchronization across all connected users via `Socket.io`, paired with 1.5-second debounced auto-saving to MongoDB.
- **Live Collaborator Cursors & Presence:** Zoom-invariant named cursor pointers and active participant avatars in the top bar.
- **In-Room Chat & Voice Notes:** Real-time text messaging plus built-in browser microphone recording to send playable voice notes directly in the room.
- **Version Snapshots:** Bookmark architecture milestones and roll back the entire board to a previous snapshot for all participants.
- **Access Control & Security:** JWT-based user accounts (with a Saved Boards dashboard), quick Guest mode, optional room password protection, and shareable **Editor** / **Viewer (Read-Only)** invite links.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React (Vite), Tailwind CSS, `react-konva`, `konva`, `socket.io-client`, `react-router-dom`, `axios`, `lucide-react` |
| **Backend** | Node.js, Express.js, `socket.io`, Mongoose, `jsonwebtoken`, `bcryptjs`, `cors`, `dotenv` |
| **Database** | MongoDB |

---

## Project Structure

```text
whiteboard/
├── client/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── components/
│       │   ├── canvas/
│       │   │   ├── CanvasBoard.jsx
│       │   │   ├── LiveCursors.jsx
│       │   │   └── TechNode.jsx
│       │   ├── chat/
│       │   │   └── ChatDrawer.jsx
│       │   ├── modals/
│       │   │   ├── ShareModal.jsx
│       │   │   └── SnapshotsModal.jsx
│       │   └── toolbar/
│       │       ├── BottomBar.jsx
│       │       ├── LeftToolbar.jsx
│       │       └── TopBar.jsx
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   └── SocketContext.jsx
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Login.jsx
│       │   └── WhiteboardRoom.jsx
│       ├── utils/
│       │   └── api.js
│       ├── App.jsx
│       ├── index.css
│       └── main.jsx
└── server/
    ├── config/
    │   └── db.js
    ├── middleware/
    │   └── authMiddleware.js
    ├── models/
    │   ├── Board.js
    │   └── User.js
    ├── routes/
    │   ├── authRoutes.js
    │   └── boardRoutes.js
    ├── socket/
    │   └── socketHandler.js
    ├── .env
    └── server.js
```

---

## Prerequisites

- **Node.js** (v18+ recommended)
- **npm**
- **MongoDB** (local instance or MongoDB Atlas connection string)

---

## Setup & Installation

### 1. Clone the Repository
```bash
git clone [https://github.com/](https://github.com/)<your-username>/<your-repo-name>.git
cd whiteboard
```

### 2. Backend Setup
```bash
cd server
npm install
```

Create a `.env` file inside the `server/` directory:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/archboard
JWT_SECRET=your_super_secret_jwt_key
CLIENT_URL=http://localhost:5173
```

Start the backend server:
```bash
npm run dev
# or
node server.js
```

### 3. Frontend Setup
Open a new terminal window:
```bash
cd client
npm install
```

*(Optional)* Create a `.env` file inside `client/` if your backend runs on a different URL:
```env
VITE_SERVER_URL=http://localhost:5000
```

Start the Vite development server:
```bash
npm run dev
```

Open `http://localhost:5173` in your browser. To test real-time collaboration locally, open a second browser window in Incognito mode and join the same Room ID.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `V` | Select / Move tool |
| `H` | Pan canvas tool |
| `P` | Freehand pencil tool |
| `R` | Rectangle tool |
| `C` | Circle tool |
| `A` | Smart Arrow connector tool |
| `T` | Text label tool |
| `Delete` / `Backspace` | Delete selected element |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo |

---

## API Overview

### Auth Routes (`/api/auth`)
- `POST /register` — Register a new user and return a JWT
- `POST /login` — Authenticate user and return a JWT
- `GET /me` — Get current authenticated user profile

### Board Routes (`/api/boards`)
- `GET /my-boards` — List boards owned by the logged-in user
- `POST /` — Create a new board room
- `POST /:roomId/join` — Verify password (if set) and join a room with resolved permissions
- `PUT /:roomId` — Save board pages, title, password, or default role
- `DELETE /:roomId` — Delete a board (owner only)
- `POST /:roomId/snapshots` — Create a new version snapshot
- `POST /:roomId/snapshots/:snapshotId/restore` — Restore a saved snapshot
- `DELETE /:roomId/snapshots/:snapshotId` — Delete a snapshot

---

## License

This project is open-source and available under the [MIT License](LICENSE).