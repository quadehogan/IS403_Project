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

app.use(
    session(
        {
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
        }
    )
);

const knex = require("knex")({
    client: "pg",
    connection: {
        host : process.env.DB_HOST || "localhost",
        user : process.env.DB_USER || "postgres",
        password : process.env.DB_PASSWORD || "admin",
    database : process.env.DB_NAME || "foodisus", // NEED TO CHANGE WHEN DB IS CREATED
        port : process.env.DB_PORT || 5432  // CONFIM PORT WHEN MADE
    }
});

app.use(express.static(path.join(__dirname, 'public')));


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

app.get('/', (req, res) => {
    if (req.session.isLoggedIn) {
        res.render('index', { username: req.session.username });
    } else {
        res.render('login', { errorMessage: null });
    }
});

// This creates attributes in the session object to keep track of user and if they logged in
app.post("/login", (req, res) => {
    let sName = req.body.username;
    let sPassword = req.body.password;

    knex.select("username", "password")
        .from('users')
        .where("username", sName)
        .andWhere("password", sPassword)
        .then(users => {
            // Check if a user was found with matching username AND password
            if (users.length > 0) {
                req.session.isLoggedIn = true;
                req.session.username = sName;
                res.redirect("/");
            } else {
                // No matching user found
                res.render("login", { error_message: "Invalid login" });
            }
        })
        .catch(err => {
            console.error("Login error:", err);
            res.render("login", { error_message: "Invalid login" });
        });

});

// Logout route
app.get("/logout", (req, res) => {
    // Get rid of the session object
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        }
        res.redirect("/");
    });
});

app.get('/signup', (req, res) => {
    res.render('signup', { title: 'Sign Up' });
});

app.get('/businesses', (req, res) => {
    res.render('businesses', { title: 'Businesses' });
});

app.get('/services', (req, res) => {
    res.send('<h2>Services Page Coming Soon</h2>');
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});