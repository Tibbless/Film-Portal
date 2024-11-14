CREATE TABLE Client (
    ClientId Serial PRIMARY KEY,
    Username VARCHAR(45) NOT NULL,
    Password VARCHAR(300) NOT NULL,
    Email VARCHAR(45) NOT NULL,
    FirstName VARCHAR(45),
    LastName VARCHAR(45),
    UserImage VARCHAR(45)
);

CREATE TABLE Movie (
    MovieId SERIAL PRIMARY KEY,
    MovieTitle VARCHAR(45) NOT NULL,
    MovieDescription TEXT,
    ReleaseDate DATE,
    MovieImage VARCHAR(300)
);

CREATE TABLE Review (
    ReviewId Serial PRIMARY KEY,
    ReviewBody TEXT NOT NULL,
    MovieRating INT NOT NULL,
    ReviewRating INT,
    ClientId INT NOT NULL REFERENCES Client(ClientId) ON DELETE CASCADE,
    MovieId INT NOT NULL REFERENCES Movie(MovieId) ON DELETE CASCADE
);

CREATE TABLE Comment (
    CommentId SERIAL PRIMARY KEY,
    CommentBody TEXT NOT NULL,
    ReviewId INT NOT NULL REFERENCES Review(ReviewId) ON DELETE CASCADE,
    ClientId INT NOT NULL REFERENCES Client(ClientId) ON DELETE CASCADE
);


CREATE TABLE Client_friend (
    ClientId INT NOT NULL REFERENCES Client(ClientId) ON UPDATE CASCADE ON DELETE CASCADE,
    FriendId INT NOT NULL REFERENCES Client(ClientId) ON DELETE CASCADE,

    CONSTRAINT Client_friend_relation PRIMARY KEY (ClientId, FriendID)
);

\dt;
