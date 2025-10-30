require('dotenv').config();

const express = require('express');

// Makes the session variable
const session = require('express-session');

let path = require('path');
let bodyParser = require('body-parser');

let app = express();

app.set('view engine', 'ejs');

// PORT on deploy 3000 on test
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(
    session(
        {
            secret: process.env.SESSION_SECRET || 'fallback_secret',
            resave: false,
            saveUninitialized: false,
        }
    )           
);

app.use(bodyParser.urlencoded({ extended: true }));

//Global authentication middleware - runs on every request
app.use((req, res, next) => {
    // Skip authentication for login routes
    if (req.path === '/' || req.path === '/login' || req.path === '/logout') {
        // Continue with the request path
        return next();
    }

    // Check if user is authenticated
    if (req.session.isLoggedIn) {
        // no return because nothing is below it 
        next(); // User is authenticated, proceed to the next middleware/route handler
    }
    else{
        res.render("login", { errorMessage: "Please log in to access this page." });
    }

});

app.post('/login', (req, res) => {
    let sName = req.body.username;
    let sPassword = req.body.password;

    if (sName === process.env.USERNAME && sPassword === process.env.PASSWORD) {
        req.session.isLoggedIn = true;
        req.session.username = sName;
        res.redirect('/');
    }
    else {
        res.render('login', { errorMessage: 'Invalid username or password' });
    }
});

app.get('/', (req, res) => {
    if (req.session.isLoggedIn) {
        res.render('index', { username: req.session.username });
    } else {
        res.render('login', { errorMessage: null });
    }
});

app.get('/test', (req, res) => {
    res.render('test');
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});