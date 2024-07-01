import { init } from "../pages/game.js";
import { recreateCanvas } from "./createEnvironment.js";
import { checkIfWebsocketIsOpen } from "./handlerMessage.js";
import { initSpaceBackground, stopStep } from "./spaceBackground.js";
import { wsTournament } from "./tournament.js";
import { winWidth, winHeight } from "./varGlobal.js";

function isFullScreen() {
	return (document.fullscreenElement);
}

let width = winWidth;
let height = winHeight;

function setSize() {
	if (isFullScreen()) {
		width = window.screen.width;
		height = window.screen.height;
	} else {
		width = winWidth;
		height = winHeight;
	}
}

function resizeSpaceBackground() {
	if (!stopStep())
		return;
	recreateCanvas("canvas");
	initSpaceBackground();
}

function resizeImages() {
	if (document.getElementById("spriteStart")) {
		if (isFullScreen()) {
			document.getElementById("spriteStart").style.backgroundImage = "url('assets/img/sprite/StartSheet.png')";
		} else {
			document.getElementById("spriteStart").style.backgroundImage = "url('assets/img/sprite/StartSheetSmall.png')";
		}
	}
	if (document.getElementsByClassName("sprite")[0]) {
		const spriteP1 = document.getElementById("spriteP1");
		const spriteP2 = document.getElementById("spriteP2");
		if (isFullScreen()) {
			spriteP1.style.backgroundImage = "url('assets/img/sprite/P1SheetFullScreen.png')";
			if (spriteP2)
				spriteP2.style.backgroundImage = "url('assets/img/sprite/P2SheetFullScreen.png')";
		} else {
			spriteP1.style.backgroundImage = "url('assets/img/sprite/P1SheetSmall.png')";
			if (spriteP2)
				spriteP2.style.backgroundImage = "url('assets/img/sprite/P2SheetSmall.png')";
		}
	}
}

function resizeGame(environment) {
	environment.camera.updateProjectionMatrix();
	environment.renderer.setSize(width, height);
	environment.renderer.render(environment.scene, environment.camera);
}

function resizeCrt() {
	const crt = document.getElementsByClassName("crt-effect")[0];
	if (crt) {
		console.log("resize crt: ", width, height);
		crt.style.width = width + "px";
		crt.style.height = height + "px";
	} 
}

function resizeBracket() {
	if (checkIfWebsocketIsOpen(wsTournament)) {
		wsTournament.send(JSON.stringify({
			'type': 'bracket',
		}));
	}
}

function resizeCanvas() {
	const canvas = document.getElementById("canvas");
	if (canvas) {
		canvas.width = width;
		canvas.height = height;
	}

}

function resize(environment) {
	console.log("resize: ", width, height);
	setSize();
	resizeSpaceBackground();
	resizeCrt();
	if (document.getElementById("bracketCanvas"))
		resizeBracket();
	if (document.getElementById("canvas"))
		resizeCanvas();

	const div = document.getElementsByClassName("menu")[0];
	if (div) {
		console.log("resize menu");
		div.style.width = width + "px";
		div.style.height = height + "px";
		div.style.fontSize = width / 25 + "px";
	}
	if (!environment)
		return ;
	resizeImages();
	resizeGame(environment);
}

export {resize, isFullScreen }