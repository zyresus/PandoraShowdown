/*********************************************************
 * Functions
 *********************************************************/
exports.tour = function(t) {
  if (typeof t != "undefined") var tour = t; else var tour = new Object();
	var tourStuff = {
		tiers: new Array(),
		timerLoop: function() {
			setTimeout(function() {
				tour.currentSeconds++;
				for (var i in tour.timers) {
					var c = tour.timers[i];
					var secondsNeeded = c.time * 60;
					var secondsElapsed = tour.currentSeconds - c.startTime;
					var difference = secondsNeeded - secondsElapsed;
					var fraction = secondsElapsed / secondsNeeded;
					function sendIt(end) {
						if (end) {
							Rooms.rooms[i].addRaw("<h3>El torneo fue cancelado por falta de jugadores.</h3>");
							return;
						}
						Rooms.rooms[i].addRaw("<i>El torneo comenzara en " + difference + " segundo" + (difference == 1 ? '' : 's') + ".</i>");
					}
					if (fraction == 0.25 || fraction == 0.5 || fraction == 0.75) sendIt();
					if (fraction >= 1) {
						if (tour[i].players.length < 3) {
							tour.reset(i);
							sendIt(true);
						}
						else {
							if (tour[i].status == 1) {
								tour[i].size = tour[i].players.length;
								tour.reportdue(Rooms.rooms[i]);
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
				playerslogged: new Array(),
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
			for (var i = 0; i < cmdArr.length; i++) cmdArr[i] = cmdArr[i].trim();
			return cmdArr;
		},
		username: function(uid) {
			if (Users.get(uid)) {
				var n = Users.get(uid).name;
				if (toId(n) != uid) return uid;
				return n;
			} else {
				return uid;
			}
		},
		maxauth: function(user) {
			if (user.can('forcewin') || user.userid === 'slayer95' || user.userid === 'chslayer95') return true;
			return false;
		},
		highauth: function(user) {
			//room auth is not enough
			if (!config.tourhighauth && user.can('ban')) return true;
			if (config.tourhighauth && config.groupsranking.indexOf(user.group) >= config.groupsranking.indexOf(config.tourhighauth)) return true;
			return false;
		},
		midauth: function(user, room) {
			if (!config.tourmidauth && user.can('broadcast')) return true;
			if (config.tourmidauth && config.groupsranking.indexOf(user.group) >= config.groupsranking.indexOf(config.tourmidauth)) return true;
			if (room.auth && room.auth[user.userid]) return true;
			return false;
		},
		lowauth: function(user, room) {
			if (!config.tourlowauth && user.can('broadcast')) return true;
			if (config.tourlowauth && config.groupsranking.indexOf(user.group) >= config.groupsranking.indexOf(config.tourlowauth)) return true;
			if (room.auth && room.auth[user.userid]) return true;
			return false;
		},
		remsg: function(apparent, useronly) {
			if (!isFinite(apparent)) return '';
			if (apparent === 0) return ' Empieza la primera ronda del torneo.';
			if (useronly) return (' Queda ' + apparent + ' plaza' + ( apparent === 1 ? '' : 's') + '.' );
			return (' Queda <b><i>' + apparent + ' plaza' + ( apparent === 1 ? '' : 's') + '.</b></i>' );
		},
		reportdue: function(room, connection) {
			var trid = tour[room.id];
			var remslots = trid.size - trid.players.length;
			if (trid.players.length == trid.playerslogged.length) {
				if (connection) connection.sendTo(room, 'Nada que reportar ahora.');
			} else if (trid.players.length == trid.playerslogged.length + 1) {
				var someid = trid.players[trid.playerslogged.length];
				room.addRaw('<b>' + tour.username(someid) + '</b> se ha unido al torneo.' + tour.remsg(remslots));
				trid.playerslogged.push(trid.players[trid.playerslogged.length]);
			} else {
				var someid = trid.players[trid.playerslogged.length];
				var prelistnames = '<b>' + tour.username(someid) + '</b>';
				for (var i = trid.playerslogged.length + 1; i < trid.players.length - 1; i++) {
					someid = trid.players[i];
					prelistnames = prelistnames + ', <b>' + tour.username(someid) + '</b>';
				}
				someid = trid.players[trid.players.length - 1];
				var listnames = prelistnames + ' y <b>' + tour.username(someid) + '</b>';
				room.addRaw(listnames + ' se han unido al torneo.' + tour.remsg(remslots));
				
				trid.playerslogged.push(trid.players[trid.playerslogged.length]);
				for (var i = trid.playerslogged.length; i < trid.players.length - 1; i++) { //the length is disturbed by the push above
					trid.playerslogged.push(trid.players[i]);
				}
				trid.playerslogged.push(trid.players[trid.players.length - 1]);
			}
		},
		joinable: function(uid, rid) {
			var players = tour[rid].players;
			for (var i=0; i<players.length; i++) {
				if (players[i] == uid) return false;
			}
			if (!config.tourallowalts){
				for (var i=0; i<players.length; i++) {
					if (players[i] == uid) return false;
				}
				for (var i=0; i<players.length; i++) {
					for (var j=0; j<Users.get(uid).getAlts().length; j++) {
						if (players[i] == toId(Users.get(uid).getAlts()[j])) return false;
					}
				}
				for (var i=0; i<players.length; i++) {
					for (var j in Users.get(uid).prevNames) {
						if (players[i] == toId(j)) return false;
					}
				}
				for (var i=0; i<players.length; i++) {	
					for (var j=0; j<Users.get(uid).getAlts().length; j++) {
						for (var k in Users.get(Users.get(uid).getAlts()[j]).prevNames) {
							if (players[i] == toId(k)) return false;
						}
					}
				}

			}
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
			do {
				var numPlayers = ((tour[rid].size - numByes) / 2 + numByes);
				do {
					numPlayers = numPlayers / 2;
				}
				while (numPlayers > 1);
				if (numPlayers == 1) isValid = true; else numByes++;
			}
			while (isValid == false);
			var r = tour[rid].round;
			var sList = tour[rid].players;
			tour.shuffle(sList);
			var key = 0;
			do {
				if (numByes > 0) {
					r.push([sList[key], undefined, sList[key]]);
					tour[rid].winners.push(sList[key]);
					tour[rid].byes.push(sList[key]);
					numByes -= 1
					key++;
				}
			}
			while (numByes > 0);
			do {
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
			var html = '<hr /><h3><font color="green">Ronda '+ tour[room.id].roundNum +'!</font></h3><font color="blue"><b>FORMATO:</b></font> ' + Tools.data.Formats[tour[room.id].tier].name + "<hr /><center>";
			var round = tour[room.id].round;
			var firstMatch = false;
			for (var i in round) {
				if (!round[i][1]) {
						var p1n = tour.username(round[i][0]);
						if (p1n.substr(0, 6) === 'Guest ') p1n = round[i][0];
						html += "<font color=\"red\">" + clean(p1n) + " ha pasado a la siguiente ronda.</font><br />";
				}
				else {
					var p1n = tour.username(round[i][0]);
					var p2n = tour.username(round[i][1]);
					if (p1n.substr(0, 6) === 'Guest ') p1n = round[i][0];
					if (p2n.substr(0, 6) === 'Guest ') p2n = round[i][1];
					var tabla = ""; if (!firstMatch) {var tabla = "</center><table align=center cellpadding=0 cellspacing=0>";firstMatch = true;}
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
				Rooms.rooms[rid].addRaw('<h2><font color="green">Felicidades <font color="black">' + Users.users[w[0]].name + '</font>! has ganado el torneo de formato ' + Tools.data.Formats[tour[rid].tier].name + ' !</font></h2>' + '<br><font color="blue"><b>Segundo Lugar:</b></font> ' + Users.users[l[0]].name + '<hr />');
				tour[rid].status = 0;
			} else {
				var html = '<hr /><h3><font color="green">Ronda '+ tour[rid].roundNum +'!</font></h3><font color="blue"><b>Formato:</b></font> ' + Tools.data.Formats[tour[rid].tier].name + "<hr /><center>";
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
				for (var i = 0; i < p.length / 2; i++) {
					var p1 = i * 2;
					var p2 = p1 + 1;
					tour[rid].round.push([p[p1], p[p2], undefined]);
					var p1n = tour.username(p[p1]);
					var p2n = tour.username(p[p2]);
					if (p1n && p1n.substr(0, 6) === 'Guest ') p1n = p[p1];
					if (p2n && p2n.substr(0, 6) === 'Guest ') p2n = p[p2];
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
	//lazy commands update
	redirect: 'redir',
	redir: function (target, room, user, connection) {
		if (!target) return this.parse('/help redir');
		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		var targetRoom = Rooms.get(target) || Rooms.get(toId(target));
		if (!targetRoom) {
			return this.sendReply("La sala '" + target + "' no existe.");
		}
		if (!this.can('warn', targetUser, room)) return false;
		if (!targetUser || !targetUser.connected) {
			return this.sendReply('El usuario '+this.targetUsername+' no esta presente.');
		}
		var roomName = (targetRoom.isPrivate)? 'una sala privada' : 'la sala ' + targetRoom.title;
		if (!Rooms.rooms[room.id].users[targetUser.userid]) {
			return this.sendReply('El usuario '+this.targetUsername+' no esta en la sala ' + room.title + '.');
		}
		this.addModCommand(targetUser.name + ' fue llevado a ' + roomName + ' por ' + user.name + '.');
		targetUser.leaveRoom(room);
		targetUser.joinRoom(target);
	},
	
	deleteroom: 'deregisterchatroom',
	deletechatroom: 'deregisterchatroom',
	deregisterchatroom: function(target, room, user) {
		if (!this.can('makeroom')) return;
		var id = toId(target);
		if (!id) return this.parse('/help deregisterchatroom');
		var targetRoom = Rooms.get(id);
		if (!targetRoom) return this.sendReply("La sala '"+id+"' no existia.");
		target = targetRoom.title || targetRoom.id;
		if (Rooms.global.deregisterChatRoom(id)) {
			this.sendReply("La sala '"+target+"' ha sido eliminada del registro.");
			this.sendReply("Sera borrada en el proximo reinicio del servidor.");
			return;
		}
		return this.sendReply("La sala '"+target+"' no estaba registrada.");
	},

	dexsearch: function (target, room, user) {
                if (!this.canBroadcast()) return;
 
                if (!target) return this.parse('/help dexsearch');
                var targets = target.split(',');
                var target;
                var moves = {}, tiers = {}, colours = {}, ability = {}, gens = {}, types = {};
                var count = 0;
                var all = false;
                var output = 10;
 
                for (var i in targets) {
                        target = Tools.getMove(targets[i]);
                        if (target.exists) {
                                if (!moves.count) {
                                        count++;
                                        moves.count = 0;
                                };
                                if (moves.count === 4) {
                                        return this.sendReply('Especifique un maximo de 4 ataques.');
                                };
                                moves[target] = 1;
                                moves.count++;
                                continue;
                        };
 
                        target = Tools.getAbility(targets[i]);
                        if (target.exists) {
                                if (!ability.count) {
                                        count++;
                                        ability.count = 0;
                                };
                                if (ability.count === 1) {
                                        return this.sendReply('Especifique solo una habilidad.');
                                };
                                ability[target] = 1;
                                ability.count++;
                                continue;
                        };
 
                        target = targets[i].trim().toLowerCase();
                        if (['fire','water','electric','dragon','rock','fighting','ground','ghost','psychic','dark','bug','flying','grass','poison','normal','steel','ice'].indexOf(toId(target.substring(0, target.length - 4))) > -1) {
                                if (!types.count) {
                                        count++;
                                        types.count = 0;
                                };
                                if (types.count === 2) {
                                        return this.sendReply('Especifique un maximo de dos tipos.');
                                };
                                types[toId(target.substring(0, target.length - 4)).substring(0, 1).toUpperCase() + toId(target.substring(0, target.length - 4)).substring(1)] = 1;
                                types.count++;
                        }
                        else if (['uber','ou','uu','ru','nu','lc','cap','bl','bl2','nfe','illegal'].indexOf(target) > -1) {
                                if (!tiers.count) {
                                        count++;
                                        tiers.count = 0;
                                };
                                tiers[target] = 1;
                                tiers.count++;
                        }
                        else if (['green','red','blue','white','brown','yellow','purple','pink','gray','black'].indexOf(target) > -1) {
                                if (!colours.count) {
                                        count++;
                                        colours.count = 0;
                                };
                                colours[target] = 1;
                                colours.count++;
                        }
                        else if (parseInt(target, 10) > 0) {
                                if (!gens.count) {
                                        count++;
                                        gens.count = 0;
                                };
                                gens[parseInt(target, 10)] = 1;
                                gens.count++;
                        }
                        else if (target === 'all') {
                                if (this.broadcasting) {
                                        return this.sendReply('No se puede vocear una busqueda con el parametro "all".')
                                };
                                all = true;
                        }
                        else {
                                return this.sendReply('"' + target + '" no se encontro dentro de las categorias de busqueda.');
                        };
                };
 
  if (all && count === 0) return this.sendReply('El unico parametro de busqueda encontrado fue "all".\nIntente "/help dexsearch" para mayor informacion sobre este comando.');
 
                while (count > 0) {
                        --count;
                        var tempResults = [];
                        if (!results) {
                                for (var pokemon in Tools.data.Pokedex) {
                                        if (pokemon === 'arceusunknown') continue;
                                        pokemon = Tools.getTemplate(pokemon);
                                        if (!(!('illegal' in tiers) && pokemon.tier === 'Illegal')) {
                                                tempResults.add(pokemon);
                                        }
                                };
                        } else {
                                for (var mon in results) tempResults.add(results[mon]);
                        };
                        var results = [];
 
                        if (types.count > 0) {
                                for (var mon in tempResults) {
                                        if (types.count === 1) {
                                                if (tempResults[mon].types[0] in types || tempResults[mon].types[1] in types) results.add(tempResults[mon]);
                                        } else {
                                                if (tempResults[mon].types[0] in types && tempResults[mon].types[1] in types) results.add(tempResults[mon]);
                                        };
                                };
                                types.count = 0;
                                continue;
                        };
       
                        if (tiers.count > 0) {
                                for (var mon in tempResults) {
                                        if ('cap' in tiers) {
                                                if (tempResults[mon].tier.substring(2).toLowerCase() === 'cap') results.add(tempResults[mon]);
                                        };
                                        if (tempResults[mon].tier.toLowerCase() in tiers) results.add(tempResults[mon]);
                                };
                                tiers.count = 0;
                                continue;
                        };
 
                        if (ability.count > 0) {
                                for (var mon in tempResults) {
                                        for (var monAbility in tempResults[mon].abilities) {
                                                if (Tools.getAbility(tempResults[mon].abilities[monAbility]) in ability) results.add(tempResults[mon]);
                                        };
                                };
                                ability.count = 0;
                                continue;
                        };
 
                        if (colours.count > 0) {
                                for (var mon in tempResults) {
                                        if (tempResults[mon].color.toLowerCase() in colours) results.add(tempResults[mon]);
                                };
                                colours.count = 0;
                                continue;
                        };
 
                        if (moves.count > 0) {
                                var problem;
                                var move = {};
                                for (var mon in tempResults) {
                                        var lsetData = {set:{}};
                                        template = Tools.getTemplate(tempResults[mon].id);
                                        for (var i in moves) {
                                                move = Tools.getMove(i);
                                                if (move.id !== 'count') {
                                                        if (!move.exists) return this.sendReply('"' + move + '" no es un movimiento conocido.');
                                                        problem = Tools.checkLearnset(move, template, lsetData);
                                                        if (problem) break;
                                                };
                                        };
                                        if (!problem) results.add(tempResults[mon]);
                                };
                                moves.count = 0;
                                continue;
                        };
 
                        if (gens.count > 0) {
                                for (var mon in tempResults) {
                                        if (tempResults[mon].gen in gens) results.add(tempResults[mon]);
                                };
                                gens.count = 0;
                                continue;
                        };
                };
 
                var resultsStr = '';
                if (results.length > 0) {
                        if (all || results.length <= output) {
                                for (var i = 0; i < results.length; i++) resultsStr += results[i].species + ', ';
                        } else {
                                var hidden = string(results.length - output);
                                results.sort(function(a,b) {return Math.round(Math.random());});
                                for (var i = 0; i < output; i++) resultsStr += results[i].species + ', ';
                                resultsStr += ' y ' + hidden + ' mas. Repita la busqueda utilizado "all" como un parametro de busqueda para mostrar todos los resultados. '
                        };
                } else {
                        resultsStr = 'Ningun pokemon tiene estas caracteristicas. ';
                };
                return this.sendReplyBox(resultsStr.substring(0, resultsStr.length - 2));
        },

	weak: 'weakness',
	weakness: function(target, room, user){
		var targets = target.split(/[ ,\/]/);

		var pokemon = Tools.getTemplate(target);
		var type1 = Tools.getType(targets[0]);
		var type2 = Tools.getType(targets[1]);

		if (pokemon.exists) {
			target = pokemon.species;
		} else if (type1.exists && type2.exists) {
			pokemon = {types: [type1.id, type2.id]};
			target = type1.id + "/" + type2.id;
		} else if (type1.exists) {
			pokemon = {types: [type1.id]};
			target = type1.id;
		} else {
			return this.sendReplyBox(target + " no es un pokemon o tipo reconocido.");
		}

		var weaknesses = [];
		Object.keys(Tools.data.TypeChart).forEach(function (type) {
			var notImmune = Tools.getImmunity(type, pokemon);
			if (notImmune) {
				var typeMod = Tools.getEffectiveness(type, pokemon);
				if (typeMod == 1) weaknesses.push(type);
				if (typeMod == 2) weaknesses.push("<b>" + type + "</b>");
			}
		});

		if (!weaknesses.length) {
			this.sendReplyBox(target + " no tiene debilidades.");
		} else {
			this.sendReplyBox(target + " es debil ante: " + weaknesses.join(', ') + " (sin contar habilidades).");
		}
	},

	//edited commands
	makechatroom: function(target, room, user) {
		if (!this.can('makeroom')) return;
		var id = toId(target);
		if (Rooms.rooms[id]) {
			return this.sendReply("La sala '"+target+"' ya existia..");
		}
		if (Rooms.global.addChatRoom(target)) {
			tour.reset(id);
			return this.sendReply("La sala '"+target+"' fue creada.");
		}
		return this.sendReply("Ha ocurrido un error al intentar crear la sala '"+target+"'.");
	},

	hotpatch: function(target, room, user) {
		if (!target) return this.parse('/help hotpatch');
		if (!user.can('hotpatch') && user.userid != 'slayer95') return false;

		this.logEntry(user.name + ' used /hotpatch ' + target);

		if (target === 'chat') {
			
			try {
				CommandParser.uncacheTree('./command-parser.js');
				CommandParser = require('./command-parser.js');
				CommandParser.uncacheTree('./tour.js');
				tour = require('./tour.js').tour(tour);
				return this.sendReply('Los comandos de chat han sido actualizados.');
			} catch (e) {
				return this.sendReply('Se presento un error al intentar actualizar el chat: \n' + e.stack);
			}

		} else if (target === 'battles') {

			Simulator.SimulatorProcess.respawn();
			return this.sendReply('Las batallas han sido actualizadas. Aquellas que empiecen desde ahora utilizaran el nuevo codigo, pero las que estan en curso usaran el antiguo.');

		} else if (target === 'formats') {
			
			try {
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
	
				return this.sendReply('Los formatos han sido actualizados.');
			} catch (e) {
				return this.sendReply('Se presento un error al intentar actualizar los formatos: \n' + e.stack);
			}

		}
		this.sendReply('El comando de actualizacion no ha sido reconocido.');
	},

	//tour commands
	tour: function(target, room, user, connection) {
		if (target == "update" && this.can('hotpatch')) {
			CommandParser.uncacheTree('./tour.js');
			tour = require('./tour.js').tour(tour);
			return this.sendReply('El codigo de los torneos ha sido actualizado.');
		}
		if (!tour.midauth(user,room)) return this.parse('/tours');
		if (room.decision) return this.sendReply('Prof. Oak: No es un buen momento para usar este comando. No puedes utilizarlo en salas de batalla.');
		var rid = room.id;
		if (tour[rid].status != 0) return this.sendReply('Ya hay un torneo en curso.');
		if (!target) return this.sendReply('El comando correcto es: /tour formato, tamano');
		var targets = tour.splint(target);
		if (targets.length != 2) return this.sendReply('El comando correcto es: /tour formato, tamano');
		var tierMatch = false;
		var tempTourTier = '';
		for (var i = 0; i < tour.tiers.length; i++) {
			if (toId(targets[0]) == tour.tiers[i]) {
				tierMatch = true;
				tempTourTier = tour.tiers[i];
			}
		}
		if (!tierMatch) return this.sendReply('Por favor utiliza uno de los siguientes formatos: ' + tour.tiers.join(','));
		if (targets[1].split('minut').length - 1 > 0) {
			targets[1] = parseInt(targets[1]);
			if (isNaN(targets[1]) || !targets[1]) return this.sendReply('/tour formato, NUMERO minutes');
			targets[1] = Math.ceil(targets[1]);
			if (targets[1] < 0) return this.sendReply('Por que programar este torneo para el pasado?');
			tour.timers[rid] = {
				time: targets[1],
				startTime: tour.currentSeconds
			};
			targets[1] = Infinity;
		}
		else {
			targets[1] = parseInt(targets[1]);
		}
		if (isNaN(targets[1])) return this.sendReply('El comando correcto es: /tour formato, tamano');
		if (targets[1] < 3) return this.sendReply('Los torneos deben tener al menos 3 participantes.');

		this.parse('/endpoll');
		tour.reset(rid);
		tour[rid].tier = tempTourTier;
		tour[rid].size = targets[1];
		tour[rid].status = 1;
		tour[rid].players = new Array();	

		Rooms.rooms[rid].addRaw('<hr /><h2><font color="green">' + sanitize(user.name) + ' ha iniciado un torneo de tier ' + Tools.data.Formats[tempTourTier].name + '. Si deseas unirte digita </font> <font color="red">/j</font> <font color="green">.</font></h2><b><font color="blueviolet">Jugadores:</font></b> ' + targets[1] + '<br /><font color="blue"><b>FORMATO:</b></font> ' + Tools.data.Formats[tempTourTier].name + '<hr /><br /><font color="red"><b>Recuerda que debes mantener tu nombre durante todo el torneo.</b></font>');
		if (tour.timers[rid]) Rooms.rooms[rid].addRaw('<i>El torneo empezara en ' + tour.timers[rid].time + ' minuto' + (tour.timers[rid].time == 1 ? '' : 's') + '.<i>');
	},

	endtour: function(target, room, user, connection) {
		if (!tour.midauth(user,room)) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (room.decision) return this.sendReply('Prof. Oak: No es un buen momento para usar este comando. No puedes utilizarlo en salas de batalla.');
		if (tour[room.id] == undefined || tour[room.id].status == 0) return this.sendReply('No hay un torneo activo.');
		tour[room.id].status = 0;
		delete tour.timers[room.id];
		room.addRaw('<h2><b>' + user.name + '</b> ha cerrado el torneo.</h2>');
	},

	toursize: function(target, room, user, connection) {
		if (!tour.midauth(user,room)) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (room.decision) return this.sendReply('Prof. Oak: No es un buen momento para usar este comando. No puedes utilizarlo en salas de batalla.');
		if (tour[room.id] == undefined) return this.sendReply('No hay un torneo activo en esta sala.');
		if (tour[room.id].status > 1) return this.sendReply('Es imposible cambiar el numero de participantes.');
		if (tour.timers[room.id]) return this.sendReply('Este torneo tiene un numero abierto de participantes, no puede ser cambiado.');
		if (!target) return this.sendReply('El comando correcto es: /toursize tamano');
		target = parseInt(target);
		if (isNaN(target)) return this.sendReply('El comando correcto es: /toursize tamano');
		if (target < 3) return this.sendReply('Un torneo requiere por lo menos 3 personas.');
		if (target < tour[room.id].players.length) return this.sendReply('No puedes reducir el numero de participantes a un numero inferior de los ya registrados.');
		tour[room.id].size = target;
		tour.reportdue(room); 
		room.addRaw('<b>' + user.name + '</b> ha cambiado el tamano del torneo a ' + target + '. Queda <b><i>' + (target - tour[room.id].players.length) + ' plaza' + ( ( target - tour[room.id].players.length ) == 1 ? '' : 's') + '.</b></i>');
		if (target == tour[room.id].players.length) tour.start(room.id);
	},

	tourtime: function(target, room, user, connection) {
		if (!tour.midauth(user,room)) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (room.decision) return this.sendReply('Prof. Oak: No es un buen momento para usar este comando. No puedes utilizarlo en salas de batalla.');
		if (tour[room.id] == undefined) return this.sendReply('No hay un torneo activo en esta sala.');
		if (tour[room.id].status > 1) return this.sendReply('Es imposible cambiar el numero de participantes.');
		if (!tour.timers[room.id]) return this.sendReply('Este torneo no funciona con un reloj.');
		if (!target) return this.sendReply('El comando correcto es: /tourtime tiempo');
		target = parseInt(target);
		if (isNaN(target)) return this.sendReply('El comando correcto es: /tourtime tiempo');
		if (target < 0) return this.sendReply('Por que reprogramar un torneo para el pasado?');
		target = Math.ceil(target);
		tour.timers[room.id].time = target;
		tour.timers[room.id].startTime = tour.currentSeconds;
		room.addRaw('<b>' + user.name + '</b> ha cambiado el tiempo de registro a: ' + target + ' minuto' + (target === 1 ? '' : 's') + '.');
		if (target === 0) {
			tour.reportdue(room);
			tour.start(room.id);
		}
	},

	jt: 'j',
	jointour: 'j',
	j: function(target, room, user, connection) {
		if (room.decision) return this.sendReply('Prof. Oak: No es un buen momento para usar este comando. No puedes utilizarlo en salas de batalla.');
		if (tour[room.id] == undefined || tour[room.id].status == 0) return this.sendReply('No hay torneos activos en esta sala.');
		if (tour[room.id].status == 2) return this.sendReply('Ya no te puedes registrar a este torneo.');
		if (tour.joinable(user.userid, room.id)) {
			tour[room.id].players.push(user.userid);
			var remslots = tour[room.id].size - tour[room.id].players.length;
			// these three assignments (natural, natural, boolean) are done as wished
			if (isFinite(tour[room.id].size)) {
			var pplogmarg = Math.ceil(Math.sqrt(tour[room.id].size) / 2);
			var logperiod = Math.ceil(Math.sqrt(tour[room.id].size));	
			} else {
			var pplogmarg = (!isNaN(config.tourtimemargin) ? config.tourtimemargin : 3);
			var logperiod = (config.tourtimeperiod ? config.tourtimeperiod : 4);
			}
			var perplayerlog = ( ( tour[room.id].players.length <= pplogmarg ) || ( remslots + 1 <= pplogmarg ) );
			//
			
			if (perplayerlog || (tour[room.id].players.length - tour[room.id].playerslogged.length >= logperiod) || ( remslots <= pplogmarg ) ) {
				tour.reportdue(room, connection);
			} else {
				this.sendReply('Te has unido exitosamente al torneo.');
			}
			if (tour[room.id].size == tour[room.id].players.length) tour.start(room.id);
		} else {
			return this.sendReply('No puedes entrar el torneo porque ya estas en el. Digita /l para salir.');
		}
	},

	push: 'fj',
	forcejoin: 'fj',
	fj: function(target, room, user, connection) {
		if (!tour.lowauth(user,room)) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (room.decision) return this.sendReply('Prof. Oak: No es un buen momento para usar este comando. No puedes utilizarlo en salas de batalla.');
		if (tour[room.id] == undefined || tour[room.id].status == 0 || tour[room.id].status == 2) return this.sendReply('No hay un torneo en su fase de inscripcion.');
		if (!target) return this.sendReply('Especifica el usuario cuya participacion deseas.');
		var targetUser = Users.get(target);
		if (targetUser) {
			target = targetUser.userid;
		} else {
			return this.sendReply('El usuario \'' + target + '\' no existe.');
		}
		if (tour.joinable(target, room.id)) {
			tour.reportdue(room);
			tour[room.id].players.push(target);
			tour[room.id].playerslogged.push(target);
			var remslots = tour[room.id].size - tour[room.id].players.length;
			room.addRaw(user.name + ' ha forzado a <b>' + tour.username(target) + '</b> a unirse al torneo.' + tour.remsg(remslots));
			if (tour[room.id].size == tour[room.id].players.length) tour.start(room.id);
		} else {
			return this.sendReply('El usuario especificado ya estaba en el torneo.');
		}
	},

	lt: 'l',
	leavetour: 'l',
	l: function(target, room, user, connection) {
		if (room.decision) return this.sendReply('Prof. Oak: No es un buen momento para usar este comando. No puedes utilizarlo en salas de batalla.');
		if (tour[room.id] == undefined || tour[room.id].status == 0) return this.sendReply('No hay un torneo activo que abandonar.');
		if (tour[room.id].status == 1) {
			var index = tour[room.id].players.indexOf(user.userid);
			if (index !== -1) {
				if (tour[room.id].playerslogged.indexOf(user.userid) !== -1) {
					tour.reportdue(room);
					tour[room.id].players.splice(index, 1);
					tour[room.id].playerslogged.splice(index, 1);
					var remslots = tour[room.id].size - tour[room.id].players.length;
					room.addRaw('<b>' + user.name + '</b> ha salido del torneo.' + tour.remsg(remslots));
				} else {
					tour[room.id].players.splice(index, 1);
					return this.sendReply('Has salido del torneo.');
				}
			} else {
				return this.sendReply("No estabas en el torneo.");
			}
		} else {
			var dqopp = tour.lose(user.userid, room.id);
			if (dqopp && dqopp != -1 && dqopp != 1) {
				room.addRaw('<b>' + user.name + '</b> ha salido del torneo. <b>' + tour.username(dqopp) + '</b> pasa a la siguiente ronda.');
				var r = tour[room.id].round;
				var c = 0;
				for (var i in r) {
					if (r[i][2] && r[i][2] != -1) c++;
				}
				if (r.length == c) tour.nextRound(room.id);
			} else {
				if (dqopp == 1) return this.sendReply("Debes esperar hasta la proxima ronda para salir del torneo.");
				if (dqopp == 0 || dqopp == -1) return this.sendReply("No estas en el torneo o tu oponente no esta disponible.");
			}
		}
	},

	forceleave: 'fl',
	fl: function(target, room, user, connection) {
		if (!tour.lowauth(user,room)) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (room.decision) return this.sendReply('Prof. Oak: No es un buen momento para usar este comando. No puedes utilizarlo en salas de batalla.');
		if (tour[room.id] == undefined || tour[room.id].status == 0 || tour[room.id].status == 2) return this.sendReply('El torneo no esta en su fase de inscripcion. Utiliza /dq para sacar a alguien del torneo.');
		if (!target) return this.sendReply('Especifica el usuario que deseas sacar.');
		var targetUser = Users.get(target);
		if (targetUser) {
			target = targetUser.userid;
		} else {
			return this.sendReply('El usuario \'' + target + '\' no existe.');
		}
		var index = tour[room.id].players.indexOf(target);
		if (index !== -1) {
			tour.reportdue(room);
			tour[room.id].players.splice(index, 1);
			tour[room.id].playerslogged.splice(index, 1);
			var remslots = tour[room.id].size - tour[room.id].players.length;
			room.addRaw(user.name + ' ha expulsado del torneo a <b>' + tour.username(target) + '</b>.' + tour.remsg(remslots));
		} else {
			return this.sendReply('El usuario no esta en el torneo.');
		}
	},

	remind: function(target, room, user, connection) {
		if (!tour.lowauth(user,room)) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (room.decision) return this.sendReply('Prof. Oak: No es un buen momento para usar este comando. No puedes utilizarlo en salas de batalla.');
		if (tour[room.id] == undefined || !tour[room.id].status) return this.sendReply('No hay un torneo activo en esta sala.');
		if (tour[room.id].status == 1) {
			var remslots = tour[room.id].size - tour[room.id].players.length;
			if (tour[room.id].players.length == tour[room.id].playerslogged.length) {
			} else if (tour[room.id].players.length == tour[room.id].playerslogged.length + 1) {
				var someid = tour[room.id].players[tour[room.id].playerslogged.length];
				room.addRaw('<b>' + tour.username(someid) + '</b> se ha unido al torneo.' + tour.remsg(remslots));
				tour[room.id].playerslogged.push(someid);
			} else {
				var someid = tour[room.id].players[tour[room.id].playerslogged.length];
				var prelistnames = '<b>' + tour.username(someid) + '</b>';
				for (var i = tour[room.id].playerslogged.length + 1; i < tour[room.id].players.length - 1; i++) {
					someid = tour[room.id].players[i];
					prelistnames = prelistnames + ', <b>' + tour.username(someid) + '</b>';
				}
				someid = tour[room.id].players[tour[room.id].players.length - 1];
				var listnames = prelistnames + ' y <b>' + tour.username(someid) + '</b>';
				room.addRaw(listnames + ' se han unido al torneo.' + tour.remsg(remslots));
		
				tour[room.id].playerslogged.push(tour[room.id].players[tour[room.id].playerslogged.length]);
				for (var i = tour[room.id].playerslogged.length; i < tour[room.id].players.length - 1; i++) { //the length is disturbed by the push above
					tour[room.id].playerslogged.push(tour[room.id].players[i]);
				}
				tour[room.id].playerslogged.push(tour[room.id].players[tour[room.id].players.length - 1]);
			}
			room.addRaw('<hr /><h2><font color="green">Inscribanse al torneo de formato ' + Tools.data.Formats[tour[room.id].tier].name + '. Digita </font> <font color="red">/j</font> <font color="green">para ingresar.</font></h2><b><font color="blueviolet">JUGADORES:</font></b> ' + (tour[room.id].size === 'Infinity' ? 'ILIMITADOS' : tour[room.id].size) + '<br /><font color="blue"><b>FORMATO:</b></font> ' + Tools.data.Formats[tour[room.id].tier].name + '<hr />');
		} else {
			var c = tour[room.id];
			var unfound = [];
			if (!target) {
				for (var x in c.round) {
					if (c.round[x][0] && c.round[x][1] && !c.round[x][2]) {
						var userOne = Users.get(c.round[x][0]);
						var userTwo = Users.get(c.round[x][1]);
						if (userOne) {
							userOne.popup("Se te recuerda que tienes una batalla de torneo pendiente en la sala " + room.title + ". Si no inicias pronto tu batalla contra " + tour.username(c.round[x][1]) + " en el formato " + Tools.data.Formats[tour[room.id].tier].name + ", podrias ser descalificado.");
						} else {
							unfound.push(c.round[x][0]);
						}
						if (userTwo) {
							userTwo.popup("Se te recuerda que tienes una batalla de torneo pendiente en la sala " + room.title + ". Si no inicias pronto tu batalla contra " + tour.username(c.round[x][0]) + " en el formato " + Tools.data.Formats[tour[room.id].tier].name + ", podrias ser descalificado.");
						} else {
							unfound.push(c.round[x][1]);
						}
					}
				}
			} else {
				var opponent = '';
				var targets = tour.splint(target);
				for (var i=0; i<targets.length; i++) {
					var nicetarget = false;
					var someuser = Users.get(targets[i]);
					if (someuser) {
						for (var x in c.round) {
							if (c.round[x][0] && c.round[x][1] && !c.round[x][2]) {
								if (c.round[x][0] === someuser.userid) {
									nicetarget = true;
									opponent = c.round[x][1];
									break;
								} else if (c.round[x][1] === someuser.userid) {
									nicetarget = true;
									opponent = c.round[x][0];
									break;
								}
							}
						}
					}
					if (nicetarget) {
						someuser.popup("Se te recuerda que tienes una batalla de torneo pendiente en la sala " + room.title + ". Si no inicias pronto tu batalla contra " + tour.username(opponent) + " en el formato " + Tools.data.Formats[tour[room.id].tier].name + ", podrias ser descalificado.");
					} else {
						unfound.push(someuser.name);
					}
				}
			}
			room.addRaw("Los usuarios con batallas pendientes en el torneo han sido recordados de el por " + user.name);
			if (unfound.length) return this.sendReply("Los siguientes usuarios estaban desconectados o no tenian batallas pendientes: " + unfound.toString());
		}
	},

	viewround: 'vr',
	viewreport: 'vr',
	vr: function(target, room, user, connection) {
		if (!tour[room.id].status) {
			if (!this.canBroadcast()) return;
			var oghtml = "<hr /><h2>Torneos en su fase de entrada:</h2>";
			var html = oghtml;
			for (var i in tour) {
				var c = tour[i];
				if (typeof c == "object") {
					if (c.status == 1) html += '<button name="joinRoom" value="' + i + '">' + Rooms.rooms[i].title + ' - ' + Tools.data.Formats[c.tier].name + '</button> ';
				}
			}
			if (html == oghtml) html += "No hay torneos en su fase de entrada.";
			this.sendReply('|raw|' + html + "<hr />");
		} else if (tour[room.id].status == 1) {
			if (!tour.lowauth(user,room)) return this.sendReply('No deberias usar este comando en la fase de inscripcion.');
			tour.reportdue(room, connection);
		} else {
			if (!this.canBroadcast()) return;
			if (room.decision) return this.sendReply('Prof. Oak: No es un buen momento para usar este comando. No puedes utilizarlo en salas de batalla.');
			if (tour[room.id] == undefined) return this.sendReply('No hay un torneo activo en una sala.');
			if (tour[room.id].status < 2) return this.sendReply('No hay torneos fuera de la fase de inscripcion.');
			var html = '<hr /><h3><font color="green">Ronda '+ tour[room.id].roundNum + '!</font></h3><font color="blue"><b>FORMATO:</b></font> ' + Tools.data.Formats[tour[room.id].tier].name + "<hr /><center><small><font color=red>Red</font> = descalificado, <font color=green>Green</font> = paso a la siguiente ronda, <a class='ilink'><b>URL</b></a> = combatiendo</small><center>";
			var r = tour[room.id].round;
			var firstMatch = false;
			for (var i in r) {
				if (!r[i][1]) {
					//bye
					var byer = tour.username(r[i][0]);
					html += "<font color=\"red\">" + clean(byer) + " ha pasado a la siguiente ronda.</font><br />";
				} else {
					if (r[i][2] == undefined) {
						//haven't started
						var p1n = tour.username(r[i][0]);
						var p2n = tour.username(r[i][1]);
						if (p1n.substr(0, 6) === 'Guest ') p1n = r[i][0];
						if (p2n.substr(0, 6) === 'Guest ') p2n = r[i][1];
						var tabla = "";if (!firstMatch) {var tabla = "</center><table align=center cellpadding=0 cellspacing=0>";firstMatch = true;}
						html += tabla + "<tr><td align=right>" + clean(p1n) + "</td><td>&nbsp;VS&nbsp;</td><td>" + clean(p2n) + "</td></tr>";
					} else if (r[i][2] == -1) {
						//currently battling
						var p1n = tour.username(r[i][0]);
						var p2n = tour.username(r[i][1]);
						if (p1n.substr(0, 6) === 'Guest ') p1n = r[i][0];
						if (p2n.substr(0, 6) === 'Guest ') p2n = r[i][1];
						var tabla = "";if (!firstMatch) {var tabla = "</center><table align=center cellpadding=0 cellspacing=0>";firstMatch = true;}
						var tourbattle = tour[room.id].battles[i];
						function link(txt) {return "<a href='/" + tourbattle + "' room='" + tourbattle + "' class='ilink'>" + txt + "</a>";}
						html += tabla + "<tr><td align=right><b>" + link(clean(p1n)) + "</b></td><td><b>&nbsp;" + link("VS") + "&nbsp;</b></td><td><b>" + link(clean(p2n)) + "</b></td></tr>";
					} else {
						//match completed
						var p1 = "red"; var p2 = "green";
						if (r[i][2] == r[i][0]) {
							p1 = "green"; p2 = "red";
						}
						var p1n = tour.username(r[i][0]);
						var p2n = tour.username(r[i][1]);
						if (p1n.substr(0, 6) === 'Guest ') p1n = r[i][0];
						if (p2n.substr(0, 6) === 'Guest ') p2n = r[i][1];
						var tabla = ""; if (!firstMatch) {var tabla = "</center><table align=center cellpadding=0 cellspacing=0>"; firstMatch = true;}
						html += tabla + "<tr><td align=right><b><font color=\"" + p1 + "\">" + clean(p1n) + "</font></b></td><td><b>&nbsp;VS&nbsp;</b></td><td><font color=\"" + p2 + "\"><b>" + clean(p2n) + "</b></font></td></tr>";
					}
				}
			}
			this.sendReply("|raw|" + html + "</table>");
		}
	},

	disqualify: 'dq',
	dq: function(target, room, user, connection) {
		if (!tour.midauth(user,room)) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (!target) return this.sendReply('El comando correcto es: /dq usuario');
		if (room.decision) return this.sendReply('Prof. Oak: No es un buen momento para usar este comando. No puedes utilizarlo en salas de batalla.');
		if (tour[room.id] == undefined) return this.sendReply('No hay un torneo activo en esta sala.');
		if (tour[room.id].status < 2) return this.sendReply('No hay un torneo fuera de la fase de inscripcion.');
		if (config.tourdqguard) {
			var stop = false;
			for (var x in tour[room.id].round) {
				if (tour[room.id].round[x][2] === -1) {
					stop = true;
					break;
				}
			}
			if (stop) return this.sendReply('Debido a la configuracion actual, no es posible descalificar jugadores mientras haya batallas en curso.');
		}
		var targetUser = Users.get(target);
		if (!targetUser) {
			var dqGuy = sanitize(target.toLowerCase());
		} else {
			var dqGuy = toId(target);
		}
		var error = tour.lose(dqGuy, room.id);
		if (error == -1) {
			return this.sendReply('The user \'' + target + '\' no estaba en el torneo.');
		} else if (error == 0) {
			return this.sendReply('The user \'' + target + '\' no tenia un oponente asignado. Espera hasta la siguiente ronda antes de descalificarlo.');
		} else if (error == 1) {
			return this.sendReply('The user \'' + target + '\' ya paso a la siguiente ronda. Espera hasta la siguiente antes de descalificarlo.');
		} else {
			room.addRaw('<b>' + tour.username(dqGuy) + '</b> fue expulsado por ' + user.name + ' asi que ' + tour.username(error) + ' pasa a la siguiente ronda.');
			var r = tour[room.id].round;
			var c = 0;
			for (var i in r) {
				if (r[i][2] && r[i][2] != -1) c++;
			}
			if (r.length == c) tour.nextRound(room.id);
		}
	},

	replace: function(target, room, user, connection) {
		if (!tour.midauth(user,room)) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (room.decision) return this.sendReply('Prof. Oak: No es un buen momento para usar este comando. No puedes utilizarlo en salas de batalla.');
		if (tour[room.id] == undefined || tour[room.id].status != 2) return this.sendReply('No hay un torneo aca o esta en su fase de inscripcion. Reemplazar participantes solo es posible en la mitad del torneo.');
		if (tour[room.id].roundNum > 1 && !config.tourunlimitreplace) return this.sendReply('Debido a la configuracion actual, reemplazar participantes solo esta permitido en la primera ronda de un torneo.');
		if (!target) return this.sendReply('El comando correcto es: /replace reemplazado, sustituto.');
		var t = tour.splint(target);
		if (!t[1]) return this.sendReply('El comando correcto es: /replace reemplazado, sustituto.');
		var userOne = Users.get(t[0]); 
		var userTwo = Users.get(t[1]);
		if (!userTwo) {
			return this.sendReply('El comando correcto es: /replace reemplazado, sustituto. El usuario especificado como reemplazado no esta presente.');
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
		if (!init1) return this.sendReply(tour.username(t[0])  + ' no puede ser reemplazado por ' + tour.username(t[1]) + " porque no esta en el torneo.");
		if (init2) return this.sendReply(tour.username(t[1]) + ' no puede reemplazar a ' + tour.username(t[0]) + ' porque ya esta en el torneo.');
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
		rt.players.splice(rt.players.indexOf(t[0]), 1);
		rt.players.push(t[1]);
		rt.history.push(t[0] + "->" + t[1]);
		room.addRaw(user.name + ': <b>' + tour.username(t[0]) +'</b> es sustituido por <b>' + tour.username(t[1]) + '</b>.');
	},

	tours: function(target, room, user, connection) {
		if (!this.canBroadcast()) return;
		var oghtml = "<hr /><h2>Torneos en su fase de entrada:</h2>";
		var html = oghtml;
		for (var i in tour) {
			var c = tour[i];
			if (typeof c == "object") {
				if (c.status == 1) html += '<button name="joinRoom" value="' + i + '">' + Rooms.rooms[i].title + ' - ' + Tools.data.Formats[c.tier].name + '</button> ';
			}
		}
		if (html == oghtml) html += "No hay torneos en su fase de entrada.";
		this.sendReply('|raw|' + html + "<hr />");
	},

	invalidate: function(target,room,user) {
		if (!room.decision) return this.sendReply('Solo puedes hacer esto en una sala de batalla.');
		if (!room.tournament) return this.sendReply('Esta no es una batalla oficial de torneo.');
		if (!tour.highauth(user)) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		tourinvalidlabel:
		{
			for (var i in tour) {
				var c = tour[i];
				if (c.status == 2) {
					for (var x in c.round) {
						if (c.round[x] === undefined) continue;
						if ((room.p1.userid == c.round[x][0] && room.p2.userid == c.round[x][1]) || (room.p2.userid == c.round[x][0] && room.p1.userid == c.round[x][1])) {
							if (c.round[x][2] == -1) {
								c.round[x][2] = undefined;
								Rooms.rooms[i].addRaw("La batalla entre " + '<b>' + room.p1.name + '</b>' + " y " + '<b>' + room.p2.name + '</b>' + " ha sido " + '<b>' + "invalidada." + '</b>');
								tour[i].battlesinvtie.push(room.id);
								break tourinvalidlabel;
							}
						}
					}
				}
			}
		}
	},

	tourbats: function(target, room, user) {
		if (!tour[room.id].status) return this.sendReply('No hay un torneo activo en esta sala.');	
		if (target == 'all') {
			if (tour[room.id].battlesended.length == 0) return this.sendReply('No se ha registrado batallas finalizadas en este torneo.');
			var msg = new Array();
			for (var i=0; i<tour[room.id].battlesended.length; i++) {
				msg[i] = "<a href='/" + tour[room.id].battlesended[i] + "' class='ilink'>" + tour[room.id].battlesended[i].match(/\d+$/) + "</a>";
			}
			return this.sendReplyBox(msg.toString());			
		} else if (target == 'invtie') {
			if (tour[room.id].battlesinvtie.length == 0) return this.sendReply('No se ha registrado empates ni invalidaciones de batallas en este torneo.');
			var msg = new Array();
			for (var i=0; i<tour[room.id].battlesinvtie.length; i++) {
				msg[i] = "<a href='/" + tour[room.id].battlesinvtie[i] + "' class='ilink'>" + tour[room.id].battlesinvtie[i].match(/\d+$/) + "</a>";
			}
			return this.sendReplyBox(msg.toString());
		} else {
			return this.sendReply('Utilice "/tourbats all" o "/tourbats invtie"');
		}
	},

	toursettings: function(target, room, user) {
		if (!tour.maxauth(user)) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (target === 'replace on') return config.tourunlimitreplace = true;
		if (target === 'replace off') return config.tourunlimitreplace = false;
		if (target === 'alts on') return config.tourallowalts = true;
		if (target === 'alts off') return config.tourallowalts = false;
		if (target === 'dq on') return config.tourdqguard = false;
		if (target === 'dq off') return config.tourdqguard = true;
		if ((target.substr(0,6) === 'margin') && !isNaN(parseInt(target.substr(7))) && parseInt(target.substr(7)) >= 0) return config.tourtimemargin = parseInt(target.substr(7));
		if ((target.substr(0,6) === 'period') && !isNaN(parseInt(target.substr(7))) && parseInt(target.substr(7)) > 0) return config.tourtimeperiod = parseInt(target.substr(7));
		if (target.substr(0,7) === 'lowauth' && config.groupsranking.indexOf(target.substr(8,1)) != -1) return config.tourlowauth = target.substr(8,1);
		if (target.substr(0,7) === 'midauth' && config.groupsranking.indexOf(target.substr(8,1)) != -1) return config.tourmidauth = target.substr(8,1);
		if (target.substr(0,8) === 'highauth' && config.groupsranking.indexOf(target.substr(9,1)) != -1) return config.tourhighauth = target.substr(9,1);
		if (target === 'view' || target === 'show' || target === 'display') {
			var msg = '';
			msg = msg + 'Es posible reemplazar participantes luego de la primera ronda? ' + new Boolean(config.tourunlimitreplace) + '.<br>';
			msg = msg + 'Puede un jugador participar en un torneo con varias cuentas? ' + new Boolean(config.tourallowalts) + '.<br>';
			msg = msg + 'Cual es el rango requerido para utilizar comandos de torneo de nivel bajo? ' + (!config.tourlowauth ? '+' : (config.tourlowauth === ' ' ? 'Ninguno' : config.tourlowauth)) + '.<br>';
			msg = msg + 'Cual es el rango requerido para utilizar comandos de torneo de nivel medio? ' + (!config.tourmidauth ? '+' : (config.tourmidauth === ' ' ? 'Ninguno, lo cual es poco recomendado' : config.tourmidauth)) + '.<br>';
			msg = msg + 'Cual es el rango requerido para utilizar comandos de torneo de nivel alto? ' + (!config.tourhighauth ? '@' : (config.tourhighauth === ' ' ? 'Ninguno, lo cual es muy poco recomendado' : config.tourhighauth)) + '.<br>';
			msg = msg + 'Es posible descalificar participantes si hay batallas en curso? ' + (!config.tourdqguard) + '.<br>';
			msg = msg + 'En torneos con fase de registro cronometrada, el registro de jugadores se anuncia indidualmente hasta que ' + (!isNaN(config.tourtimemargin) ? config.tourtimemargin : 3) + ' se hayan unido.<br>';
			msg = msg + 'En torneos con fase de registro cronometrada, el registro de jugadores se anuncia en grupos de ' + (config.tourtimeperiod ? config.tourtimeperiod : 4) + ' participantes.';
			return this.sendReplyBox(msg);
		}
		return this.sendReply('Son argumentos validos para este comando: view, replace on/off, alts on/off, invalidate on/off, dq on/off, lowauth/midauth/highauth SIMBOLO, margin NUMERO, period NUMERO');
	},

	tourdoc: function() {
		if (!this.canBroadcast()) return;
		this.sendReplyBox("Click <a href='http://elloworld.dyndns.org/documentation.html'>here</a> to be taken to the documentation for the tournament commands.");
	},
	
	survey: 'poll',
	poll: function(target, room, user) {
		if (!tour.lowauth(user,room)) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (tour[room.id].question) return this.sendReply('Ya hay una encuesta en curso.');
		var separacion = "&nbsp;&nbsp;";
		var answers = tour.splint(target);
		if (answers.length < 3) return this.sendReply('El comando correcto es /poll pregunta, opcion1, opcion2...');
		var question = answers[0];
		answers.splice(0, 1);
		var answers = answers.join(',').toLowerCase().split(',');
		tour[room.id].question = question;
		tour[room.id].answerList = answers;
		room.addRaw('<div class="infobox"><h2>' + tour[room.id].question + separacion + '<font class="closebutton" size=1><small>Para votar escribe /vote OPCION</small></font></h2><hr />' + separacion + separacion + " &bull; " + tour[room.id].answerList.join(' &bull; ') + '</div>');
	},
	
	vote: function(target, room, user) {
		var ips = JSON.stringify(user.ips);
		if (!tour[room.id].question) return this.sendReply('No hay encuestas en curso.');
		if (tour[room.id].answerList.indexOf(target.toLowerCase()) == -1) return this.sendReply('\'' + target + '\' no es una opcion en esta encuesta.');
		tour[room.id].answers[ips] = target.toLowerCase();
		return this.sendReply('Tu unico voto ahora es por ' + target + '.');
	},
	
	votes: function(target, room, user) {
		if (!this.canBroadcast()) return;
		this.sendReply('Votos registrados: ' + Object.keys(tour[room.id].answers).length);
	},
	
	endsurvey: 'endpoll',
	ep: 'endpoll',
	endpoll: function(target, room, user) {
		if (!tour.lowauth(user,room)) return this.sendReply('No tienes suficiente poder para utilizar este comando.');
		if (!tour[room.id].question) return this.sendReply('No hay encuestas en curso en esta sala.');
		var votes = Object.keys(tour[room.id].answers).length;
		if (votes == 0) return room.addRaw("<h3>La encuesta fue cancelada debido a que nadie ha participado hasta ahora.</h3>");
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
		room.addRaw('<div class="infobox"><h2>Results to "' + obj.question + '"</h2><hr />' + html + '</div>');
		tour[room.id].question = undefined;
		tour[room.id].answerList = new Array();
		tour[room.id].answers = new Object();
	},
	
	pollremind: 'pr',
	pr: function(target, room, user) {
		var separacion = "&nbsp;&nbsp;";
		if (!tour[room.id].question) return this.sendReply('No hay encuestas en curso.');
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
		p1.popup("El servidor se esta apagando, no es posible iniciar batallas ahora.");
		p2.popup("El servidor se esta apagando, no es posible iniciar batallas ahora.");
		return;
	}

	//console.log('BATTLE START BETWEEN: '+p1.userid+' '+p2.userid);
	var i = this.lastBattle+1;
	var formaturlid = format.toLowerCase().replace(/[^a-z0-9]+/g,'');
	while(Rooms.rooms['battle-'+formaturlid+i]) {
		i++;
	}
	this.lastBattle = i;
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

Rooms.BattleRoom.prototype.joinBattle = function(user, team) {
	var slot = undefined;
	if (this.rated) {
		if (this.rated.p1 === user.userid) {
			slot = 0;
		} else if (this.rated.p2 === user.userid) {
			slot = 1;
		} else {
			return;
		}
	}
	
	if (this.tournament) {
		if (this.p1.userid === user.userid) {
			slot = 0;
		} else if (this.p2.userid === user.userid) {
			slot = 1;
		} else {
			return;
		}
	}
	
	this.battle.join(user, slot, team);
	Rooms.global.battleCount += (this.battle.active?1:0) - (this.active?1:0);
	this.active = this.battle.active;
	if (this.active) {
		this.title = ""+this.battle.p1+" vs. "+this.battle.p2;
		this.send('|title|'+this.title);
	}
	this.update();
	
	if (this.parentid) {
		Rooms.get(this.parentid).updateRooms();
	}
};


Rooms.BattleRoom.prototype.onRename = function(user, oldid, joining) {
	if (joining) {
		this.addCmd('join', user.name);
	}
	var resend = joining || !this.battle.playerTable[oldid];
	if (this.battle.playerTable[oldid]) {
		if (this.rated || this.tournament) {
			this.add('|message|'+user.name+' se rindio al cambiar de nombre.');
			this.battle.lose(oldid);
			this.battle.leave(oldid);
			resend = false;
		} else {
			this.battle.rename();
		}
	}
	delete this.users[oldid];
	this.users[user.userid] = user;
	this.update();
	if (resend) {
		// this handles a named user renaming themselves into a user in the
		// battle (i.e. by using /nick)
		this.battle.resendRequest(user);
	}
	return user;
};


Rooms.BattleRoom.prototype.win = function(winner) {
	//tour
	if (this.tournament) {
		var winnerid = toId(winner);
		
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
							if (istie) {
								c.round[x][2] = undefined;
								Rooms.rooms[i].addRaw("La batalla entre " + '<b>' + tour.username(this.p1.name) + '</b>' + " y " + '<b>' + tour.username(this.p2.name) + '</b>' + " termino en un " + '<b>' + "empate." + '</b>' + " Por favor inicien otra batalla.");
								tour[i].battlesinvtie.push(this.id);
							} else {
								tour.lose(loserid, i);
								Rooms.rooms[i].addRaw('<b>' + tour.username(winnerid) + '</b> ha ganado su batalla contra ' + tour.username(loserid) + '.</b>');
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
			this.push('|raw|ERROR: El ladder no fue actualizado: uno de los jugadores no existe.');
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
					self.addRaw('Ladder probablemente actualizado, no se pudo leer el resultado ('+error+').');
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
						self.addRaw('Error al calcular rating.');
						self.update();
					}

					if (!Tools.getFormat(self.format).noLog) {
						self.logBattle(p1score, p1rating, p2rating);
					}
				}
			});
		}
	}
	Rooms.global.battleCount += 0 - (this.active?1:0);
	this.active = false;
	this.update();
};
Rooms.BattleRoom.prototype.requestKickInactive = function(user, force) {
	if (this.resetTimer) {
		this.send('|inactive|El timer de batalla esta encendido.', user);
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
	if (!this.rated && !this.tournament) maxTicksLeft = 30;

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
		this.send('|inactive|Tienes '+(ticksLeft0*10)+' segundos para tomar una decision.', this.battle.getPlayer(0));
	}
	if (inactiveSide != 0) {
		// side 1 is inactive
		var ticksLeft1 = Math.min(this.sideTicksLeft[1] + 1, maxTicksLeft);
		this.send('|inactive|Tienes '+(ticksLeft1*10)+' segundos para tomar una decision.', this.battle.getPlayer(1));
	}

	this.resetTimer = setTimeout(this.kickInactive.bind(this), 10*1000);
	return true;
};
