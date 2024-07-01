import { checkCollisionWithBorder, physicsBall } from "./collision.js";
import { createTextMesh } from "./score.js";
import { removeObject } from "./removeObject.js";
import * as THREE from 'three';

function actualizeScoreOnline(data, env) {
    let name = data['name'].charAt(0).toUpperCase() + data['name'].slice(1);
    createTextMesh(data['score'] + '', env.font, env, 'score' + name).then((res) => {                
        removeObject('score' + name, env);
        const score = res;
        if (data['name'] == 'player1')
            score.position.set(-0.60, -0.2, 0.935).unproject(env.camera);
        else
            score.position.set(0.20, -0.2, 0.935).unproject(env.camera);
        env.scene.add(score);
        env.renderer.render(env.scene, env.camera);
    });
    env.ball.mesh.position.set(0, 0, 0.9).unproject(env.camera);
}

function sendIfScored(ball, player, webSocket, env) {
    let bbox = new THREE.Box3().setFromObject(player.paddle.mesh);
    let isScored = false;

    if (player.name == 'player1' && ball.mesh.position.x < bbox.min.x - 2) {
        ball.direction.x = -0.1;
        isScored = true;
    }
    if (player.name == 'player2' && ball.mesh.position.x > bbox.max.x + 2) {
        ball.direction.x = 0.1;
        isScored = true;
    }
    if (!isScored)
        return ;
    ball.mesh.position.set(0, 0, 0.9).unproject(env.camera);
    webSocket.send(JSON.stringify({
        'type': 'score',
        'score': player.score + 1,
        'name': player.name
    }));
    webSocket.send(JSON.stringify({
        'type': 'ball_data',
        'posX': 0,
        'posY': 0,
        'dirX': ball.direction.x,
        'dirY': 0
    }));
}

function translateBall(ball) {
    if (!ball)
        return ;
    ball.mesh.translateX(ball.direction.x);
    ball.mesh.translateY(ball.direction.y);
}

export { translateBall, sendIfScored, actualizeScoreOnline}