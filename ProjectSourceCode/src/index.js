// ----------------------------------   DEPENDENCIES  ----------------------------------------------
const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const path = require('path');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const axios = require('axios')

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


// hashing stuff
const crypto = require('crypto');

// hashing password
function hashPassword(password) {
  return crypto.createHash('sha256')  // using SHA256
    .update(password)
    .digest('hex');
}


// =========================================================================================================
//      Helper Functions
// =========================================================================================================


async function apply(async_fetch, async_param, func) {
    try {
        return func(await async_fetch(async_param))
    } catch (error) {
        return {success: false, error}
    }
}

async function getMoviesLocal(title) {
    const query = 
    `select * 
        from movie 
        where movietitle 
        like $1
        limit 1;`

    try {
        const movie = await db.one(query, [title])
        return {success: true, movie}
    } catch (error) {
        return {success: false, error}
    }
}

async function getMoviesExternal(title) {
    const tmdb_query = {
        url: `https://api.themoviedb.org/3/search/movie`,
        method: `GET`,
        params: {
            query: title,
            include_adult: false,
            language: "en-USA",
            page: 1, // Limit API calls
            api_key: process.env.API_KEY
        }
    }
    
    const organizeMovies = (response) => {
        var moviesData = []

        response.data.results.forEach((result) => {
            var image = null

            if (result.poster_path) {
                image = `https://image.tmdb.org/t/p/original/${result.poster_path}`
            }

            moviesData[moviesData.length] = {
                title: result.title,
                release_date: result.release_date,
                description: result.overview,
                image: image
            }}
        )

        return {success: true, moviesData}
    }

    return await apply(axios, tmdb_query, organizeMovies)
}

async function cacheMovies(response) {
    const moviesData = response.moviesData
    const query = `
        insert into Movie (MovieTitle, MovieDescription, ReleaseDate, MovieImage)
        Values ($1, $2, $3, $4) 
        returning *;
    `
    const firstMovie = moviesData[0]
    const params = [firstMovie.title, firstMovie.description, firstMovie.release_date, firstMovie.image]
    try {
        const movie = await db.one(query, params)
        return {success: true, movie}
    } catch (error) {
        return {success: false, error}
    }
}

async function getMovies(title) {
    const localRes = await getMoviesLocal(title)

    if (localRes.success){
        return localRes
    } else {
        return await apply(getMoviesExternal, title, cacheMovies)
    }
}


// =========================================================================================================
//      Endpoints
// =========================================================================================================

app.get('/', (req, res) => {
  res.redirect('/login');
});

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
      res.status(400).json({message:"Email in use"});
      return res.render('pages/register', { error: 'Email is already registered' });
    }

    // hashing password
    const hashedPassword = hashPassword(Password);

    // insert user into db
    await db.none(
      'INSERT INTO Client (Username, Password, Email, FirstName, LastName) VALUES ($1, $2, $3, $4, $5)', 
      [Username, hashedPassword, Email, FirstName, LastName]
    );
    res.status(200);
    res.redirect('/login');
  } catch (error) {
    res.status(400);
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

app.get('/test_database', (req, res) => {
    const testOne = getMovies('Oddity')
        .then(resultOne => {
            const testTwo = getMoviesLocal('The Incredibles').
                then(resultTwo => {
                    res.json({status: 'success', message: {testOne: resultOne, testTwo: resultTwo}})
                    }
                )
            }
        )
});

app.get('/test_query', (req, res) => {
    const testOne = getMoviesExternal('Stargate')
        .then(resultOne => {
            const testTwo = getMovies('Coraline').
                then(resultTwo => {
                    res.json({status: 'success', message: {testOne: resultOne, testTwo: resultTwo}})
                    }
                )
            }
        )
});

app.get('/settings', (req, res) => {
  res.render('pages/settings');
})

app.put('updateUsername', (req, res) => {
  const newUsername = req.body;
  const userId = req.session.user.userId;
  const query = "UPDATE Client SET Username = '$1' WHERE ClientId = $2;"
  
  db.one(query, [newUsername, userId]).then(data => {
    res.status(200).json({
      message: "Success",
    })
  }).catch(error => {
    console.log(error);
    res.redirect('/settings');
  })
})

app.put('updatePassword', (req, res) => {
  const newPassword = req.body;
  const userId = req.session.user.userId;
  const query = "UPDATE Client SET Password = '$1' WHERE ClientId = $2;"
  
  const hashedPassword = hashPassword(newPassword);

  db.one(query, [hashedPassword, userId]).then(data => {
    res.status(200).json({
      message: "Success",
    })
  }).catch(error => {
    console.log(error);
    res.redirect('/settings');
  })
})

app.delete('deleteAccount', (req, res) => {
  let deleteConfirm = window.confirm("Are you sure you want to delete your account?");

  if (deleteConfirm) {
    const userId = req.session.user.userId;
    const query = "DELETE FROM CLIENT WHERE ClientId = $1;"
    db.one(query, [userId]).then(data => {
      res.status(200).json({
        message: "Successfully deleted account",
      })
    }).catch(error => {
      console.log(error);
      res.redirect('/settings');
    })
  
  } else {
    res.redirect('/settings');
  }
})


app.listen(3000);

// module.exports = app.listen(3000);
console.log('Server is listening on port 3000');

