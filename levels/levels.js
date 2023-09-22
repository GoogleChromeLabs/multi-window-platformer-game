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

const levels = [
  '1.json', '2.json', '3.json', '4.json', '5.json', '6.json', '7.json',
  '8.json', '9.json', '10.json', '11.json',

  '12.json',  // Screen Door
  '13.json',  // Teleport
  '14.json',  // Platform intro
];

export const NUM_LEVELS = levels.length;
export const LEVEL_DATA_LIST = [];

export async function LoadLevels(progress_callback) {
  // NOT: Intentionally not parallized to reduce load on
  // simple Python server.
  for (let i = 0; i < levels.length; ++i) {
    progress_callback(i / levels.length);

    // Load is relative to main page
    const url = `./levels/${levels[i]}`;

    const response = await fetch(url);
    if (!response.ok)
      throw new Error(response.statusText);
    const json = await response.json();
    LEVEL_DATA_LIST.push(json);
  }
  progress_callback(1);
}
