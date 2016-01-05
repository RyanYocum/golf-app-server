var Hapi = require('hapi');
var port = process.env.PORT || 3000;
var server = new Hapi.Server();
server.connection({port: port});

var Sequelize = require('sequelize');

var sequelize = new Sequelize(process.env.DBDB || 'golf', process.env.DBUSER || 'postgres', process.env.DBPW || 'postgres', {
  host: process.env.DBHOST || 'localhost',
  dialect: 'postgres',
  // logging: false
});

var User = sequelize.define('user', {
	username: Sequelize.STRING,
	token: Sequelize.STRING,
	gamesWon: Sequelize.FLOAT,
	gamesPlayed: Sequelize.FLOAT,
	lastPlayed: Sequelize.DATEONLY,
	winnings: Sequelize.FLOAT,
	handicap: Sequelize.FLOAT
});

var Course = sequelize.define('course', {
	county: Sequelize.STRING,
	city: Sequelize.STRING,
	name: Sequelize.STRING,
	rating: Sequelize.FLOAT,
	slope: Sequelize.FLOAT,
	par:  { type : Sequelize.ARRAY(Sequelize.FLOAT), defaultValue: null},
	hdcp:  { type : Sequelize.ARRAY(Sequelize.FLOAT), defaultValue: null},
	parL:  { type : Sequelize.ARRAY(Sequelize.FLOAT), defaultValue: null},
	hdcpL:  { type : Sequelize.ARRAY(Sequelize.FLOAT), defaultValue: null},
});

var Score = sequelize.define('score', {
	score: { type : Sequelize.ARRAY(Sequelize.FLOAT), defaultValue: null},
	playernumber: Sequelize.FLOAT,
	winnings: Sequelize.FLOAT
});

var Game = sequelize.define('game', {
	inprogress: { type: Sequelize.BOOLEAN}
});

var Guest = sequelize.define('guest', {
  name: Sequelize.STRING,
});

var GuestScore = sequelize.define('guestscore', {
	score: { type : Sequelize.ARRAY(Sequelize.FLOAT), defaultValue: null},
	playernumber: Sequelize.FLOAT,
	winnings: Sequelize.FLOAT
});

User.hasMany(Score);
User.belongsToMany(Course, {as: 'favorites', through: 'favorites'});
Course.belongsToMany(User, {as: 'favorites', through: 'favorites'});
// Score.belongsTo(User);
// Score.belongsToMany(User, {as: 'individualgame', through: 'individualgame'});
Score.belongsToMany(Game, {as: 'individualgame', through: 'individualgame'});
Game.belongsToMany(Score, {as: 'individualgame', through: 'individualgame'});
Game.belongsTo(Course);


sequelize.sync()


server.register(require('inert'), function (err) {
    if (err) {
        throw err;
    }
    server.route({
        method: 'GET',
        path: '/',
        handler: function (request, reply) {
            reply.file('./index.html');
        }
    });
});

server.route({
	method: 'POST',
	path: '/createuser',
	handler: function (request, reply) {
		User.findOrCreate({where: {username: request.payload.username}, defaults: {
			gamesWon: 0,
			gamesPlayed: 0,
			handicap: request.payload.handicap,
			winnings: 0
		}}).spread( function (user, created) {
			if (created === false) {
				reply('user already exists');
			}
			else {
				reply('user created');
			}
		})
	}
});

server.route({
	method: 'POST',
	path: '/createcourse',
	handler: function (request, reply) {
		Course.findOrCreate({where: {name: request.payload.name}, defaults: {
			par: request.payload.par,
			handicap: request.payload.handicap
		}}).spread(function (course, created) {
			if (!created) {
				reply('Already exists');
			}
			else {
				reply(course);
			}
		})
	}
});

server.route({
	method: 'GET',
	path: '/users',
	handler: function (request, reply) {
		User.findAll().done(function (users) {
			reply(users);
		})
	}
});

server.route({
	method: 'GET',
	path: '/user/{user}',
	handler: function (request, reply) {
		User.findOne({where: {username: request.params.user}}, {include: [{model: Course, as: 'favorites'}]}).then( function (user) {
			reply(user);
		})
	}
});

server.route({
	method: "GET",
	path: "/courses",
	handler: function (request, reply) {
		Course.findAll().done(function (courses) {
			reply(courses);
		})
	}
});

server.route({
	method: "GET",
	path: "/coursenames",
	handler: function (request, reply) {
		Course.findAll({attributes: ['name']}).done(function (courses) {
			reply(courses);
		})
	}
});

server.route({
	method: "GET",
	path: "/coursenames/{location*1}",
	handler: function (request, reply) {
		var location = request.params.location
		Course.findAll({where: {county: location}, attributes: ['name', 'city'], order: 'name ASC'}).then(function (courses) {
			reply(courses);
		})
	}
});

server.route({
	method: "GET",
	path: "/coursenames/{location*2}",
	handler: function (request, reply) {
		var location = request.params.location.split('/');
		Course.findAll({where: {county: location[0], city: location[1]}, attributes: ['name'], order: 'name ASC'}).then(function (courses) {
			reply(courses);
		})
	}
});

server.route({
	method: "GET",
	path: "/coursesbycity/{city}",
	handler: function (request, reply) {
		var city = request.params.city;
		Course.findAll({where: {city: {$iLike: city}}, attributes: ['name'], order: 'name ASC'}).then(function (courses) {
			reply(courses);
		})
	}
});

server.route({
	method: "GET",
	path: "/course/{name*}",
	handler: function (request, reply) {
		Course.findOne({where: {name: {$iLike: request.params.name}}}).done(function (course) {
			reply(course);
		})
	}
});

server.route({
	method: 'POST',
	path: '/submitGame',
	handler: function (request, reply) {
		Course.findOne({where: {name: request.payload.course}}).then(function (course) {
			Game.create({courseId: course.id}).then(function (game) {
				game.setCourse(course).then(function () {
          var scoreArray1 = [];
          var scoreArray2 = [];
          var scoreArray3 = [];
          var scoreArray4 = [];
          for (var i = 1; i < 19; i++) {
            var temp = 'h'+ i;
            scoreArray1.push(request.payload.player1score[temp]);
            if (request.payload.player2score) {
              scoreArray2.push(request.payload.player2score[temp]);
            }
            if (request.payload.player3score.h1) {
              scoreArray3.push(request.payload.player3score[temp]);
            }
            if (request.payload.player4score.h1) {
              scoreArray4.push(request.payload.player4score[temp]);
            }
          }
					// for (var i = 0; i < request.payload.user.length; i++) {

						//putting in a for loop caused async issues, loop finishes before user finding ever happens

						Score.create({playernumber: 0, score: scoreArray1, winnings: request.payload.player1Results}).then(function (score) {
							score.addIndividualgame(game);
							game.addIndividualgame(score);
							User.findOne({where: {username: request.payload.player1}}).then(function (user) {
								user.addScore(score)
							})
						})
						Score.create({playernumber: 1, score: scoreArray2, winnings: request.payload.player2Results}).then(function (score) {
							score.addIndividualgame(game);
							// game.addIndividualgame(score);
							User.findOrCreate({where: {username: 1}}).then(function (user) {
								user.addScore(score)
							})
						})
            if (scoreArray3[0]) {
  						Score.create({playernumber: 2, score: scoreArray3, winnings: request.payload.player3Results}).then(function (score) {
  							score.addIndividualgame(game);
  							// game.addIndividualgame(score);
  							User.findOne({where: {id: 2}}).then(function (user) {
  								user.addScore(score)
  							})
  						})
            }
            if(scoreArray4[0]){
  						Score.create({playernumber: 3, score: scoreArray4, winnings: request.payload.player4Results}).then(function (score) {
  							score.addIndividualgame(game);
  							// game.addIndividualgame(score);
  							User.findOne({where: {id: 3}}).then(function (user) {
  								user.addScore(score)
  							})
  						})
            }

					// }
					reply('Game Created');
				})
			})
		})
	}
});

server.route({
	method: 'POST',
	path: '/addFavorite',
	handler: function (request, reply) {
		User.findOne({where: {username: request.payload.username}}).then(function (user) {
			Course.findOne({where: {name: request.payload.course}}).then(function (course) {
				user.addFavorite(course).then(function () {
					reply('added favorite');
				})
			})
		})
	}
});

server.route({
	method: 'GET',
	path: '/getFavorites/{name}',
	handler: function (request, reply) {
		console.log('gettin favorites')
		User.findOne({where: {username: {$iLike: request.params.name}}, include: [{model: Course, as: 'favorites', attributes: ['name']}]}).then(function (user) {
			reply(user.favorites);
		})
	}
});

server.route({
	method: 'GET',
	path: '/getAllGames',
	handler: function (request, reply) {
		Game.findAll({include: [{model: Course, on: 'courseId'}]}).then(function (games) {
			console.log(games);
			reply(games)
		})
	}
});

server.route({
	method: 'GET',
	path: '/getGamesFromUser',
	handler: function (request, reply) {
		User.findOne({where: {id: 1}, include: [{model: Score, as: 'userId'}]}).then(function (user) {
			console.log(user);
			reply(user);
		})
	}
});

server.route({
	method: 'POST',
	path: '/postHoleScore',
	handler: function (request, reply) {
		Game.findOne({where: {}})
	}
});

server.start(function () {
    console.log('Server running at:', server.info.uri);
});
