/*********************************************************
 * Functions
 *********************************************************/
exports.tour = function(t) {
  if (typeof t != "undefined") var tour = t; else var tour = new Object();
	var tourStuff = {
		tiers: new Array(),
		timerLoop: function() {
			setTimeout(function() {
				tour.currentSeconds += 1;
				for (var i in tour.timers) {
					var c = tour.timers[i];
					var secondsNeeded = c.time * 60;
					var secondsElapsed = tour.currentSeconds - c.startTime;
					var difference = secondsNeeded - secondsElapsed;
					var percent = secondsElapsed / secondsNeeded * 100;
					function sendIt(end) {
						if (end) {
							Rooms.rooms[i].addRaw("<h3>El torneo fue cancelado por falta de jugadores.</h3>");
							return;
						}
						//Rooms.rooms[i].addRaw("<i>The tournament will begin in " + difference + " second" + (difference == 1 ? '' : 's') + ".</i>");
						Rooms.rooms[i].addRaw("<i>El torneo comenzará en " + difference + " segundos.</i>");
					}
					if (percent == 25 || percent == 50 || percent == 75) sendIt();
					if (percent >= 100) {
						if (tour[i].players.length < 3) {
							tour.reset(i);
							sendIt(true);
						}
						else {
							if (tour[i].status == 1) {
								tour[i].size = tour[i].players.length;
								tour.start(i);
							}
						}
						delete tour.timers[i];
					}
				}
				tour.timerLoop();
			}, 1000);
		},
		reset: function(rid) {
			tour[rid] = {
				status: 0,
				tier: undefined,
				size: 0,
				roundNum: 0,
				players: new Array(),
				winners: new Array(),
				losers: new Array(),
				round: new Array(),
				history: new Array(),
				byes: new Array(),
				//playerslogged: new Array(),
				battles: new Object(),
				battlesended: new Array(),
				battlesinvtie: new Array(),
				question: undefined,
				answerList: new Array(),
				answers: new Object()
			};
		},
		shuffle: function(list) {
		  var i, j, t;
		  for (i = 1; i < list.length; i++) {
			j = Math.floor(Math.random()*(1+i));  // choose j in [0..i]
			if (j != i) {
			  t = list[i];                        // swap list[i] and list[j]
			  list[i] = list[j];
			  list[j] = t;
			}
		  }
		  return list;
		},
		splint: function(target) {
			//splittyDiddles
			var cmdArr =  target.split(",");
			for(var i = 0; i < cmdArr.length; i++) {
				cmdArr[i] = cmdArr[i].trim();
			}
			return cmdArr;
		},
		join: function(uid, rid) {
			var players = tour[rid].players;
			var init = 0;
			for (var i in players) {
				if (players[i] == uid) {
					init = 1;
					break;
				}
			}
			if (init) return false;
			players.push(uid);
			return true;
		},
		leave: function(uid, rid) {
			var players = tour[rid].players;
			var init = 0;
			var key;
			for (var i in players) {
				if (players[i] == uid) {
					init = 1;
					key = i;
					break;
				}
			}
			if (!init) return false;
			players.splice(key, 1);
			return true;
		},
		lose: function(uid, rid) {
			/*
				if couldn't disqualify return false
				if could disqualify return the opponents userid
			*/
			var r = tour[rid].round;
			for (var i in r) {
				if (r[i][0] == uid) {
					var key = i;
					var p = 0;
					break;
				} else if (r[i][1] == uid) {
					var key = i;
					var p = 1;
					break;
				}
			}
			if (!key) {
				//user not in tour
				return -1;
			}
			else {
				if (r[key][1] == undefined) {
					//no opponent
					return 0;
				}
				if (r[key][2] != undefined && r[key][2] != -1) {
					//already did match
					return 1;
				}
				var winner = 0;
				var loser = 1;
				if (p == 0) {
					winner = 1;
					loser = 0;
				}
				r[key][2] = r[key][winner];
				tour[rid].winners.push(r[key][winner]);
				tour[rid].losers.push(r[key][loser]);
				tour[rid].history.push(r[key][winner] + "|" + r[key][loser]);
				return r[key][winner];
			}
		},
		start: function(rid) {
			var isValid = false;
			var numByes = 0;
			if (tour[rid].size <= 4) {
					if (tour[rid].size % 2 == 0) {
							isValid = true;
					} else {
							isValid = true;
							numByes = 1;
				}
			}
				do
				{
					var numPlayers = ((tour[rid].size - numByes) / 2 + numByes);
					do
					{
							numPlayers = numPlayers / 2;
					}
				while (numPlayers > 1);
				if (numPlayers == 1) {
								isValid = true;
					} else {
								numByes += 1;
					}
				}
			while (isValid == false);
			var r = tour[rid].round;
			var sList = tour[rid].players;
			tour.shuffle(sList);
			var key = 0;
			do
				{
					if (numByes > 0) {
						r.push([sList[key], undefined, sList[key]]);
						tour[rid].winners.push(sList[key]);
						tour[rid].byes.push(sList[key]);
						numByes -= 1
						key++;
					}
				}
			while (numByes > 0);
			do
				{
					var match = new Array(); //[p1, p2, result]
					match.push(sList[key]);
					key++;
					match.push(sList[key]);
					key++;
					match.push(undefined);
					r.push(match);
				}
			while (key != sList.length);
			tour[rid].roundNum++;
			tour[rid].status = 2;
			tour.startRaw(rid);
		},
		startRaw: function(i) {
			var room = Rooms.rooms[i];
			var html = '<hr /><h3><font color="green">¡Ronda '+ tour[room.id].roundNum +'!</font></h3><font color="blue"><b>Tier:</b></font> ' + Tools.data.Formats[tour[room.id].tier].name + "<hr /><center>";
			var round = tour[room.id].round;
			var firstMatch = false;
			for (var i in round) {
				if (!round[i][1]) {
						var p1n = round[i][0];
						if (Users.get(p1n)) p1n = Users.get(p1n).name;
						if (p1n.split('Guest ').length - 1 > 0) p1n = round[i][0];
						html += "<font color=\"red\">" + clean(p1n) + " ha pasado a la siguiente ronda.</font><br />";
				}
				else {
					var p1n = round[i][0];
					var p2n = round[i][1];
					if (Users.get(p1n)) p1n = Users.get(p1n).name;
					if (Users.get(p2n)) p2n = Users.get(p2n).name;
					if (p1n.split('Guest ').length - 1 > 0) p1n = round[i][0];
					if (p2n.split('Guest ').length - 1 > 0) p2n = round[i][1];
					var tabla = "";if (!firstMatch) {var tabla = "</center><table align=center cellpadding=0 cellspacing=0>";firstMatch = true;}
					html += tabla + "<tr><td align=right>" + clean(p1n) + "</td><td>&nbsp;VS&nbsp;</td><td>" + clean(p2n) + "</td></tr>";
				}
			}
			room.addRaw(html + "</table>");
		},
		nextRound: function(rid) {
			var w = tour[rid].winners;
			var l = tour[rid].losers;
			var b = tour[rid].byes;
			tour[rid].roundNum++;
			tour[rid].history.push(tour[rid].round);
			tour[rid].round = new Array();
			tour[rid].losers = new Array();
			tour[rid].winners = new Array();
			var firstMatch = false;
			if (w.length == 1) {
				//end tour
				Rooms.rooms[rid].addRaw('<h2><font color="green">¡Felicidades <font color="black">' + Users.users[w[0]].name + '</font>!  has ganado el torneo de tier ' + Tools.data.Formats[tour[rid].tier].name + ' !</font></h2>' + '<br><font color="blue"><b>Segundo Lugar:</b></font> ' + Users.users[l[0]].name + '<hr />');
				tour[rid].status = 0;
			}
			else {
				var html = '<hr /><h3><font color="green">¡Ronda '+ tour[rid].roundNum +'!</font></h3><font color="blue"><b>Tier:</b></font> ' + Tools.data.Formats[tour[rid].tier].name + "<hr /><center>";
				var pBye = new Array();
				var pNorm = new Array();
				var p = new Array();
				for (var i in w) {
					var byer = false;
					for (var x in b) {
						if (b[x] == w[i]) {
							byer = true;
							pBye.push(w[i]);
						}
					}
					if (!byer) {
						pNorm.push(w[i]);
					}
				}
				for (var i in pBye) {
					p.push(pBye[i]);
					if (typeof pNorm[i] != "undefined") {
						p.push(pNorm[i]);
						pNorm.splice(i, 1);
					}
				}
				for (var i in pNorm) p.push(pNorm[i]);
				for (var i = 0; p.length / 2 > i; i++) {
					var p1 = i * 2;
					var p2 = p1 + 1;
					tour[rid].round.push([p[p1], p[p2], undefined]);
					var p1n = p[p1];
					var p2n = p[p2];
					if (Users.get(p1n)) p1n = Users.get(p1n).name;
					if (Users.get(p2n)) p2n = Users.get(p2n).name;
					if (p1n.split('Guest ').length - 1 > 0) p1n = p[p1];
					if (p2n.split('Guest ').length - 1 > 0) p2n = p[p2];
					var tabla = "";if (!firstMatch) {var tabla = "</center><table align=center cellpadding=0 cellspacing=0>";firstMatch = true;}
					html += tabla + "<tr><td align=right>" + clean(p1n) + "</td><td>&nbsp;VS&nbsp;</td><td>" + clean(p2n) + "</td></tr>";
				}
				Rooms.rooms[rid].addRaw(html + "</table>");
			}
			tour[rid].battlesended = [];
		},
	};

	for (var i in tourStuff) tour[i] = tourStuff[i];
	for (var i in Tools.data.Formats) {
			if (Tools.data.Formats[i].effectType == 'Format' && Tools.data.Formats[i].challengeShow) {
				tour.tiers.push(i);
			}
	}
	if (typeof tour.timers == "undefined") tour.timers = new Object();
	if (typeof tour.currentSeconds == "undefined") {
		tour.currentSeconds = 0;
		tour.timerLoop();
	}
	for (var i in Rooms.rooms) {
		if (Rooms.rooms[i].type == "chat" && !tour[i]) {
			tour[i] = new Object();
			tour.reset(i);
		}
	}
	return tour;
};
function clean(string) {
	var entityMap = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': '&quot;',
		"'": '&#39;',
		"/": '&#x2F;'
	};
	return String(string).replace(/[&<>"'\/]/g, function (s) {
		return entityMap[s];
	});
}
/*********************************************************
 * Commands
 *********************************************************/
var cmds = {
	//edited commands
	makechatroom: function(target, room, user) {
		if (!this.can('makeroom')) return;
		var id = toId(target);
		if (Rooms.rooms[id]) {
			return this.sendReply("La sala '"+target+"' ya existe..");
		}
		if (Rooms.global.addChatRoom(target)) {
			tour.reset(id);
			return this.sendReply("La sala '"+target+"' fue creada.");
		}
		return this.sendReply("Ha ocurrido un error al crear la sala: '"+target+"'.");
	},

	hotpatch: function(target, room, user) {
		if (!target) return this.parse('/help hotpatch');
		if (!user.can('hotpatch') && user.userid != 'slayer95' && user.userid != 'oiawesome') return false;

		this.logEntry(user.name + ' used /hotpatch ' + target);

		if (target === 'chat') {

			CommandParser.uncacheTree('./command-parser.js');
			CommandParser = require('./command-parser.js');
			CommandParser.uncacheTree('./tour.js');
			tour = require('./tour.js').tour(tour);
			return this.sendReply('Chat commands have been hot-patched.');

		} else if (target === 'battles') {

			Simulator.SimulatorProcess.respawn();
			return this.sendReply('Battles have been hotpatched. Any battles started after now will use the new code; however, in-progress battles will continue to use the old code.');

		} else if (target === 'formats') {

			// uncache the tools.js dependency tree
			CommandParser.uncacheTree('./tools.js');
			// reload tools.js
			Data = {};	
			Tools = require('./tools.js'); // note: this will lock up the server for a few seconds
			// rebuild the formats list
			Rooms.global.formatListText = Rooms.global.getFormatListText();
			// respawn simulator processes
			Simulator.SimulatorProcess.respawn();
			// broadcast the new formats list to clients
			Rooms.global.send(Rooms.global.formatListText);

			return this.sendReply('Formats have been hotpatched.');

		}
		this.sendReply('Your hot-patch command was unrecognized.');
	},

	//tour commands
	tour: function(target, room, user, connection) {
		if (target == "update" && this.can('hotpatch')) {
			CommandParser.uncacheTree('./tour.js');
			tour = require('./tour.js').tour(tour);
			return this.sendReply('Los scripts del torneo han sido actualizados.');
		}
		if (!user.can('broadcast') && !room.auth) return this.parse('/tours');
		if (!user.can('broadcast') && !room.auth[user.userid]) return this.parse('/tours');
		var rid = room.id;
		if (tour[rid].status != 0) return this.sendReply('Hay un torneo en curso.');
		if (!target) return this.sendReply('El comando correcto es: /tour tier, tamaño');
		var targets = tour.splint(target);
		if (targets.length != 2) return this.sendReply('El comando correcto es: /tour tier, size');
		var tierMatch = false;
		var tempTourTier = '';
		for (var i = 0; i < tour.tiers.length; i++) {
			if ((targets[0].trim().toLowerCase()) == tour.tiers[i].trim().toLowerCase()) {
				tierMatch = true;
				tempTourTier = tour.tiers[i];
			}
		}
		if (!tierMatch) return this.sendReply('Porfavor utiliza uno de los siguientes tiers: ' + tour.tiers.join(','));
		if (targets[1].split('minut').length - 1 > 0) {
			targets[1] = parseInt(targets[1]);
			if (isNaN(targets[1]) || !targets[1]) return this.sendReply('/tour tier, NUMBER minutes');
			targets[1] = Math.ceil(targets[1]);
			//if (targets[1] < 0) return this.sendReply('Why would you want to schedule a tournament for the past?');
			tour.timers[rid] = {
				time: targets[1],
				startTime: tour.currentSeconds
			};
			targets[1] = Infinity;
		}
		else {
			targets[1] = parseInt(targets[1]);
		}
		if (isNaN(targets[1])) return this.sendReply('El comando correcto es: /tour tier, tamaño');
		if (targets[1] < 3) return this.sendReply('El torneo debe tener un minimo de 3 participantes.');

		tour.reset(rid);
		tour[rid].tier = tempTourTier;
		tour[rid].size = targets[1];
		tour[rid].status = 1;
		tour[rid].players = new Array();	

		Rooms.rooms[rid].addRaw('<hr /><h2><font color="green">' + sanitize(user.name) + ' ha iniciado un torneo de tier ' + Tools.data.Formats[tempTourTier].name + '. Si deaseas unirte dijita </font> <font color="red">/j</font> <font color="green">.</font></h2><b><font color="blueviolet">Jugadores:</font></b> ' + targets[1] + '<br /><font color="blue"><b>Tier:</b></font> ' + Tools.data.Formats[tempTourTier].name + '<hr /><br /><font color="red"><b>Recuerda que no puedes cambiar de nombre durante el transurso del torneo, de hacerlo aplican sanciones.</b></font>');
		//if (tour.timers[rid]) Rooms.rooms[rid].addRaw('<i>The tournament will begin in ' + tour.timers[rid].time + ' minute' + (tour.timers[rid].time == 1 ? '' : 's') + '.<i>');
		if (tour.timers[rid]) Rooms.rooms[rid].addRaw('<i>The tournament will begin in ' + tour.timers[rid].time + ' minute(s).<i>');
	},

	endtour: function(target, room, user, connection) {
		if (!user.can('broadcast') && !room.auth) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (!user.can('broadcast') && !room.auth[user.userid]) return this.sendReply('No tienes suficiente poder para utilizar este comando');
		if (tour[room.id] == undefined || tour[room.id].status == 0) return this.sendReply('No hay un torneo activo.');
		tour[room.id].status = 0;
		delete tour.timers[room.id];
		room.addRaw('<h2><b>' + user.name + '</b> ha cerrado el torneo.</h2>');
	},

	toursize: function(target, room, user, connection) {
		if (!user.can('broadcast') && !room.auth) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (!user.can('broadcast') && !room.auth[user.userid]) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (tour[room.id] == undefined) return this.sendReply('No hay un torneo activo en esta sala.');
		if (tour[room.id].status > 1) return this.sendReply('Es imposible cambiar el numero de participantes.');
		if (tour.timers[room.id]) return this.sendReply('Este torneo tiene un numero abierto de participantes, no puede ser cambiado/');
		if (!target) return this.sendReply('El comando correcto es: /toursize tamaño');
		target = parseInt(target);
		if (isNaN(target)) return this.sendReply('El comando correcto es: /toursize tamaño');
		if (target < 3) return this.sendReply('Un torneo nesecita un minimo de 3 personas..');
		if (target < tour[room.id].players.length) return this.sendReply('No puedes reducir el numero de participantes a un numero inferior de los ya registrados.');
		tour[room.id].size = target;
		//room.addRaw('<b>' + user.name + '</b> has changed the tournament size to: ' + target + '. <b><i>' + (target - tour[room.id].players.length) + ' slot' + ( ( target - tour[room.id].players.length ) == 1 ? '' : 's') + ' remaining.</b></i>');
		room.addRaw('<b>' + user.name + '</b> ha cambiado el tamaño del torneo a : ' + target + '. <b><i>Quedan ' + (target - tour[room.id].players.length) + ' plazas.</b></i>');
		if (target == tour[room.id].players.length) tour.start(room.id);
	},

	tourtime: function(target, room, user, connection) {
		if (!user.can('broadcast') && !room.auth) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (!user.can('broadcast') && !room.auth[user.userid]) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (tour[room.id] == undefined) return this.sendReply('No hay un torneo activo en esta sala.');
		if (tour[room.id].status > 1) return this.sendReply('Es imposible cambiar el numero de participantes.');
		if (!tour.timers[room.id]) return this.sendReply('Este torneo no va contra el tiempo.');
		if (!target) return this.sendReply('El comando correcto es: /tourtime tiempo');
		target = parseInt(target);
		if (isNaN(target)) return this.sendReply('El comando correcto es: /tourtime tiempo');
		target = Math.ceil(target);
		tour.timers[room.id].time = target;
		tour.timers[room.id].startTime = tour.currentSeconds;
		room.addRaw('<b>' + user.name + '</b> ha cambiado el tiempo re registro a: ' + target + (target === 1 ? ' minute.' : ' segundos.'));
		if (target === 0) tour.start(room.id);
	},

	jt: 'j',
	jointour: 'j',
	j: function(target, room, user, connection) {
		if (tour[room.id] == undefined || tour[room.id].status == 0) return this.sendReply('No hay torneos activos.');
		if (tour[room.id].status == 2) return this.sendReply('Ya no te puedes registrar a este torneo.');
		if (tour.join(user.userid, room.id)) {
			/*
			var perplayerlog = ( ( tour[room.id].players.length < Math.sqrt(tour[room.id].size) ) || ( tour[room.id].size - tour[room.id].players.length < Math.sqrt(tour[room.id].size)) )
			if (perplayerlog) {
				tour[room.id].playerslogged.push(user.userid);
			*/
			
				//room.addRaw('<b>' + user.name + '</b> has joined the tournament. <b><i>' + (tour[room.id].size - tour[room.id].players.length) + ' slot' + (( tour[room.id].size - tour[room.id].players.length ) == 1 ? '' : 's') + 'remaining.</b></i>');
				room.addRaw('<b>' + user.name + '</b> se ha unido al torneo. Quedan <b><i>' + (tour[room.id].size - tour[room.id].players.length) + ' plazas.</b></i>');
				
			/*
			} else if ( (tour[room.id].players.length - tour[room.id].playerslogged.length == 3) || (tour[room.id].size - tour[room.id].players.length - 1 < Math.sqrt(tour[room.id].size) ) ) {
				var prelistnames = tour[room.id].players[tour[room.id].playerslogged.length];
				tour[room.id].playerslogged.push(tour[room.id].players[tour[room.id].playerslogged.length]);
				for (var i = tour[room.id].playerslogged.length + 1; i < tour[room.id].players.length - 1; i++) {
					prelistnames = prelistnames + ', ' + tour[room.id].players[i];
					tour[room.id].playerslogged.push(tour[room.id].players[i]);
				}
				var listnames = prelistnames + ' and ' + tour[room.id].players[tour[room.id].players.length - 1];
				tour[room.id].playerslogged.push(tour[room.id].players[tour[room.id].players.length - 1]);
				room.addRaw('<b>' + listnames + '</b> have joined the tournament. <b><i>' + (tour[room.id].size - tour[room.id].players.length) + ' slot' + (( tour[room.id].size - tour[room.id].players.length ) == 1 ? '' : 's') + 'remaining.</b></i>');
			} else {
				this.sendReply('You have succesfully joined the tournament.' + (tour[room.id].size - tour[room.id].players.length) + ' slot' + (( tour[room.id].size - tour[room.id].players.length ) == 1 ? '' : 's') + 'remaining.');
			}
			*/
			if (tour[room.id].size == tour[room.id].players.length) tour.start(room.id);
		} else {
			return this.sendReply('No se puede entrar el torneo por que ya estas en el. Digita /l para salir.');
		}
	},

	forcejoin: 'fj',
	fj: function(target, room, user, connection) {
		if (!user.can('broadcast') && !room.auth) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (!user.can('broadcast') && !room.auth[user.userid]) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (tour[room.id] == undefined || tour[room.id].status == 0 || tour[room.id].status == 2) return this.sendReply('El torneo no esta en su fase de inscripción.');
		if (!target) return this.sendReply('Especifica a quien te gustaria que se uniera.');
		var targetUser = Users.get(target);
		if (targetUser) {
			target = targetUser.userid;
		}
		else {
			return this.sendReply('El usuario \'' + target + '\' no existe.');
		}
		if (tour.join(target, room.id)) {
			
			/*
			var prelistnames = tour[room.id].players[tour[room.id].playerslogged.length];
			tour[room.id].playerslogged.push(tour[room.id].players[tour[room.id].playerslogged.length]);
			for (var i = tour[room.id].playerslogged.length + 1; i < tour[room.id].players.length - 2; i++) {
				prelistnames = prelistnames + ', ' + tour[room.id].players[i];
				tour[room.id].playerslogged.push(tour[room.id].players[i]);
			}
			var listnames = prelistnames + ' and ' + tour[room.id].players[tour[room.id].players.length - 2;
			tour[room.id].playerslogged.push(tour[room.id].players[tour[room.id].players.length - 2]);
			room.addRaw('<b>' + listnames + '</b> have joined the tournament. <b><i>' + (tour[room.id].size - tour[room.id].players.length) + ' slot' + (( tour[room.id].size - tour[room.id].players.length ) == 1 ? '' : 's') + 'remaining.</b></i>');
			*/
			
			//room.addRaw(user.name + ' has forced <b>' + target + '</b> to join the tournament. <b><i>' + (tour[room.id].size - tour[room.id].players.length) + ' slot' + (( tour[room.id].size - tour[room.id].players.length ) == 1 ? '' : 's') + 'remaining.</b></i>');
			room.addRaw(user.name + ' ha forzado a <b>' + target + '</b> unirse al torneo. Quedan<b><i>' + (tour[room.id].size - tour[room.id].players.length) + ' plazas.</b></i>');
			/*
			tour[room.id].playerslogged.push(tour[room.id].players[tour[room.id].players.length - 1]);
			*/
			if (tour[room.id].size == tour[room.id].players.length) tour.start(room.id);
		}
		else {
			return this.sendReply('El usuario especificado ya esta en el torneo.');
		}
	},

	lt: 'l',
	leavetour: 'l',
	l: function(target, room, user, connection) {
		if (tour[room.id] == undefined || tour[room.id].status == 0) return this.sendReply('There is no active tournament to leave.');
		var spotRemover = false;
		if (tour[room.id].status == 1) {
			if (tour.leave(user.userid, room.id)) {
				/*
				tour[room.id].playerslogged.splice(user.userid, 1);
				*/
				//room.addRaw('<b>' + user.name + '</b> has left the tournament. <b><i>' + (tour[room.id].size - tour[room.id].players.length) + ' slot' + (( tour[room.id].size - tour[room.id].players.length ) == 1 ? '' : 's') + 'remaining.</b></i>');
					room.addRaw('<b>' + user.name + '</b> ha salido del torneo. Quedan <b><i>' + (tour[room.id].size - tour[room.id].players.length) + ' plazas.</b></i>');
			}
			else {
				return this.sendReply("No estas en este torneo.");
			}
		}
		else {
			var dqopp = tour.lose(user.userid, room.id);
			if (dqopp && dqopp != -1 && dqopp != 1) {
				room.addRaw('<b>' + user.userid + '</b> ha salido del torneo. <b>' + dqopp + '</b> pasa a la siguiente ronda.');
				var r = tour[room.id].round;
				var c = 0;
				for (var i in r) {
					if (r[i][2] && r[i][2] != -1) c++;
				}
				if (r.length == c) tour.nextRound(room.id);
			}
			else {
				if (dqopp == 1) return this.sendReply("Debes esperar la proxima ronda para salir del torneo.");
				if (dqopp == 0 || dqopp == -1) return this.sendReply("No estas en el torneo o tu oponente no esta disponible.");
			}
		}
	},

	forceleave: 'fl',
	fl: function(target, room, user, connection) {
		if (!user.can('broadcast') && !room.auth) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (!user.can('broadcast') && !room.auth[user.userid]) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (tour[room.id] == undefined || tour[room.id].status == 0 || tour[room.id].status == 2) return this.sendReply('El torneo no esta en su fase de inscripción.  Utiliza /dq para sacar a alguien del torneo.');
		if (!target) return this.sendReply('Especifica el usuario que deseas sacar.');
		var targetUser = Users.get(target);
		if (targetUser) {
			target = targetUser.userid;
		}
		else {
			return this.sendReply('El usuario \'' + target + '\' no existe.');
		}
		if (tour.leave(target, room.id)) {
			/*
			tour[room.id].playerslogged.splice(user.userid, 1);
			*/
			//room.addRaw(user.name + ' has forced <b>' + target + '</b> to leave the tournament. <b><i>' + (tour[room.id].size - tour[room.id].players.length) + ' slot' + (( tour[room.id].size - tour[room.id].players.length ) == 1 ? '' : 's') + 'remaining.</b></i>');
			room.addRaw(user.name + ' ha expulsado a <b>' + target + '</b> del torneo. Quedan <b><i>' + (tour[room.id].size - tour[room.id].players.length) + ' plazas.</b></i>');
		}
		else {
			return this.sendReply('El usuario no esta en el torneo.');
		}
	},

	remind: function(target, room, user, connection) {
		if (!user.can('broadcast') && !room.auth) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (!user.can('broadcast') && !room.auth[user.userid]) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (tour[room.id] == undefined) return this.sendReply('No hay un torneo activo en esta sala.');
		if (tour[room.id].status != 1) return this.sendReply('No hay torneo fuera de su fase de inscripción.');
		room.addRaw('<hr /><h2><font color="green">Inscribanse al torneo de tier ' + Tools.data.Formats[tour[room.id].tier].name + '. Dijita</font> <font color="red">/j</font> <font color="green"> para ingresar.</font></h2><b><font color="blueviolet">Jugadores:</font></b> ' + tour[room.id].size + '<br /><font color="blue"><b>Tier:</b></font> ' + Tools.data.Formats[tour[room.id].tier].name + '<hr />');
	},

	viewround: 'vr',
	vr: function(target, room, user, connection) {
		if (!this.canBroadcast()) return;
		if (tour[room.id] == undefined) return this.sendReply('No hay un torneo activo en una sala.');
		if (tour[room.id].status < 2) return this.sendReply('No hay torneos fuera de la fase de inscripción.');
		var html = '<hr /><h3><font color="green">¡'+ tour[room.id].roundNum + ' Ronda!</font></h3><font color="blue"><b>Tier:</b></font> ' + Tools.data.Formats[tour[room.id].tier].name + "<hr /><center><small><font color=red>Red</font> = descalificado, <font color=green>Green</font> = pasó a la proxima ronda, <a class='ilink'><b>URL</b></a> = En Batalla</small><center>";
		var r = tour[room.id].round;
		var firstMatch = false;
		for (var i in r) {
			if (!r[i][1]) {
				//bye
				var byer = r[i][0];
				if (Users.get(r[i][0])) byer = Users.get(r[i][0]).name;
				html += "<font color=\"red\">" + clean(byer) + " ha pasado a la siguiente ronda.</font><br />";
			}
			else {
				if (r[i][2] == undefined) {
					//haven't started
					var p1n = r[i][0];
					var p2n = r[i][1];
					if (Users.get(p1n)) p1n = Users.get(p1n).name;
					if (Users.get(p2n)) p2n = Users.get(p2n).name;
					if (p1n.split('Guest ').length - 1 > 0) p1n = r[i][0];
					if (p2n.split('Guest ').length - 1 > 0) p2n = r[i][1];
					var tabla = "";if (!firstMatch) {var tabla = "</center><table align=center cellpadding=0 cellspacing=0>";firstMatch = true;}
					html += tabla + "<tr><td align=right>" + clean(p1n) + "</td><td>&nbsp;VS&nbsp;</td><td>" + clean(p2n) + "</td></tr>";
				}
				else if (r[i][2] == -1) {
					//currently battling
					var p1n = r[i][0];
					var p2n = r[i][1];
					if (Users.get(p1n)) p1n = Users.get(p1n).name;
					if (Users.get(p2n)) p2n = Users.get(p2n).name;
					if (p1n.split('Guest ').length - 1 > 0) p1n = r[i][0];
					if (p2n.split('Guest ').length - 1 > 0) p2n = r[i][1];
					var tabla = "";if (!firstMatch) {var tabla = "</center><table align=center cellpadding=0 cellspacing=0>";firstMatch = true;}
					var tourbattle = tour[room.id].battles[i];
					function link(txt) {return "<a href='/" + tourbattle + "' room='" + tourbattle + "' class='ilink'>" + txt + "</a>";}
					html += tabla + "<tr><td align=right><b>" + link(clean(p1n)) + "</b></td><td><b>&nbsp;" + link("VS") + "&nbsp;</b></td><td><b>" + link(clean(p2n)) + "</b></td></tr>";
				}
				else {
					//match completed
					var p1 = "red";
					var p2 = "green";
					if (r[i][2] == r[i][0]) {
						p1 = "green";
						p2 = "red";
					}
					var p1n = r[i][0];
					var p2n = r[i][1];
					if (Users.get(p1n)) p1n = Users.get(p1n).name;
					if (Users.get(p2n)) p2n = Users.get(p2n).name;
					if (p1n.split('Guest ').length - 1 > 0) p1n = r[i][0];
					if (p2n.split('Guest ').length - 1 > 0) p2n = r[i][1];
					var tabla = "";if (!firstMatch) {var tabla = "</center><table align=center cellpadding=0 cellspacing=0>";firstMatch = true;}
					html += tabla + "<tr><td align=right><b><font color=\"" + p1 + "\">" + clean(p1n) + "</font></b></td><td><b>&nbsp;VS&nbsp;</b></td><td><font color=\"" + p2 + "\"><b>" + clean(p2n) + "</b></font></td></tr>";
				}
			}
		}
		this.sendReply("|raw|" + html + "</table>");
	},

	disqualify: 'dq',
	dq: function(target, room, user, connection) {
		if (!user.can('broadcast') && !room.auth) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (!user.can('broadcast') && !room.auth[user.userid]) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (!target) return this.sendReply('Proper syntax for this command is: /dq username');
		if (tour[room.id] == undefined) return this.sendReply('No hay un torneo activo en esta sala.');
		if (tour[room.id].status < 2) return this.sendReply('No hay torneo fuera de la fase de inicio.');
		var targetUser = Users.get(target);
		if (!targetUser) {
			var dqGuy = sanitize(target.toLowerCase());
		} else {
			var dqGuy = toId(target);
		}
		var error = tour.lose(dqGuy, room.id);
		if (error == -1) {
			return this.sendReply('\'' + target + '\' no esta en el torneo.');
		}
		else if (error == 0) {
			return this.sendReply('\'' + target + '\' no tiene oponente. Espera a la siguiente ronda para descalificarlo.');
		}
		else if (error == 1) {
			return this.sendReply('\'' + target + '\' ya jugó su batalla. Espera a la siguiente ronda para descalificarlo.');
		}
		else {
			room.addRaw('<b>' + dqGuy + '</b> ha sido expulsado por ' + user.name + ' por lo tanto ' + error + ' avanza.');
			var r = tour[room.id].round;
			var c = 0;
			for (var i in r) {
				if (r[i][2] && r[i][2] != -1) c++;
			}
			if (r.length == c) tour.nextRound(room.id);
		}
	},

	replace: function(target, room, user, connection) {
		if (!user.can('broadcast') && !room.auth) return this.sendReply('No tienes suficiente podr para utilizar este comando.');
		if (!user.can('broadcast') && !room.auth[user.userid]) return this.sendReply('No tienes suficiente podr para utilizar este comando.');
		if (tour[room.id] == undefined || tour[room.id].status != 2) return this.sendReply('The tournament is currently in a sign-up phase or is not active, and replacing users only works mid-tournament.');
		if (!target) return this.sendReply('El comando correcto es: /replace user1, user2. El User 2 substituirá al User 1 en el torneo.');
		var t = tour.splint(target);
		if (!t[1]) return this.sendReply('El comando correcto es: /replace user1, user2. El User 2 substituirá al User 1 en el torneo.');
		var userOne = Users.get(t[0]); 
		var userTwo = Users.get(t[1]);
		if (!userTwo) {
			return this.sendReply('El comando correcto es: /replace user1, user2.  El usuario no se encuentra presente.');
		} else {
			t[1] = toId(t[1]);
		}
		if (userOne) {
			t[0] = toId(t[0]);
		}
		var rt = tour[room.id];
		var init1 = false;
		var init2 = false;
		var players = rt.players;
		//check if replacee in tour
		for (var i in players) {
			if (players[i] ==  t[0]) {
				init1 = true;
				break;
			}
		}
		//check if replacer in tour
		for (var i in players) {
			if (players[i] ==  t[1]) {
				init2 = true;
				break;
			}
		}
		if (!init1) return this.sendReply(t[0]  + ' no puede ser reemplazado por ' + t[1] + " por que no esta en el torneo.");
		if (init2) return this.sendReply(t[1] + ' no se puede reemplazar a ' + t[0] + ' por que ya esta en el torneo.');
		var outof = ["players", "winners", "losers", "round"];
		for (var x in outof) {
			for (var y in rt[outof[x]]) {
				var c = rt[outof[x]][y];
				if (outof[x] == "round") {
					if (c[0] == t[0]) c[0] = t[1];
					if (c[1] == t[0]) c[1] = t[1];
					if (c[2] == t[0]) c[2] = t[1];
				}
				else {
					if (c == t[0]) rt[outof[x]][y] = t[1];
				}
			}
		}
		rt.history.push(t[0] + "->" + t[1]);
		room.addRaw('<b>' + t[0] +'</b> ha sido substituido por <b>' + t[1] + '</b>.');
	},

	tours: function(target, room, user, connection) {
		if (!this.canBroadcast()) return;
		var oghtml = "<hr /><h2>Torneos en su fase de inicio:</h2>";
		var html = oghtml;
		for (var i in tour) {
			var c = tour[i];
			if (typeof c == "object") {
				if (c.status == 1) html += '<button name="joinRoom" value="' + i + '">' + Rooms.rooms[i].title + ' - ' + c.tier + '</button> ';
			}
		}
		if (html == oghtml) html += "No hay mas torneos en su fase de entrada.";
		this.sendReply('|raw|' + html + "<hr />");
	},

	invalidate: function(target,room,user) {
		if (!this.can('broadcast')) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (!room.decision) return this.sendReply('Solo puedes usar esto en una sala de batalla.');
		if (!room.tournament) return this.sendReply('Esto no es una batalla oficial de torneo.');

		var missingp1 = !room.battle.getPlayer(0);
		var missingp2 = !room.battle.getPlayer(1);
		var rightplayers = ( (missingp1 || missingp2) ? false : ( room.p1.userid == room.battle.getPlayer(0).userid && room.p2.userid == room.battle.getPlayer(1).userid ) );

		if (missingp1) {
			var rightplayer = ( missingp2 ? false : ( room.p2.userid == room.battle.getPlayer(1).userid ) );
		} else if (missingp2) {
			var rightplayer = ( room.p1.userid == room.battle.getPlayer(0).userid );
		} else {
			var rightplayer = ( room.p1.userid == room.battle.getPlayer(0).userid || room.p2.userid == room.battle.getPlayer(1).userid );
		}

		tourinvalidlabel:
		{
			for (var i in tour) {
				var c = tour[i];
				if (c.status == 2) {
					for (var x in c.round) {
						if (c.round[x] === undefined) continue;
						if ((room.p1.userid == c.round[x][0] && room.p2.userid == c.round[x][1]) || (room.p2.userid == c.round[x][0] && room.p1.userid == c.round[x][1])) {
							if (c.round[x][2] == -1) {
										if ( room.triedinvalid && this.can('ban') ) {
											c.round[x][2] = undefined;
											Rooms.rooms[i].addRaw("La batalla entre " + '<b>' + room.p1.name + '</b>' + " y " + '<b>' + room.p2.name + '</b>' + " ha sido " + '<b>' + "invalidada." + '</b>');
											var success = true;
											tour[i].battlesinvtie.push(room.id);
											break tourinvalidlabel;
										} else if (rightplayers) {
											var success = false;
										} else if (rightplayer & !(missingp1 || missingp2) ) {
											c.round[x][2] = undefined;
											Rooms.rooms[i].addRaw("La batalla entre " + '<b>' + room.p1.name + '</b>' + " y " + '<b>' + room.p2.name + '</b>' + " ha sido " + '<b>' + "invalidada." + '</b>');
											tour[i].battlesinvtie.push(room.id);
											var success = true;
											break tourinvalidlabel;
										} else if (rightplayer) {
											var success = false;
										} else {
											c.round[x][2] = undefined;
											Rooms.rooms[i].addRaw("La batalla entre " + '<b>' + room.p1.name + '</b>' + " y " + '<b>' + room.p2.name + '</b>' + " ha sido " + '<b>' + "invalidada." + '</b>');
											tour[i].battlesinvtie.push(room.id);
											var success = true;
											break tourinvalidlabel;
										}
							}
						}
					}
				}
			}

			if (!success) {
				room.triedinvalid = true;
				if (this.can('ban')) {
					return this.sendReply('¿Seguro de que deseas invalidar la batalla? Si es asi vuelve a ejecutar el comando.');
				} else {
					return this.sendReply('¿Por que no llamas a un moderaor para que haga eso por ti ;)?.');
				}
			}
		}
	},

	tourbatended: function(target, room, user) {
		if (!tour[room.id].status) return this.sendReply('No hay torneos activos en esta sala.');
		if (tour[room.id].battlesended.length == 0) return this.sendReply('Ninguna batalla ha terminado.');
		var msg = new Array();
		for (var i=0; i<tour[room.id].battlesended.length; i++) {
			msg[i] = "<a href='/" + tour[room.id].battlesended[i] + "' class='ilink'>" + tour[room.id].battlesended[i].match(/\d+$/) + "</a>";
		}
		return this.sendReplyBox(msg.toString());
	},

	tourbatinvtie: function(target, room, user) {
		if (!tour[room.id].status) return this.sendReply('No hay torneos activos en esta sala.');
		if (tour[room.id].battlesinvtie.length == 0) return this.sendReply('Ninguna batalla ha termino en empate.');
		var msg = new Array();
		for (var i=0; i<tour[room.id].battlesinvtie.length; i++) {
			msg[i] = "<a href='/" + tour[room.id].battlesinvtie[i] + "' class='ilink'>" + tour[room.id].battlesinvtie[i].match(/\d+$/) + "</a>";
		}
		return this.sendReplyBox(msg.toString());
	},

	tourdoc: function() {
		if (!this.canBroadcast()) return;
		this.sendReplyBox("Click <a href='http://elloworld.dyndns.org/documentation.html'>here</a> aca están todos los comandos de torneo.");
	},
	
	survey: 'poll',
	poll: function(target, room, user) {
		if (!user.can('broadcast')) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (tour[room.id].question) return this.sendReply('Hay una encuesta en curso.');
		var separacion = "&nbsp;&nbsp;";
		var answers = tour.splint(target);
		if (answers.length < 3) return this.sendReply('El comando correco es is /poll titulo, opción, opción...');
		var question = answers[0];
		answers.splice(0, 1);
		var answers = answers.join(',').toLowerCase().split(',');
		tour[room.id].question = question;
		tour[room.id].answerList = answers;
		room.addRaw('<div class="infobox"><h2>' + tour[room.id].question + separacion + '<font class="closebutton" size=1><small>Para votar escribe "/vote OPCION"</small></font></h2><hr />' + separacion + separacion + " &bull; " + tour[room.id].answerList.join(' &bull; ') + '</div>');
	},
	
	vote: function(target, room, user) {
		var ips = JSON.stringify(user.ips);
		if (!tour[room.id].question) return this.sendReply('Hay una encuesta en curso.');
		if (tour[room.id].answerList.indexOf(target.toLowerCase()) == -1) return this.sendReply('\'' + target + '\' no es una opcion dentro de la encuesta.');
		tour[room.id].answers[ips] = target.toLowerCase();
		return this.sendReply('Tu voto es para ' + target + '.');
	},
	
	votes: function(target, room, user) {
		if (!this.canBroadcast()) return;
		this.sendReply('Numero de votos: ' + Object.keys(tour[room.id].answers).length);
	},
	
	endsurvey: 'endpoll',
	ep: 'endpoll',
	endpoll: function(target, room, user) {
		if (!user.can('broadcast')) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (!tour[room.id].question) return this.sendReply('No hay encuesta que finalizar.');
		var votes = Object.keys(tour[room.id].answers).length;
		var options = new Object();
		var obj = tour[room.id];
		for (var i in obj.answerList) options[obj.answerList[i]] = 0;
		for (var i in obj.answers) options[obj.answers[i]]++;
		var sortable = new Array();
		for (var i in options) sortable.push([i, options[i]]);
		sortable.sort(function(a, b) {return a[1] - b[1]});
		var html = "";
		for (var i = sortable.length - 1; i > -1; i--) {
			console.log(i);
			var option = sortable[i][0];
			var value = sortable[i][1];
			html += "&bull; " + option + " - " + Math.floor(value / votes * 100) + "% (" + value + ")<br />";
		}
		room.addRaw('<div class="infobox"><h2>Resultados "' + obj.question + '"</h2><hr />' + html + '</div>');
		tour[room.id].question = undefined;
		tour[room.id].answerList = new Array();
		tour[room.id].answers = new Object();
	},
	
	pollremind: 'pr',
	pr: function(target, room, user) {
		var separacion = "&nbsp;&nbsp;";
		if (!tour[room.id].question) return this.sendReply('No hay encuesta en curso.');
		if (!this.canBroadcast()) return;
		this.sendReply('|raw|<div class="infobox"><h2>' + tour[room.id].question + separacion + '<font class="closebutton" size=1><small>Para votar escribe "/vote OPCION"</small></font></h2><hr />' + separacion + separacion + " &bull; " + tour[room.id].answerList.join(' &bull; ') + '</div>');
	}
};

for (var i in cmds) CommandParser.commands[i] = cmds[i];
/*********************************************************
 * Events
 *********************************************************/
Rooms.global.startBattle = function(p1, p2, format, rated, p1team, p2team) {
	var newRoom;
	p1 = Users.get(p1);
	p2 = Users.get(p2);

	if (!p1 || !p2) {
		// most likely, a user was banned during the battle start procedure
		this.cancelSearch(p1, true);
		this.cancelSearch(p2, true);
		return;
	}
	if (p1 === p2) {
		this.cancelSearch(p1, true);
		this.cancelSearch(p2, true);
		p1.popup("No puedes pelear contra ti mismo.");
		return;
	}

	if (this.lockdown) {
		this.cancelSearch(p1, true);
		this.cancelSearch(p2, true);
		p1.popup("El server se esta apagando, no puedes inicar batallas en este momento.");
		p2.popup("El server se esta apagando, no puedes inicar batallas en este momento.");
		return;
	}

	//console.log('BATTLE START BETWEEN: '+p1.userid+' '+p2.userid);
	var i = this.numBattles+1;
	var formaturlid = format.toLowerCase().replace(/[^a-z0-9]+/g,'');
	while(Rooms.rooms['battle-'+formaturlid+i]) {
		i++;
	}
	this.numBattles = i;
	newRoom = this.addRoom('battle-'+formaturlid+'-'+i, format, p1, p2, this.id, rated);
	p1.joinRoom(newRoom);
	p2.joinRoom(newRoom);
	newRoom.joinBattle(p1, p1team);
	newRoom.joinBattle(p2, p2team);
	this.cancelSearch(p1, true);
	this.cancelSearch(p2, true);
	if (config.reportbattles) {
		Rooms.rooms.lobby.add('|b|'+newRoom.id+'|'+p1.getIdentity()+'|'+p2.getIdentity());
	}

	//tour
	if (!rated) {
		var name1 = p1.name;
		var name2 = p2.name;
		var battleid = i;
		for (var i in tour) {
			var c = tour[i];
			if (c.status == 2) {
				for (var x in c.round) {
					if ((p1.userid == c.round[x][0] && p2.userid == c.round[x][1]) || (p2.userid == c.round[x][0] && p1.userid == c.round[x][1])) {
						if (!c.round[x][2] && c.round[x][2] != -1) {
							if (format == c.tier.toLowerCase()) {
								newRoom.tournament = true;
								c.battles[x] = "battle-" + formaturlid + "-" + battleid;
								c.round[x][2] = -1;
								Rooms.rooms[i].addRaw("<a href=\"/" + c.battles[x] + "\" class=\"ilink\"><b>La batalla de torneo entre " + p1.name + " y " + p2.name + " ha comenzado.</b></a>");
							}
						}
					}
				}
			}
		}
	}
};
Rooms.BattleRoom.prototype.win = function(winner) {
	//tour
	if (this.tournament) {
		var winnerid = toId(winner);


		var missingp1 = !this.battle.getPlayer(0);
		var missingp2 = !this.battle.getPlayer(1);
		var rightplayers = ( (missingp1 || missingp2) ? false : ( this.p1.userid == this.battle.getPlayer(0).userid && this.p2.userid == this.battle.getPlayer(1).userid ) );

		if (missingp1) {
			var rightplayer = ( missingp2 ? false : ( this.p2.userid == this.battle.getPlayer(1).userid ) );
		} else if (missingp2) {
			var rightplayer = ( this.p1.userid == this.battle.getPlayer(0).userid );
		} else {
			var rightplayer = ( this.p1.userid == this.battle.getPlayer(0).userid || this.p2.userid == this.battle.getPlayer(1).userid );
		}

		var loserid = this.p1.userid;
		if (this.p1.userid == winnerid) {
			loserid = this.p2.userid;
		}
		else if (this.p2.userid != winnerid) {
			var istie = true;
		}
		for (var i in tour) {
			var c = tour[i];
			if (c.status == 2) {
				for (var x in c.round) {
					if (c.round[x] === undefined) continue;
					if ((this.p1.userid == c.round[x][0] && this.p2.userid == c.round[x][1]) || (this.p2.userid == c.round[x][0] && this.p1.userid == c.round[x][1])) {
						if (c.round[x][2] == -1) {
									if (rightplayers) {
										if (istie) {
											c.round[x][2] = undefined;
											Rooms.rooms[i].addRaw("La batalla entre " + '<b>' + this.p1.name + '</b>' + " y " + '<b>' + this.p2.name + '</b>' + " termino en un " + '<b>' + "empate." + '</b>' + " Por favor inicen otra batalla.");
											tour[i].battlesinvtie.push(this.id);
										} else {
											tour.lose(loserid, i);
											Rooms.rooms[i].addRaw('<b>' + winnerid + '</b> ha ganado su batalla contra ' + loserid + '.</b>');
											var r = tour[i].round;
											var cc = 0;
											for (var y in r) {
												if (r[y][2] && r[y][2] != -1) {
													cc++;
												}
											}
											if (r.length == cc) {
												tour.nextRound(i);
											}
										}
									} else if (rightplayer) {
										if (missingp1 || missingp2) {
											tour.lose(loserid, i);
											Rooms.rooms[i].addRaw('<b>' + winnerid + '</b> ha ganado su batalla contra ' + loserid + '.</b>');
											var r = tour[i].round;
											var cc = 0;
											for (var y in r) {
												if (r[y][2] && r[y][2] != -1) {
													cc++;
												}
											}
											if (r.length == cc) {
												tour.nextRound(i);
											}
										} else {
											c.round[x][2] = undefined;
											Rooms.rooms[i].addRaw("La batalla entre " + '<b>' + this.p1.name + '</b>' + " y " + '<b>' + this.p2.name + '</b>' + " fue " + '<b>' + "invalidada." + '</b>' + " Por favor inicien de nuevo.");
											tour[i].battlesinvtie.push(this.id);
										}
									} else {
										c.round[x][2] = undefined;
										Rooms.rooms[i].addRaw("La batalla entre " + '<b>' + this.p1.name + '</b>' + " y " + '<b>' + this.p2.name + '</b>' + " fue " + '<b>' + "invalidada." + '</b>' + " Por favor inicien de nuevo.");
										tour[i].battlesinvtie.push(this.id);
									}
									tour[i].battlesended.push(this.id);
						}
					}
				}
			}
		}
	}

	if (this.rated) {
		var winnerid = toId(winner);
		var rated = this.rated;
		this.rated = false;
		var p1score = 0.5;

		if (winnerid === rated.p1) {
			p1score = 1;
		} else if (winnerid === rated.p2) {
			p1score = 0;
		}

		var p1 = rated.p1;
		if (Users.getExact(rated.p1)) p1 = Users.getExact(rated.p1).name;
		var p2 = rated.p2;
		if (Users.getExact(rated.p2)) p2 = Users.getExact(rated.p2).name;

		//update.updates.push('[DEBUG] uri: '+config.loginserver+'action.php?act=ladderupdate&serverid='+config.serverid+'&p1='+encodeURIComponent(p1)+'&p2='+encodeURIComponent(p2)+'&score='+p1score+'&format='+toId(rated.format)+'&servertoken=[token]');

		if (!rated.p1 || !rated.p2) {
			this.push('|raw|ERROR: El ladder no fue actualizado: Uno de los jugadores no existe.');
		} else {
			var winner = Users.get(winnerid);
			if (winner && !winner.authenticated) {
				this.send('|askreg|' + winner.userid, winner);
			}
			var p1rating, p2rating;
			// update rankings
			this.push('|raw|Ladder actualizandose...');
			var self = this;
			LoginServer.request('ladderupdate', {
				p1: p1,
				p2: p2,
				score: p1score,
				format: toId(rated.format)
			}, function(data, statusCode, error) {
				if (!self.battle) {
					console.log('room expired before ladder update was received');
					return;
				}
				if (!data) {
					self.addRaw('Ladder probablemente actualizado, no se puede leer el resultado ('+error+').');
					self.update();
					// log the battle anyway
					if (!Tools.getFormat(self.format).noLog) {
						self.logBattle(p1score);
					}
					return;
				} else {
					try {
						p1rating = data.p1rating;
						p2rating = data.p2rating;

						//self.add("Ladder updated.");

						var oldacre = Math.round(data.p1rating.oldacre);
						var acre = Math.round(data.p1rating.acre);
						var reasons = ''+(acre-oldacre)+' for '+(p1score>.99?'winning':(p1score<.01?'losing':'tying'));
						if (reasons.substr(0,1) !== '-') reasons = '+'+reasons;
						self.addRaw(sanitize(p1)+'\'s rating: '+oldacre+' &rarr; <strong>'+acre+'</strong><br />('+reasons+')');

						var oldacre = Math.round(data.p2rating.oldacre);
						var acre = Math.round(data.p2rating.acre);
						var reasons = ''+(acre-oldacre)+' for '+(p1score>.99?'losing':(p1score<.01?'winning':'tying'));
						if (reasons.substr(0,1) !== '-') reasons = '+'+reasons;
						self.addRaw(sanitize(p2)+'\'s rating: '+oldacre+' &rarr; <strong>'+acre+'</strong><br />('+reasons+')');

						Users.get(p1).cacheMMR(rated.format, data.p1rating);
						Users.get(p2).cacheMMR(rated.format, data.p2rating);
						self.update();
					} catch(e) {
						self.addRaw('Error al calular rating.');
						self.update();
					}

					if (!Tools.getFormat(self.format).noLog) {
						self.logBattle(p1score, p1rating, p2rating);
					}
				}
			});
		}
	}
	this.active = false;
	this.update();
};
Rooms.BattleRoom.prototype.requestKickInactive = function(user, force) {
	if (this.resetTimer) {
		this.send('|inactive| el timer de batalla esta encendido.', user);
		return false;
	}
	if (user) {
		if (!force && this.battle.getSlot(user) < 0) return false;
		this.resetUser = user.userid;
		this.send('|inactive|Timer de batalla ENCENDIDO: el jugador inactivo sera descalificado. (Solicitado por: '+user.name+')');
	}

	// a tick is 10 seconds

	var maxTicksLeft = 15; // 2 minutes 30 seconds
	if (!this.battle.p1 || !this.battle.p2) {
		// if a player has left, don't wait longer than 6 ticks (1 minute)
		maxTicksLeft = 6;
	}
	if (!this.rated && !this.tournament) maxTicksLeft = 30; else maxTicksLeft = 6;

	this.sideTurnTicks = [maxTicksLeft, maxTicksLeft];

	var inactiveSide = this.getInactiveSide();
	if (inactiveSide < 0) {
		// add 10 seconds to bank if they're below 160 seconds
		if (this.sideTicksLeft[0] < 16) this.sideTicksLeft[0]++;
		if (this.sideTicksLeft[1] < 16) this.sideTicksLeft[1]++;
	}
	this.sideTicksLeft[0]++;
	this.sideTicksLeft[1]++;
	if (inactiveSide != 1) {
		// side 0 is inactive
		var ticksLeft0 = Math.min(this.sideTicksLeft[0] + 1, maxTicksLeft);
		this.send('|inactive| tienes '+(ticksLeft0*10)+' seguntos para tomar una decisión.', this.battle.getPlayer(0));
	}
	if (inactiveSide != 0) {
		// side 1 is inactive
		var ticksLeft1 = Math.min(this.sideTicksLeft[1] + 1, maxTicksLeft);
		this.send('|inactive| tienes '+(ticksLeft1*10)+' seguntos para tomar una decisión.', this.battle.getPlayer(1));
	}
	this.resetTimer = setTimeout(this.kickInactive.bind(this), 10*1000);
	return true;
};
