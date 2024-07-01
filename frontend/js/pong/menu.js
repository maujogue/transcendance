import { createEnvironment } from "./createEnvironment.js";
import { displayCharacter } from './displayCharacter.js';
import { createLobbyLights, createLobbyScene } from './createField.js';
import { isFullScreen } from './resize.js';
import { winWidth, winHeight, charactersNames } from './varGlobal.js';
import { initSpaceBackground } from "./spaceBackground.js";
import { colors } from "./varGlobal.js"; 
import * as THREE from 'three';
import { characters } from "../pages/game.js";

let width = winWidth;
let height = winHeight;
let env;

function getSize() {
	if (isFullScreen()) {
		width = window.screen.width;
		height = window.screen.height;
	} else {
		width = winWidth;
		height = winHeight;
	}
}

function createIcon(parent, character) {
	const img = document.createElement("img");
	img.id = "icon_" + character;
	img.className = "charactersIcon"
	img.setAttribute("src", "assets\\img\\character_icon\\" + character + ".png");
	img.setAttribute("alt", character);
	img.style.width = "100%";
	img.style.height = "100%";
	parent.appendChild(img);
}

function createWaitingScreen() {
	createDivMenu("waitingScreen");
	const waitingScreen = document.getElementById("waitingScreen");
	waitingScreen.innerHTML = '\
		<i class="fa-solid fa-xmark close-matchmaking" id="closeMatchmaking"></i> \
		<img id="avatar_pong" src="" alt="avatar">\
		<div id="waitingText">Waiting for other player</div>';
	
}

function createSwatchPanel(nb, character) {
	const newDiv = document.createElement("div");
	newDiv.classList.add("swatch");
	newDiv.id = "swatch" + nb;

	newDiv.style.zIndex = "100";
	newDiv.style.display = "block";
	newDiv.style.height = "50%";
	document.getElementById("panel").appendChild(newDiv);
	createIcon(newDiv, character);
}

function createCursor(swatch, cursorName, textCursor) {
	const cursor = document.createElement("p");
	const text = document.createTextNode(textCursor);
	const parent = document.getElementById(swatch);
	cursor.className = cursorName;
	cursor.id = cursorName;
	cursor.appendChild(text);
	parent.appendChild(cursor);
}

function checkIfPanelIsSelected(swatchId) {
	if (!document.getElementById(swatchId))
		return ;
	let childNodes = document.getElementById(swatchId).childNodes[1];

	if (childNodes)
		return (true);
	return (false);
}

async function moveCursor(keyPressed, player, className, env) {
	let cursor = document.getElementsByClassName(className)[0];
	if (!cursor)
		return ;
	const parent = cursor.parentNode.id;
	let parentNumber = parent[parent.length - 1];

	if (keyPressed == "d" || keyPressed == "ArrowRight") {
		parentNumber++;
		if (checkIfPanelIsSelected("swatch" + parentNumber))
			parentNumber++;
		if (parentNumber >= charactersNames.length)
		parentNumber = 0;
		if (checkIfPanelIsSelected("swatch" + parentNumber))
			parentNumber++;
	}
	else if (keyPressed == "q" || keyPressed == "ArrowLeft") {
		parentNumber--;
		if (checkIfPanelIsSelected("swatch" + parentNumber))
			parentNumber--;
		if (parentNumber <= -1)
		parentNumber = charactersNames.length - 1;
		if (checkIfPanelIsSelected("swatch" + parentNumber))
			parentNumber--;
	}

	let swatch = document.getElementsByClassName("swatch")[parentNumber];
	swatch.appendChild(cursor);
	player = displayCharacter(player, env, charactersNames[parentNumber], player.name);
}

function createTitle(div) {
	const logo = document.createElement("img");
	logo.src = "./assets/img/pong.svg";
	logo.classList.add("logo");
	div.appendChild(logo);
}

function createDivMenu(id) {
	if (document.getElementById(id))
		document.getElementById(id).remove();
	getSize();
	const div = document.createElement("div");
	div.className = "menu crt";
	addCrtEffect(div);
	const canvas = document.getElementById("canvas");
	div.id = id;
	div.style.width = width + 'px';
	div.style.height = height + 'px';
	div.style.fontSize = width / 25 + 'px'
	canvas.insertAdjacentHTML('beforebegin', div.outerHTML);
}

function createPanelDiv() {
	const swatch = document.createElement("div");
	
	swatch.id = "panel";
	swatch.style.position = "relative";
	swatch.style.height = "25%";
	swatch.style.color = "blue";
	document.getElementById("selectMenu").appendChild(swatch);
}

function createDivInputImg(playerName) {
	const infoDiv = document.getElementById("toggleDiv");
	const inputAnimate = document.createElement("div");
	const sprite = document.createElement("div");
	inputAnimate.className = "inputAnimate";
	inputAnimate.classList.add("input" + playerName);
	sprite.className = "sprite";
	sprite.id = "sprite" + playerName;
	if (isFullScreen())
		sprite.style.backgroundImage = "url('assets/img/sprite/" + playerName + "Sheet.png')";
	else
		sprite.style.backgroundImage = "url('assets/img/sprite/" + playerName + "SheetSmall.png')";
	const divText = document.createElement("div");
	divText.textContent = playerName + ": ";
	divText.className = "infoText";
	inputAnimate.appendChild(divText);
	infoDiv.appendChild(inputAnimate);
	inputAnimate.appendChild(sprite);
}

function createInterfaceSelectMenu() {
	getSize();
	let i = 0;
	
	createDivMenu("selectMenu");
	document.getElementById("selectMenu").innerHTML = '\
	<i class="fa-solid fa-arrow-left icon" id="backIcon"></i> \
	<i class="fa-solid fa-question icon" id="toggleButton"></i> \
	<div id="toggleDiv" class="hidden"></div>';
	createPanelDiv();
	createDivInputImg("P1");
	createDivInputImg("P2");
	createDivInputImg("Start");
	charactersNames.forEach(character => {
		createSwatchPanel(i, character);
		i++;
	});
	createCursor("swatch0", "cursorP1", "P1");
	createCursor("swatch1", "cursorP2", "P2");
	addCrtEffect(document.getElementById("selectMenu"));
}

function setCharacterPosInIntroScene(env, character1, character2) {
	character1.position.set(-0.3, -1.2, -0.7).unproject(env.camera);
	character2.position.set(0.3, -1.2, -0.7).unproject(env.camera);
	character1.scale.set(0.005, 0.005, 0.005);
	character2.scale.set(0.005, 0.005, 0.005);
	character1.rotateZ(Math.PI / -2);
	character2.rotateZ(Math.PI / 2);
}

function addLights(env, color1, color2) {
    const light1 = new THREE.PointLight(color1, 50);
    const light2 = new THREE.PointLight(color2, 50);

    light1.position.set(-2, 2, 2);
    light2.position.set(2, 2, 2);

    env.scene.add(light1);
    env.scene.add(light2);
}

export function createIntroScene(p1Character, p2Character) {
	const env = createEnvironment("canvas");
	env.scene.add(createLobbyScene(env));
	addLights(env, colors.get(p1Character), colors.get(p2Character));
	const character1 = characters.get(p1Character).clone();
	const character2 = characters.get(p2Character).clone();
	setCharacterPosInIntroScene(env, character1.mesh, character2.mesh);
	env.scene.add(character1.mesh);
	env.scene.add(character2.mesh);
	character1.setAnimation(0);
	character2.setAnimation(0);
	moveCamera(env, character1, character2);
	env.renderer.render(env.scene, env.camera);
	return {
		"renderer": env.renderer,
		"scene": env.scene,
		"camera": env.camera,
		"start": false
	};
}

function moveCamera(env, character1, character2) {
    const radius = 1.50;
    const time = Date.now() * 0.0005;
    
    const centerX = (character1.mesh.position.x + character2.mesh.position.x) / 2;
    const centerZ = (character1.mesh.position.z + character2.mesh.position.z) / 2;

    env.camera.position.x = centerX + radius * Math.cos(time);
    env.camera.position.z = centerZ + radius * Math.sin(time);
	env.camera.fov = 45;

    env.camera.lookAt(centerX, 0, centerZ);

	character1.mixer.update(0.01);
	character2.mixer.update(0.01);
    env.renderer.render(env.scene, env.camera);
    requestAnimationFrame(() => moveCamera(env, character1, character2));
}

function createSelectMenu(characters) {
	const env = createEnvironment("canvas");
	env.scene.add(createLobbyScene(env));
	createLobbyLights(env);
	createInterfaceSelectMenu();
	env.renderer.render(env.scene, env.camera);
	return {
		"renderer": env.renderer,
		"scene": env.scene,
		"camera": env.camera,
		"start": false,
		"characters": characters
	};
}

function createButton(text, id, parent) {
	const button = document.createElement('button');
	const textButton = document.createTextNode(text);
	button.className = 'btn';
	button.id = id;
	button.setAttribute('data-lang', id);
	button.appendChild(textButton);
	document.getElementById(parent).appendChild(button);
}

function displayLobby() {
	createDivMenu('lobby');
	const lobby = document.getElementById('lobby');
	lobby.innerHTML = '\
	<p>Lobby Name</p><br/> \
	<input id="lobby-name-input" type="text" size="100"><br/> \
    <input id="submit" type="button" value="Enter">'
}

function removeAllMenu() {
	if (document.getElementsByClassName("menu")) {
		const divMenu = document.getElementsByClassName("menu");
		for (let i = 0; i < divMenu.length; i++)
			divMenu[i].remove()
	}
}

function displayMainMenu() {
	getSize();
	removeAllMenu();
	createDivMenu("menu");
	const divMenu = document.getElementById("menu");
	createTitle(document.getElementById("menu"));

	createButton("Local Game", "localGame", "menu");
	createButton("Online Game", "onlineGame", "menu");
	const fullScreenIcon = document.createElement("div");
	fullScreenIcon.innerHTML = '<i class="fa-solid fa-expand fullScreenIcon icon" id="fullScreen"></i>';

	divMenu.appendChild(fullScreenIcon);
	initSpaceBackground();
}

function createGamemodeDiv(text, parent) {
	const div = document.createElement("div");
	div.innerHTML += `<img class="gamemode-img" src="./assets/img/icon/${text}.png" alt="tournament_icon"><p data-lang="${text}">${text}</p>`;
	const list = document.createElement("ul");
	list.className = "submode-list submode-list-" + text;
	div.className = "gamemode";
	div.id = text;
	parent.appendChild(div);
	div.appendChild(list);
}

function createOnlineMenu() {
	document.getElementById("menu").remove();
	createDivMenu("onlineMenu");
	const parent = document.getElementById("onlineMenu");
	parent.innerHTML = '<i class="fa-solid fa-arrow-left icon" id="backIcon"></i>';
	addCrtEffect(parent);
	createGamemodeDiv("1v1", parent);
	createGamemodeDiv("Tournament", parent);
	createSubmode('Tournament', "Create");
	createSubmode('Tournament', "Join");
	createSubmode('Tournament', "History");
	createSubmode('1v1', "Quick Play");
	createSubmode('1v1', "Private Game");
}

export function createLocalMenu() {
	document.getElementById("menu").remove();
	createDivMenu("localMenu");
	const parent = document.getElementById("localMenu");
	parent.innerHTML = '<i class="fa-solid fa-arrow-left icon" id="backIcon"></i>';
	createGamemodeDiv("Multiplayer", parent);
	createGamemodeDiv("Solo", parent);
	createSubmode('Multiplayer', "1v1");
	createSubmode('Solo', "Easy");
}

export function createSubmode(listName, text) {
	const firstWord = text.split(' ')[0].toLowerCase();
	const list = document.querySelector('.submode-list-' + listName);
	list.innerHTML += `<li class="submode" id="${firstWord}" data-lang="${text}">${text}</li>`;
}

export function createHUD(player, opp) {
	var player1Avatar = player.userInfo.avatar;
	var player2Avatar = opp.userInfo.avatar;
	
	if (document.getElementById("hud"))
		return ;
	if (player.name == "player2") {
		player1Avatar = opp.userInfo.avatar;
	    player2Avatar = player.userInfo.avatar;
	}
	createDivMenu("hud");
	const parent = document.getElementById("hud");
	parent.innerHTML = `\
	<img id="avatar_player1" class="avatar-in-game" src='${player1Avatar}' alt="avatar Player1">\
	<img id="avatar_player2" class="avatar-in-game" src='${player2Avatar}' alt="avatar Player2">\
	`
}

export function addCrtEffect(parent) {
	const crtEffect = document.createElement("img");
	crtEffect.src = "../assets/img/fx/crt_effect.png";
	crtEffect.className = "crt-effect";
	crtEffect.style.width = width + "px";
	crtEffect.style.height = height + "px";
	parent.appendChild(crtEffect);
}

export function createTournamentDiv() {
	if (document.getElementsByClassName("menu")[0])
    	document.getElementsByClassName("menu")[0].remove();
	initSpaceBackground();
	createDivMenu("tournamentMenu");
    const tournamentDiv = document.createElement("div");
	tournamentDiv.className = "tournament crt";
	addCrtEffect(tournamentDiv)
    document.getElementById("tournamentMenu").appendChild(tournamentDiv);
}

export { displayMainMenu, createSelectMenu, moveCursor, createDivMenu,
		displayLobby, createWaitingScreen, createInterfaceSelectMenu, 
		createOnlineMenu };