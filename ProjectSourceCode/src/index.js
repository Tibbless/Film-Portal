const axios = require('axios');

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
