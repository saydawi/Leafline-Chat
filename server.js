const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const multer = require('multer');
const fs = require('fs');
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

app.post('/upload', upload.single('file'), (req, res) => {
    res.json({ fileUrl: `/uploads/${req.file.filename}`, fileName: req.file.originalname });
});

const activeUsers = {};
const groupKeys = {};

io.on('connection', (socket) => {
    socket.on('login', (username) => {
        socket.data.username = username;
        activeUsers[socket.id] = username;
        io.emit('updateUserList', Object.values(activeUsers));
    });
    socket.on('create-group', ({ room, key }) => {
        if (groupKeys[room]) socket.emit('error-msg', 'Group exists!');
        else { groupKeys[room] = key; socket.emit('join-room', room); }
    });
    socket.on('join-group', ({ room, key }) => {
        if (groupKeys[room] && groupKeys[room] !== key) socket.emit('error-msg', 'Incorrect Key!');
        else socket.emit('join-room', room);
    });
    socket.on('join', (room) => {
        socket.rooms.forEach(r => { if (r !== socket.id) socket.leave(r); });
        socket.join(room);
        socket.emit('room-changed', room);
    });
    socket.on('chat message', (data) => io.to(data.room).emit('chat message', data));
    socket.on('disconnect', () => { delete activeUsers[socket.id]; io.emit('updateUserList', Object.values(activeUsers)); });
});

http.listen(3000, () => console.log('Saydawi Chat running on http://localhost:3000'));