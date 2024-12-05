// ----------------------------------   DEPENDENCIES  ----------------------------------------------
const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const path = require('path');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const axios = require('axios');

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

// app.use(
//   bodyParser.urlencoded({
//     extended: true,
//   })
// );

app.use(bodyParser.urlencoded({
  parameterLimit: 100000,
  limit: 52428800,
  extended: true
}));
app.use(express.json({limit : 52428800}));
// app.use(express.urlencoded({extended: true, limit:52428800}));

// -------------------------------------  DB CONFIG AND CONNECT   ---------------------------------------
const dbConfig = {
  host: process.env.POSTGRES_HOST,
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

// General note:
// Results are objects of the form: {success : true, result } (with different
// names for result, depending on the function).
// Errors are objects of the form: {success : false, error}

// Try an async function 'async_fetch' with a single parameter 'async_param',
// returning an error on failure
async function apply(async_fetch, async_param, func) {
    try {
        return func(await async_fetch(async_param))
    } catch (error) {
        return {success: false, error}
    }
}

// Get movies from the local database on our server
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

// Get movies from TMDB, a movie database
// On success, returns an object with relevant fields
// from the first page of movies
// (title, release_date, description, and image)
async function getMoviesExternal(title) {
    const tmdb_query = {
        url: `https://api.themoviedb.org/3/search/movie`,
        method: `GET`,
        params: {
            query: title,
            include_adult: false,
            language: "en-US",
            page: 1, // Limit API calls
            api_key: process.env.API_KEY
        },
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

// Caches movies from TMDB into the local (server) database
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

// First attempts to find 'title' in the local
// (server) database using getMoviesLocal.
// If this fails, the function gets
// the first result from TMDB, caches
// it into the database, and returns the result

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
  const message = req.session.message || null;
  req.session.error = null;  // clear error message after passing it to the view
  req.session.message = null;  // clear success message after passing it to the view

  res.render('pages/login', { error, message });  // pass error and message to the view
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
    
    req.session.userId = user.clientid;
    req.session.error = null;  // clear error after successful login
    res.redirect('/home');
  } catch (error) {
    console.error('Error during login:', error);
    req.session.error = 'An error occurred during login. Please try again.';
    res.redirect('/login');
  }
});

app.get('/register', (req, res) => {
  const error = req.session.error || null;
  req.session.error = null;  // clear error message after passing it to the view

  res.render('pages/register', { error });
});

app.post('/register', async (req, res) => {
  const { Username, Password, Email, FirstName, LastName } = req.body;

  try {
    // input validation
    if (!Username || !Password || !Email) {
      req.session.error = 'Username, Password, and Email are required';
      return res.redirect('/register');
    }

    // check if email already exists in the database so we dont get duplicate users
    const existingUser = await db.oneOrNone('SELECT * FROM Client WHERE Email = $1', [Email]);
    if (existingUser) {
      req.session.error = 'Email is already registered';
      return res.redirect('/register');
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
    req.session.error = 'An error occurred during registration. Please try again.';
    return res.redirect('/register');
  }
});

app.get('/home', (req, res) => {
    const query = 'select * from movie;'
    db.any(query, [])
        .then(movies => {
            res.render('pages/home', {movies: movies});
        })
});

app.get('/search', (req, res) => {
  const error = req.session.error || null; // get error message, if no error message then dont display error
  req.session.error = null; // clear the error message after retrieving it

  res.render('pages/search', { error }); // render the search page with error message
});


app.post('/search', async (req, res) => {
  const { searchType, query } = req.body;

  // validate user input
  if (!query || !searchType) {
    req.session.error = 'Search type and query are required.';
    return res.redirect('/search');
  }

  try {
    let results = [];

    if (searchType === 'byUser') {
      // search for reviews by a specific user
      results = await db.any(
        `SELECT r.ReviewId, m.MovieTitle, c.Username AS Author, r.ReviewBody
         FROM Review r
         JOIN Client c ON r.ClientId = c.ClientId
         JOIN Movie m ON r.MovieId = m.MovieId
         WHERE c.Username ILIKE $1
         ORDER BY r.ReviewId ASC`,
        [`%${query}%`]
      );
    } else if (searchType === 'byMovie') {
      // search for revews of a specific movie
      results = await db.any(
        `SELECT r.ReviewId, m.MovieTitle, c.Username AS Author, r.ReviewBody
         FROM Review r
         JOIN Client c ON r.ClientId = c.ClientId
         JOIN Movie m ON r.MovieId = m.MovieId
         WHERE m.MovieTitle ILIKE $1
         ORDER BY r.ReviewId ASC`,
        [`%${query}%`]
      );
    } else if (searchType === 'byBody') {
      // search for reviews contaiining specific text
      results = await db.any(
        `SELECT r.ReviewId, m.MovieTitle, c.Username AS Author, r.ReviewBody
         FROM Review r
         JOIN Client c ON r.ClientId = c.ClientId
         JOIN Movie m ON r.MovieId = m.MovieId
         WHERE r.ReviewBody ILIKE $1
         ORDER BY r.ReviewId ASC`,
        [`%${query}%`]
      );
    } else {
      req.session.error = 'Invalid search type.';
      return res.redirect('/search');
    }

    // if no results are found send error
    if (results.length === 0) {
      req.session.error = 'No results found.';
      return res.redirect('/search');
    }

    // store the results in the session and redirect to results page
    req.session.results = results;
    req.session.error = null; // clear any previous errors
    res.redirect('/results');
  } catch (error) {
    console.error('Error during search:', error);
    req.session.error = 'An error occurred during the search. Please try again.';
    res.redirect('/search');
  }
});

app.get('/results', (req, res) => {
  const error = req.session.error || null;
  const results = req.session.results || null;

  req.session.error = null; // clear the error
  req.session.results = null; // clear the results

  res.render('pages/results', { error, results }); // pass data to the view
});

app.get('/profile', async (req, res) => {
  try {
      // Get the user ID from the session
      const userId = req.session.userId;

      // Query to fetch user information
      const query = 'SELECT FirstName, LastName, Email FROM Client WHERE ClientId = $1';
      
      // Execute the query
      const user = await db.one(query, [userId]);

      // Render the profile page with user information
      res.render('pages/profile', {
          first_name: user.firstname,
          last_name: user.lastname,
          email: user.email
      });
  } catch (error) {
      console.error('Error fetching user profile:', error);
      // Redirect to login if there's an error (e.g., user not found)
      res.redirect('/login');
  }
});

app.get('/create-post', (req, res) => {
    res.render('pages/create-post')
})

app.post('/create-post', (req, res) => {
    const title = req.body.title
    const movie = req.body.movie
    // First ensure 'movie' is in the local (server) database.
    getMovies(movie)
        .then(_movie => {
            const movie_query = `select MovieId from Movie where MovieTitle = $1;`

            // Get the MovieId of 'movie'
            return db.any(movie_query, [movie])
        })
        .then(function (movies) {
            // Gets the relevant fields
            const movie_id = movies[0].movieid
            const movie_rating = req.body.movie_rating

            const review_rating = 0
            const client_id = req.session.userId
            const body = req.body.body

            const query = "insert into Review (ReviewBody, MovieRating, ReviewRating, ClientId, MovieId) values ($1, $2, $3, $4, $5) returning *;"

            const inputs = [body, movie_rating, review_rating, client_id, movie_id]

            return db.any(query, inputs)
        })
        .then(function (data) {
            res.render('pages/home', { message: 'Created post!'})
        })
        .catch(function (err) {
            console.log(err)
            res.render('pages/create-post', {
                message: 'Error creating post. Please try again.'
            })
        });
})


app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});




app.get('/settings', (req, res) => {
  console.log("\n\n\n====================");
  console.log(req.body);
  console.log("\n\n\n");
  res.render('pages/settings');
})

app.post('/settings/updateUsername', (req, res) => {
  const newUsername = req.body.username;
  const userId = req.session.userId;
  const query = "UPDATE Client SET Username = $1 WHERE ClientId = $2;"
  
  db.any(query, [newUsername, userId]).then(data => {
    res.render('pages/settings', {
      message: "Successfully updated username"
    });
    // res.redirect('/settings',
    // {
    //   status: 200,
    //   message: "Sucessfully updated username"
    // });
  }).catch(error => {
    console.log(error);
    res.redirect('/settings');
  });
});

app.post('/settings/updatePassword', (req, res) => {
  const newPassword = req.body.password;
  const newPasswordConfirm = req.body.password_confirm;
  const userId = req.session.userId;
  const query = "UPDATE Client SET Password = $1 WHERE ClientId = $2;"
  
  if (newPassword != newPasswordConfirm) {
    res.render('pages/settings', {
      message: "Passwords do not match"
    });
  }

  const hashedPassword = hashPassword(newPassword);

  db.any(query, [hashedPassword, userId]).then(data => {
    res.render('pages/settings', {
      message: "Successfully updated password"
    });
  }).catch(error => {
    console.log(error);
    res.redirect('/settings');
  })
})

app.post('/settings/updatePicture', (req, res) => {
  const newPicture = req.body.newPicture;
  if (newPicture) {

  const selectQuery = "SELECT imageid FROM Client_images WHERE ClientID = $1;";

  db.any(selectQuery, [req.session.userId]).then( data => {
    if (data.imageid) {
      const updateQuery = "UPDATE Client_images SET ClientImage = $1 WHERE InageId = $2;";
      db.any(updateQuery, [newPicture, data.imageid]).then( () => {
        res.render('pages/settings', {
          message: "Picture succssfully updated"
        });
    }).catch(error => {
      console.log(error);
      res.redirect("/settings");
    });
    }
    else {
      const insertQuery = "INSERT INTO Client_images (ClientImage, ClientId) VALUES ($1, $2);";

      db.any(insertQuery, [newPicture, req.session.userId]).then( data => {
        res.render("pages/settings", {
          message: "Sucessfully updated picture"
        });
    }).catch(error => {
      console.log(error)
      res.redirect("/settings");
    });
    }
  });
  }
  else {
    console.log("Unable to get image")
    res.render("pages/settings", {
      message: "Unable to update image"
    });
  }
})

app.post('/settings/deleteAccount', (req, res) => {
  //let deleteConfirm = confirm("Are you sure you want to delete your account?");

  // if (deleteConfirm) {
    const userId = req.session.userId;
    const query = "DELETE FROM CLIENT WHERE ClientId = $1 RETURNING *;"
    db.any(query, [userId]).then(data => {
      //console.log(data);
      // res.status(200).json({
      //   message: "Successfully deleted account",
      // })
      req.session.destroy();
      res.render('pages/login', {
        message: "Account Deleted"
      });
    }).catch(error => {
      console.log(error);
      res.redirect('/settings');
    })
  
  // } else {
  //   res.redirect('/settings');
  // }
})

app.post('/search', async (req, res) => {
  const { searchType, query } = req.body; // inputs
  let results = [];
  let error = null;

  try {
    if (searchType === 'byUser') {
      results = await db.any(
        `SELECT r.ReviewBody, c.Username AS Author, m.MovieTitle, m.MovieDescription, m.ReleaseDate, m.MovieImage
         FROM Review r
         JOIN Client c ON r.ClientId = c.ClientId
         JOIN Movie m ON r.MovieId = m.MovieId
         WHERE c.Username ILIKE $1`, [`%${query}%`]
      );
    } else if (searchType === 'byMovie') {
      results = await db.any(
        `SELECT r.ReviewBody, c.Username AS Author, m.MovieTitle, m.MovieDescription, m.ReleaseDate, m.MovieImage
         FROM Review r
         JOIN Client c ON r.ClientId = c.ClientId
         JOIN Movie m ON r.MovieId = m.MovieId
         WHERE m.MovieTitle ILIKE $1`, [`%${query}%`]
      );
    } else if (searchType === 'byBody') {
      results = await db.any(
        `SELECT r.ReviewBody, c.Username AS Author, m.MovieTitle, m.MovieDescription, m.ReleaseDate, m.MovieImage
         FROM Review r
         JOIN Client c ON r.ClientId = c.ClientId
         JOIN Movie m ON r.MovieId = m.MovieId
         WHERE r.ReviewBody ILIKE $1`, [`%${query}%`]
      );
    } else {
      error = 'Invalid search type.';
    }

    console.log('Results:', results); // debuging
  } catch (err) {
    console.error(err);
    error = 'An error occurred while searching.';
  }

  res.render('pages/results', { results, error });
});


// search render
app.get('/search', (req, res) => {
  res.render('pages/search', { error: null });
});

/* Tests for the Database */
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

/* End Tests */


app.listen(3000);

//module.exports = app.listen(3000);
console.log('Server is listening on port 3000');

