exports.BattleScripts = {
	randomHeavyTeam: function(side) {
		var keys = [];
		var pokemonLeft = 0;
		var pokemon = [];
		for (var i in this.data.FormatsData) {
			if (this.data.FormatsData[i].viableMoves) {
				if (this.data.Pokedex[i].weightkg >= 300) {
					keys.push(i);
				}
			}
		}
		keys = keys.randomize();

		var typeCount = {};
		var typeComboCount = {};
		var uberCount = 0;
		var nuCount = 0;

		for (var i=0; i<keys.length && pokemonLeft < 6; i++) {
			var template = this.getTemplate(keys[i]);
			if (!template || !template.name || !template.types) continue;
			var tier = template.tier;
			// This tries to limit the amount of Ubers and NUs on one team to promote "fun":
			// LC Pokemon have a hard limit in place at 2; NFEs/NUs/Ubers are also limited to 2 but have a 20% chance of being added anyway.
			// LC/NFE/NU Pokemon all share a counter (so having one of each would make the counter 3), while Ubers have a counter of their own.
			if (tier === 'LC' && nuCount > 1) continue;
			if ((tier === 'NFE' || tier === 'NU') && nuCount > 1 && Math.random()*5>1) continue;
			if (tier === 'Uber' && uberCount > 1 && Math.random()*5>1) continue;

			// CAPs have 20% the normal rate
			if ((tier === 'G4CAP' || tier === 'G5CAP') && Math.random()*5>1) continue;
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

			var set = this.randomSet(template, i);

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
			// Increment Uber/NU counter:
			if (tier === 'Uber') {
				uberCount++;
			} else if (tier === 'NU' || tier === 'NFE' || tier === 'LC') {
				nuCount++;
			}
		}
		return pokemon;
	},
};
