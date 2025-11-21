// Loads environment variables from the .env file into process.env
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();

// Templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Port
const port = process.env.PORT || 5001;

// ---------------------- SESSION SETUP ----------------------
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'fallback-secret-key',
        resave: false,
        saveUninitialized: false,
    })
);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// ---------------------- KNEX SETUP ----------------------
const knex = require("knex")({
    client: "pg",
    connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    }
});

// Test DB connection
knex.raw("select 1+1 as result")
    .then(() => console.log("✅ Database connected!"))
    .catch(err => console.error("❌ Database connection failed:", err));

// ---------------------- MIDDLEWARE ----------------------
function requireLogin(req, res, next) {
    if (req.session.user || req.session.business_user) {
        return next();
    }
    res.redirect('/');
}

// ---------------------- ROUTES ----------------------

// Root
app.get('/', (req, res) => {
    res.render("signup", { errorMessage: null });
});

app.get("/index", requireLogin, (req, res) => {
    res.render("index", { username, businessName });
});

// Login Pages
app.get("/login-user", (req, res) => res.render("loginUser", { errorMessage: null }));
app.get("/login-business", (req, res) => res.render("loginBusiness", { errorMessage: null }));

// Login POST
app.post("/user-login-submit", async(req, res) => {
    const { U_Username, U_Password } = req.body;

    try {
        const user = await knex("User").where({ U_Username }).first();

        if (!user || user.U_Password !== U_Password) {
            return res.render("loginUser", { errorMessage: "Invalid username or password" });
        }

        req.session.user = { username: user.U_Username, userid: user.User_ID };
        res.redirect("/index");
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

app.post("/login-business-submit", async(req, res) => {
    const { B_Username, B_Password } = req.body;

    try {
        const business_user = await knex("Business").where({ B_Username }).first();

        if (!business_user || business_user.B_Password !== B_Password) {
            return res.render("loginBusiness", { errorMessage: "Invalid username or password" });
        }

        req.session.business_user = { B_Username: business_user.B_Username, Business_ID: business_user.Business_ID };
        res.redirect("/index");
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

// Logout
app.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) console.log(err);
        res.redirect("/");
    });
});

// Signup Pages
app.get('/signup', (req, res) => res.render('signup', { title: 'Sign Up', error_message: null }));
app.get('/user_signup', (req, res) => res.render('user_signup', { title: 'User Sign Up', error_message: null }));
app.get('/business_signup', (req, res) => res.render('business_signup', { title: 'Business Sign Up', error_message: null }));

// Signup POST
app.post('/signup-submit-user', (req, res) => {
    const { U_Username, U_Password, U_Email, U_PhoneNumber, U_Address } = req.body;
    if (!U_Username || !U_Password || !U_Email) {
        return res.status(400).render("user_signup", { error_message: "Username, email, and password are required." });
    }

    const newUser = { U_Username, U_Password, U_Email, U_PhoneNumber, U_Address };

    knex("User")
        .insert(newUser)
        .then(() => res.redirect("/login-user"))
        .catch(dbErr => {
            console.error("Error inserting user:", dbErr.message);
            res.status(500).render("user_signup", { error_message: "Unable to save user. Please try again." });
        });
});

app.post('/signup-submit-business', (req, res) => {
    const { B_Name, B_Email, B_Password, B_Category, B_Description, B_Phone, B_Address, B_Username, Owner } = req.body;
    if (!B_Name || !B_Password || !B_Email || !B_Username || !B_Category || !Owner || !B_Description || !B_Phone || !B_Address) {
        return res.status(400).render("business_signup", { error_message: "All fields are required for business signup." });
    }

    const newBusiness = { B_Name, B_Email, B_Password, B_Category, B_Description, B_Phone, B_Address, B_Username, Owner };

    knex("Business")
        .insert(newBusiness)
        .then(() => res.redirect("/login-business"))
        .catch(dbErr => {
            console.error("Error inserting business:", dbErr.message);
            res.status(500).render("business_signup", { error_message: "Unable to save business. Please try again." });
        });
});

// Display Businesses
app.get('/businesses', requireLogin, async(req, res) => {
    try {
        const businesses = await knex('Business').select('*');
        res.render('businesses', { businesses, error_message: null });
    } catch (err) {
        console.error('Error loading businesses:', err);
        res.render('businesses', { businesses: [], error_message: 'Unable to load businesses.' });
    }
});

// Display Services
app.get('/services', (req, res) => {
    res.send('<h2>Services Page Coming Soon</h2>');
});

// Start server
app.listen(port, () => console.log(`Server is listening on port ${port}`));