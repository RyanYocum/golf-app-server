var Hapi = require('hapi');

var server = new Hapi.Server();
server.connection({port: 3000});

var Sequelize = require('sequelize');

var sequelize = new Sequelize('golf', 'postgres', 'postgres', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false
});

var User = sequelize.define('user', {
	username: Sequelize.STRING,
	email: Sequelize.STRING,
	password: Sequelize.STRING,
	handicap: Sequelize.FLOAT,
	winnings: Sequelize.FLOAT
});

var Course = sequelize.define('course', {
	name: Sequelize.STRING,
	rating: Sequelize.FLOAT,
	slope: Sequelize.FLOAT,
	par:  { type : Sequelize.ARRAY(Sequelize.FLOAT), defaultValue: null},
	handicap:  { type : Sequelize.ARRAY(Sequelize.FLOAT), defaultValue: null}
});

var Score = sequelize.define('score', {
	score: { type : Sequelize.ARRAY(Sequelize.FLOAT), defaultValue: null},
	playernumber: Sequelize.FLOAT
})

var Game = sequelize.define('game', {
	inprogress: { type: Sequelize.BOOLEAN}
});

User.belongsToMany(Score, {as: 'individualgame', through: 'individualgame'});
Score.belongsToMany(User, {as: 'individualgame', through: 'individualgame'});
Score.belongsTo(Game, {as: 'game'});
// Game.belongsToMany(Score, {as: 'player', through: 'player'});
Game.belongsTo(Course, {as: 'course'});


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
			email: request.payload.email,
			password: request.payload.password,
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

server.start(function () {
    console.log('Server running at:', server.info.uri);
});