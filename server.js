// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
// database 
const sqlite3 = require('sqlite3').verbose();
// Open or create the SQLite database      
const db = new sqlite3.Database('./database.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err)  console.error("Error opening database:", err.message)
    else      console.log("Connected to the SQLite database.")
});
// this create table named messages and has two field text and id  
// add username to this table
db.run(`CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
  )`, (err) => {
  if (err) console.error("Error creating table:", err.message)
});

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.post('/submit-message', (req, res) => {
  const { message, userId } = req.body;

  // Retrieve the user information based on userId
  db.get('SELECT username, profile_image FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error("Error fetching user data:", err.message);
      return res.status(500).send("Error fetching user data");
    }
    if (!user) return res.status(400).send("User not found");
    
    // Insert the message along with user ID
    db.run(`INSERT INTO messages (message, user_id) VALUES (?, ?)`, [message, userId], function(err) {
      if (err) {
        console.error("Error inserting message:", err.message);
        return res.status(500).send("Error inserting message into the database");
      }

      // Emit the message to all clients with user details
      io.emit('chat message', {
        message: message,
        username: user.username,
        profileImage: user.profile_image
      });

      // Send response to the client
      res.status(200).json({
        message: message,
        username: user.username,
        profileImage: user.profile_image,
        userId: userId
      });
    });
  });
});


// Serve static HTML files (for the form)
app.use(express.static('public'));



// handing db data to client

app.get('/get-messages', (req, res) => {
  const query = `
    SELECT messages.message, users.username, users.profile_image 
    FROM messages
    INNER JOIN users ON messages.user_id = users.id
    ORDER BY messages.id ASC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("Error fetching messages:", err.message);
      return res.status(500).send("Error fetching messages from the database");
    }
    res.json(rows); // Send messages with user details as JSON
  });
});

const multer = require('multer')
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads'); // Save images in the 'uploads' folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Give the file a unique name
  }
});

const upload = multer({ storage: storage });
// Create the users table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  profile_image TEXT
)`, (err) => {
  if (err) {
    console.error("Error creating table:", err.message);
  }
});
// API endpoint to handle login data (username and profile image)
app.post('/register', upload.single('profileImage'), (req, res) => {
  const username = req.body.username;
  const profileImage = req.file ? req.file.filename : null; // Store file path if uploaded

  if (!username) return res.status(400).send('Username is required')

// Handle user details request




  // Insert user data into the database
  db.run(`INSERT INTO users (username, profile_image) VALUES (?, ?)`, [username, profileImage], function(err) {
    if (err) {
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.status(400).send("Username already taken");
      }
      console.error("Error inserting data:", err.message);
      return res.status(500).send("Error saving user data");
    }
    res.status(200).json({ userId: this.lastID });
  });
});
// not sure about this one 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/user-details', (req, res) => {
  const { username } = req.query;

  db.get('SELECT username, profile_image ,id FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      console.error("Error fetching user details:", err.message);
      return res.status(500).json({ error: "Error fetching user details" });
    }
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user); // Send user details as JSON
  });
});