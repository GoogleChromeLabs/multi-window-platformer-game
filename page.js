/*
 Copyright 2023 Google LLC

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

import GameController from './gameController.js';
import {NUM_LEVELS} from './levels/levels.js';
import {PreloadAllSounds} from './sound.js';

window.addEventListener('load', CheckPermissionState);
const $ = s => document.querySelector(s);

for (let i = 0; i < NUM_LEVELS; ++i) {
  let o = document.createElement('option');
  o.innerText = `Level ${i + 1}`;
  o.value = i;
  $('#levelSelector').append(o);
}
let game = new GameController();
await game.Initialize(progress => {
  $('#progress progress').value = progress * 100;
});
await PreloadAllSounds();
$('#start').onclick = async () => {
  $('#start').disabled = true;
  await game.Start(Number($('#levelSelector').value), level => {
    $('#levelSelector').value = level;
    $('#start').disabled = false;
    $('#start').focus();
  });
};
$('#progress').style.visibility = 'hidden';
$('#startcontrols').style.visibility = 'visible';

$('#popups-blocked button').addEventListener('click', e => {
  $('#popups-blocked').close();
});

$('#start').focus();

function UpdateWindowManagementPermissionStatus(permissionStatus) {
  let checkbox = $('#MultiscreenCheckbox');
  let label = $('#MultiscreenLabel');
  if (!permissionStatus || !('getScreenDetails' in self)) {
    checkbox.disabled = true;
    label.innerText = 'Multiscreen (not supported)';
    return;
  }
  // TODO: Support disabling multi-screen game when permission is granted?
  checkbox.checked = permissionStatus.state === 'granted';
  checkbox.disabled = label.disabled = permissionStatus.state !== 'prompt';
  if (permissionStatus.state === 'granted') {
    window.getScreenDetails()
        .then(screenDetails => {
          label.innerText =
              `Multiscreen (${screenDetails.screens.length} detected)`;
        })
        .catch(() => {
          label.innerText = 'Multiscreen (details unavailable)';
        });
  } else if (permissionStatus.state === 'prompt') {
    label.innerText = 'Multiscreen (click to prompt)';
    // Call getScreenDetails on checkbox clicks to request permission.
    checkbox.addEventListener('click', () => {
      window.getScreenDetails();
    });
  } else if (permissionStatus.state === 'denied') {
    label.innerText = 'Multiscreen (permission denied)';
  }
}


async function CheckPermissionState() {
  let permissionStatus;

  try {
    permissionStatus =
        await navigator.permissions.query({name: 'window-management'});
    UpdateWindowManagementPermissionStatus(permissionStatus);
  } catch (ex) {
    UpdateWindowManagementPermissionStatus();
    return;
  }

  permissionStatus.addEventListener('change', () => {
    UpdateWindowManagementPermissionStatus(permissionStatus);
  });
}

// Poll for "Start" button on gamepad, map it to Start button click.
setInterval(() => {
  const gamepads = navigator.getGamepads();
  if (!gamepads)
    return;
  const gamepad = gamepads.find(g => g);
  if (gamepad?.buttons?.[9].pressed) {
    document.querySelector('#start').click();
  }
}, 100);
