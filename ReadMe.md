# Film Portal

**CSCI 3308: Recitation 011**

**Team: Movie Buffs**
  

## Description: Film Portal is a social media site for reviewing movies. Users can search for movies, post their reviews, and comment on reviews. 
  

## Contirbutors:

- Nolan Tibbles

- Calvin Schaller

- Oscar Bender-Stone

- Ethan Skamarock

  

## Tech Stack
- Frontend:
    - Bootstrap
    - Handlebars

- Backend:
    - Node
    - Express
    - PG-Promise
    - Postgres
    - Bcryptjs

- Development:
    - Testing: chai + mocha.


## Software Prerequisites
- [Docker-Compose](https://docs.docker.com/compose/install/)
    - Note: depending on your system, you may need to run Docker with elevated privileges (e.g., sudo on Unix).

- Browsers: works best with Chromium-based browsers or Firefox
  

## Instructions to Run Locally


1. In [docker-compose.yaml](ProjectSourceCode/docker-compose.yaml),
make sure `command` under the `web` service is `'npm start run'`.

2. In the root of this project, run:
    
    `cd ProjectSourceCode && docker-compose up`.
  
  

## How to Run Tests

1. In [docker-compose.yaml](ProjectSourceCode/docker-compose.yaml),
change `command` under the `web` service to: 

    `'npm start test'`.

2. In the root of this project, run:
    
    `cd ProjectSourceCode && docker-compose up`.

## Link to Deployed Application:
