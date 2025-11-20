// Loads environment variables from the .env file into process.env

const express = require('express');                // Import Express framework
const session = require('express-session');        // Import session middleware for login persistence
const path = require('path');                      // Node utility for working with file paths
const bodyParser = require('body-parser');         // Parses form POST data (req.body)

const app = express();

// Tell Express to use EJS as the templating engine for rendering views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));



// Determine which port to run the server on:
//  - Use PORT from environment (Elastic Beanstalk, Render, etc.)
//  - Fallback to port 5001 for local testing
const port = process.env.PORT || 5001;

// ---------------------- SESSION SETUP ----------------------
// Creates a session for each user storing things like userID
//  - secret: used to sign/verify session cookies
//  - resave: do not save session if nothing changed
//  - saveUninitialized: do not create empty sessions
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'fallback-secret-key',
        resave: false,
        saveUninitialized: false,
    })
);

// Serve static files (CSS, JS, images) from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Enable parsing of form data (application/x-www-form-urlencoded)
app.use(bodyParser.urlencoded({ extended: true }));

////////////////// KNEX SETUP //////////////////
const knex = require("knex")({
   client: "pg",
   connection: {
     host: process.env.DB_HOST,        // ✅ Matches
     user: process.env.DB_USER,        // ✅ Matches
     password: process.env.DB_PASSWORD, // ✅ Matches
     database: process.env.DB_NAME,    // ✅ Matches
     port: process.env.DB_PORT         // ✅ Matches
  }
});
////////////////// TEST DB CONNECTION //////////////////

////////////////// UNHANDLED ERRORS //////////////////
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).send("Something went wrong!");
});


////////////////// LOGIN PRIVLEDGES //////////////////
function requireLogin(req, res, next) {
    const publicPaths = [
        '/',
        '/login-user',
        '/login-business',
        '/logout',
        '/signup',
        '/user_signup',
        '/business_signup'
    ];

    if (publicPaths.includes(req.path)) {
        return next();
    }

    if (req.session.isLoggedIn) {
        return next();
    }

    res.status(403).render('loginUser', { errorMessage: 'You must log in to access this page.' });
}

app.use(requireLogin);

////////////////// ROOT ROUTE //////////////////
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


////////////////// LOGIN USER PAGES //////////////////
app.get("/login-user", (req, res) => 
  res.render("loginUser", { errorMessage: null }
));

////////////////// LOGIN-POST USER //////////////////
app.post("/user-login-submit", async (req, res) => {
  const {U_Username, U_Password} = req.body;


  try{

    const user = await knex("User")
      .where({U_Username: U_Username})
      .first();

    if(!user) {
      return res.status(400).send("User not found");
    }

    if (user.U_Password !== U_Password) {
      return res.status(400).send("Incorrect Password");
    }

    req.session.user = {
      username: user.U_Username,
      userid: user.User_ID
    };

    res.redirect("/index");
  }catch (err) {
    console.error(err)
    res.status(500).send("Server error")
  }

});

////////////////// LOGIN BUSINESS PAGES //////////////////
app.get("/login-business", (req, res) => 
  res.render("loginBusiness", { errorMessage: null }
));

////////////////// LOGIN-POST BUSINESS //////////////////
app.post("/login-business-submit", async (req, res) => {
  const {B_Username, B_Password} = req.body;


  try{

    const business_user = await knex("Business")
      .where({B_Username: B_Username})
      .first();

    if(!user) {
      return res.status(400).send("Business not found");
    }

    if (user.B_Password !== B_Password) {
      return res.status(400).send("Incorrect Password");
    }

    req.session.business_user = {
      B_Username: business_user.B_Username,
      Business_ID: business_user.Business_ID
    };

    res.redirect("/index");
  }catch (err) {
    console.error(err)
    res.status(500).send("Server error")
  }
});

////////////////// LOGOUT //////////////////
app.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) console.log(err);
        res.redirect("/");
    });
});

////////////////// SIGNUP PAGES //////////////////
app.get('/signup', (req, res) => 
  res.render('signup', { 
    title: 'Sign Up',
    error_message: null 
  }
));

app.get('/user_signup', (req, res) => 
  res.render('user_signup', { 
    title: 'User Sign Up',
    error_message: null 
  }
));

app.get('/business_signup', (req, res) => 
  res.render('business_signup', { 
    title: 'Business Sign Up',
    error_message: null 
  }
));

////////////////// SIGNUP-POST USER //////////////////
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

////////////////// SIGNUP-POST BUSINESS //////////////////
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

////////////////// DISPLAY BUSINESSES //////////////////
app.get('/businesses', async(req, res) => {
    try {
        const businesses = await knex('businesses').select('*');
        res.render('businesses', { businesses, error_message: null });
    } catch (err) {
        console.error('Error loading businesses:', err);
        res.render('businesses', { businesses: [], error_message: 'Unable to load businesses.' });
    }
});

////////////////// DISPLAY SERVICES //////////////////
app.get('/services', (req, res) => {
    res.send('<h2>Services Page Coming Soon</h2>');
});

// Start server
app.listen(port, () => console.log(`Server is listening on port ${port}`));