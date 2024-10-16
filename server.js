const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const saltRounds = 10;

// handling images
const multer = require("multer");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const secretKey = 'C3%ke$lctd^eqcO7-xqxZSj%sca:^lu[FB#4e=9G@JyS?N<>VTLRYi:MD0"brK=';
const app = express();
const server = http.createServer(app);
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
  profile_image TEXT,
  password TEXT NOT NULL,
  role TEXT
)`,
  (err) => {
    if (err) console.error("Error creating users table:", err.message);
  }
);

// File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

io.on("connection", (socket) => {
  console.log("A user connected");
  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
  });
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Handle message submission and save to database
app.post("/submit-message", (req, res) => {
  const { message, userId } = req.body;
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Extract the token after 'Bearer'

  if (!token) return res.sendStatus(401); // If there's no token, return unauthorized

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.sendStatus(403); // If the token is invalid, return forbidden

    db.get(
      "SELECT username, profile_image,id FROM users WHERE id = ?",
      [user.userId],
      (err, _) => {
        if (err) {
          console.error("Error fetching user data:", err.message);
          return res.status(500).send("Error fetching user data");
        }
        if (!user) return res.status(400).send("User not found");

        db.run(
          "INSERT INTO messages (message, user_id) VALUES (?, ?)",
          [message, user.userId],
          function (err) {
            if (err) {
              console.error("Error inserting message:", err.message);
              return res.status(500).send("Error inserting message");
            }
            io.emit("chat message", {
              message,
              username: user.username,
              profileImage: user.profile_image,
              id: user.userId,
            })
            res.status(200).json({
              message,
              username: user.username,
              profileImage: user.profile_image,
              userId,
            });
          }
        );
      }
    );
  });
});
function deleteMessage() {
  const query = `
    DELETE FROM messages
    WHERE id IN (
      SELECT id FROM messages
      ORDER BY id DESC
      LIMIT 5
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

// deleteMessage()
// Fetch last 50 messages when user logs in
app.get("/get-messages", (req, res) => {
  const query = `
    SELECT messages.message, users.username, users.profile_image, users.id
    FROM messages
    INNER JOIN users ON messages.user_id = users.id
    ORDER BY messages.id DESC
    LIMIT 50
  `;
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("Error fetching messages:", err.message);
      return res.status(500).send("Error fetching messages");
    }
    // Reverse the order so the latest message is at the bottom
    res.json(rows.reverse());
  });
});


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
      "INSERT INTO users (username, password, profile_image, role) VALUES (?, ?, ?, ?)",
      [username, hashedPassword, profileImage, "user"],
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
      "SELECT username, profile_image, role, id FROM users WHERE id = ?",
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
app.get("/user-details-v2", (req, res) => {
  const { id } = req.query;
  db.get(
    "SELECT username, profile_image, role, id FROM users WHERE id = ?",
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
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve the client files
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// new 
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
