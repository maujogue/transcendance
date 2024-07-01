import { displayCharacter } from "./displayCharacter.js";
import { createSelectMenu, createWaitingScreen, createInterfaceSelectMenu, createHUD} from "./menu.js";
import { handleMenuKeyPress} from "./handleKeyPress.js";
import { ClearAllEnv } from "./createEnvironment.js";
import { initGame } from "./initGame.js";
import { translateBall} from "./onlineCollision.js";
import { handlerScore, setBallData, handlerStatusMessage, removeGameScreen, checkIfWebsocketIsOpen, displayIntroScreen } from "./handlerMessage.js";
import { sendCharacter} from "./sendMessage.js";
import { characters } from "../pages/game.js";
import { updateMixers } from "./displayCharacter.js";
import { resize } from "./resize.js";
import { getUserData } from "../User.js";
import { field } from "../pages/game.js";
import { wsTournament } from "./tournament.js";
import { hostname } from "../Router.js";

let requestId
let env;
let player;
let opp;
let keysPressed = {};
let keyPress = false;
let status = {
    'start': false,
    'exit': false,
    'is_connected': false,
}
let keyUp = false;
export let wsMatch = null;
let oppInfo;
let lobbyId = null;
export const playersMove = new Map();
export let tournament_username

function setUserInfo(data) {
    let user = {
        'username': data['username'],
        'avatar': `data:image/png;base64, ${data['avatar']}`
    }
    return user;
}

export function clearOnlineVariables() {
    cancelAnimationFrame(requestId);
    wsMatch = null;
    player = null;
    opp = null;
    keysPressed = {};
    keyPress = false;
    status = {
        'start': false,
        'exit': false,
    }
    keyUp = false;
    oppInfo = null;
    lobbyId = null;
    playersMove.clear();
    ClearAllEnv(env)
}


document.addEventListener('keypress', function(event) {
    keysPressed[event.key] = true;
    keyPress = true;
    event.stopPropagation();
})

document.addEventListener("keyup", function(event) {
    delete keysPressed[event.key];
    keyPress = false;
    if (status.start && (event.key == 'w' || event.key == 's')) {
        keyUp = true;
    }
    event.stopPropagation();
});

document.addEventListener('fullscreenchange', function () {
    if (!status.exit)
        resize(env);
});

function leaveMatchmaking() {
    if (wsMatch)
        wsMatch.close();
    document.getElementById("waitingScreen")?.remove();
    createInterfaceSelectMenu();
    removeP2Cursor();
    const paddle = env.scene.getObjectByName("paddle_" + player.name);
    player.name = "player";
    paddle.name = "paddle_player";
}

function clickHandler(event) {
    if (event.target.id == 'restart') {
        document.getElementById("endscreen")?.remove();
        sendIsReady(wsMatch);
    }
    if (event.target.id == 'backMenu') {
        document.getElementById("endscreen")?.remove();
        if (wsMatch)
            wsMatch.close();
    }
    if (event.target.id == 'closeMatchmaking')
        leaveMatchmaking();
}

function removeP2Cursor() {
    document.getElementById("cursorP2").remove();
    document.getElementsByClassName("inputP2")[0].remove();
}


async function goToOnlineSelectMenu() {
    env = createSelectMenu(characters);
    removeP2Cursor();
}

async function createOnlineSelectMenu(id) {
    if (wsMatch)
        wsMatch.close();
    if (id)
        lobbyId = id;
    document.getElementsByClassName("menu")[0]?.remove();
    status.exit = false;
    goToOnlineSelectMenu(field);
    displayCharacter(player, env, "chupacabra", "player").then((res) => {
        player = res;
        const paddle = env.scene.getObjectByName("paddle_" + player.name);
        paddle.position.x = 2.5;
        onlineGameLoop(wsMatch);
    });
}

async function connectToLobby(username) {
    if (username == null)
        return ;
    console.log(`Connecting to the server with username: ${username} and lobbyId: ${lobbyId}`);
    if (!lobbyId)
        wsMatch = new WebSocket(`ws://${hostname}:8080/ws/lobby/`);
    else {
        wsMatch = new WebSocket(`ws://${hostname}:8080/ws/lobby/${lobbyId}/`);
    }
    
    tournament_username = username;
    wsMatch.onopen = function() {
        console.log("Connected to the server mutliplayer");
        status.is_connected = true;
        document.getElementById("selectMenu").remove();
        wsMatch.send(JSON.stringify({
            'type': 'auth',
            'username': username,
        }));
        createWaitingScreen();
        cancelAnimationFrame(requestId);
        onlineGameLoop(wsMatch);
        send_ping();
    }
    
    document.addEventListener('click', clickHandler);
    
    wsMatch.onmessage = function(e) {
        const data = JSON.parse(e.data);

        if (data['type'] == 'player_data') {
            const paddle = env.scene.getObjectByName("paddle_" + player.name);
            player.name = data['name'];
            paddle.name = "paddle_" + data['name'];
        }
        if (data['type'] && data['type'] == 'status')
            handlerStatusMessage(data, wsMatch, env, status);
        if (data['type'] == 'match_info')
            displayIntroScreen(env, data);
        if (data['type'] == 'ball_data')
            setBallData(data, env);
        if (data['type'] == 'auth' && data['status'] == 'failed') 
            wsMatch.close();
        if (data['type'] == 'character_data') {
            if (data['name'] != player.name) {
                console.log('displayCharacter:', data['character'], data['name'])
                displayCharacter(opp, env, data['character'], data['name']).then((res) => {
                    opp = res;
                    opp.character.removeCharacterFromLobby(env);
                });
            }
        }
        if (data['type'] == 'user_info') {
            if (data['username'] == username)
                player.userInfo = setUserInfo(data);
            else 
                oppInfo = setUserInfo(data);
        }
        if (data['type'] == 'player_pos')
            movePaddle(data);
        if (data['type'] == 'score')
            handlerScore(data, env, player, opp);
        if (data['type'] == 'ask_character') {
            wsMatch.send(JSON.stringify({
                "character": player.character.name
            }));
        }
        if (data['type'] == 'ask_user' && player.userInfo) {
            wsMatch.send(JSON.stringify({
                'type': 'user_info',
                'username': username,
                'avatar': player.userInfo.avatar.split(' ')[1],
                'name': player.name
            }));
        } 
    }

    wsMatch.onclose = function(e) {
        console.log('Connection closed', e.code, e.reason);
        status.is_connected = false;
        if (status.start)
            clearOnlineVariables();
    }

    wsMatch.onerror = function(e) {
        status.is_connected = false;
        const selectMenu = document.getElementById("selectMenu");
        const div = document.createElement("div");
        div.id = "error";
        div.innerHTML = "Error while connecting to the server";
        selectMenu.appendChild(div);
        wsMatch = null;
    }
}

async function send_ping() {
    setInterval(() => {
        if (checkIfWebsocketIsOpen(wsMatch)) {
            wsMatch.send(JSON.stringify({
                'type': 'ping'
            }));
        }
        if (status.start)
            return ;
    }, 1000);
}

function movePaddle(data) {
    const paddle = env.scene.getObjectByName("paddle_" + data['name']);
    if (!paddle)
        return ;
    paddle.translateY(data['move']);
    if (paddle.position.y != data['posY'])
        paddle.position.y = data['posY'];
}

function sendMove(wsMatch) {
    const move = (keysPressed["w"]) ? 1 : -1;

    if (keyPress && (keysPressed["w"] || keysPressed["s"])) {
        if (Math.sign(playersMove.get(player.name)) == move)
            return ;
        wsMatch.send(JSON.stringify({
            'type': 'player_pos',
            'move': move
        }));
        keyPress = false;
        keysPressed["w"] = false;
        keysPressed["s"] = false;
    }
    if (keyUp) {
        wsMatch.send(JSON.stringify({
            'type': 'player_pos',
            'move': 0
        }));
        keyUp = false;
    }
}

async function sendIsReady(wsMatch) {
    await sendCharacter(wsMatch);
    wsMatch.send(JSON.stringify({
        'ready': 'true'
    }));
}

async function setGameIsStart() {
    console.log("setGameIsStart");
    if (player && opp && oppInfo) {
        opp.userInfo = oppInfo;
        if (player.name == "player1")
            env = await initGame(player, opp);
        else
            env = await initGame(opp, player);
        status.gameIsInit = false;
        status.start = true;
    }
}

async function onlineGameLoop(wsMatch) {
    if (document.getElementById("menu")) {
        ClearAllEnv(env);
        wsMatch?.close();
        keyPress = false;
        status.exit = true;
        document.removeEventListener('click', clickHandler);
    }
    if (keysPressed[' '] && !status.is_connected) {
        keysPressed[' '] = false;
        console.log("Connecting to the server");
        getUserData('tournament_username').then((res) => {
            connectToLobby(res, null)
        })
        .catch((err) => {
            console.log(err);
        });
    }
    if (!status.start && keyPress) {
        handleMenuKeyPress(keysPressed, player, null, env);
        keyPress = false;
    }
    if (status.gameIsInit)
        await setGameIsStart();
    if (status.start && wsMatch) {
        translateBall(env.ball);
        sendMove(wsMatch);
    }
    env.renderer.render(env.scene, env.camera);
    updateMixers(player, opp);
    if (!status.exit)
        requestId = requestAnimationFrame(() => onlineGameLoop(wsMatch));
}

export { connectToLobby, onlineGameLoop, goToOnlineSelectMenu, createOnlineSelectMenu}