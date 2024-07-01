import { createDivMenu } from "./menu.js"
import { ClearAllEnv } from "./createEnvironment.js"
import { displayMainMenu } from "./menu.js"
import { tournament_username } from "./online.js";

function createEndScreen(winnerName) {
    createDivMenu("endscreen");
    const div = document.getElementById("endscreen");
    div.classList.add('endscreen');

    const h3 = document.createElement('h3');
    h3.innerText = winnerName + " WIN";
    const titleDiv = document.createElement('div');
    div.append(titleDiv);
    titleDiv.append(h3);

    const restartBtn = document.createElement('button');
    restartBtn.className = 'btn btn-endscreen';
    restartBtn.id = 'restart';
    restartBtn.innerText = 'Play again';
	restartBtn.setAttribute("data-lang", "playagain");
    const backToTheMenuBtn = document.createElement('button');
    backToTheMenuBtn.className = 'btn';
    backToTheMenuBtn.id = 'backMenu';
    backToTheMenuBtn.innerText = 'Back to menu';
	backToTheMenuBtn.setAttribute("data-lang", "backmenu");

    const backToMenuBtn = document.createElement('button');
    backToMenuBtn.className = 'btn btn-endscreen';
    backToMenuBtn.id = 'backMenu';
    backToMenuBtn.innerText = 'Back to menu';

    const btnDiv = document.createElement('div');
    btnDiv.classList.add('endscreen-btn');
    div.append(btnDiv);
    btnDiv.append(restartBtn);
    btnDiv.append(backToMenuBtn);
}

function returnToMenu() {
    console.log("returnToMenu");
    const menu = document.getElementsByClassName("menu");
    menu[0].remove();
    displayMainMenu();
}

export {createEndScreen, returnToMenu }

export function createTournamentEndScreen(winnerName) {
    console.log("inside createTournamentEndScree.\nwinnerName:" + winnerName);
    console.log("tournament username: " + tournament_username);
    createDivMenu("endscreen");
    const div = document.getElementById("endscreen");
    div.classList.add('endscreen');
    
    const h3 = document.createElement('h3');
    h3.innerText = winnerName + " WIN";
    const titleDiv = document.createElement('div');
    div.append(titleDiv);
    titleDiv.append(h3);

    const h2 = document.createElement('h2');
    if (tournament_username === winnerName) {
        h2.id = 'winMsg';
        h2.innerText = "Congratulations !";
    }
    else {
        h2.id = 'loseMsg';
        h2.innerText = "You lost.\nIt happens... more to some than to others...";
    }
    const msgDiv = document.createElement('div');
    div.append(msgDiv);
    msgDiv.append(h2);
}