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

async function apply(async_fetch, async_param, func) {
    try {
        return func(await async_fetch(async_param))
    } catch (error) {
        return {success: false, error}
    }
}

function onFailure(data, callback) {
    if (data.success) {
        return data 
    } else {
        return callback(data)
    }
}

function onSuccess(data, callback) {
    if (data.success) {
        return callback(data)
    } else {
        return data
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

    return await onFailure(
        localRes, 
        await apply(getMoviesExternal, title, cacheMovies)
    )
}

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



app.get('/login', (req, res) => {
  res.render('pages/login');
});
app.get('/login', (req, res) => {
  res.render('pages/login');
});

app.post('/login', (req, res) => {
  res.redirect('/home');
});

app.get('/register', (req, res) => {
  res.render('pages/register');
});

app.post('/register/add', (req, res) => {

});

app.get('/home', (req, res) => {
  res.render('pages/home');
});

app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});


module.exports = app.listen(3000);
console.log('Server is listening on port 3000');
