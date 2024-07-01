import * as THREE from 'three'
import { actualizeScore } from './score.js';

function resetPos(ball, player1, player2, environment) {
    ball.mesh.position.set(0, 0, -16.5);
    ball.direction.y = 0;
    player1.paddle.mesh.position.set(-9.5, 0, -16.5);
    player2.paddle.mesh.position.set(9.5, 0, -16.5);
}

async function checkIfScored(ball, player1, player2, environment) {
    let bbox1 = new THREE.Box3().setFromObject(player1.paddle.mesh);
    let bbox2 = new THREE.Box3().setFromObject(player2.paddle.mesh);

    if (ball.mesh.position.x <= -12) {
        player2.score++;
        ball.direction.x = -0.055;
        resetPos(ball, player1, player2, environment);
        actualizeScore(player1, player2, environment, environment.font);
    }
    if (ball.mesh.position.x >= 12) {
        player1.score++; 
        ball.direction.x = 0.055;
        resetPos(ball, player1, player2, environment);
        actualizeScore(player1, player2, environment, environment.font);
    }
}

function physicsBall(ball, paddleBox) {
    let center = new THREE.Vector3();
    paddleBox.getCenter(center);

    ball.direction.x *= -1;
    if (ball.direction.x < 0 && ball.direction.x > -0.55)
        ball.direction.x -= 0.009;
    else if (ball.direction.x > 0 && ball.direction.x < 0.55)
        ball.direction.x += 0.009;
    ball.direction.y = 0.08 * (ball.mesh.position.y - center.y);
}

function checkCollisionWithBorder(ball, ballBox, environment) {
    if (environment.border.up.box.intersectsBox(ballBox) || 
        environment.border.down.box.intersectsBox(ballBox)) {
        if (ball.direction.x > 0)
            ball.direction.x += 0.02;
        else
             ball.direction.x -= 0.02;
        ball.direction.y *= -1;
        return (true);
    }
    return (false);
}

function checkCollisionsWithPaddles(ball, player1, player2, environment) {
	if (ball.mesh.position.x >=  player2.paddle.mesh.position.x && ball.mesh.position.x <= player2.paddle.mesh.position.x + 0.5) {
		if (ball.mesh.position.y <= player2.paddle.mesh.position.y + 1 && ball.mesh.position.y >= player2.paddle.mesh.position.y - 1)
			return (true);
	}
	else if (ball.mesh.position.x <= player1.paddle.mesh.position.x && ball.mesh.position.x >= player1.paddle.mesh.position.x - 0.5) {
		if (ball.mesh.position.y <= player1.paddle.mesh.position.y + 1 && ball.mesh.position.y >= player1.paddle.mesh.position.y - 1)
			return (true);
	}
	return (false);
}

function checkCollision(ball, player1, player2, environment) {
    let bbox1 = new THREE.Box3().setFromObject(player1.paddle.mesh);
    let bbox2 = new THREE.Box3().setFromObject(player2.paddle.mesh);
    let ballBox = new THREE.Box3();
    
    ball.mesh.geometry.computeBoundingBox();
    ballBox.copy(ball.mesh.geometry.boundingBox).applyMatrix4(ball.mesh.matrixWorld);
	if (checkCollisionsWithPaddles(ball, player1, player2, environment)) {
		if (ball.mesh.position.x > 0)
			physicsBall(ball, bbox2);
		else
			physicsBall(ball, bbox1);
	}
    checkCollisionWithBorder(ball, ballBox, environment);
    ball.mesh.translateX(ball.direction.x);
    ball.mesh.translateY(ball.direction.y);
    checkIfScored(ball, player1, player2, environment);
}

export { checkCollision, checkCollisionWithBorder, physicsBall }