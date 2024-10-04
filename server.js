const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
// pass Encryption
const bcrypt = require('bcrypt');
// idk wtf is this
const saltRounds = 10;
// handling images
const multer = require('multer');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
// idk wtf is this 
const secretKey = 'C3%ke$lctd^eqcO7-xqxZSj%sca:^lu[FB#4e=9G@JyS?N<>VTLRYi:MD0"brK=';
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// SQLite Database Setup
const db = new sqlite3.Database('./database.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) console.error("Error opening database:", err.message);
  else console.log("Connected to the SQLite database.");
});

// Create messages table
db.run(`CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
)`, (err) => {
  if (err) console.error("Error creating messages table:", err.message);
});

// Create users table
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  profile_image TEXT,
  role TEXT
)`, (err) => {
  if (err) console.error("Error creating users table:", err.message);
});

// File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Handle message submission and save to database
app.post('/submit-message', (req, res) => {
  const { message, userId } = req.body;

  db.get('SELECT username, profile_image,id FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error("Error fetching user data:", err.message);
      return res.status(500).send("Error fetching user data");
    }
    if (!user) return res.status(400).send("User not found");

    db.run('INSERT INTO messages (message, user_id) VALUES (?, ?)', [message, userId], function(err) {
      if (err) {
        console.error("Error inserting message:", err.message);
        return res.status(500).send("Error inserting message");
      }
      io.emit('chat message', { message, username: user.username, profileImage: user.profile_image,id : user.id });
      console.log(message, user.username,  user.profile_image, user.id)
      res.status(200).json({ message, username: user.username, profileImage: user.profile_image, userId });
    });
  });
});

// Fetch all messages
app.get('/get-messages', (req, res) => {
  const query = `
    SELECT messages.message, users.username, users.profile_image , users.id
    FROM messages
    INNER JOIN users ON messages.user_id = users.id
    ORDER BY messages.id ASC
  `;
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("Error fetching messages:", err.message);
      return res.status(500).send("Error fetching messages");
    }
    res.json(rows);
  });
});

// Handle user registration (sign up)
app.post('/register', upload.single('profileImage'), (req, res) => {
  const { username, password } = req.body; 
  const profileImage = req.file ? req.file.filename : null;

  if (!username) return res.status(400).send('Username is required');
  if (!password) return res.status(400).send('Username is required');

  bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
    if (err) return res.status(500).send('Error hashing password');

    // Store the user details along with the hashed password
    db.run('INSERT INTO users (username, password, profile_image, role) VALUES (?, ?, ?, ?)', 
    [username, hashedPassword, profileImage, 'user'], function(err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint failed")) {
          return res.status(400).send("Username already taken");
        }
        console.error("Error inserting user:", err.message);
        return res.status(500).send("Error saving user data");
      }

      // Generate a JWT token for the user
      const token = jwt.sign({ userId: this.lastID, username }, secretKey, { expiresIn: '7d' });

      // Set the token as a cookie
      res.cookie('auth_token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days

      res.status(200).json({ userId: this.lastID });
    });
  });
});

// Handle user login
app.post('/login', (req, res) => {
  const { username,password } = req.body;
  if (!username) return res.status(400).send('Username is required');
  if (!password ) return res.status(400).send('Username is required');

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) return res.status(500).send('Error retrieving user');
    if (!user) return res.status(400).send('Invalid username or password');
    // Compare entered password with the hashed password
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return res.status(500).send('Error comparing passwords');
      if (!isMatch) return res.status(400).send('Invalid username or password');
      // Generate a JWT token
      const token = jwt.sign({ userId: user.id, username: user.username }, secretKey, { expiresIn: '7d' });
      // Set the token as a cookie
      res.cookie('auth_token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days
      // If valid, send user info or session data
      res.status(200).json({ userId: user.id, username: user.username });
    });
  });
});

function authenticateToken(req, res, next) {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).send('Access denied. No token provided.');

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.status(403).send('Invalid token');
    req.user = user; // Attach user info to request object
    next();
  });
}

app.get('/protected-route', authenticateToken, (req, res) => {
  res.send(`Hello ${req.user.username}, you have access to this route!`);
});

// Serve user details
app.get('/user-details', (req, res) => {
  const { id } = req.query;
  db.get('SELECT username, profile_image, role, id FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      console.error("Error fetching user details:", err.message);
      return res.status(500).send("Error fetching user details");
    }
    if (!user) return res.status(404).send("User not found");
    res.json(user);
  });
});

// Update user profile
app.post('/update-profile', upload.single('profile_image'), (req, res) => {
  const { userId, username } = req.body;
  const profileImage = req.file ? req.file.filename : null;

  let query = 'UPDATE users SET username = ?, profile_image = ? WHERE id = ?';
  let params = [username, profileImage, userId];

  if (!profileImage) {
    query = 'UPDATE users SET username = ? WHERE id = ?';
    params = [username, userId];
  }

  db.run(query, params, function(err) {
    if (err) return res.status(500).send("Error updating profile");
    res.status(200).send("Profile updated successfully");
  });
});

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve the client files
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
