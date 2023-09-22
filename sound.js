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

// After `PreloadAllSounds` is called, the map values are replaced
// by a record of {audio: HTMLAudioElement, playing: true/false, track:
// MediaElementAudioSourceNode}
const soundMap = new Map([
  ['start', './assets/start.mp3'], ['fall', './assets/fall.mp3'],
  ['goal', './assets/goal.mp3'], ['clap', './assets/clap.mp3'],
  ['roar', './assets/roar.mp3'], ['fireworks', './assets/fireworks.mp3'],
  ['jump', './assets/jump.mp3'], ['h-collision', './assets/h-collision.mp3'],
  ['v-collision', './assets/v-collision.mp3']
]);

let audioContext;

export async function PreloadAllSounds() {
  // console.log("preload all sounds");
  const promises = [];

  for (const [key, src] of soundMap) {
    promises.push(new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = true;
      audio.addEventListener('canplaythrough', resolve, false);
      audio.src = src;
      audio.load();  // to make sure audio files are preloaded even before
                     // playing

      const record = {audio, playing: false};
      audio.addEventListener('ended', e => {
        record.playing = false;
      });
      soundMap.set(key, record);
    }));
  }

  await Promise.all(promises);
}

export function PlaySound(soundKey, pan) {
  // console.log("playSound: " + soundKey);
  //  play only if sound playing enabled and currently not playing
  if (!document.querySelector('.SoundCheckbox').checked)
    return;
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const record = soundMap.get(soundKey);

  // First time through, now that we definitely have an AudioContext:
  if (!record.track) {
    record.track = audioContext.createMediaElementSource(record.audio);
    record.panner = new StereoPannerNode(audioContext, {pan: 0});
    record.track.connect(record.panner).connect(audioContext.destination);
  }

  // And actually play it.
  if (!record.playing) {
    if (!pan) {
      record.panner.pan.value = 0;
    } else {
      record.panner.pan.value = pan;
    }

    record.audio.play();
    record.playing = true;
  }
}
