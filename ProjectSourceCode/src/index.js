// ----------------------------------   DEPENDENCIES  ----------------------------------------------
const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const path = require('path');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const axios = require('axios');
const pgp = require('pg-promise')();
const dbConfig = {
  host: 'db',
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};
const db = pgp(dbConfig);

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

function getMovies(title) {
    const localMoviesData = getMoviesLocal(title)

    if (!localMoviesData) {
        getMoviesExternal(title)
    } else {
        return localMoviesData
    }
}

function getMoviesLocal(title) {
    const query = `select * from Movies where MoviesTitle like $1`
    const values = [title]

    db.one(query, values)
      .then(data => { console.log(data) })
      .catch(error => { console.log(error) })
}

function getMoviesExternal(title) {
    var moviesData = []

    axios({
        url: `https://api.themoviedb.org/3/search/movie`,
        method: `GET`,
        params: {
            query: title,
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

        console.log(moviesData)
    }))
      .catch(error => console.log(error))
}
app.get('/login', (req, res) => {
  res.render('pages/login');
});

app.listen(3000);
console.log('Server is listening on port 3000');
