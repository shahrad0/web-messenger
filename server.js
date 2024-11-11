const express = require("express");
const socketIo = require("socket.io");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const saltRounds = 10;

// handling files
const multer = require("multer");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const secretKey = 'C3%ke$lctd^eqcO7-xqxZSj%sca:^lu[FB#4e=9G@JyS?N<>VTLRYi:MD0"brK=';
const app = express();

// START https
// open cmd in the main directory and enter this command openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout key.pem -out cert.pem

// const https   = require('https');
// const fs      = require('fs');
// const options = {
//   key: fs.readFileSync('key.pem'),
//   cert: fs.readFileSync('cert.pem'),
// };
// const server = https.createServer(options, app).listen(443)

// END https

// START http

const http   = require("http");
const server = http.createServer(app).listen(80) 

// END http

const io = socketIo(server);

app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// SQLite Database Setup
const db = new sqlite3.Database(
  "./database.db",
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) console.error("Error opening database:", err.message);
    else console.log("Connected to the SQLite database.");
  }
);

// Create messages table
db.run(
  `CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  reply_id INTEGER DEFAULT NULL,
  file_path  TEXT DEFAULT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
)`,
  (err) => {
    if (err) console.error("Error creating messages table:", err.message);
  }
);

// Create users table
db.run(
  `CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'user', 
  profile_image TEXT,
  password TEXT NOT NULL,
  status TEXT DEFAULT 'offline')`,
  (err) => {
    if (err) console.error("Error creating users table:", err.message);
  }
);

// File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
})
const upload = multer({ storage: storage });

// START user status

app.post("/user-status", upload.single("file"), (req, res) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]
  if (!token) return res.sendStatus(401)
  const query = `UPDATE users SET status = ? WHERE id = ?`

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.sendStatus(403)
    const { status } = req.body
    if (status !== "online" && status !== "offline")   
      return res.status(400).json({ message: "Invalid status" }) // Ensure status is valid | Not sure if its necessary

    db.run(query,[status,user.userId],function(error) {
      if (error) {
        console.error('Error updating user status:', error);
        return res.status(500).json({ message: 'Failed to update status in database' });
      }

      console.log(`User ${user.username} (${user.userId}) is now ${status}`)

      res.sendStatus(204)
    })
  })
})

// END user status

// Handle message submission and save to database
app.post("/submit-message", upload.single("file"), (req, res) => {
  const { message, replyId } = req.body;
  const filePath = req.file ? req.file.filename : null;
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  const query = `INSERT INTO messages (message, user_id, reply_id, file_path) VALUES (?, ?, ?, ?)`;
  if (!token) return res.sendStatus(401);

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.sendStatus(403);

    db.get("SELECT username, profile_image FROM users WHERE id = ?", [user.userId], (err, currentUser) => {
      if (err) return res.status(500).send("Error fetching user data")
      if (!currentUser) return res.status(400).send("User not found")
      if (!message && !filePath) return res.status(400).send("Either a message or a file must be provided.")

      db.run(query, [message || null, user.userId, replyId || null, filePath], function (err) {
        if (err) return res.status(500).send("Error inserting message");

        const messageId = this.lastID
        if (replyId) {
          db.get(
            `SELECT messages.message AS repliedMessage, users.username AS repliedUsername 
             FROM messages 
             JOIN users ON messages.user_id = users.id 
             WHERE messages.id = ?`, [replyId], (err, repliedData) => {
              if (err) return res.status(500).send("Error fetching replied message");

              io.emit("chat message", {message,username: currentUser.username,profileImage: currentUser.profile_image,userId: user.userId,messageId,replyId,repliedMessage: repliedData ? repliedData.repliedMessage : null,repliedUsername: repliedData ? repliedData.repliedUsername : null,filePath});

              res.status(200).json({
                message,
                username: currentUser.username,
                profileImage: currentUser.profile_image,
                userId: user.userId,
                messageId,
                replyId,
                repliedMessage: repliedData ? repliedData.repliedMessage : null,
                repliedUsername: repliedData ? repliedData.repliedUsername : null,
                filePath
              });
            }
          );
        } else {
          io.emit("chat message", {
            message,
            username: currentUser.username,
            profileImage: currentUser.profile_image,
            userId: user.userId,
            messageId,
            replyId: null,
            repliedMessage: null,
            repliedUsername: null,
            filePath
          });

          res.status(200).json({
            message,
            username: currentUser.username,
            profileImage: currentUser.profile_image,
            userId: user.userId,
            messageId,
            replyId: null,
            repliedMessage: null,
            repliedUsername: null,
            filePath
          });
        }
      });
    });
  });
});



function deleteMessage() {
  const query = `
    DELETE FROM messages
    WHERE id IN (
      SELECT id FROM messages
      ORDER BY id DESC
      LIMIT 10
    );
  `;
  db.run(query, (error) => {
    if (error) {
      console.error("Error deleting messages:", error.message);
    } else {
      console.log("Successfully deleted the last 5 messages.");
    }
  });
}

deleteMessage()
// Fetch last 50 messages when user logs in
app.get("/get-messages", (req, res) => {
  const query = `
    SELECT 
      messages.message, 
      messages.id AS messageId, 
      users.username, 
      users.profile_image, 
      users.id AS userId,
      messages.reply_id,
      messages.file_path,
      repliedMessages.message AS repliedMessage,
      repliedUsers.username AS repliedUsername
    FROM messages
    INNER JOIN users ON messages.user_id = users.id
    LEFT JOIN messages AS repliedMessages ON messages.reply_id = repliedMessages.id
    LEFT JOIN users AS repliedUsers ON repliedMessages.user_id = repliedUsers.id
    ORDER BY messages.id DESC
    LIMIT 50
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("Error fetching messages:", err.message);
      return res.status(500).send("Error fetching messages");
    }
    
    const messages = rows.reverse().map(row => ({
      message: row.message,
      username: row.username,
      profileImage: row.profile_image,
      userId: row.userId,
      messageId: row.messageId,
      replyId: row.reply_id,
      repliedMessage: row.repliedMessage,
      repliedUsername: row.repliedUsername,
      filePath: row.file_path 
    }));

    res.json(messages);
  });
});

// START pagintion

app.post("/get-older-messages", (req, res) => {
  const {messageId} = req.body

  const query = `
    SELECT 
      messages.message, 
      messages.id AS messageId, 
      users.username, 
      users.profile_image, 
      users.id AS userId,
      messages.reply_id,
      messages.file_path,
      repliedMessages.message AS repliedMessage,
      repliedUsers.username AS repliedUsername
    FROM messages
    INNER JOIN users ON messages.user_id = users.id
    LEFT JOIN messages AS repliedMessages ON messages.reply_id = repliedMessages.id
    LEFT JOIN users AS repliedUsers ON repliedMessages.user_id = repliedUsers.id
    WHERE messages.id < ?
    ORDER BY messages.id DESC
    LIMIT 50`
    
  db.all(query, [messageId], (err, rows) => {
    if (err) {
      console.error("Error fetching messages:", err.message);
      return res.status(500).json({ error: "Error fetching messages" })
    }

    const messages = rows.reverse().map(row => ({
      message: row.message,
      username: row.username,
      profileImage: row.profile_image,
      userId: row.userId,
      messageId: row.messageId,
      replyId: row.reply_id,
      repliedMessage: row.repliedMessage,
      repliedUsername: row.repliedUsername,
      filePath: row.file_path 
    }))

    res.json(messages)
  })
})

// END pagintion

// Handle user registration (sign up)
app.post("/register", upload.single("profileImage"), (req, res) => {
  const { username, password } = req.body;
  const profileImage = req.file ? req.file.filename : null;

  if (!username) return res.status(400).send("Username is required");
  if (!password) return res.status(400).send("Password is required");

  console.log(password);

  bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
    if (err) return res.status(500).send(err.message);

    // Store the user details along with the hashed password
    db.run(
      "INSERT INTO users (username, password, profile_image) VALUES (?, ?, ?, ?)",
      [username, hashedPassword, profileImage],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE constraint failed"))   return res.status(400).send("Username already taken")
          console.error("Error inserting user:", err.message);
          return res.status(500).send("Error saving user data");
        }
        generateToken({ userId: this.lastID,username,profile_image : profileImage},res)
        res.status(200).json({ userId: this.lastID });
      }
    );
  });
});

// Handle user login
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username) return res.status(400).send("Username is required");
  if (!password) return res.status(400).send("Username is required");

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) return res.status(500).send("Error retrieving user");
    if (!user) return res.status(400).send("Invalid username or password");
    // Compare entered password with the hashed password
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return res.status(500).send("Error comparing passwords");
      if (!isMatch) return res.status(400).send("Invalid username or password");
      generateToken({userId: user.id,username: user.username,profileImage : user.profile_image},res)
      // If valid, send user info or session data
      res.status(200).json({ userId: user.id, username: user.username });
    });
  });
});

// Serve user details
app.get("/user-details", (req, res) => {
  // const { id } = req.query;
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.sendStatus(403); // If the token is invalid, return forbidden
    db.get(
      "SELECT username, profile_image, role, status, id FROM users WHERE id = ?",
      [user.userId],
      (err, dbData) => {
        if (err) {
          console.error("Error fetching user details:", err.message);
          return res.status(500).send("Error fetching user details");
        }
        if (!dbData) return res.status(404).send("User not found");
        res.json(dbData);
      }
    );
  });
});

// Serve user details
app.get("/users-details", (req, res) => {
  const { id } = req.query;
  db.get(
    "SELECT username, profile_image, role, status, id FROM users WHERE id = ?",
    [id],
    (err, dbData) => {
      if (err) {
        console.error("Error fetching user details:", err.message);
        return res.status(500).send("Error fetching user details");
      }
      if (!dbData) return res.status(404).send("User not found");
      res.json(dbData);
    }
  );
});

// Update user profile
app.post("/update-profile", upload.single("profile_image"), (req, res) => {
  const { userId, username } = req.body;
  const profileImage = req.file ? req.file.filename : null;

  let query = "UPDATE users SET username = ?, profile_image = ? WHERE id = ?";
  let params = [username, profileImage, userId];

  if (!profileImage) {
    query = "UPDATE users SET username = ? WHERE id = ?";
    params = [username, userId];
  }

  db.run(query, params, function (err) {
    if (err) {
      console.error("Database error: ", err);
      return res.status(500).send("Error updating profile");
    }
    
    generateToken({userId: userId,username: username,profile_image : profileImage},res)
    res.status(200).send("Profile updated successfully");
  });
});

// Serve uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

function generateToken(user, res) {
  const tokenData = {
      userId: user.userId,
      username: user.username,
  }
  if (user.profile_image)  tokenData.profile_image = user.profile_image; // Only include if available
  // Generate JWT token
  const token = jwt.sign(tokenData, secretKey, { expiresIn: "7d" });
  // Set the token as a cookie
  res.cookie("auth_token", token, {
      secure: process.env.NODE_ENV === "production", // true in production
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // lax in development
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}
// START adding column
// const addReplyIdColumn = () => {
//   const sql = `ALTER TABLE users ADD COLUMN status TEXT DEFAULT offline`;

//   db.run(sql, function(err) {
//       if (err) {
//           return console.error(err.message);
//       }
//       console.log('Column reply_id added to messages table.');
//   });
// };
// addReplyIdColumn();

// END adding column

// START updating column

// const updateColumn = () => {
//   const sql = `UPDATE users SET role = 'user' WHERE role IS NULL`

//   db.run(sql, function(err) {
//       if (err)    return console.error(err.message)
//   })
// }
// updateColumn()

// END updating column

// START update user role

// const updateUserRole = (userId, newRole) => {
//   const sql = `UPDATE users SET role = ? WHERE id = ?`
  
//   db.run(sql, [newRole, userId], function(err) {
//     if (err)   return console.error("Error updating user role:", err.message);

//     console.log(`User ${userId} role updated to ${newRole}`);
//   });
// };

// updateUserRole(8, 'owner');

// END update user role