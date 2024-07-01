import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { lobbyCharPos } from '../varGlobal.js';

export class Character {
	constructor(name, scene, animations) {
		this.name = name;
		this.mesh = scene.children[0];
		this.scene = scene;
		this.animations = animations;
		this.isDisplayed = false;
	}

	setCharacterInLobby(playerName, environment) {
		this.mesh.scale.set(0.005, 0.005, 0.005);
		if (playerName == "player1" || playerName == "player") {
			this.mesh.position.set(lobbyCharPos - 0.1, -0.5, 0).unproject(environment.camera);
			this.mesh.rotateZ(Math.PI / -4);
		}
		else {
			this.mesh.position.set((lobbyCharPos * -1) + 0.1, -0.5, 0).unproject(environment.camera);
			this.mesh.rotateZ(Math.PI / 4);
		}
		this.mesh.name = playerName;
		this.setAnimation(0)
		environment.scene.add(this.mesh);
	}

	removeCharacterFromLobby(environment) {
		environment.scene.remove(this.mesh);
	}
	
	setAnimation(animationIndex) {
		const animation = this.animations[animationIndex];
		if (!animation)
			return ;

		this.mixer = new THREE.AnimationMixer(this.mesh);
		const action = this.mixer.clipAction(animation);
		action.play();
	}

	clone() {
		const clonedCharacter = new Character(this.name, this.scene.clone(), this.animations.slice());
	
		clonedCharacter.mesh = SkeletonUtils.clone(this.mesh);
		clonedCharacter.mixer = new THREE.AnimationMixer(clonedCharacter.scene);
	
		clonedCharacter.isDisplayed = this.isDisplayed;
	
		return clonedCharacter;
	}
}
