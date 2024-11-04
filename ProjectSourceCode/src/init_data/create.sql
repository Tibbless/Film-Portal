

CREATE TABLE User (
    UserId Serial PRIMARY KEY,
    Username VARCHAR(45) NOT NULL,
    Password VARCHAR(300) NOT NULL,
    Email VARCHAR(45) NOT NULL,
    FirstName VARCHAR(45),
    LastName VARCHAR(45),
    UserImage VARCHAR(45),
    CONSTRAINT fk_user
        FOREIGN KEY(FriendId)
            REFERENCES User(UserId)
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
    CONSTRAINT fk_user
        FOREIGN KEY(UserId)
            REFERENCES User(UserId),
    CONSTRAINT fk_movie
        FOREIGN KEY(MovieId)
            REFERENCES Movie(MovieId)
);

CREATE TABLE Comment (
    CommentId SERIAL PRIMARY KEY,
    CommentBody TEXT NOT NULL,
    CONSTRAINT fk_review
        FOREIGN KEY(ReviewId)
            REFERENCES Review(ReviewId)
);


