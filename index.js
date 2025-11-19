require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
app.set('view engine', 'ejs');

// PORT
const port = process.env.PORT || 5000;

// Session setup
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'fallback-secret-key',
        resave: false,
        saveUninitialized: false,
    })
);

// --- Knex setup ---
const knex = require("knex")({
    client: "pg",
    connection: {
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "password123",
        database: process.env.DB_NAME || "bizconnect",
        port: process.env.DB_PORT || 5432
    }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Global login check
function requireLogin(req, res, next) {
    const publicPaths = [
        '/',
        '/login-user',
        '/login-business',
        '/logout',
        '/signup',
        '/signup-user',
        '/signup-business'
    ];

    if (publicPaths.includes(req.path) || req.path.startsWith('/signup')) {
        return next();
    }

    if (req.session.isLoggedIn) {
        return next();
    }

    res.status(403).render('loginUser', { errorMessage: 'You must log in to access this page.' });
}

app.use(requireLogin);

// Root route
app.get('/', (req, res) => {
    if (req.session.isLoggedIn) {
        res.render('index', {
            username: req.session.username,
            businessName: req.session.businessName
        });
    } else {
        res.render('loginUser', { errorMessage: null });
    }
});

// Login pages
app.get("/login-user", (req, res) => res.render("loginUser", { errorMessage: null }));
app.get("/login-business", (req, res) => res.render("loginBusiness", { errorMessage: null }));

// Logout
app.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) console.log(err);
        res.redirect("/");
    });
});

// Signup pages
app.get('/signup', (req, res) => res.render('signup', { title: 'Sign Up' }));
app.get('/signup-user', (req, res) => res.render('user_signup', { title: 'User Sign Up' }));
app.get('/signup-business', (req, res) => res.render('business_signup', { title: 'Business Sign Up' }));

// Signup POST - Users
app.post('/signup-submit-user', (req, res) => {
    const { U_Username, U_Password, U_Email, U_PhoneNumber, U_Address } = req.body;
    if (!U_Username || !U_Password || !U_Email) {
        return res.status(400).render("user_signup", { error_message: "Username, email, and password are required." });
    }

    const newUser = { U_Username, U_Password, U_Email, U_PhoneNumber, U_Address };

    knex("users")
        .insert(newUser)
        .then(() => res.redirect("/login-user"))
        .catch(dbErr => {
            console.error("Error inserting user:", dbErr.message);
            res.status(500).render("user_signup", { error_message: "Unable to save user. Please try again." });
        });
});

// Signup POST - Businesses
app.post('/signup-submit-business', (req, res) => {
    const { B_Name, B_Email, B_Password, B_Category, B_Description, B_Phone, B_Address, B_Username, Owner } = req.body;
    if (!B_Name || !B_Password || !B_Email || !B_Username || !B_Category || !Owner || !B_Description || !B_Phone || !B_Address) {
        return res.status(400).render("business_signup", { error_message: "All fields are required for business signup." });
    }

    const newBusiness = { B_Name, B_Email, B_Password, B_Category, B_Description, B_Phone, B_Address, B_Username, Owner };

    knex("businesses")
        .insert(newBusiness)
        .then(() => res.redirect("/login-business"))
        .catch(dbErr => {
            console.error("Error inserting business:", dbErr.message);
            res.status(500).render("business_signup", { error_message: "Unable to save business. Please try again." });
        });
});

// Display all businesses
app.get('/businesses', async(req, res) => {
    try {
        const businesses = await knex('businesses').select('*');
        res.render('businesses', { businesses, error_message: null });
    } catch (err) {
        console.error('Error loading businesses:', err);
        res.render('businesses', { businesses: [], error_message: 'Unable to load businesses.' });
    }
});

// Services page
app.get('/services', (req, res) => {
    res.send('<h2>Services Page Coming Soon</h2>');
});

// Start server
app.listen(port, () => console.log(`Server is listening on port ${port}`));