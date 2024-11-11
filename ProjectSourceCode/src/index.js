// ----------------------------------   DEPENDENCIES  ----------------------------------------------
const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const path = require('path');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');

// -------------------------------------  APP CONFIG   ----------------------------------------------

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
});

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json());
// set Session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: true,
    resave: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',  // change to true latter when using HTTPS
      httpOnly: true,  // to prevent XSS attacks
      maxAge: 24 * 60 * 60 * 1000  // makes sure you cant have a webpage open for more than a day
    }
  })
);
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// -------------------------------------  DB CONFIG AND CONNECT   ---------------------------------------
const dbConfig = {
  host: 'db',
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};
const db = pgp(dbConfig);

// db test
db.connect()
  .then(obj => {
    // Can check the server version here (pg-promise v10.1.0+):
    console.log('Database connection successful');
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR', error.message || error);
  });

const axios = require('axios');

// hashing stuff
const crypto = require('crypto');

// hashing password
function hashPassword(password) {
  return crypto.createHash('sha256')  // using SHA256
    .update(password)
    .digest('hex');
}

function getMovies(query) {
    var moviesData = []

    axios({
        url: `https://api.themoviedb.org/3/search/movie`,
        method: `GET`,
        params: {
            query: query,
            include_adult: false,
            language: "en-USA",
            page: 1, // Limit API calls
            api_key: process.env.API_KEY
        }
    }).then(res => res.data.results.forEach((result) => {
        var image = null

        if (result.poster_path) {
            image = `https://image.tmdb.org/t/p/original/${result.poster_path}`
        }

        moviesData[moviesData.length] = {
            title: result.title,
            release_date: result.release_date,
            description: result.overview,
            image: image
        }

        return moviesData
    }))
      .catch(error => console.log(error))
}

app.get('/login', (req, res) => {
  const error = req.session.error || null;
  req.session.error = null;  // clear error message after passing it to the view

  res.render('pages/login', { error });  // pass the error to the view
});

app.post('/login', async (req, res) => {
  const { Email, Password } = req.body;

  try {
    // get user from database
    const user = await db.oneOrNone('SELECT * FROM Client WHERE Email = $1', [Email]);

    if (!user) {
      // set error message in session if user is not found
      req.session.error = 'Invalid email';
      return res.redirect('/login');
    }

    // hash password and compare it to the stored hash
    const hashedPassword = hashPassword(Password);

    if (hashedPassword !== user.password) {
      req.session.error = 'Invalid password';
      return res.redirect('/login');
    }

    // set session user ID on successful login
    req.session.userId = user.ClientId;
    req.session.error = null;  // clear error after successful login
    res.redirect('/home');
  } catch (error) {
    console.error('Error during login:', error);
    req.session.error = 'An error occurred during login. Please try again.';
    res.redirect('/login');
  }
});

app.get('/register', (req, res) => {
  res.render('pages/register');
});

app.post('/register', async (req, res) => {
  const { Username, Password, Email, FirstName, LastName } = req.body;

  try {
    // input validation
    if (!Username || !Password || !Email) {
      return res.render('pages/register', { error: 'Username, Password, and Email are required' });
    }

    // check if email already exists in the database so we dont get duplicate users
    const existingUser = await db.oneOrNone('SELECT * FROM Client WHERE Email = $1', [Email]);
    if (existingUser) {
      return res.render('pages/register', { error: 'Email is already registered' });
    }

    // hashing password
    const hashedPassword = hashPassword(Password);

    // insert user into db
    await db.none(
      'INSERT INTO Client (Username, Password, Email, FirstName, LastName) VALUES ($1, $2, $3, $4, $5)', 
      [Username, hashedPassword, Email, FirstName, LastName]
    );

    res.redirect('/login');
  } catch (error) {
    console.error('Error during registration:', error);
    res.render('pages/register', { error: 'An error occurred during registration. Please try again.' });
  }
});

app.get('/home', (req, res) => {

  res.render('pages/home');
});

app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});


app.listen(3000);
// module.exports = app.listen(3000);
console.log('Server is listening on port 3000');
