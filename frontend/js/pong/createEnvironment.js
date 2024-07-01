import * as THREE from 'three';
import { createField, createBorder } from './createField.js';
import { winWidth, winHeight } from './varGlobal.js';
import { isFullScreen } from './resize.js';
import { stopStep } from './spaceBackground.js';
import { addCrtEffect } from './menu.js';

function getSize() {
	var width = winWidth;
	var height = winHeight;
	
	if (isFullScreen()) {
		width = window.screen.width;
		height = window.screen.height;
	}
	return {
		"width": width,
		"height": height
	};
}

async function createMap(environment) {
	let borderUp = await createBorder(new THREE.Vector3(0, 1.075, 0.9), environment.camera);
	let borderDown = await createBorder(new THREE.Vector3(0, -1.075, 0.9), environment.camera);
	let borderCenter = await createBorder(new THREE.Vector3(0, 0, 0.95), environment.camera);
	borderCenter.mesh.material.metalness = 0.2;
	borderCenter.mesh.material.roughness = 0.8;
	borderCenter.mesh.rotation.set(0, 0, Math.PI / 2);
	borderCenter.mesh.scale.set(1, 0.3, 1);
	environment.scene.add(borderDown.mesh);
	environment.scene.add(borderUp.mesh);
	environment.scene.add(borderCenter.mesh);
	environment.scene.add(await createField());
	return {
		"borderUp": borderUp,
		"borderDown": borderDown
	};
}

export function recreateCanvas(id) {
	stopStep();	
	const canvas = document.getElementById(id);
	canvas.remove();
	const newCanvas = document.createElement("canvas");
	canvas.width = getSize().width;
	canvas.height = getSize().height;
	newCanvas.id = id;
	document.getElementById("game").appendChild(newCanvas);
}

function createEnvironment(id) {
	recreateCanvas(id);
	const div = document.getElementById(id);
	const divSize = getSize();
	
	const scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x000000 );
	const camera = new THREE.PerspectiveCamera( 45, divSize.width / divSize.height, 1, 100);

	const renderer = new THREE.WebGLRenderer({ canvas: div, antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(divSize.width, divSize.height);

	return {
		"scene": scene,
		"renderer": renderer,
		"camera": camera
	  };
}

function ClearAllEnv(environment) {
    if (!environment)
        return;

    while (environment.scene.children.length > 0) {
        const obj = environment.scene.children[0];
        environment.scene.remove(obj);

        if (obj instanceof THREE.Object3D) {
            obj.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    const material = child.material;
                    if (material.map)
                        material.map.dispose();
                }
            });
        }
    }
    environment.renderer.dispose();
}

export { createEnvironment, createMap, getSize, ClearAllEnv};