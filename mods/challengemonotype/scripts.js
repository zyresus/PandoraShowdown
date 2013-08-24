exports.BattleScripts = {
	randomCCMonoTeam: function(side) {
		//this tier intends to use challenge cup sets and allow each team to have a different type
               		var teamdexno = [];
                	var team = [];
                	var typesarray = ["Bug", "Dragon", "Electric", "Water", "Fire", "Flying", "Dark", "Grass", "Ground", "Ice", "Normal", "Poison", "Psychic", "Rock", "Ghost", "Fighting", "Steel"];              
                	var sidetype = typesarray.sample();
		//var banarray = [351,413,479,492,493,555,648];
		//Kecleon, Castform, Wormadam, Rotom, Shaymin, Arceus, Darmanitan, Meloetta
 
 		//console.log(side.name + "'s type is " + sidetype);
 
           		//pick six random pokemon--no repeats, even among formes
                	//also need to either normalize for formes or select formes at random
                	//unreleased are okay. No CAP for now, but maybe at some later date
                	for (var i=0; i<6; i++)
                	{
                        		while (true) {
                                		do
                                		{
                                			var x=Math.floor(Math.random()*649)+1;
					//if (banarray.indexOf(x) != -1) continue;
                                        			var formes = [];
                                        			for (var j in this.data.Pokedex) {
                                        				if (this.data.Pokedex[j].num === x && this.getTemplate(this.data.Pokedex[j].species).learnset) {
                                        					formes.push(this.data.Pokedex[j].species);
                                        				}
                                        			}

					for (var j=0; j<formes.length; j++)
					{
                                        				var poke = formes[j];
                                        				if (!poke) {
                                        					console.log("Debug: poke was undefined."); //not expected in any way
                                        					break;
                                       		 		}
                                        				var template = this.getTemplate(poke);
                                       				 if (!template) {
                                        					console.log("Debug: template was undefined.");
                                        					break;
                                        				}
                                        				//console.log("The species is " + template.species);
                                        				var type1 = template.types[0];
                                        				if (!type1) {
                                        					console.log("Debug: type1 was undefined.");
                                        					break;
                                        				}
                                        				var type2 = template.types[1];
                                        				if (!type2) {
                                        					//console.log(i + ", " + x + ", " + template.species + ", only " + type1);
                                        					if (i==0) {
                                        						var righttype = false;
                                        						//first poke will always have double typing
                                        					}
                                        					else {
                                        						var righttype = (type1==sidetype);
                                        					}
                                        				}
                                        				else { 
                                        					//console.log(i + ", " + x + ", " + template.species + ", " + type1 + " and " + type2);
                                        					var righttype = (type1==sidetype || type2==sidetype);
                                        				}
						if(righttype) break;
					}
                                		}
                                		while (!righttype);
                                
                               
                                if (teamdexno.indexOf(x) === -1) {
                                        teamdexno.push(x);
                                        break;
                                }
                        }
                }
 
                for (var i=0; i<6; i++) {
 
                        //choose forme
                        var formes = [];

                        for (var j in this.data.Pokedex) {
		if (this.data.Pokedex[j].num === teamdexno[i] && this.getTemplate(this.data.Pokedex[j].species).learnset) {
			var prototemplate = this.getTemplate(this.data.Pokedex[j].species);
                                        	if (!prototemplate.types[1]) {
                                        		if (i==0) {
                                        			var righttype = false;
                	                        	} else {
                                        			var righttype = (prototemplate.types[0]==sidetype);
                                        		}
                                        	} else {
                                	        		var righttype = (prototemplate.types[0]==sidetype || prototemplate.types[1]==sidetype);
                                        	}
			if (righttype) {
	                                        formes.push(this.data.Pokedex[j].species);
                	                }
		}
                        }
                        var poke = formes.sample();
                        var template = this.getTemplate(poke);
 
                        //level balance--calculate directly from stats rather than using some silly lookup table
                        var mbstmin = 1307; //sunkern has the lowest modified base stat total, and that total is 807
 
                        var stats = template.baseStats;
 
                        //modified base stat total assumes 31 IVs, 85 EVs in every stat
                        var mbst = (stats["hp"]*2+31+21+100)+10;
                        mbst += (stats["atk"]*2+31+21+100)+5;
                        mbst += (stats["def"]*2+31+21+100)+5;
                        mbst += (stats["spa"]*2+31+21+100)+5;
                        mbst += (stats["spd"]*2+31+21+100)+5;
                        mbst += (stats["spe"]*2+31+21+100)+5;
                       
                        var level = Math.floor(100*mbstmin/mbst); //initial level guess will underestimate
 
                        while (level < 100) {
                                mbst = Math.floor((stats["hp"]*2+31+21+100)*level/100+10);
                                mbst += Math.floor(((stats["atk"]*2+31+21+100)*level/100+5)*level/100); //since damage is roughly proportional to lvl
                                mbst += Math.floor((stats["def"]*2+31+21+100)*level/100+5);
                                mbst += Math.floor(((stats["spa"]*2+31+21+100)*level/100+5)*level/100);
                                mbst += Math.floor((stats["spd"]*2+31+21+100)*level/100+5);
                                mbst += Math.floor((stats["spe"]*2+31+21+100)*level/100+5);
 
                                if (mbst >= mbstmin)
                                        break;
                                level++;
                        }
                       
 
                        //random gender--already handled by PS?
                       
                        //random ability (unreleased DW are par for the course)
                        var abilities = [template.abilities['0']];
                        if (template.abilities['1']) {
                                abilities.push(template.abilities['1']);
                        }
                        if (template.abilities['DW']) {
                                abilities.push(template.abilities['DW']);
                        }
                        var ability = abilities.sample();
 
                        //random nature
                        var nature = ["Adamant", "Bashful", "Bold", "Brave", "Calm", "Careful", "Docile", "Gentle", "Hardy", "Hasty", "Impish", "Jolly", "Lax", "Lonely", "Mild", "Modest", "Naive", "Naughty", "Quiet", "Quirky", "Rash", "Relaxed", "Sassy", "Serious", "Timid"].sample();
 
                        //random item--I guess if it's in items.js, it's okay  
                        var item = Object.keys(this.data.Items).sample();
 
                        //since we're selecting forme at random, we gotta make sure forme/item combo is correct
                        if (template.requiredItem) {
                                item = template.requiredItem;
                        }
                        while ((poke === 'Arceus' && item.indexOf("plate") > -1) || (poke === 'Giratina' && item === 'griseousorb')) {
                                item = Object.keys(this.data.Items).sample();
                        }
                               
                               
 
                        //random IVs
                        var ivs = {
                                hp: Math.floor(Math.random()*32),
                                atk: Math.floor(Math.random()*32),
                                def: Math.floor(Math.random()*32),
                                spa: Math.floor(Math.random()*32),
                                spd: Math.floor(Math.random()*32),
                                spe: Math.floor(Math.random()*32)
                        };
 
                        //random EVs
                        var evs = {
                                hp: 0,
                                atk: 0,
                                def: 0,
                                spa: 0,
                                spd: 0,
                                spe: 0
                        };
                        var s = ["hp","atk","def","spa","spd","spe"];
                        var evpool = 510;
                        do
                        {
                                var x = s.sample();
                                var y = Math.floor(Math.random()*Math.min(256-evs[x],evpool+1));
                                evs[x]+=y;
                                evpool-=y;
                        } while (evpool > 0);
 
                        //random happiness--useless, since return/frustration is currently a "cheat"
                        var happiness = Math.floor(Math.random()*256);
 
                        //random shininess?
                        var shiny = (Math.random()*1024<=1);
 
                        //four random unique moves from movepool. don't worry about "attacking" or "viable"
                        var moves;
                        var pool = ['struggle'];
                        if (poke === 'Smeargle') {
                                pool = Object.keys(this.data.Movedex).exclude('struggle', 'chatter');
                        } else if (template.learnset) {
                                pool = Object.keys(template.learnset);
                        }
                        if (pool.length <= 4) {
                                moves = pool;
                        } else {
                                moves=pool.sample(4);
                        }
 
                        team.push({
                                name: poke,
                                moves: moves,
                                ability: ability,
                                evs: evs,
                                ivs: ivs,
                                nature: nature,
                                item: item,
                                level: level,
                                happiness: happiness,
                                shiny: shiny
                        });
                }
 
                //console.log(team);
                return team;
        },
};