require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
app.set('view engine', 'ejs');

// PORT on deploy 3000 on test
const port = process.env.PORT || 3000;

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
  })
);

// --- Knex setup (commented out for now) ---
// const knex = require("knex")({
//   client: "pg",
//   connection: {
//     host: process.env.DB_HOST || "localhost",
//     user: process.env.DB_USER || "postgres",
//     password: process.env.DB_PASSWORD || "admin",
//     database: process.env.DB_NAME || "bizconnect", // update to your actual DB name
//     port: process.env.DB_PORT || 5432
//   }
// });

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Global authentication middleware - runs on every request
app.use((req, res, next) => {
  if (
    req.path === '/' ||
    req.path === '/login-user' ||
    req.path === '/login-business' ||
    req.path === '/logout' ||
    req.path.startsWith('/signup')
  ) {
    return next();
  }

  if (req.session.isLoggedIn) {
    next();
  } else {
    res.render("loginUser", { errorMessage: "Please log in to access this page." });
  }
});

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

// User login
app.get("/login-user", (req, res) => {
  res.render("loginUser", { errorMessage: null });
});

// Business login
app.get("/login-business", (req, res) => {
  res.render("loginBusiness", { errorMessage: null });
});

// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    }
    res.redirect("/");
  });
});

// Signup routes (these will need knex uncommented later)
app.get('/signup', (req, res) => {
  res.render('signup', { title: 'Sign Up' });
});

app.post('/signupsumbit', (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res.status(400).render("signupUser", { error_message: "Username, email, and password are required." });
  }
  // TODO: Uncomment knex and insert into users table
  res.redirect('/login-user');
});

app.post('/bussignupsumbit', (req, res) => {
  const { B_Name, B_Email, B_Password, B_Category, B_Description, B_Phone, B_Address, B_Username, Owner } = req.body;
  if (!B_Name || !B_Password || !B_Email || !B_Username || !B_Category || !Owner || !B_Description || !B_Phone || !B_Address) {
    return res.status(400).render("signupBusiness", { error_message: "All fields are required for business signup." });
  }

  const newBusiness = {
        B_Name,
        B_Email,
        B_Password,
        B_Category,
        B_Description,
        B_Phone,
        B_Address,
        B_Username,
        Owner
    };

    // Insert the record into PostgreSQL and return the user list on success.
    knex("businesses")
        .insert(newBusiness)
        .then(() => {
            res.redirect("/loginBusinesses");
        })
        .catch((dbErr) => {
            console.error("Error inserting user:", dbErr.message);
            // Database error, so show the form again with a generic message.
            res.status(500).render("addBusiness", { error_message: "Unable to save business. Please try again." });
        });
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