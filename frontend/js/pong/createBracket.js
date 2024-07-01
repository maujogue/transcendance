import { displayMainMenu } from "./menu.js";
import { createUnsubscribeButton, playerStatus, tournamentStatus } from "./tournament.js";
import { wsTournament } from "./tournament.js";
import { winHeight, winWidth } from "./varGlobal.js";

let canvas;
let ctx;
const startX = 75;
const startY = 20;
let boxWidth;
let boxHeight;
let horizontalSpacing;

function drawMatchBox(x, y, match) {
    ctx.fillStyle = 'white';
    ctx.fillRect(x, y, boxWidth, boxHeight);

    ctx.strokeRect(x, y, boxWidth, boxHeight);
    ctx.font = '0.8em Arial';
    writePlayerName(x + 10 ,y + 20, match.player1, match.player1_score, match.winner);
    writePlayerName(x + 10, y + (boxHeight - 10), match.player2, match.player2_score, match.winner);
}

function writePlayerName(x, y, playerName, score, winner) {
    if (winner === playerName)
        ctx.fillStyle = 'green';
    else if (!winner || winner === null)
        ctx.fillStyle = 'black';
    else
        ctx.fillStyle = 'red';
    if (!playerName) {
        playerName = "-";
        score = "-";
        ctx.fillStyle = "black";
    }
    ctx.fillText(`${playerName}`, x, y);
    ctx.fillText(`${score}`, x + boxWidth - 25, y);
    ctx.fillStyle = 'black';
}

function drawConnectingLine(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    const midX = (x1 + x2) / 2;
    ctx.lineTo(midX, y1);
    ctx.lineTo(midX, y2);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function createBracketCanvas() {
    if (document.getElementById('bracketCanvas'))
        document.getElementById('bracketCanvas').remove();
    const tournamentDiv = document.getElementsByClassName('tournament')[0];
    const canvas = document.createElement('canvas');
    canvas.id = 'bracketCanvas';
    canvas.width = tournamentDiv.offsetWidth - 20;
    canvas.height = tournamentDiv.offsetHeight - 20;
    tournamentDiv?.appendChild(canvas);
}

function updateButtonWithStatus() {
    if (tournamentStatus === "finished" || playerStatus === "disqualified") {
        createLeaveButton(document.getElementsByClassName('tournament')[0]);
        if (tournamentStatus === "finished")
            displayRankingButton(document.getElementsByClassName('tournament')[0]);
    }
    if (tournamentStatus != "finished")
        displayWaitingText();
}

function displayWaitingText() {
    const waitingText = document.createElement('p');
    let textContent;
    waitingText.id = 'waitingText';
    waitingText.classList.add('waiting-text');
    document.getElementsByClassName('tournament')[0].appendChild(waitingText);
    let dots = '';
    let maxDots = 3;
    let interval = 500;
    
    setInterval(() => {
        if (tournamentStatus === "started")
            textContent = 'Tournament start in few seconds';
        if (tournamentStatus === "waiting")
            textContent = 'Waiting for players to finish their matches';
        if (playerStatus === "disqualified") {
            waitingText.remove();
            return;
        }
        if (dots.length < maxDots) {
            dots += '.';
        } else {
            dots = '';
        }
        waitingText.textContent = `${textContent}${dots}`;
    }, interval);
}

function setDimensions() {
    const tournamentDiv = document.getElementsByClassName('tournament')[0];
    boxWidth =  tournamentDiv.offsetWidth / 5;
    boxHeight = tournamentDiv.offsetHeight / 10;
    horizontalSpacing = tournamentDiv.offsetWidth / 3.5;
}

export function drawBracket(bracket) {
    const tournamentName = document.createElement('h1');
    tournamentName.textContent = bracket.tournament.name;
    document.getElementsByClassName('tournament')[0].appendChild(tournamentName);
    updateButtonWithStatus();
    createBracketCanvas(bracket.tournament.name);
    setDimensions();
    canvas = document.getElementById('bracketCanvas');
    ctx = canvas.getContext('2d');
    ctx.font = '12px Arial';
    let prevRoundMatchesPosY = [];
    const rounds = bracket.tournament.rounds;

    rounds.forEach((round, roundIndex) => {

        let matchesPosY = [];
        let indexMatchesPosY = 0;
        const roundX = startX + roundIndex * horizontalSpacing;
        const prevRoundX = (startX + (roundIndex - 1) * horizontalSpacing) + boxWidth;

        ctx.font = '1em Arial';
        ctx.fillStyle = 'black';
        ctx.fillText(round.name, roundX + (boxHeight / 2), startY);
        round.matches.forEach((match, matchIndex) => {
            let matchY;

            if (roundIndex === 0) {
                const verticalSpacing = 8;
                matchY = (startY + 40) + matchIndex * (boxHeight + verticalSpacing);
            }
            else {
                let verticalSpacing = prevRoundMatchesPosY[indexMatchesPosY + 1] - (prevRoundMatchesPosY[indexMatchesPosY] + boxHeight);
                if (prevRoundMatchesPosY[indexMatchesPosY + 1] === undefined)
                    verticalSpacing = (prevRoundMatchesPosY[indexMatchesPosY] - boxHeight) / 2;
                const twoBoxHeight = (boxHeight * 2) + (verticalSpacing / 2);
                matchY = (prevRoundMatchesPosY[indexMatchesPosY]  + (twoBoxHeight / 2)) - (boxHeight / 2);
            }
            matchesPosY.push(matchY);

            drawMatchBox(roundX, matchY, match);
            
            if (roundIndex != 0) {
                const prevMatchYCenter1 = prevRoundMatchesPosY[indexMatchesPosY] + (boxHeight / 2);
                const prevMatchYCenter2 = prevRoundMatchesPosY[indexMatchesPosY + 1] + (boxHeight / 2);
                const matchYCenter = matchY + boxHeight / 2;
                drawConnectingLine(roundX - 5, matchYCenter, prevRoundX + 5, prevMatchYCenter1);
                drawConnectingLine(roundX - 5, matchYCenter, prevRoundX + 5, prevMatchYCenter2);
            }
            indexMatchesPosY += 2;
        });
        prevRoundMatchesPosY = matchesPosY;
    });
}

function displayRankingButton(parent) {
    const btn = document.createElement('button');
    btn.id = 'showRanking';
    btn.classList.add('tournament-btn', 'show-ranking-btn', 'end-tournament-btn');
    btn.textContent = 'Show Ranking';
    parent.appendChild(btn);
    document.getElementById('showRanking').addEventListener('click', () => {
        wsTournament.send(JSON.stringify({type: "getRanking"}));
    });
}

export function createLeaveButton(parent) {
    const btn = document.createElement('button');
    btn.id = 'leaveTournament';
    btn.classList.add('tournament-btn', 'leave-tournament-btn', 'end-tournament-btn');
    btn.textContent = 'Exit';
    parent.appendChild(btn);
    document.getElementById('leaveTournament').addEventListener('click', () => {
        if (wsTournament)
            wsTournament.close();
        displayMainMenu();
    });
}