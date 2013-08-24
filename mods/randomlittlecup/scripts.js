exports.BattleScripts = {

	randomLCTeam: function(side) {
		var keys = [];
		var pokemonLeft = 0;
		var pokemon = [];
		for (var i in this.data.FormatsData) {
			if (this.data.FormatsData[i].viableMoves && this.data.FormatsData[i].tier === "LC") {
				keys.push(i);
			}
		}
		keys = keys.randomize();

		var typeCount = {};
		var typeComboCount = {};

		for (var i=0; i<keys.length && pokemonLeft < 6; i++) {
			var template = this.getTemplate(keys[i]);
			if (!template || !template.name || !template.types) continue;

			// Arceus formes have 1/17 the normal rate each (so Arceus as a whole has a normal rate)
			if (keys[i].substr(0,6) === 'arceus' && Math.random()*17>1) continue;

			// Limit 2 of any type
			var types = template.types;
			var skip = false;
			for (var t=0; t<types.length; t++) {
				if (typeCount[types[t]] > 1 && Math.random()*5>1) {
					skip = true;
					break;
				}
			}
			if (skip) continue;

			var set = this.randomLCSet(template, i);

			// Limit 1 of any type combination
			var typeCombo = types.join();
			if (set.ability === 'Drought' || set.ability === 'Drizzle') {
				// Drought and Drizzle don't count towards the type combo limit
				typeCombo = set.ability;
			}
			if (typeCombo in typeComboCount) continue;

			// Okay, the set passes, add it to our team
			pokemon.push(set);

			pokemonLeft++;
			// Now that our Pokemon has passed all checks, we can increment the type counter:
			for (var t=0; t<types.length; t++) {
				if (types[t] in typeCount) {
					typeCount[types[t]]++;
				} else {
					typeCount[types[t]] = 1;
				}
			}
			typeComboCount[typeCombo] = 1;
		}
		return pokemon;
	},

	randomLCSet: function(template, i) {
		if (i === undefined) i = 1;
		template = this.getTemplate(template);
		var name = template.name;

		if (!template.exists || (!template.viableMoves && !template.learnset)) {
			template = this.getTemplate('unown');

			var stack = 'Template incompatible with random battles: '+name;
			var fakeErr = {stack: stack};
			require('../crashlogger.js')(fakeErr, 'The randbat set generator');
		}

		var moveKeys = Object.keys(template.viableMoves || template.learnset).randomize();
		var moves = [];
		var ability = '';
		var item = '';
		var evs = {
			hp: 85,
			atk: 85,
			def: 85,
			spa: 85,
			spd: 85,
			spe: 85
		};
		var ivs = {
			hp: 31,
			atk: 31,
			def: 31,
			spa: 31,
			spd: 31,
			spe: 31
		};
		var hasStab = {};
		hasStab[template.types[0]] = true;
		var hasType = {};
		hasType[template.types[0]] = true;
		if (template.types[1]) {
			hasStab[template.types[1]] = true;
			hasType[template.types[1]] = true;
		}

		var damagingMoves = [];
		var damagingMoveIndex = {};
		var hasMove = {};
		var counter = {};
		var setupType = '';
		
		var j=0;
		do {
			// Choose next 4 moves from learnset/viable moves and add them to moves list:
			while (moves.length<4 && j<moveKeys.length) {
				var moveid = toId(moveKeys[j]);
				j++;
				if (moveid.substr(0,11) === 'hiddenpower') {
					if (!hasMove['hiddenpower']) {
						hasMove['hiddenpower'] = true;
					} else {
						continue;
					}
				}
				moves.push(moveid);
			}

			damagingMoves = [];
			damagingMoveIndex = {};
			hasMove = {};
			counter = {
				Physical: 0, Special: 0, Status: 0, damage: 0,
				technician: 0, skilllink: 0, contrary: 0, sheerforce: 0, ironfist: 0, adaptability: 0, hustle: 0,
				blaze: 0, overgrow: 0, swarm: 0, torrent: 0,
				recoil: 0, inaccurate: 0,
				physicalsetup: 0, specialsetup: 0, mixedsetup: 0
			};
			// Iterate through all moves we've chosen so far and keep track of what they do:
			for (var k=0; k<moves.length; k++) {
				var move = this.getMove(moves[k]);
				var moveid = move.id;
				// Keep track of all moves we have:
				hasMove[moveid] = true;
				if (move.damage || move.damageCallback) {
					// Moves that do a set amount of damage:
					counter['damage']++;
					damagingMoves.push(move);
					damagingMoveIndex[moveid] = k;
				} else {
					// Are Physical/Special/Status moves:
					counter[move.category]++;
				}
				// Moves that have a low base power:
				if (move.basePower && move.basePower <= 60) {
					counter['technician']++;
				}
				// Moves that hit multiple times:
				if (move.multihit && move.multihit[1] === 5) {
					counter['skilllink']++;
				}
				// Punching moves:
				if (move.isPunchAttack) {
					counter['ironfist']++;
				}
				// Recoil:
				if (move.recoil) {
					counter['recoil']++;
				}
				// Moves which have a base power:
				if (move.basePower || move.basePowerCallback) {
					if (hasType[move.type]) {
						counter['adaptability']++;
						// STAB:
						// Power Gem, Bounce, Aeroblast aren't considered STABs. 
						// If they're in the Pokémon's movepool and are STAB, consider the Pokémon not to have that type as a STAB.
						if (moveid === 'aeroblast' || moveid === 'powergem' || moveid === 'bounce') hasStab[move.type] = false;
					}
					if (move.category === 'Physical') counter['hustle']++;
					if (move.type === 'Fire') counter['blaze']++;
					if (move.type === 'Grass') counter['overgrow']++;
					if (move.type === 'Bug') counter['swarm']++;
					if (move.type === 'Water') counter['torrent']++;
					// Make sure not to count Knock Off, Rapid Spin, etc.
					if (move.basePower > 20 || move.multihit || move.basePowerCallback) {
						damagingMoves.push(move);
						damagingMoveIndex[moveid] = k;
					}
				}
				// Moves with secondary effects:
				if (move.secondary) {
					if (move.secondary.chance < 50) {
						counter['sheerforce'] -= 5;
					} else {
						counter['sheerforce']++;
					}
				}
				// Moves with low accuracy:
				if (move.accuracy && move.accuracy !== true && move.accuracy < 90) {
					counter['inaccurate']++;
				}
				// Moves which drop stats:
				var ContraryMove = {
					leafstorm: 1, overheat: 1, closecombat: 1, superpower: 1, vcreate: 1
				};
				if (ContraryMove[moveid]) {
					counter['contrary']++;
				}
				// Moves that boost Attack:
				var PhysicalSetup = {
					swordsdance:1, dragondance:1, coil:1, bulkup:1, curse:1, bellydrum:1, shiftgear:1, honeclaws:1, howl:1
				};
				// Moves which boost Special Attack:
				var SpecialSetup = {
					nastyplot:1, tailglow:1, quiverdance:1, calmmind:1
				};
				// Moves which boost Attack AND Special Attack:
				var MixedSetup = {
					growth:1, workup:1, shellsmash:1
				};
				
				if (PhysicalSetup[moveid]) {
					counter['physicalsetup']++;
				}
				if (SpecialSetup[moveid]) {
					counter['specialsetup']++;
				}
				if (MixedSetup[moveid]) {
					counter['mixedsetup']++;
				}
			}

			// Choose a setup type:
			if (counter['mixedsetup']) {
				setupType = 'Mixed';
			} else if (counter['specialsetup']) {
				setupType = 'Special';
			} else if (counter['physicalsetup']) {
				setupType = 'Physical';
			}

			// Iterate through the moves again, this time to cull them:
			for (var k=0; k<moves.length; k++) {
				var moveid = moves[k];
				var move = this.getMove(moveid);
				var rejected = false;
				var isSetup = false;

				switch (moveid) {
				
				// not very useful without their supporting moves
				case 'sleeptalk':
					if (!hasMove['rest']) rejected = true;
					break;
				case 'endure':
					if (!hasMove['flail'] && !hasMove['endeavor'] && !hasMove['reversal']) rejected = true;
					break;
				case 'focuspunch':
					if (hasMove['sleeptalk'] || !hasMove['substitute']) rejected = true;
					break;
				case 'storedpower':
					if (!hasMove['cosmicpower'] && !setupType) rejected = true;
					break;
				case 'batonpass':
					if (!setupType && !hasMove['substitute'] && !hasMove['cosmicpower']) rejected = true;
					break;

				// we only need to set up once
				case 'swordsdance': case 'dragondance': case 'coil': case 'curse': case 'bulkup': case 'bellydrum':
					if (counter.Physical < 2 && !hasMove['batonpass']) rejected = true;
					if (setupType !== 'Physical' || counter['physicalsetup'] > 1) rejected = true;
					isSetup = true;
					break;
				case 'nastyplot': case 'tailglow': case 'quiverdance': case 'calmmind':
					if (counter.Special < 2 && !hasMove['batonpass']) rejected = true;
					if (setupType !== 'Special' || counter['specialsetup'] > 1) rejected = true;
					isSetup = true;
					break;
				case 'shellsmash': case 'growth': case 'workup':
					if (counter.Physical+counter.Special < 2 && !hasMove['batonpass']) rejected = true;
					if (setupType !== 'Mixed' || counter['mixedsetup'] > 1) rejected = true;
					isSetup = true;
					break;

				// bad after setup
				case 'seismictoss': case 'nightshade': case 'superfang':
					if (setupType) rejected = true;
					break;
				case 'knockoff': case 'perishsong': case 'magiccoat': case 'spikes':
					if (setupType) rejected = true;
					break;
				case 'uturn': case 'voltswitch':
					if (setupType || hasMove['agility'] || hasMove['rockpolish'] || hasMove['magnetrise']) rejected = true;
					break;
				case 'relicsong':
					if (setupType) rejected = true;
					break;
				case 'pursuit': case 'protect': case 'haze': case 'stealthrock':
					if (setupType || (hasMove['rest'] && hasMove['sleeptalk'])) rejected = true;
					break;
				case 'trick': case 'switcheroo':
					if (setupType || (hasMove['rest'] && hasMove['sleeptalk']) || hasMove['trickroom'] || hasMove['reflect'] || hasMove['lightscreen'] || hasMove['batonpass']) rejected = true;
					break;
				case 'dragontail': case 'circlethrow':
					if (hasMove['agility'] || hasMove['rockpolish']) rejected = true;
					if (hasMove['whirlwind'] || hasMove['roar'] || hasMove['encore']) rejected = true;
					break;

				// bit redundant to have both
				// Attacks:
				case 'flamethrower': case 'fierydance':
					if (hasMove['lavaplume'] || hasMove['overheat'] || hasMove['fireblast'] || hasMove['blueflare']) rejected = true;
					break;
				case 'overheat':
					if (setupType === 'Special' || hasMove['fireblast']) rejected = true;
					break;
				case 'icebeam':
					if (hasMove['blizzard']) rejected = true;
					break;
				case 'surf':
					if (hasMove['scald'] || hasMove['hydropump']) rejected = true;
					break;
				case 'hydropump':
					if (hasMove['razorshell'] || hasMove['scald']) rejected = true;
					break;
				case 'waterfall':
					if (hasMove['aquatail']) rejected = true;
					break;
				case 'airslash':
					if (hasMove['hurricane']) rejected = true;
					break;
				case 'bravebird': case 'pluck': case 'drillpeck':
					if (hasMove['acrobatics']) rejected = true;
					break;
				case 'solarbeam':
					if ((!hasMove['sunnyday'] && template.species !== 'Ninetales') || hasMove['gigadrain'] || hasMove['leafstorm']) rejected = true;
					break;
				case 'gigadrain':
					if ((!setupType && hasMove['leafstorm']) || hasMove['petaldance']) rejected = true;
					break;
				case 'leafstorm':
					if (setupType && hasMove['gigadrain']) rejected = true;
					break;
				case 'weatherball':
					if (!hasMove['sunnyday']) rejected = true;
					break;
				case 'firepunch':
					if (hasMove['flareblitz']) rejected = true;
					break;
				case 'bugbite':
					if (hasMove['uturn']) rejected = true;
					break;
				case 'crosschop': case 'hijumpkick':
					if (hasMove['closecombat']) rejected = true;
					break;
				case 'drainpunch':
					if (hasMove['closecombat'] || hasMove['hijumpkick'] || hasMove['crosschop']) rejected = true;
					break;
				case 'thunderbolt':
					if (hasMove['discharge'] || hasMove['voltswitch'] || hasMove['thunder']) rejected = true;
					break;
				case 'discharge': case 'thunder':
					if (hasMove['voltswitch']) rejected = true;
					break;
				case 'rockslide': case 'rockblast':
					if (hasMove['stoneedge'] || hasMove['headsmash']) rejected = true;
					break;
				case 'stoneedge':
					if (hasMove['headsmash']) rejected = true;
					break;
				case 'bonemerang': case 'earthpower':
					if (hasMove['earthquake']) rejected = true;
					break;
				case 'dragonclaw':
					if (hasMove['outrage'] || hasMove['dragontail']) rejected = true;
					break;
				case 'ancientpower':
					if (hasMove['paleowave']) rejected = true;
					break;
				case 'dragonpulse':
					if (hasMove['dracometeor']) rejected = true;
					break;
				case 'return':
					if (hasMove['bodyslam'] || hasMove['facade'] || hasMove['doubleedge'] || hasMove['tailslap']) rejected = true;
					break;
				case 'poisonjab':
					if (hasMove['gunkshot']) rejected = true;
					break;
				case 'psychic':
					if (hasMove['psyshock']) rejected = true;
					break;
				case 'fusionbolt':
					if (setupType && hasMove['boltstrike']) rejected = true;
					break;
				case 'boltstrike':
					if (!setupType && hasMove['fusionbolt']) rejected = true;
					break;

				// Status:
				case 'rest':
					if (hasMove['painsplit'] || hasMove['wish'] || hasMove['recover'] || hasMove['moonlight'] || hasMove['synthesis']) rejected = true;
					break;
				case 'softboiled': case 'roost':
					if (hasMove['wish'] || hasMove['recover']) rejected = true;
					break;
				case 'perishsong':
					if (hasMove['roar'] || hasMove['whirlwind'] || hasMove['haze']) rejected = true;
					break;
				case 'roar':
					// Whirlwind outclasses Roar because Soundproof
					if (hasMove['whirlwind'] || hasMove['dragontail'] || hasMove['haze'] || hasMove['circlethrow']) rejected = true;
					break;
				case 'substitute':
					if (hasMove['uturn'] || hasMove['voltswitch'] || hasMove['pursuit']) rejected = true;
					break;
				case 'fakeout':
					if (hasMove['trick'] || hasMove['switcheroo']) rejected = true;
					break;
				case 'encore':
					if (hasMove['rest'] && hasMove['sleeptalk']) rejected = true;
					if (hasMove['whirlwind'] || hasMove['dragontail'] || hasMove['roar'] || hasMove['circlethrow']) rejected = true;
					break;
				case 'suckerpunch':
					if (hasMove['rest'] && hasMove['sleeptalk']) rejected = true;
					break;
				case 'cottonguard':
					if (hasMove['reflect']) rejected = true;
					break;
				case 'lightscreen':
					if (hasMove['calmmind']) rejected = true;
					break;
				case 'rockpolish': case 'agility': case 'autotomize':
					if (!setupType && !hasMove['batonpass'] && hasMove['thunderwave']) rejected = true;
					if ((hasMove['stealthrock'] || hasMove['spikes'] || hasMove['toxicspikes']) && !hasMove['batonpass']) rejected = true;
					break;
				case 'thunderwave':
					if (setupType && (hasMove['rockpolish'] || hasMove['agility'])) rejected = true;
					if (hasMove['discharge'] || hasMove['trickroom']) rejected = true;
					if (hasMove['rest'] && hasMove['sleeptalk']) rejected = true;
					break;
				case 'lavaplume':
					if (hasMove['willowisp']) rejected = true;
					break;
				}
				
				// These moves can be used even if we aren't setting up to use them:
				var SetupException = {
					overheat:1, dracometeor:1, leafstorm:1,
					voltswitch:1, uturn:1,
					suckerpunch:1, extremespeed:1
				};
				if (move.category === 'Special' && setupType === 'Physical' && !SetupException[move.id]) {
					rejected = true;
				}
				if (move.category === 'Physical' && setupType === 'Special' && !SetupException[move.id]) {
					rejected = true;
				}
				
				// This move doesn't satisfy our setup requirements:
				if (setupType === 'Physical' && move.category !== 'Physical' && counter['Physical'] < 2) {
					rejected = true;
				}
				if (setupType === 'Special' && move.category !== 'Special' && counter['Special'] < 2) {
					rejected = true;
				}
				
				// Remove rejected moves from the move list.
				if (rejected && j<moveKeys.length) {
					moves.splice(k,1);
					break;
				}

				// handle HP IVs
				if (move.id === 'hiddenpower') {
					var HPivs = this.getType(move.type).HPivs;
					for (var iv in HPivs) {
						ivs[iv] = HPivs[iv];
					}
				}
			}
			if (j<moveKeys.length && moves.length === 4) {
				// Move post-processing:
				if (damagingMoves.length===0) {
					// Have a 60% chance of rejecting one move at random:
					if (Math.random()*1.66>1) moves.splice(Math.floor(Math.random()*moves.length),1);
				} else if (damagingMoves.length===1) {
					// Night Shade, Seismic Toss, etc. don't count:
					if (!damagingMoves[0].damage) {
						damagingid = damagingMoves[0].id;
						damagingType = damagingMoves[0].type;
						var replace = false;
						if (damagingid === 'suckerpunch' || damagingid === 'counter' || damagingid === 'mirrorcoat') {
							// A player shouldn't be forced to rely upon the opponent attacking them to do damage.
							if (!hasMove['encore'] && Math.random()*2>1) replace = true;
						} else if (damagingid === 'focuspunch') {
							// Focus Punch is a bad idea without a sub:
							if (!hasMove['substitute']) replace = true;
						} else if (damagingid.substr(0,11) === 'hiddenpower' && damagingType === 'Ice') {
							// Mono-HP-Ice is never acceptable.
							replace = true;
						} else {
							// If you have one attack, and it's not STAB, Ice, Fire, or Ground, reject it.
							// Mono-Ice/Ground/Fire is only acceptable if the Pokémon's STABs are one of: Poison, Psychic, Steel, Normal, Grass. 
							if (!hasStab[damagingType]) {
								if (damagingType === 'Ice' || damagingType === 'Fire' || damagingType === 'Ground') {
									if (!hasStab['Poison'] && !hasStab['Psychic'] && !hasStab['Steel'] && !hasStab['Normal'] && !hasStab['Grass']) {
										replace = true;
									}
								} else {
									replace = true;
								}
							}
						}
						if (replace) moves.splice(damagingMoveIndex[damagingid],1);
					}
				} else if (damagingMoves.length===2) {
					// If you have two attacks, neither is STAB, and the combo isn't Ice/Electric, Ghost/Fighting, or Dark/Fighting, reject one of them at random.
					var type1 = damagingMoves[0].type, type2 = damagingMoves[1].type;
					var typeCombo = [type1, type2].sort().join('/');
					var rejectCombo = true;
					if (!type1 in hasStab && !type2 in hasStab) {
						if (typeCombo === 'Electric/Ice' || typeCombo === 'Fighting/Ghost' || typeCombo === 'Dark/Fightng') rejectCombo = false;
					} else {
						rejectCombo = false;
					}
					if (rejectCombo) moves.splice(Math.floor(Math.random()*moves.length),1);
				} else {
					// If you have three or more attacks, and none of them are STAB, reject one of them at random.
					var isStab = false;
					for (var l=0; l<damagingMoves.length; l++) {
						if (hasStab[damagingMoves[l].type]) {
							isStab = true;
							break;
						}
					}
					if (!isStab) moves.splice(Math.floor(Math.random()*moves.length),1);
				}
			}
		} while (moves.length<4 && j<moveKeys.length);

		// any moveset modification goes here
		//moves[0] = 'Safeguard';
		{
			var abilities = [template.abilities['0']];
			if (template.abilities['1']) {
				abilities.push(template.abilities['1']);
			}
			if (template.abilities['DW']) {
				abilities.push(template.abilities['DW']);
			}
			abilities.sort(function(a,b){
				return this.getAbility(b).rating - this.getAbility(a).rating;
			}.bind(this));
			var ability0 = this.getAbility(abilities[0]);
			var ability1 = this.getAbility(abilities[1]);
			var ability = ability0.name;
			if (abilities[1]) {

				if (ability0.rating <= ability1.rating) {
					if (Math.random()*2<1) {
						ability = ability1.name;
					}
				} else if (ability0.rating - 0.6 <= ability1.rating) {
					if (Math.random()*3<1) {
						ability = ability1.name;
					}
				}

				var rejectAbility = false;
				if (ability === 'Blaze' && !counter['blaze']) {
					rejectAbility = true;
				}
				if (ability === 'Overgrow' && !counter['overgrow']) {
					rejectAbility = true;
				}
				if (ability === 'Swarm' && !counter['swarm']) {
					rejectAbility = true;
				}
				if (ability === 'Torrent' && !counter['torrent']) {
					rejectAbility = true;
				}
				if (ability === 'Contrary' && !counter['contrary']) {
					rejectAbility = true;
				}
				if (ability === 'Technician' && !counter['technician']) {
					rejectAbility = true;
				}
				if (ability === 'Skill Link' && !counter['skilllink']) {
					rejectAbility = true;
				}
				if (ability === 'Iron Fist' && !counter['ironfist']) {
					rejectAbility = true;
				}
				if (ability === 'Adaptability' && !counter['adaptability']) {
					rejectAbility = true;
				}
				if ((ability === 'Rock Head' || ability === 'Reckless') && !counter['recoil']) {
					rejectAbility = true;
				}
				if ((ability === 'No Guard' || ability === 'Compoundeyes') && !counter['inaccurate']) {
					rejectAbility = true;
				}
				if ((ability === 'Sheer Force' || ability === 'Serene Grace') && !counter['sheerforce']) {
					rejectAbility = true;
				}
				if (ability === 'Hustle' && !counter['hustle']) {
					rejectAbility = true;
				}
				if (ability === 'Simple' && !setupType && !hasMove['flamecharge'] && !hasMove['stockpile']) {
					rejectAbility = true;
				}
				if (ability === 'Prankster' && !counter['Status']) {
					rejectAbility = true;
				}
				if (ability === 'Defiant' && !counter['Physical'] && !hasMove['batonpass']) {
					rejectAbility = true;
				}
				// below 2 checks should be modified, when it becomes possible, to check if the team contains rain or sun
				if (ability === 'Swift Swim' && !hasMove['raindance']) {
					rejectAbility = true;
				}
				if (ability === 'Chlorophyll' && !hasMove['sunnyday']) {
					rejectAbility = true;
				}
				if (ability === 'Moody' && template.id !== 'bidoof') {
					rejectAbility = true;
				}
				if (ability === 'Lightningrod' && template.types.indexOf('Ground') >= 0) {
					rejectAbility = true;
				}

				if (rejectAbility) {
					if (ability === ability1.name) { // or not
						ability = ability0.name;
					} else if (ability1.rating > 0) { // only switch if the alternative doesn't suck
						ability = ability1.name;
					}
				}
				if ((abilities[0] === 'Guts' || abilities[1] === 'Guts' || abilities[2] === 'Guts') && ability !== 'Quick Feet' && hasMove['facade']) {
					ability = 'Guts';
				}
				if ((abilities[0] === 'Swift Swim' || abilities[1] === 'Swift Swim' || abilities[2] === 'Swift Swim') && hasMove['raindance']) {
					ability = 'Swift Swim';
				}
				if ((abilities[0] === 'Chlorophyll' || abilities[1] === 'Chlorophyll' || abilities[2] === 'Chlorophyll') && ability !== 'Solar Power' && hasMove['sunnyday']) {
					ability = 'Chlorophyll';
				}
				if (template.id === 'combee') {
					// it always gets Hustle but its only physical move is Endeavor, which loses accuracy
					ability = 'Honey Gather';
				}
			}

			if (hasMove['gyroball']) {
				ivs.spe = 0;
				//evs.atk += evs.spe;
				evs.spe = 0;
			} else if (hasMove['trickroom']) {
				ivs.spe = 0;
				//evs.hp += evs.spe;
				evs.spe = 0;
			}

			item = 'Leftovers';
			if (template.requiredItem) {
				item = template.requiredItem;
			} else if (template.species === 'Rotom-Fan') {
				// this is just to amuse myself
				item = 'Air Balloon';
			} else if (template.species === 'Delibird') {
				// to go along with the Christmas Delibird set
				item = 'Leftovers';

			// First, the extra high-priority items

			} else if (ability === 'Imposter') {
				item = 'Choice Scarf';
			} else if (hasMove["magikarpsrevenge"]) {
				item = 'Choice Band';
			} else if (ability === 'Wonder Guard') {
				item = 'Focus Sash';
			} else if (template.species === 'Unown') {
				item = 'Choice Specs';
			} else if ((template.species === 'Wynaut' || template.species === 'Wobbuffet') && hasMove['destinybond'] && Math.random()*2 > 1) {
				item = 'Custap Berry';
			} else if (hasMove['trick'] && hasMove['gyroball'] && (ability === 'Levitate' || hasType['Flying'])) {
				item = 'Macho Brace';
			} else if (hasMove['trick'] && hasMove['gyroball']) {
				item = 'Iron Ball';
			} else if (hasMove['trick'] || hasMove['switcheroo']) {
				var randomNum = Math.random()*2;
				if (counter.Physical >= 3 && (template.baseStats.spe >= 95 || randomNum>1)) {
					item = 'Choice Band';
				} else if (counter.Special >= 3 && (template.baseStats.spe >= 95 || randomNum>1)) {
					item = 'Choice Specs';
				} else {
					item = 'Choice Scarf';
				}
			} else if (hasMove['rest'] && !hasMove['sleeptalk'] && ability !== 'Natural Cure' && ability !== 'Shed Skin') {
				item = 'Chesto Berry';
			} else if (hasMove['naturalgift']) {
				item = 'Liechi Berry';
			} else if (ability === 'Harvest') {
				item = 'Sitrus Berry';
			} else if (template.species === 'Cubone' || template.species === 'Marowak') {
				item = 'Thick Club';
			} else if (template.species === 'Pikachu') {
				item = 'Light Ball';
			} else if (template.species === 'Clamperl') {
				item = 'DeepSeaTooth';
			} else if (hasMove['reflect'] && hasMove['lightscreen']) {
				item = 'Light Clay';
			} else if (hasMove['acrobatics']) {
				item = 'Flying Gem';
			} else if (hasMove['shellsmash']) {
				item = 'White Herb';
			} else if (hasMove['facade'] || ability === 'Poison Heal' || ability === 'Toxic Boost') {
				item = 'Toxic Orb';
			} else if (hasMove['raindance']) {
				item = 'Damp Rock';
			} else if (hasMove['sunnyday']) {
				item = 'Heat Rock';
			} else if (hasMove['sandstorm']) { // lol
				item = 'Smooth Rock';
			} else if (hasMove['hail']) { // lol
				item = 'Icy Rock';
			} else if (ability === 'Magic Guard' && hasMove['psychoshift']) {
				item = 'Flame Orb';
			} else if (ability === 'Sheer Force' || ability === 'Magic Guard') {
				item = 'Life Orb';
			} else if (ability === 'Unburden' && (counter['Physical'] || counter['Special'])) {
				// Give Unburden mons a random Gem of the type of one of their damaging moves
				var shuffledMoves = moves.randomize();
				for (var m in shuffledMoves) {
					var move = this.getMove(shuffledMoves[m]);
					if (move.basePower || move.basePowerCallback) {
						item = move.type + ' Gem';
						break;
					}
				}
			} else if (ability === 'Guts') {
				if (hasMove['drainpunch']) {
					item = 'Flame Orb';
				} else {
					item = 'Toxic Orb';
				}
				if ((hasMove['return'] || hasMove['hyperfang']) && !hasMove['facade']) {
					// lol no
					for (var j=0; j<moves.length; j++) {
						if (moves[j] === 'Return' || moves[j] === 'HyperFang') {
							moves[j] = 'Facade';
							break;
						}
					}
				}
			} else if (ability === 'Marvel Scale' && hasMove['psychoshift']) {
				item = 'Flame Orb';
			} else if (hasMove['reflect'] || hasMove['lightscreen']) {
				// less priority than if you'd had both
				item = 'Light Clay';
			} else if (counter.Physical >= 4 && !hasMove['fakeout'] && !hasMove['suckerpunch'] && !hasMove['flamecharge'] && !hasMove['rapidspin']) {
				if (Math.random()*3 > 1) {
					item = 'Choice Band';
				} else {
					item = 'Expert Belt';
				}
			} else if (counter.Special >= 4) {
				if (Math.random()*3 > 1) {
					item = 'Choice Specs';
				} else {
					item = 'Expert Belt';
				}
			} else if (this.getEffectiveness('Ground', template) >= 2 && ability !== 'Levitate' && !hasMove['magnetrise']) {
				item = 'Air Balloon';
			} else if ((hasMove['eruption'] || hasMove['waterspout']) && !counter['Status']) {
				item = 'Choice Scarf';
			} else if (hasMove['substitute'] && hasMove['reversal']) {
				var shuffledMoves = moves.randomize();
				for (var m in shuffledMoves) {
					var move = this.getMove(shuffledMoves[m]);
					if (move.basePower || move.basePowerCallback) {
						item = move.type + ' Gem';
						break;
					}
				}
			} else if (hasMove['substitute'] || hasMove['detect'] || hasMove['protect'] || ability === 'Moody') {
				item = 'Leftovers';
			} else if ((hasMove['flail'] || hasMove['reversal']) && !hasMove['endure'] && ability !== 'Sturdy') {
				item = 'Focus Sash';
			} else if (ability === 'Iron Barbs') {
				// only Iron Barbs for now
				item = 'Rocky Helmet';
			} else if ((template.baseStats.hp+75)*(template.baseStats.def+template.baseStats.spd+175) > 60000 || template.species === 'Skarmory' || template.species === 'Forretress') {
				// skarmory and forretress get exceptions for their typing
				item = 'Leftovers';
			} else if (counter.Physical + counter.Special >= 3 && setupType) {
				item = 'Life Orb';
			} else if (counter.Special >= 3 && setupType) {
				item = 'Life Orb';
			} else if (counter.Physical + counter.Special >= 4) {
				item = 'Expert Belt';
			} else if (i===0 && ability !== 'Sturdy' && !counter['recoil']) {
				item = 'Focus Sash';
			} else if (hasMove['outrage']) {
				item = 'Lum Berry';

			// this is the "REALLY can't think of a good item" cutoff
			// why not always Leftovers? Because it's boring. :P

			} else if (hasType['Flying'] || ability === 'Levitate') {
				item = 'Leftovers';
			} else if (this.getEffectiveness('Ground', template) >= 1 && ability !== 'Levitate' && !hasMove['magnetrise']) {
				item = 'Air Balloon';
			} else if (hasType['Poison']) {
				item = 'Black Sludge';
			} else if (counter.Status <= 1) {
				item = 'Life Orb';
			} else {
				item = 'Leftovers';
			}

			if (item === 'Leftovers' && hasType['Poison']) {
				item = 'Black Sludge';
			}
		}
		
		var level = 5;

		return {
			name: name,
			moves: moves,
			ability: ability,
			evs: evs,
			ivs: ivs,
			item: item,
			level: level,
			shiny: (Math.random()*1024<=1)
		};
	},

};
