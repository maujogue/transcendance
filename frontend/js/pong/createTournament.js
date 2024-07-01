import { connectToTournament } from "./tournament.js";
import { get_csrf_token } from "../ApiUtils.js";
import { createTournamentDiv } from "./menu.js";
import { displayErrorPopUp } from "./tournament.js";
import { hostname } from "../Router.js";

export async function sendTournamentForm(form) {
	const formData = new FormData(form);
	const fetchBody = {
		name: formData.get("name"),
		max_players: formData.get("max_players")
	}
	
	fetch(`https://${hostname}:8000/api/tournament/create/`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			"X-CSRFToken": await get_csrf_token(),
		},
		credentials: "include",
		body: JSON.stringify(fetchBody),
	})
	.then((response) => response.json())
	.then((data) => {
		if (data.errors)
			throw new Error(data.errors);
		connectToTournament(data.tournament);
	})
	.catch((error) => {
		displayErrorPopUp(error, document.getElementsByClassName("tournament")[0]);
	});
}

export function createFormTournament() {
	createTournamentDiv();
	document.getElementsByClassName("menu")[0].innerHTML += '<i class="fa-solid fa-arrow-left icon" id="backIcon"></i>';
	const parent = document.getElementsByClassName("tournament")[0];
	parent.innerHTML += '\
	<h1 class="form-header glitched" data-lang="create_tournament">Create Tournament</h1>\
	<form id="tournamentForm" method="post">\
	<div class="form-field">\
		<label for="name" class="form-field-name glitched" data-lang="name">Name :</label>\
		<input class="glitched" type="text" id="name" name="name" required>\
	</div>\
	<div class="form-field">\
		<label for="max_players" class="form-field-max_players glitched" data-lang="max_players">Max players :</label>\
		<input type="number" class="glitched" id="max_players" name="max_players" min="2" required>\
	</div>\
	<div class="glitched">\
		<button class="form-btn tournament-btn" id="form-btn" type="submit">Create</button>\
	</div>\
	</form>';
}
