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
