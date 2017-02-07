/*
  Copyright 2017 Google Inc. All Rights Reserved.
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
      http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
/* global VRFrameData */

import 'three/src/polyfills.js';

import {Matrix4} from 'three/src/math/Matrix4';
import {PerspectiveCamera} from 'three/src/cameras/PerspectiveCamera';
import {WebGLRenderer} from 'three/src/renderers/WebGLRenderer';
import loader from './loader';
import * as vrui from 'webvr-ui';
import world from './world';

const NEAR = 0.1;
const FAR = 1000;

const renderer = new WebGLRenderer();
document.body.appendChild(renderer.domElement);

const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, NEAR, FAR);
world.viewpoint.add(camera);

let frameData;
// Check that VR is supported
if ('VRFrameData' in window) {
  frameData = new VRFrameData();
}
const vrCamera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, NEAR, FAR);
world.viewpoint.add(vrCamera);

let lastFrameStart = 0;

let display = window;

const enterVR = new vrui.EnterVRButton(renderer.domElement, {})
  .on('enter', () => {
    enterVR.getVRDisplay().then((vrdisplay) => {
      display = vrdisplay;
      display.depthFar = FAR;
      display.depthNear = NEAR;
      renderer.setPixelRatio(1);
      renderer.autoClear = false;
      const eyeParamsL = display.getEyeParameters('left');
      renderer.setSize(eyeParamsL.renderWidth * 2, eyeParamsL.renderHeight, false);
    });
  })
  .on('exit', () => {
    display = window;
    renderer.autoclear = true;
  });
document.getElementById('button').appendChild(enterVR.domElement);

const viewMatrix = new Matrix4();

function renderEye(view, projection, width, height, side) {
  renderer.setViewport(width * side, 0, width, height);

  viewMatrix.fromArray(view);

  vrCamera.matrixAutoUpdate = false;
  vrCamera.projectionMatrix.fromArray(projection);
  vrCamera.matrix.getInverse(viewMatrix);
  vrCamera.updateMatrixWorld(true);

  renderer.render(world.scene, vrCamera);
}

function render(frameStart) {
  display.requestAnimationFrame(render);
  const elapsed = (frameStart - lastFrameStart) / 1000;
  lastFrameStart = frameStart;

  world.update(elapsed);

  if (enterVR.isPresenting()) {
    renderer.clear();

    display.getFrameData(frameData);

    const eyeParamsL = display.getEyeParameters('left');
    const width = eyeParamsL.renderWidth;
    const height = eyeParamsL.renderHeight;

    renderEye(frameData.leftViewMatrix, frameData.leftProjectionMatrix, width, height, 0);
    renderer.clearDepth();
    renderEye(frameData.rightViewMatrix, frameData.rightProjectionMatrix, width, height, 1);

    display.submitFrame();
  } else {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    camera.updateMatrix();
    renderer.setPixelRatio(devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(world.scene, camera);
  }
}

loader.load().then((assets) => {
  world.start(assets);
  render(0);
});
