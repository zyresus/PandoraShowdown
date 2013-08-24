exports.BattleScripts = {
	randomCapTeam: function(side) {
		var keys = [];
		var pokemonLeft = 0;
		var pokemon = [];
		for (var i in this.data.FormatsData) {
			if (this.data.FormatsData[i].viableMoves && (this.data.FormatsData[i].tier === "G4CAP" || this.data.FormatsData[i].tier === "G5CAP")) {
				keys.push(i);
			}
		}
		keys = keys.randomize();

		var typeCount = {};
		var typeComboCount = {};

		for (var i=0; i<keys.length && pokemonLeft < 6; i++) {
			var template = this.getTemplate(keys[i]);
			if (!template || !template.name || !template.types) continue;

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
		}
		return pokemon;
	},
};
