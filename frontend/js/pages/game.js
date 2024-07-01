import { resize, isFullScreen } from "../pong/resize.js";
import { checkCollision } from "../pong/collision.js";
import { displayMainMenu, createSelectMenu, createOnlineMenu, createLocalMenu} from '../pong/menu.js';
import { handleKeyPress, handleMenuKeyPress } from '../pong/handleKeyPress.js';
import { displayCharacter, updateMixers } from '../pong/displayCharacter.js';
import { initGame } from "../pong/initGame.js";
import { createEndScreen, returnToMenu } from "../pong/createEndScreen.js"
import { actualizeScore } from "../pong/score.js";
import { createField } from "../pong/createField.js";
import { createOnlineSelectMenu } from "../pong/online.js";
import { ClearAllEnv } from "../pong/createEnvironment.js";
import { loadAllModel } from "../pong/loadModels.js"
import { loadScene } from "../pong/loadModels.js";
import { getUserData } from "../User.js";
import { sendTournamentForm, createFormTournament } from "../pong/createTournament.js";
import { createJoinTournamentMenu } from "../pong/joinTournament.js";
import { checkIfUserIsInTournament, connectToTournament } from "../pong/tournament.js";
import { showAlert } from "../Utils.js";
import { loadAgentModel, moveAI} from '../pong/AI/AIUtils.js';
import { wsTournament } from "../pong/tournament.js";
import { createTournamentHistoryMenu } from "../pong/tournamentHistory.js";
import * as THREE from 'three';
import { injectGameTranslations } from "../modules/translationsModule/translationsModule.js";

export var lobby;
export var clock;
export var characters;

var isGameLoaded = false;
export const field = await createField();
export var soloMode;
export var environment;
export var model;

export async function init(queryParams) {
	if (queryParams && queryParams.get("message"))
		showAlert(queryParams.get("message"), queryParams.get("success"));
	if (isGameLoaded)
		return;

	var target = document.querySelector('#game');
	var config = { attributes: true, childList: true, characterData: true };
	var observer = new MutationObserver(function (mutations) {
		mutations.forEach(injectGameTranslations);
	});
	observer.observe(target, config);

	lobby = await loadScene('lobbyTest');
	clock = new THREE.Clock();
	characters = new Map();
	let start = false;
	let divMenu = document.getElementById("menu");
	let player1;
	let player2;
	let keyPress = false;
	let keysPressed = {};
	let isOnline = false;
	let localLoop = false;
	let userData;
	let form;
	const gameDiv = document.getElementById('game');

	await loadAllModel();
	soloMode = false;

	window.addEventListener('resize', resize(environment));
	
	getUserData().then((data) => {
		userData = data;
		if (userData) {
			checkIfUserIsInTournament(userData).then((response) => {
				if (response && response['joined'] && !wsTournament)
					connectToTournament(response['tournament']);
			});
		}
	})

	async function goToLocalSelectMenu() {
		divMenu = document.getElementById("localMenu");
		divMenu.remove();
		environment = createSelectMenu(characters);
		player1 = await displayCharacter(player1, environment, "chupacabra", "player1");
		player2 = await displayCharacter(player2, environment, "elvis", "player2");
	}

	async function createAISelectMenu(field) {
		document.getElementById("localMenu").remove();
		environment = createSelectMenu(field, characters);
		document.getElementById("cursorP2").remove();
		document.getElementsByClassName("inputP2")[0].remove();
		environment.renderer.render(environment.scene, environment.camera);
		player1 = await displayCharacter(player1, environment, "chupacabra", "player1");
		player2 = await displayCharacter(player2, environment, "elvis", "player2");
		}

	document.addEventListener("keydown", function (event) {
		let key = event.key;
		if (event.key.match(/^[aqwd]$/))
			key = event.key.toLowerCase();
		keysPressed[key] = true;
		keyPress = true;
		event.stopPropagation();
	});

	document.addEventListener("keyup", function (event) {
		delete keysPressed[event.key];
	});


	gameDiv.addEventListener('click', function (event) {
		document.body.style.overflow = 'hidden';
		if (!gameDiv.contains(event.target)) {
			document.body.style.overflow = 'auto';
		}
	});

	gameDiv.addEventListener('click', function () {
		document.body.style.overflow = 'hidden';
	});

	document.body.addEventListener("click", function (event) {
		getUserData().then((data) => {
			userData = data;
		})
		
		if (event.target.id == 'restart' && !isOnline) {
			document.getElementById("endscreen").remove();
			player1.score = 0;
			player2.score = 0;
			start = true;
			actualizeScore(player1, player2, environment, environment.font);
		}
		if (event.target.id == 'backMenu' || event.target.id == 'backIcon') {
			localLoop = false;
			isOnline = false;
			ClearAllEnv(environment);
			returnToMenu();
		}
		if (event.target.id == 'localGame') {
			createLocalMenu(field);
		}
		if (event.target.id == '1v1') {
			localLoop = true;
			soloMode = false;
			localGameLoop();
			goToLocalSelectMenu();
		}
		if (event.target.id == 'easy') {
			localLoop = true;
			soloMode = true;
			localGameLoop();
			createAISelectMenu(field);
		}
		if (event.target.id == 'onlineGame' && userData) {
			isOnline = true;
			createOnlineMenu();
		}
		if (event.target.id == 'quick') {
			createOnlineSelectMenu(null);
		}
		if (event.target.id == 'create') {
			createFormTournament();
			form = document.getElementById("tournamentForm");
			form.addEventListener('submit', function (event) {
				event.preventDefault();
				sendTournamentForm(form);
			});
		}
		if (event.target.id == 'join') {
			createJoinTournamentMenu();
		}
		if (event.target.id == 'fullScreen') {
			if (!isFullScreen())
				gameDiv.requestFullscreen();
			else
				document.exitFullscreen();
		}
		if (event.target.id == 'toggleButton') {
			const div = document.getElementById('toggleDiv');
			if (div.classList.contains('hidden'))
				div.classList.remove('hidden');
			else
				div.classList.add('hidden');
		}
		if (event.target.id == 'history') {
			createTournamentHistoryMenu();
		}
	});

	document.addEventListener('fullscreenchange', function () {
		if (!isOnline)
			resize(environment);
	});

	function setIfGameIsEnd() {
		if (player1.score < 5 && player2.score < 5)
			return;

		let winner = player1.name;
		if (player2.score > player1.score)
			winner = player2.name;

		if (winner === "player1")
			winner = "player 1";
		else if (winner === "player2")
			winner = "player 2";

		createEndScreen(winner);
		start = false;
	}

	async function localGameLoop() {
		if (keyPress && !start) {
			await handleMenuKeyPress(keysPressed, player1, player2, environment);
			keyPress = false;
		}
		if (keysPressed[" "] && document.getElementById("selectMenu") && player1 && player2 && !start) {
			start = true;
			ClearAllEnv(environment);
			if (!soloMode)
				divMenu.remove();
			else
				model = await loadAgentModel();
			environment = await initGame(player1, player2);
			player1.score = 0;
			player2.score = 0;
		}
		if (start) {
			if (soloMode)
				moveAI(player2, environment, model);
			if (keyPress)
				handleKeyPress(keysPressed, player1, player2, environment);
		checkCollision(environment.ball, player1, player2, environment);
		setIfGameIsEnd();
	}
	if (player1 && player2)
	updateMixers(player1, player2);
	environment?.renderer.render(environment.scene, environment.camera);
	if (localLoop)
		requestAnimationFrame(localGameLoop);
	}
	isGameLoaded = true;
}


export { displayMainMenu } ;