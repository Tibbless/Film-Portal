CREATE TABLE Client (
    ClientId Serial PRIMARY KEY,
    Username VARCHAR(45) NOT NULL,
    Password VARCHAR(300) NOT NULL,
    Email VARCHAR(45) NOT NULL,
    FirstName VARCHAR(45),
    LastName VARCHAR(45),
    UserImage VARCHAR(45)
    -- CONSTRAINT fk_user
    --     FOREIGN KEY(FriendId)
    --         REFERENCES User(UserId)
);

CREATE TABLE Movie (
    MovieId SERIAL PRIMARY KEY,
    MovieTitle VARCHAR(45) NOT NULL,
    MovieDescription TEXT,
    MovieImage VARCHAR(300)
);

CREATE TABLE Review (
    ReviewId Serial PRIMARY KEY,
    ReviewBody TEXT NOT NULL,
    MovieRating INT NOT NULL,
    ReviewRating INT,
    ClientId INT NOT NULL REFERENCES Client(ClientId),
    -- CONSTRAINT fk_user
    --     FOREIGN KEY(UserId)
    --         REFERENCES User(UserId),
    MovieId INT NOT NULL REFERENCES Movie(MovieId)
    -- CONSTRAINT fk_movie
    --     FOREIGN KEY(MovieId)
    --         REFERENCES Movie(MovieId)
);

CREATE TABLE Comment (
    CommentId SERIAL PRIMARY KEY,
    CommentBody TEXT NOT NULL,
    ReviewId INT NOT NULL REFERENCES Review(ReviewId)
    -- CONSTRAINT fk_review
    --    FOREIGN KEY(ReviewId)
    --        REFERENCES Review(ReviewId)
);


