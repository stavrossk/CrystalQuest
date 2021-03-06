(function () {
  if (typeof CrystalQuest === "undefined") {
    window.CrystalQuest = {};
  }

  var Game = window.CrystalQuest.Game = function (xDim, yDim, ctx, audioCtx) {
    this.X_DIM = xDim;
    this.Y_DIM = yDim;
    this.ctx = ctx;
    this.audioCtx = audioCtx;
    this.timeBonus = 0;
    this.counter = 0;
    // this.database = {};
    this.database = new Firebase("https://luminous-inferno-7080.firebaseio.com/web/data");

    $(document).keyup(function (event) {
      event.preventDefault();
      if (event.keyCode === 13) {
        $('#start').click();
        $('#next-level').click();
      }
    }.bind(this))
  }

  Game.prototype.getHighScores = function(cb) {
    var scores = this.database.child('highScores');
    scores.orderByChild('score').limitToLast(10).once("value", function(snapshot) {
      var val = snapshot.val();
      var result = [];
      for (var key in val) {
        result.push(val[key]);
      }
      result.sort(function(a, b) {
        return a.score > b.score;
      });

      if (cb) {
        cb(result);
      }
    }, function (errorObject) {
      console.log("The read failed: " + errorObject.code);
    });
    return scores;
  }

  Game.prototype.bindKeyHandlers = function(wave) {
    var ship = wave.ship
    key('up', function(e) { e.preventDefault(); ship.power([0,-2]) });
    key('down', function(e) { e.preventDefault(); ship.power([0,2]) });
    key('right', function (e) { e.preventDefault(); ship.power([2,0]) });
    key('left', function (e) { e.preventDefault(); ship.power([-2,0]) });
    key('w', function(e) { e.preventDefault(); ship.power([0,-2]) });
    key('s', function(e) { e.preventDefault(); ship.power([0,2]) });
    key('d', function (e) { e.preventDefault(); ship.power([2,0]) });
    key('a', function (e) { e.preventDefault(); ship.power([-2,0]) });
    key('r', function(e) { e.preventDefault(); ship.power([0,0]) });
    key('space', function(e) { e.preventDefault(); ship.fireBullet() });
  };

  Game.prototype.playSound = function(sound) {
    var file = Game.SOUNDS[sound];
    var request = new XMLHttpRequest();
    request.open('GET', file, true);
    request.responseType = 'arraybuffer';

    var _this = this;
    request.onload = function() {
      var audioData = request.response;
      _this.audioCtx.decodeAudioData(audioData, function(buffer) {
        var src = _this.audioCtx.createBufferSource();

        src.buffer = buffer;
        src.connect(this.audioCtx.destination);
        src.start(0);
      });
    }

    request.send();
  };

  Game.prototype.stop = function() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  };

  Game.prototype.win = function() {
    var timeTaken = $('#time').text();
    var seconds = (parseInt(timeTaken.split(":")[0]) / 60) + parseInt(timeTaken.split(":")[1]);
    var bonus = Math.floor((30 - seconds) * 500);
    this.timeBonus = bonus > 0 ? bonus : 0;

    if (this.counter === Game.WAVES.length - 1) {
      this.counter = 0;
      var total = this.timeBonus + parseInt($('#score').text());
      var content = "<h2>YOU WON!!!</h2><p>Wave number " + $('#wave').text() + " completed</p><p>Time taken: " + timeTaken + "</p><p>Time bonus: " + this.timeBonus + "</p><h3>Total Score: " + total + " </h3><button id='start'>Play Again?</button><button id='start-menu'>Exit</button>"
      $('#controls').append(content);
      var _this = this;
      this.getHighScores(function(scores) {
        if (scores.length < 10 || scores[0].score < score) {
          _this.enterHighScore(total);
        }
      });
    } else {
      var content = "<p>Wave number " + $('#wave').text() + " completed</p><p>Time taken: " + timeTaken + "</p><p>Time bonus: " + this.timeBonus + "</p><br><button id='next-level'>Next Level</button>";
      $('#controls').append(content);
    }
  };

  Game.prototype.lose = function() {
    this.counter = 0;
    var score = parseInt($('#score').text());
    var _this = this;
    this.getHighScores(function(scores) {
      if (scores.length < 10 || scores[0].score < score) {
        _this.enterHighScore(score);
        _this.showHighScores();
      } else {
        var content = "<p style='color:white;'>Game Over</p><br><button id='start'>Restart</button><button id='start-menu'>Exit</button>"
        $('#controls').append(content)
      }
    });
  };

  Game.prototype.showIntro = function () {
    $('#status-bar').empty();
    var str = "<h1>CRYSTAL QUEST</h1><br><button id='start'>Start</button><br><button id='high-scores'>High Scores</button><br><br><t style='font-weight:bold;'>Press <code>enter</code> or click Start to start</t>"
    $('#controls').append(str);
  };

  Game.prototype.showHighScores = function () {
    $('#status-bar').empty();
    var str = "<h1>HIGH SCORES</h1><ul></ul><button id='start-menu'>Back to Start Menu</button>"
    $('#controls').append(str);
    this.getHighScores(function(scores) {
      scores.forEach(function(score) {
        var scoreStr = "<li>" + score['name'] + "&nbsp; &nbsp; &nbsp;" + score['score'] + "</li>"
        $('ul').prepend(scoreStr);
      });
    });
  };

  Game.prototype.enterHighScore = function (score) {
    var name = prompt("You got a new high score! Enter your initials: ");
    if ((name !== "") && (name !== null)) {
      var scoresRef = this.database.child('highScores');
      scoresRef.push({ name: name.slice(0,3), score: score });
    }
  }

  Game.prototype.startLevel = function () {
    $('#controls').empty();

    if (this.counter === 0) {
      $('#status-bar').empty();
      $('#status-bar').append('<ul><li>Score: <t id="score">0</t></li><li id="lives"><img src="img/life.png" width="25"><img src="img/life.png" width="25"><t id="life-count"></t></li><li id="bombs"><img src="img/bomb.png" height="15"><img src="img/bomb.png" height="15"><img src="img/bomb.png" height="15"><t id="bomb-count"></t></li><li>Wave: <t id="wave">1</t></li><li>Time: <t id="time">00:00</t></li>');
    } else {
      $('#wave').html(this.counter + 1)
      var score = parseInt($('#score').text()) + this.timeBonus;
      $('#score').html(score);
      this.ctx.clearRect(0, 0, this.X_DIM, this.Y_DIM);
    }
    var wave = new window.CrystalQuest.Wave(this.X_DIM, this.Y_DIM, this, Game.WAVES[this.counter]);
    var _this = this;

    this.interval = setInterval( function () {
      var step = wave.step();
      if (step === "lost" ) {
        _this.endLevel(wave, 'lost');
      } else if (step === "won") {
        _this.endLevel(wave, 'won');
      } else if (step === "quit") {
        _this.endLevel(wave, 'quit');
      } else {
        wave.draw(this.ctx);
      }
    }, 10);

    this.counter++;
    this.bindKeyHandlers(wave);
  };

  Game.prototype.endLevel = function (wave, ending) {
    this.stop();
    this.ctx.clearRect(0, 0, this.X_DIM, this.Y_DIM);

    wave.aliens.forEach( function (alien) {
      wave.remove(wave.aliens, alien);
    }.bind(wave))
    wave.aliens = [];

    if (ending === 'lost' || ending === 'quit') {
      this.lose();
    } else {
      this.win();
    }
  };

  Game.prototype.run = function () {
    this.showIntro();

    $('#controls').on('click', '#start', this.startLevel.bind(this));
    $('#controls').on('click', '#next-level', this.startLevel.bind(this));

    $('#controls').on('click', '#high-scores', function () {
      $('#controls').empty();
      this.ctx.clearRect(0, 0, this.X_DIM, this.Y_DIM);
      this.showHighScores();
    }.bind(this))

    $('#controls').on('click', "#start-menu", function () {
      $('#controls').empty();
      this.ctx.clearRect(0, 0, this.X_DIM, this.Y_DIM);
      this.showIntro();
    }.bind(this))

  };

  Game.WAVE_ONE = {
    numAsteroids: 0,
    numBombs: 0,
    numCrystals: 10,
    numBasicAliens: 4,
    numBigCrystals: 0,
    numPoints: 0,
    // numAsteroids: 10,
    // numBombs: 1,
    // numCrystals: 30,
    // numCShooterAliens: 6,
    // numBasicAliens: 2,
    // numShooterAliens: 4,
    // numComputerAliens: 2,
    // numBigCrystals: 0,
    // numPoints: 1
  };

  Game.WAVE_TWO = {
    numAsteroids: 0,
    numBombs: 0,
    numCrystals: 12,
    numBasicAliens: 1,
    numBigCrystals: 1,
    numPoints: 0
  };

  Game.WAVE_THREE = {
    numAsteroids: 2,
    numBombs: 0,
    numCrystals: 15,
    numShooterAliens: 2,
    numBigCrystals: 1,
    numPoints: 0
  };

  Game.WAVE_FOUR = {
    numAsteroids: 5,
    numBombs: 0,
    numCrystals: 15,
    numShooterAliens: 4,
    numBigCrystals: 0,
    numPoints: 2
  };

  Game.WAVE_FIVE = {
    numAsteroids: 5,
    numBombs: 1,
    numCrystals: 20,
    numBigCrystals: 0,
    numPoints: 0
  };

  Game.WAVE_SIX = {
    numAsteroids: 10,
    numBombs: 1,
    numCrystals: 20,
    numBlobAliens: 3,
    numBasicAliens: 1,
    numBigCrystals: 1,
    numPoints: 1
  };

  Game.WAVE_SEVEN = {
    numAsteroids: 10,
    numBombs: 0,
    numCrystals: 25,
    numComputerAliens: 1,
    numBigCrystals: 1,
    numPoints: 3
  };

  Game.WAVE_EIGHT = {
    numAsteroids: 10,
    numBombs: 1,
    numCrystals: 25,
    numComputerAliens: 5,
    numBasicAliens: 1,
    numBigCrystals: 0,
    numPoints: 3
  };

  Game.WAVE_NINE = {
    numAsteroids: 10,
    numBombs: 0,
    numCrystals: 30,
    numCShooterAliens: 6,
    numBigCrystals: 1,
    numPoints: 2
  };

  Game.WAVE_TEN = {
    numAsteroids: 10,
    numBombs: 1,
    numCrystals: 30,
    numCShooterAliens: 6,
    numBasicAliens: 2,
    numShooterAliens: 4,
    numComputerAliens: 2,
    numBigCrystals: 0,
    numPoints: 1
  };

  Game.WAVE_ELEVEN = {
    numAsteroids: 10,
    numBombs: 1,
    numCrystals: 30,
    numFourLegsAliens: 2,
    numBigCrystals: 1,
    numPoints: 1
  };

  Game.WAVE_TWELVE = {
    numAsteroids: 10,
    numBombs: 1,
    numCrystals: 30,
    numBlobAliens: 2,
    numBasicAliens: 1,
    numFourLegsAliens: 5,
    numCShooterAliens: 1,
    numShooterAliens: 1,
    numBigCrystals: 0,
    numPoints: 2
  };

  Game.WAVE_THIRTEEN = {
    numAsteroids: 10,
    numBombs: 2,
    numCrystals: 30,
    numXShooterAliens: 4,
    numBigCrystals: 0,
    numPoints: 2
  };

  Game.WAVE_FOURTEEN = {
    numAsteroids: 10,
    numBombs: 2,
    numCrystals: 30,
    numXShooterAliens: 13,
    numBasicAliens: 2,
    numFourLegsAliens: 2,
    numShooterAliens: 1,
    numBlobAliens: 2,
    numCShooterAliens: 1,
    numBigCrystals: 0,
    numPoints: 1
  };

  // Wave fifteen seeding is temporary. More levels to come.
  Game.WAVE_FIFTEEN = {
    numAsteroids: 15,
    numBombs: 2,
    numCrystals: 30,
    numBlobAliens: 7,
    numBasicAliens: 2,
    numXShooterAliens: 6,
    numComputerAliens: 5,
    numFourLegsAliens: 2,
    numCShooterAliens: 5,
    numShooterAliens: 2,
    numBigCrystals: 2,
    numPoints: 5
  };

  Game.WAVES = [
    Game.WAVE_ONE,
    Game.WAVE_TWO,
    Game.WAVE_THREE,
    Game.WAVE_FOUR,
    Game.WAVE_FIVE,
    Game.WAVE_SIX,
    Game.WAVE_SEVEN,
    Game.WAVE_EIGHT,
    Game.WAVE_NINE,
    Game.WAVE_TEN,
    Game.WAVE_ELEVEN,
    Game.WAVE_TWELVE,
    Game.WAVE_THIRTEEN,
    Game.WAVE_FOURTEEN,
    Game.WAVE_FIFTEEN
  ];

  Game.SOUNDS = {
    bullet: 'sounds/laser.wav',
    wall: 'sounds/reverbLaser.wav',
    crystal: 'sounds/crystal.wav',
    success: 'sounds/success.mp3',
    levelSuccess: 'sounds/levelSuccess.wav',
    tristeza: 'sounds/tristeza.wav',
  };

})();
