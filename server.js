// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

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


// database i hope
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
  message TEXT NOT NULL
)`, (err) => {
  if (err) console.error("Error creating table:", err.message)
});

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.post('/submit-message', (req, res) => {
  const message = req.body.message; // Get message from request body

  db.run(`INSERT INTO messages (message) VALUES (?)`, [message], function(err) {
      if (err) {
          console.error("Error inserting data:", err.message);
          return res.status(500).send("Error inserting message into the database");
      } else {
          console.log(`A row has been inserted with rowid ${this.lastID}`);
          res.status(200).send("Message inserted successfully");
      }
  });
});
// Serve static HTML files (for the form)
app.use(express.static('public'));



// handing db data to client

app.get('/get-messages', (req, res) => {
  db.all('SELECT * FROM (SELECT * FROM messages ORDER BY id DESC LIMIT 100) ORDER BY id ASC', [], (err, rows) => {
    if (err) {
      console.error("Error fetching data:", err.message);
      return res.status(500).send("Error fetching messages from the database");
    }
    res.json(rows); // Send the messages as JSON
  });
  
});

