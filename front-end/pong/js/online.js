import { displayCharacter } from "./displayCharacter.js";
import { createSelectMenu } from "./menu.js";
import { handleMenuKeyPress} from "./handleKeyPress.js";
import { ClearAllEnv } from "./createEnvironment.js";
import { initGame } from "./initGame.js";
import { getColorChoose } from "./getColorChoose.js";
import { translateBall} from "./onlineCollision.js";
import { handlerScore, setBallData, handlerStatusMessage } from "./handlerMessage.js";
import * as THREE from 'three';

let env;
let player;
let opp;
let keysPressed = {};
let keyPress = false;
let status = {
    'ready': false,
    'start': false,
    'isReady': false,
    'exit': false,
}
let keyUp = false;
let name;
let webSocket;

const playersMove = new Map();

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

function clickHandler(event) {
    if (event.target.id == 'restart') {
        console.log('restart');
        if (document.getElementById("endscreen"))
            document.getElementById("endscreen").remove();
        sendIsReady(webSocket);
    }
}

async function goToOnlineSelectMenu(field) {
    document.getElementById("menu").remove();
    env = createSelectMenu(field);
    document.getElementById("cursorP2").remove();
    env.renderer.render(env.scene, env.camera);
}

async function connectToLobby(field) {
    webSocket = new WebSocket('ws://localhost:8000/ws/lobby/1/');
    
    webSocket.onopen = function() { 
        console.log('Connection established');
        exit = false;
        goToOnlineSelectMenu(field);
        onlineGameLoop(webSocket);
    }
    
    document.addEventListener('click', clickHandler);
    
    webSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);

        if (data['type'] == 'player_data') {
            name = data['name'];
            displayCharacter(player, env, data['color'], name).then((res) => {
                player = res;
            });
        }
        if (data['type'] && data['type'] == 'status')
            handlerStatusMessage(data, webSocket, env, status);
        if (data['type'] == 'ball_data')
            setBallData(data, env);
        if (data['color_data']) {
            displayCharacter(opp, env, data['color_data'], data['name']).then((res) => {
                opp = res;
            });
        }
        if (data['message'] == 'start')
            status.gameIsInit = true;
        if (data['type'] == 'player_pos')
            env.scene.getObjectByName(data['name']).position.y = data['posY'];
            playersMove.set(data['name'], data['move']);
        if (data['type'] == 'score')
            handlerScore(data, env, player, opp);
    }

    webSocket.onclose = function(e) {
        console.log('Connection closed');
        status.exit = true;
    }
    
}

async function sendColor(webSocket) {
    const color = getColorChoose('cursorP1');
    if (!color)
        return ;
    displayCharacter(player, env, color, name).then((res) => {
        player = res;
    });
    await webSocket.send(JSON.stringify({
        'color': color
    }));
}

function setIsReady() {
    let ready;

    if (status.isReady) {
        status.isReady = false;
        ready = 'false';
    } else {
        status.isReady = true;
        ready = 'true';
    }
    keysPressed['Enter'] = false;
    return (ready);
}

function sendMove(webSocket) { 
    const move = (keysPressed["w"]) ? 1 : -1;

    if (keyPress && (keysPressed["w"] || keysPressed["s"])) {
        if (Math.sign(playersMove.get(name)) == move)
            return ;
        webSocket.send(JSON.stringify({
            'type': 'player_pos',
            'move': move,
            'posY': player.paddle.mesh.position.y
        }));
        keyPress = false;
        keysPressed["w"] = false;
        keysPressed["s"] = false;
    }
    if (keyUp) {
        webSocket.send(JSON.stringify({
            'type': 'player_pos',
            'move': 0,
            'posY': player.paddle.mesh.position.y
        }));
        keyUp = false;
    }
}

function movePlayers() {
    playersMove.forEach((value, key) => {
        const paddle = env.scene.getObjectByName(key);
        if (!paddle)
            return ;
        const playerBox = new THREE.Box3().setFromObject(paddle);
        if (value > 0 && !env.border.up.box.intersectsBox(playerBox)) {
            paddle.translateY(value);
        }
        else if (value < 0 && !env.border.down.box.intersectsBox(playerBox)) {
            paddle.translateY(value);
        }
    });
}

function sendIsReady(webSocket) {
    const status = setIsReady();
    console.log('sendIsReady', status);
    keysPressed['Enter'] = false;
    keyPress = false;
    webSocket.send(JSON.stringify({
        'ready': status
    }));
}

async function setGameIsStart() {
    if (player && opp) {
        ClearAllEnv(env);
        env = await initGame(player, opp);
        status.gameIsInit = false;
        status.start = true;
    }
}

async function onlineGameLoop(webSocket) {
    if (document.getElementById("menu")) {
        ClearAllEnv(env);
        webSocket.close();
        keyPress = false;
        document.removeEventListener('click', clickHandler);
    }
    if (!status.start && keysPressed['Enter'])
        sendIsReady(webSocket);
    if (!status.start && keyPress) {
        handleMenuKeyPress(keysPressed, player, null, env);
        await sendColor(webSocket);
        keyPress = false;
    }
    if (status.gameIsInit)
        await setGameIsStart();
    if (status.start) {
        sendMove(webSocket);
        movePlayers();
        translateBall(env.ball);
        webSocket.send(JSON.stringify({ 'type': 'frame' }));
    }
    env.renderer.render(env.scene, env.camera);
    if (!status.exit)
        requestAnimationFrame(() => onlineGameLoop(webSocket));
}

export { connectToLobby }