var mergeObj = function(o1, o2) {
	for(var attr in o2) {
		if(typeof o2[attr] == "object") {
			mergeObj( o1[attr], o2[attr]);
		} else {
			o1[attr] = o2[attr];
		}
	}
}

var GameManager = ( function() {
	var GameManager = function GameManager() {
		this.listofgames = [];
		this.loadedGames = {};

	}

	GameManager.prototype.getGame = function(gameid, done) {
		if(gameid in this.loadedGames) {
			return this.loadedGames[gameid];
		} else {
			t = this;
			this.loadedGames[gameid] = new Game();
			session.getAServer().sendReq("get_game", {gameid:gameid},
				function(r) {
					t.loadedGames[gameid].update(r.game)
					done();
				});
			return this.loadedGames[gameid];
		}
	}

	GameManager.prototype.fetchGameList = function(callback) {
		t = this;
		session.getAServer().sendReq("listgames", {}, function(r) {
			t.listofgames = r.games;
			callback(t.listofgames)
		});
	}

	return GameManager;
})();


var Game = ( function() {

	var Game = function Game() {
	}

	Game.prototype.update = function(data) {
		mergeObj(this, data);
	}

	//Game.prototype.join = function(

	return Game;
})();

gamemanager = new GameManager();
