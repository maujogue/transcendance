export var winWidth = window.innerWidth / 2;
export var winHeight = winWidth * 9 / 16;
export const charactersNames = ['chupacabra', 'elvis', 'granny', 'peasant'];
export const colors = new Map();
colors.set('chupacabra', "rgb(160, 2, 217)");
colors.set('elvis', "rgb(209, 201, 212)");
colors.set('granny', "rgb(0, 128, 255)");
colors.set('peasant', "rgb(173, 62, 2)");
export const lobbyCharPos = -0.5;
export const lobbyPaddlePos = -0.3;

export function updateWinVariables() {
	winWidth = window.innerWidth / 2;
	winHeight = winWidth * 9 / 16;
}