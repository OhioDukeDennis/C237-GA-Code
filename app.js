const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const app = express();


const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'c237_ga_eventapp'
});


connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});


// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });


// Set up view engine
app.set('view engine', 'ejs');
// enable static files
app.use(express.static('public'));

// enable form processing
app.use(express.urlencoded({
    extended: false
}));


app.get('/', (req, res) => {
    res.redirect('/login'); // Redirect root URL to the login page
});


app.get('/login', (req, res) => {
    res.render('login', { error: req.query.error });
});

// Login route - POST (process login form submission)
app.post('/login', (req, res) => {
    const userId = req.body.userId;
    const password = req.body.password;

    // Check if user exists in organizer table
    const sqlOrganizer = 'SELECT * FROM organizer WHERE organizerId = ? AND password = ?';
    connection.query(sqlOrganizer, [userId, password], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).send('Error retrieving user');
            return;
        }

        if (results.length > 0) {
            // User exists in organizer table, redirect to index page
            res.redirect('/index');

        } else {

            // Check if user exists in company table
            const sqlCompany = 'SELECT * FROM company WHERE companyId = ? AND password = ?';
            connection.query(sqlCompany, [userId, password], (err, results) => {
                if (err) {
                    console.error('Database query error:', err);
                    res.status(500).send('Error retrieving user');
                    return;
                }

                if (results.length > 0) {
                    // User exists in company table, redirect to index page
                    res.redirect('/index');

                } else {
                    res.redirect('/login?error=Incorrect username or password');
                }
            });
        }
    });
});

app.get('/logout', (req, res) => {
    res.redirect('/login');
});


app.get('/index', (req, res) => {
    const sql = 'SELECT * FROM events';
    // Fetch data from MySQL
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error Retrieving products');
        }
        // Render HTML page with data
        res.render('index', { events: results });
    });
});


app.get('/event/:id', (req, res) => {
    // Extract the event ID from the request parameters
    const eventId = req.params.id;
    const sql = 'SELECT * FROM events WHERE eventId = ?';
    // Fetch data from MySQLbased on the event ID
    connection.query(sql, [eventId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error Retrieving event by ID');
        }
        // Check if any event with the given ID was found
        if (results.length > 0) {
            // Render HTML page with the product data
            res.render('Event', { event: results[0] });
        } else {
            // If no event with the given ID was found, render a 404 page or handle it accordingly
            res.status(404).send('Event not found');
        }
    });

});


app.get('/addEvent', (req, res) => {
    res.render('addEvent');
});

app.post('/addEvent', upload.single('image'), (req, res) => {
    // Extract product data from the request body
    const { title, organizerId, venue, date, startTime, endTime, description, capacity, regDeadline } = req.body;
    let image;
    if (req.file) {
        image = req.file.filename; // Save only the filename
    } else {
        image = null;
    }


    // Convert form fields to Date objects
    const startTimeStr = `${date} ${startTime}`;
    const endTimeStr = `${date} ${endTime}`;
    const regDeadlineStr = regDeadline; // Assuming it's in 'YYYY-MM-DDTHH:MM' format if from datetime-local input

    const startTimeObj = new Date(startTimeStr); // Combine date and time with a space
    const endTimeObj = new Date(endTimeStr);
    const regDeadlineObj = new Date(regDeadlineStr);

    // Determine event status
    let currentDateTime = new Date();
    let status;
    if (currentDateTime < startTimeObj) {
        status = 'Upcoming';
    } else if (currentDateTime >= startTimeObj && currentDateTime <= endTimeObj) {
        status = 'Ongoing';
    } else {
        status = 'Ended';
    }


    // Prepare for database insertion
    const sql = 'INSERT INTO events (title, organizerId, venue, date, startTime, endTime, description, capacity, regDeadline, status, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [title, organizerId, venue, date, startTime, endTime, description, capacity, regDeadline, status, image];
    // Insert the new event into the database
    connection.query(sql, values, (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error adding event:", error);
            res.status(500).send('Error adding event');
        } else {
            // Send a success response
            res.redirect('/index');
        }
    });
});


app.get('/editEvent/:id', (req, res) => {
    const eventId = req.params.id;
    const sql = 'SELECT * FROM events WHERE eventId = ?';
    // Fetch data from MySQL based on the event ID
    connection.query(sql, [eventId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving event by ID');
        }
        // Check if any event with the given ID was found
        if (results.length > 0) {
            // Render HTML page with the event data
            res.render('editEvent', { event: results[0] });
        } else {
            // If no event with the given ID was found, render a 404 page or handle it accordingly
            res.status(404).send('Event not found');
        }
    });
});


app.post('/editEvent/:id', upload.single('image'), (req, res) => {
    const eventId = req.params.id;
    // Extract product data from the request body
    const { title, organizerId, venue, date, startTime, endTime, description, capacity, regDeadline } = req.body;
    let image = req.body.currentImage; //retrieve current image filename
    if (req.file) { //if new image is uploaded
        image = req.file.filename; // set imageto be new image filename
    }


    // Convert form fields to Date objects
    const startTimeStr = `${date} ${startTime}`;
    const endTimeStr = `${date} ${endTime}`;
    const regDeadlineStr = regDeadline; // Assuming it's in 'YYYY-MM-DDTHH:MM' format if from datetime-local input


    // If startTime or endTime is not changed, keep the existing values
    if (!startTime) {
        startTimeStr = req.body.existingStartTime;
    }
    if (!endTime) {
        endTimeStr = req.body.existingEndTime;
    }

    const startTimeObj = new Date(startTimeStr); // Combine date and time with a space
    const endTimeObj = new Date(endTimeStr);
    const regDeadlineObj = new Date(regDeadlineStr);


    // Determine event status based on current date and time
    const currentDateTime = new Date();
    let status;
    if (currentDateTime < startTimeObj) {
        status = 'Upcoming';
    } else if (currentDateTime >= startTimeObj && currentDateTime <= endTimeObj) {
        status = 'Ongoing';
    } else {
        status = 'Ended';
    }

    // Prepare SQL query to update event
    const sql = 'UPDATE events SET title = ?, organizerId = ?, venue = ?, date = ?, startTime = ?, endTime = ?, description = ?, capacity = ?, regDeadline = ?, status = ?, image = ? WHERE eventId = ?';
    const values = [title, organizerId, venue, date, startTime, endTime, description, capacity, regDeadline, status, image, eventId];

    // Execute the query
    connection.query(sql, values, (error, results) => {
        if (error) {
            console.error("Error updating event:", error);
            res.status(500).send('Error updating event');
        } else {
            res.redirect('/index'); // Redirect to index page after successful update
        }
    });
});


app.get('/deleteEvent/:id', (req, res) => {
    const eventId = req.params.id;
    const sql = 'DELETE FROM events WHERE eventId = ?';
    connection.query(sql, [eventId], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error deleting event:", error);
            res.status(500).send('Error deleting event');
        } else {
            // Send a success response
            res.redirect('/index');
        }
    });
});




// Registration route - GET (display registration form)
app.get('/register', (req, res) => {
    res.render('register');
});

// Registration route - POST (process registration form submission)
app.post('/register', (req, res) => {
    const { userId, name, contact, accountType, password, confirmPassword, address, website, description } = req.body;

    // Check if passwords match
    if (password !== confirmPassword) {
        return res.status(400).send('Passwords do not match');
    }

    // Determine which table to insert into based on accountType
    let tableName;
    let insertValues;
    if (accountType === 'organizer') {
        tableName = 'organizer';
        insertValues = [userId, name, contact, password, confirmPassword];
    } else if (accountType === 'company') {
        tableName = 'company';
        insertValues = [userId, name, contact, address, website, description, password, confirmPassword];
    } else {
        return res.status(400).send('Invalid account type');
    }

    // Prepare SQL query to insert into the chosen table
    let sql;
    if (accountType === 'organizer') {
        sql = `INSERT INTO ${tableName} (organizerId, name, contact, password, confirmPassword) VALUES (?, ?, ?, ?, ?)`;
    } else if (accountType === 'company') {
        sql = `INSERT INTO ${tableName} (companyId, name, contact, address, website, description, password, confirmPassword) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    }

    // Execute the query
    connection.query(sql, insertValues, (error, results) => {
        if (error) {
            console.error("Error registering user:", error);
            return res.status(500).send('Error registering user');
        }
        res.redirect('/login'); // Redirect to login page after successful registration
    });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));