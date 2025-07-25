// server.js
//
// A lightweight Express + Socket.io server that powers Braydon's
// real-time chat application. The server serves static files from
// the `public` directory and manages socket connections to
// broadcast chat messages among connected clients. Usernames are
// assigned when a client emits a `join` event. Messages are not
// persisted; this demo is meant for educational use.

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static assets from the public folder
app.use(express.static('public'));

// Keep track of connected users. This array stores unique usernames
const users = [];

io.on('connection', (socket) => {
  console.log('A user connected');

  // Handle user joining. Assign a username and update the users list.
  socket.on('join', (username) => {
    socket.username = username || 'Anonymous';
    // Add to users list if not already present
    if (!users.includes(socket.username)) {
      users.push(socket.username);
    }
    // Broadcast a system message announcing the new user
    socket.broadcast.emit('message', {
      username: 'System',
      text: `${socket.username} joined the chat.`,
      system: true,
      timestamp: Date.now()
    });
    // Send updated user list to all clients
    io.emit('userList', users);
  });

  // Relay incoming chat messages to all connected clients. Attach a timestamp.
  socket.on('message', (text) => {
    if (!socket.username) {
      return;
    }
    const trimmed = String(text).trim();
    if (trimmed.length === 0) {
      return;
    }
    io.emit('message', {
      username: socket.username,
      text: trimmed,
      system: false,
      timestamp: Date.now()
    });
  });

  // Handle user disconnecting. Remove from users list and notify others.
  socket.on('disconnect', () => {
    if (socket.username) {
      // Remove the username from the array
      const index = users.indexOf(socket.username);
      if (index !== -1) {
        users.splice(index, 1);
      }
      // Notify others that the user left
      socket.broadcast.emit('message', {
        username: 'System',
        text: `${socket.username} left the chat.`,
        system: true,
        timestamp: Date.now()
      });
      // Send updated user list to all clients
      io.emit('userList', users);
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Braydon's App server running on port ${PORT}`);
});
