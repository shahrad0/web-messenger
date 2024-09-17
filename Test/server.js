const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const db = new sqlite3.Database(':memory:');

app.use(bodyParser.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Create a table if it doesn't exist
db.run('CREATE TABLE IF NOT EXISTS texts(id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT)');

// Route to save text
app.post('/saveText', (req, res) => {
    const text = req.body.text;
    db.run('INSERT INTO texts(text) VALUES(?)', [text], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Text saved!', id: this.lastID });
    });
});

// Route to retrieve all texts
app.get('/getTexts', (req, res) => {
    db.all('SELECT * FROM texts', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
