import { createTournamentDiv } from "./menu.js";
import { connectToTournament } from "./tournament.js";
import { get_csrf_token } from "../ApiUtils.js";
import { displayErrorPopUp } from "./tournament.js";
import { hostname } from "../Router.js";
import { getUserData } from "../User.js";

async function getUsername() {
    try {
        const userData = await getUserData();
        return userData.username;
    } catch (error) {
        console.error("Error fetching user data:", error);
        return null;
    }
}

async function getUserTournaments(username) {
    try {
        const response = await fetch(`https://${hostname}:8000/api/tournament/history/${username}/`);
        if (!response.ok) {
            throw new Error('HTTP error: ' + response.status);
        }
        return await response.json();
    } catch (error) {
        throw new Error('Error:', error);
    }
}

function createTournamentInfo(tournament) {
	const parent = document.getElementById("tournamentsInfo");
	const tournamentDiv = document.createElement("div");
	tournamentDiv.className = "tournament-info";
    tournamentDiv.id = tournament.name;
	const div = document.createElement("div");
	div.textContent = tournament.name;
	tournamentDiv.appendChild(div);
	parent.appendChild(tournamentDiv);
    tournamentDiv.addEventListener("click", () => {
        connectToTournament(tournament);
    });
}

function createDivTournamentHistory(parent) {
    parent.innerHTML += '<i class="fa-solid fa-arrow-left icon" id="backIcon"></i> \
    <i class="fa-solid fa-rotate-right actualize-icon icon" id="actualizeIcon"></i>';
    const listTournament = document.getElementsByClassName("tournament")[0];
    const header = document.createElement("div");
    header.className = "list-header";
    const div = document.createElement("div");
    div.textContent = "Tournaments History";
    const div2 = document.createElement("div");
    const tournamentsInfo = document.createElement("div");
    tournamentsInfo.id = "tournamentsInfo";
    header.appendChild(div);
    listTournament.appendChild(header);
    listTournament.appendChild(tournamentsInfo);
    listTournament.id = "listTournament";
    listTournament.classList.add("tournament")
    
    parent.appendChild(listTournament);
    document.getElementById("actualizeIcon").addEventListener("click", () => {
        displayUserTournaments();
    });
}

async function displayUserTournaments() {
    if (document.getElementById("tournamentsInfo"))
        document.getElementById("tournamentsInfo").innerHTML = "";
    try {
        const username = await getUsername();
        if (!username) {
            console.error("Could not fetch the username.");
            return ;
        }
        const data = await getUserTournaments(username);
        data.tournaments.map((tournament) => {
            createTournamentInfo(tournament, tournament.participants.length, tournament.maxParticipants);
        });
    } catch (error) {
        console.error("Error:", error);
    }
}

async function createListTournament(parent) {
    createDivTournamentHistory(parent);
    displayUserTournaments();
}

export function createTournamentHistoryMenu() {
	createTournamentDiv()
    const parent = document.getElementById("tournamentMenu");
	createListTournament(parent);
}