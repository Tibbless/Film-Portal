INSERT INTO Client (Username, Password, Email, FirstName, LastName, UserImage)
VALUES ('Eskam', 
	'5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
	'etsk5997@colorado.edu',
	'Ethan',
	'Skamarock',
	'https://avatars.githubusercontent.com/u/48768892?s=400&u=af251595b83ce2640ea7a35c238d889bb3619e65&v=4');

INSERT INTO Client (Username, Password, Email)
VALUES ('hater123', 
	'5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
	'hater@hate.com');

INSERT INTO Movie (MovieTitle, MovieDescription, ReleaseDate, MovieImage)
VALUES (
	'Oddity',
	'After the brutal murder of her twin sister, Darcy goes after those responsible by using haunted items as her tools for revenge.',
	'2024-07-19',
	'https://www.themoviedb.org/t/p/w600_and_h900_bestv2/3Z9c1tbUhP0QruRjczPHnbx3U2D.jpg'
);

INSERT INTO Review (ReviewBody, MovieRating, ReviewRating, ClientId, MovieId)
VALUES (
	'Very spooky, great watch',
	5,
	0,
	1,
	1);

INSERT INTO Comment (CommentBody, ReviewId, ClientId)
VALUES (
	'Bad review, bad movie',
	1,
	2);

INSERT INTO Client_friend
VALUES (
	1,
	2);

INSERT INTO Client_friend
VALUES (
	2,
	1);
