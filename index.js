// index.js
import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import path from 'path';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(path.resolve(), 'public')));
app.set('view engine', 'ejs');

// Store active rooms and users
const activeRooms = new Set();
const usersInRooms = {};

app.get('/', (req, res) => {
    res.render('index');
});

io.on('connection', (socket) => {
    console.log('A user connected');
    socket.emit("message", "Welcome to the Chat App!");

    socket.on('joinRoom', ({ username, room }) => {
        socket.join(room);
        activeRooms.add(room);

        // Initialize room in usersInRooms if it doesn't exist
        if (!usersInRooms[room]) {
            usersInRooms[room] = [];
        }

        // Add the user to the room
        usersInRooms[room].push(username);

        // Broadcast active rooms and users to all clients
        io.emit('activeRooms', Array.from(activeRooms));
        io.emit('usersInRooms', usersInRooms);

        socket.emit('message', `You have joined the ${room} chat room`);
        socket.to(room).emit('message', `${username} has joined the room`);

        socket.on('chatMessage', (msg) => {
            io.to(room).emit('message', `${username}: ${msg}`);
        });

        socket.on('disconnect', () => {
            socket.leave(room);

            // Remove user from the room
            if (usersInRooms[room]) {
                usersInRooms[room] = usersInRooms[room].filter(user => user !== username);
                
                // Remove room if empty
                if (usersInRooms[room].length === 0) {
                    delete usersInRooms[room];
                    activeRooms.delete(room);
                }
            }

            // Broadcast updated active rooms and users to all clients
            io.emit('activeRooms', Array.from(activeRooms));
            io.emit('usersInRooms', usersInRooms);

            io.to(room).emit('message', `${username} has left the room`);
        });
    });
});

const PORT = 3500;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
