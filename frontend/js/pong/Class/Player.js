
class Player {
	constructor(name, paddle, light, character) {
		this.name = name;
		this.paddle = paddle;
		this.light = light;
		this.score = 0;
		this.ready = false;
		this.character = character;
	}

	setCharacter(environment, characterName) {
		this.character = environment.characters.get(characterName).clone();
	}
}

export { Player };