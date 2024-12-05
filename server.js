const express = require("express")
const socketIo = require("socket.io")
const path = require("path")
const sqlite3 = require("sqlite3").verbose()
const bodyParser = require("body-parser")
const multer = require("multer")
const jwt = require("jsonwebtoken")
const cookieParser = require("cookie-parser")
const secretKey = 'C3%ke$lctd^eqcO7-xqxZSj%sca:^lu[FB#4e=9G@JyS?N<>VTLRYi:MD0"brK='
const bcrypt = require("bcrypt")
const saltRounds = 10
const app = express()
const fs = require('fs')

// START https
// open cmd in the main directory and enter this command openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout key.pem -out cert.pem

// const https   = require('https');
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

// Create chat table
db.run(
  `CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    profile_image TEXT,
    user_count INTEGER NOT NULL DEFAULT 0,
    online_users INTEGER DEFAULT 0
  )`,
  (err) => {
    if (err) console.error("Error creating messages table:", err.message)
  }
)
// to add basic chats when table was created 
db.get(
  `SELECT COUNT(*) AS count FROM chats`,
  (err, row) => {
    if (err) {
      console.error("Error checking chats table:", err.message)
      return
    }
    if (row.count === 0) createBasicChats()
  }
)

function createBasicChats() {
  const query = 'INSERT INTO chats (name) VALUES ("Main Chat"),("Exam")'

  db.run(query, (err) => {
    if (err) console.error("Error inserting basic chats:", err.message)
    else     console.log("Basic chats created successfully.")
  })
}

// Create messages table
db.run(
  `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT DEFAULT NULL,
    user_id INTEGER NOT NULL,
    chat_id INTEGER NOT NULL,
    reply_id INTEGER DEFAULT NULL,
    file_path TEXT DEFAULT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(chat_id) REFERENCES chats(id)
  )`,
  (err) => {
    if (err) console.error("Error creating messages table:", err.message)
  }
)

// Create users table
db.run(
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    role TEXT DEFAULT 'user', 
    profile_image TEXT,
    password TEXT NOT NULL,
    status TEXT DEFAULT 'offline'
  )`,
  (err) => {
    if (err) console.error("Error creating users table:", err.message)
  }
)

// Create chat_users table (join table)
db.run(
  `CREATE TABLE IF NOT EXISTS chat_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(chat_id, user_id)
  )`,
  (err) => {
    if (err) console.error("Error creating chat_users table:", err.message)
  }
)

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

// reset chat and user status
function resetStatus() {
  const usersQuery = 'UPDATE users SET status = "offline"'
  const chatQuery  = 'UPDATE chats SET online_users = 0'
  db.run(usersQuery)
  db.run(chatQuery)
}

resetStatus()

io.on("connection", (socket) => {
  const authHeader = socket.request.headers.cookie;
  const token = authHeader && authHeader.split("=")[1];

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      socket.emit('error', { message: 'Forbidden: Invalid token' });
      return
    }

    handleUserConnection(user, socket)
  })
})
// idk
// io.emit("update chat detail"), () => {
//   getChatDetail()
// }
const handleUserConnection = (user, socket) => {
  updateUserStatus("online", user.userId, (err) => {
    if (err) {
      console.error('Error updating user status:', err)
      return socket.emit('error', { message: 'Failed to update status in database' })
    }

    console.log(`User ${user.username} is now online`)
    updateOnlineUsers(1, user.userId, (err) => {
      if (err) console.error("Error updating online count:", err)
    })

    socket.on("disconnect", () => handleUserDisconnection(user))
  })
}

const handleUserDisconnection = (user) => {
  updateUserStatus("offline", user.userId, (err) => {
    if (err) return console.error('Error updating user status:', err)

    updateOnlineUsers(-1, user.userId, (err) => {
      if (err) console.error("Error updating online count:", err)
      console.log(`User ${user.username} is now offline`)
    })
  })
}

const updateUserStatus = (status, userId, callback) => {
  const query = `UPDATE users SET status = ? WHERE id = ?`
  db.run(query, [status, userId], callback)
}

const updateOnlineUsers = (increment, userId, callback) => {
  const query = `
    UPDATE chats
    SET online_users = online_users + ?
    WHERE id IN (
      SELECT chat_id
      FROM chat_users
      WHERE user_id = ?
    )`
  db.run(query, [increment, userId], callback)
}

// END user status

// Handle message and file submission 
app.post("/submit-message", upload.single("file"), (req, res) => {
  const { message, replyId , chatId} = req.body
  const filePath = req.file ? req.file.filename : null

  const query = `INSERT INTO messages (message, user_id, chat_id, reply_id, file_path) VALUES (?, ?, ?, ?, ?)`
  const token = req.cookies.auth_token

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.sendStatus(403)
    
    db.get("SELECT username, profile_image FROM users WHERE id = ?", [user.userId], (err, currentUser) => {
      if (err) return res.status(500).send("Error fetching user data")
      if (!currentUser) return res.status(400).send("User not found")
      if (!message && !filePath) return res.status(400).send("Either a message or a file must be provided.")

      db.run(query, [message || null, user.userId, chatId, replyId || null, filePath], function (err) {
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
      })
    })
  })
})

// Handle deleting messages
app.post("/delete-message", (req, res) => {
  const { messageId } = req.body
  const token = req.cookies.auth_token

  if (!token) return res.status(401).send("Unauthorized")

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.status(403).send("Invalid token")

    const roleQuery = "SELECT role FROM users WHERE id = ?"
    db.get(roleQuery, [user.userId], (err, row) => {
      if (err || !row || (row.role !== "owner" && row.role !== "admin")) return res.status(403).send("Unauthorized")

      // Check if the message has a file path
      const fileCheckQuery = "SELECT file_path FROM messages WHERE id = ?"
      db.get(fileCheckQuery, [messageId], (err, message) => {
        if (err) return res.status(500).send("Error retrieving message")
        if (!message) return res.status(404).send("Message not found")

        // Delete the file if it exists
        if (message.file_path) {
          fs.unlink("uploads/"+message.file_path, (err) => {
            if (err) console.error(`Failed to delete file: ${message.file_path}`, err)
          })
        }

        // Delete the message from the database
        const deleteQuery = "DELETE FROM messages WHERE id = ?"
        db.run(deleteQuery, [messageId], (err) => {
          if (err) return res.status(500).send("Failed to delete message")
          io.emit("delete message", { messageId })
          res.status(200).send("Message deleted successfully")
        })
      })
    })
  })
})

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
})

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
app.post("/register", upload.single("profileImage"), async (req, res) => {
  const { username, password } = req.body;
  const profileImage = req.file ? req.file.filename : null;

  if (!username) return res.status(400).send("Username is required");
  if (!password) return res.status(400).send("Password is required");

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert user into the database
    db.run(
      "INSERT INTO users (username, password, profile_image) VALUES (?, ?, ?)",
      [username, hashedPassword, profileImage],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE constraint failed")) {
            return res.status(400).send("Username already taken.")
          }
          console.error("Error inserting user:", err.message)
          return res.status(500).send("Error saving user data.")
        }

        const userId = this.lastID

        // Add the user to basic chats
        const chatIds = [1, 2] // chat IDs 
        const query = "INSERT INTO chat_users (chat_id, user_id) VALUES (?, ?)"
        let completed = 0

        chatIds.forEach((chatId) => {
          db.run(query, [chatId, userId], (err) => {
            if (err) {
              console.error(`Error adding user to chat ${chatId}:`, err.message)
              return
            }
            completed++
            if (completed === chatIds.length) {
              const token = generateToken({ userId, username, profileImage }, res)
              return res.status(200).json({ userId, token })
            }
          })
        })
      }
    )
  } catch (err) {
    console.error("Error hashing password:", err.message);
    res.status(500).send("Server error. Please try again.");
  }
})

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
})

// verify user on login
app.get("/verify", (req, res) => {
  const token = req.cookies.auth_token

  if (!token) return res.status(401).send("Not authenticated")

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.status(403).send("Invalid or expired token")
    res.status(200).json({ userId: user.userId, username: user.username })
  });
})

// Serve user details
app.get("/user-details", (req, res) => {
  const token = req.cookies.auth_token
  
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
})

// Serve user's details
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
})

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

  if (user.profile_image) tokenData.profile_image = user.profile_image

  const token = jwt.sign(tokenData, secretKey, { expiresIn: "7d" })

  res.cookie("auth_token", token, {
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    httpOnly: true, // Prevent XSS attacks
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  })

  return token
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

// updateUserRole(1, 'owner');

// END update user role

// START user role 

app.get("/get-user-role", (req, res) => {
  const token = req.cookies.auth_token

  jwt.verify(token, secretKey, (err, user) => {
    if (err || !user) return res.status(401).json({ error: "Unauthorized access" })

    db.get("SELECT role FROM users WHERE id = ?", [user.userId], (err, userRole) => {
      if (err) {
        console.error("Database error:", err.message)
        return res.status(500).json({ error: "Internal server error" })
      }
      res.status(200).json(userRole)
    })
  })
})

// END user role 

// START get chat name and users in chat 

function getChatDetail(req, res) {
  const { chatId } = req.query 

  const query = 'SELECT user_id  FROM chat_users WHERE chat_id = ?'
  db.all(query, [chatId], (err,users) => {
    const chatQuery = 'SELECT online_users FROM chats WHERE id = ?'
    db.get(chatQuery, [chatId], (err, chat) => {
      if (err) {
        console.error(err)
        res.status(500).send("Error fetching chat details")
        return
      }
      res.json({ userCount : users.length, onlineUsers : chat.online_users})
    })
  })
}

app.get("/chat-detail", (req, res) => {
  getChatDetail(req, res)
})

app.get("/chat-users", (req, res) => {
  const { chatId } = req.query

  const query = `
    SELECT users.id, users.username, users.status, users.role, users.profile_image
    FROM chat_users
    JOIN users ON chat_users.user_id = users.id
    WHERE chat_users.chat_id = ?
    `

  db.all(query, [chatId], (err, users) => {
    if (err) {
      console.error(err)
      res.status(500).send("Error fetching chat details")
      return
    }

    db.get('SELECT name FROM chats WHERE id = ?', [chatId], (err, chat) => {
      if (err) {
        console.error(err)
        res.status(500).send("Error fetching chat details")
        return
      }

      res.json({
        chatName : chat.name,
        users
      })
    })
  })
})

// END get chat name and users in chat 
