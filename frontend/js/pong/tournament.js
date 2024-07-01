import { get_csrf_token} from "../ApiUtils.js";
import { returnToMenu } from "./createEndScreen.js";
import { getUserData } from "../User.js";
import { clearOnlineVariables, createOnlineSelectMenu } from "./online.js";
import { createTournamentDiv } from "./menu.js";
import { createLeaveButton, drawBracket} from "./createBracket.js";
import { hostname } from "../Router.js";
import { wsMatch } from "./online.js";
import { checkIfWebsocketIsOpen, handlerEndGame } from "./handlerMessage.js";

export let wsTournament
export let tournamentStatus;
export let playerStatus;
let userData;
let currentTournament;

export async function connectToTournament(tournament) {
    try {
        console.log("Connecting to tournament:", tournament);
        currentTournament = tournament;
        wsTournament = new WebSocket(`ws://${hostname}:8080/ws/tournament/${tournament.id}/`);
    
        wsTournament.onopen = () => {
            createWaitingScreenTournament(tournament);
            fillUserData().then(sendUsername);
        };

        wsTournament.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("Received data:", data);
            if (data.type == "participants")
                displayPlayerList(data.participants);
            if (data.type == "matchup") {
                createOnlineSelectMenu(data.match.lobby_id);
                displayTimer(data.timer)
            }
            if (data.type == "status")
                handlerMessageStatus(data);
            if (data.type == "ranking")
                displayRankingScreen(data);
            if (data.type == "bracket") {
                createTournamentDiv();
                drawBracket(data.bracket);
            }
        };
        
        wsTournament.onerror = (error) => {
            console.error("Websocket error observed:", error);
        };
        
        wsTournament.onclose = (event) => {
            playerStatus = null;
            tournamentStatus = null;
            clearOnlineVariables();
            console.log("Websocket connection closed:", event);
        };
    } catch(err) {
        console.error("Failed to connect to WebSocket:", err);
    }
}

function displayTimer(time) {
    const timerDiv = document.createElement("div");
    timerDiv.id = "timer";
    timerDiv.classList.add("timer");
    timerDiv.innerHTML = `Time left: ${time}`;
    document.getElementById("selectMenu").appendChild(timerDiv);
    setInterval(() => {
        if (time == 0)
            return ;
        time--;
        timerDiv.innerHTML = `Time left: ${time}`;
    }, 1000);
}

function handlerMessageStatus(data) {
    console.log("Status:", data.status);
    if (data.status == "disqualified") {
        playerStatus = "disqualified";
        // displayErrorPopUp("You have been disqualified", document.getElementsByClassName("tournament")[0]);
    }
    if (data.status == "endTournament")
        tournamentStatus = "finished";
    if (data.status == "start")
        tournamentStatus = "started";
    if (data.status == "waiting") {
        tournamentStatus = "waiting";
        ask_tournament_status();
    }
    if (data.status == "cancelled") {
        displayErrorPopUp(data['message'], document.getElementById('game'));
        if (checkIfWebsocketIsOpen(wsMatch)) {
            wsMatch.close();
            clearOnlineVariables();
        }
    }
}

async function ask_tournament_status() {
    setInterval(() => {
        if (tournamentStatus != "waiting" || !checkIfWebsocketIsOpen(wsTournament) || playerStatus == "disqualified")
            return ;
        wsTournament.send(JSON.stringify({
            'type': 'ask_status',
        }));
    }, 60000)
}

function displayRankingScreen(data) {
    if (!document.getElementsByClassName("tournament")[0])
        createTournamentDiv();
    const tournamentDiv = document.getElementsByClassName("tournament")[0];
    tournamentDiv.innerHTML = `<h1 class="won-title">${data.winner} won the tournament!</h1>`;
    displayTournamentRanking(data.ranking);
    createLeaveButton(tournamentDiv);
    createShowBracketButton(tournamentDiv);
}

function displayTournamentRanking(ranking) {
    console.log("displayTournamentRanking: ", ranking);
    const rankingDiv = document.createElement("div");
    rankingDiv.className = "ranking";
    rankingDiv.innerHTML = "<h2 class='ranking-title'>Ranking</h2>";
    const podiumDiv = document.createElement("div");
    podiumDiv.className = "podium";
    const podium = ["🥇", "🥈", "🥉"]
    const otherDiv = document.createElement("div"); 
    otherDiv.className = "other";
    let pos = 1;
    ranking.reverse();
    ranking.map((player) => {
        if (player != null) {
            const playerDiv = document.createElement("div");
            playerDiv.className = "player";
            if (pos < 4) {
                playerDiv.innerHTML = `<p>${podium[pos - 1]} ${player}</p>`;
                podiumDiv.appendChild(playerDiv);
            } else {
                playerDiv.innerHTML = `<p>${pos}. ${player}</p>`;
                otherDiv.appendChild(playerDiv);
            }
            pos++;
        }
    });
    rankingDiv.appendChild(podiumDiv);
    rankingDiv.appendChild(otherDiv);
    document.getElementsByClassName("tournament")[0].appendChild(rankingDiv);
}


function displayPlayerList(participants) {
    console.log("displayPlayerList");
    if (document.getElementById("player-list"))
        document.getElementById("player-list").innerHTML = "";
    participants.map((participant) => insertPlayer(participant));
}

async function fillUserData() {
    await getUserData().then((data) => {
        userData = data;
    });
}

async function sendUsername() {
    wsTournament.send(JSON.stringify({
        'type': 'auth',
        'username': userData.username,
    }));
}

export async function unsubscribeFromTournament() {
    console.log("Unsubscribing from tournament: ", currentTournament);
    fetch(`https://${hostname}:8000/api/tournament/${currentTournament.id}/quit/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": await get_csrf_token(),
        },
    })
    .then((response) => {
        if (!response.ok)
            throw new Error("Error while unsubscribing from tournament");
        console.log("Unsubscribed from tournament");
        returnToMenu();
        wsTournament.close();
    })
    .catch((error) => {
        console.error(error);
    });
}

export async function checkIfUserIsInTournament(user) {
    return fetch(`https://${hostname}:8000/api/tournament/check-subscribed/${user.username}/`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": await get_csrf_token(),
        },
    })
    .then((response) => {
        if (!response.ok)
            throw new Error("Error while checking if user is in tournament");
        return response.json();
    })
    .catch((error) => {
        console.error(error);
        return false;
    });
}

export function displayErrorPopUp (message, parent) {
    console.error("displayErrorPopUp", message);
    const errorPopUp = document.createElement("div");
    errorPopUp.id = "errorPopUp";
    errorPopUp.className = "error-pop-up pop-up";
    errorPopUp.innerHTML = `<p>${message}</p>`;
    parent.appendChild(errorPopUp);
    setTimeout(() => {
        if (document.getElementById("errorPopUp"))
            document.getElementById("errorPopUp").remove();
    }, 3000);
}

export function createShowBracketButton(parent) {
    const seeBracketBtn = document.createElement("button");
    seeBracketBtn.textContent = "Show bracket";
    seeBracketBtn.className = "show-bracket-btn end-tournament-btn tournament-btn";
    parent.appendChild(seeBracketBtn);
    seeBracketBtn.onclick = () => ask_bracket();
}

function ask_bracket() {
    wsTournament.send(JSON.stringify({
        'type': 'bracket',
    }));
}

export function createUnsubscribeButton(parent) {
    const unsubscribeBtn = document.createElement("button");
    unsubscribeBtn.textContent = "Unsubscribe";
    unsubscribeBtn.onclick = () => unsubscribeFromTournament();
    unsubscribeBtn.className = "unsubscribe-btn tournament-btn";
    parent.appendChild(unsubscribeBtn);
}

export function createWaitingScreenTournament(tournament) {
    if (!tournament)
        return;
    if (!document.getElementsByClassName("tournament")[0])
        createTournamentDiv();
    document.getElementById("backIcon")?.remove();
    document.getElementById("actualizeIcon")?.remove();
    const tournamentDiv = document.getElementsByClassName("tournament")[0];
    tournamentDiv.innerHTML = `<h1>${tournament.name}</h1>`;
    tournamentDiv.id = "PlayerList";
	const header = document.createElement("div");
	header.className = "list-header";
	header.textContent = "Players";
    const playerList = document.createElement("div");
    playerList.className = "player-list";
    playerList.id = "player-list";
    createUnsubscribeButton(tournamentDiv);
	tournamentDiv.appendChild(header);
    tournamentDiv.appendChild(playerList);
}

export function insertPlayer(player) {
	const div = document.createElement("div");
    const playerList = document.getElementById("player-list");
	div.textContent = player;
    playerList?.appendChild(div);
}