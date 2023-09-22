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

import htm from 'https://esm.sh/htm';
import {h, render} from 'https://esm.sh/preact';
import {useCallback, useEffect, useState} from 'https://esm.sh/preact/hooks';

import {DoorEntity} from '../entities/doorEntity.js';
import {DoorEntitySwap} from '../entities/doorEntitySwap.js';
import {GoalEntity} from '../entities/goalEntity.js';
import {MovingPlatformEntity} from '../entities/movingPlatformEntity.js';
import {PlayerEntity} from '../entities/playerEntity.js';
import {RespawnPointEntity} from '../entities/respawnPointEntity.js';
import {RippleEntity} from '../entities/rippleEntity.js';
import {SolidBlockEntity} from '../entities/solidBlockEntity.js';

const html = htm.bind(h);

const entityTypes = [
  {type: SolidBlockEntity, color: SolidBlockEntity.fillColor},
  {type: PlayerEntity, color: '#ff0000'},
  {type: GoalEntity, color: '#46d10a'},
  {type: RespawnPointEntity, color: '#ff7f7f'},
  {type: RippleEntity, color: '#3f7fff'},
  {type: DoorEntity, color: '#9c00ad'},
  {type: MovingPlatformEntity, color: MovingPlatformEntity.FILL_COLOR},
  {type: DoorEntitySwap, color: DoorEntitySwap.FILL_COLOR},
];

const newWindow = () => {
  return {x: 0, y: 0, width: 320, height: 320, entities: new Array()};
};

export default class TileEditor {
  constructor() {
    render(html`<${this.App} />`, document.body);
  }
  App() {
    // Selected entity type to place.
    const [tileType, setTileType] = useState(SolidBlockEntity.name);
    // Selected grid size for snapping.
    const [snapGridSize, setSnapGridSize] = useState(32);
    // Entity width/height to set for placed entities.
    const [entityW, setEntityW] = useState(32);
    const [entityH, setEntityH] = useState(32);
    const [entityAngle, setEntityAngle] = useState(0);
    const [entityDist, setEntityDist] = useState(32);
    const [entityT, setEntityT] = useState(240);
    const [entityShared, setEntityShared] = useState(false);
    // Output JSON to be shown in the textarea.
    const [outputJson, setOutputJson] = useState('');
    // Index of current window being edited.
    const [windowIdx, setWindowIdx] = useState(0);
    // All level data for the level being edited.
    const [levelData, setLevelData] =
        useState({id: 1, level_text: '', windows: [newWindow()]});
    // Set a property on the current window being edited.
    const setWindowProperty = useCallback((f) => {
      var copy = structuredClone(levelData);
      f(copy.windows[windowIdx]);
      setLevelData(copy);
    }, [levelData, windowIdx]);
    // Add the current selected entity type to (x,y).
    const addEntity = useCallback(
        (x, y) => {
          const windowData = levelData.windows[windowIdx];
          setWindowProperty(d => d.entities.push({
            type: tileType,
            x: x + windowData.x,
            y: y + windowData.y,
            width: entityW,
            height: entityH,
            angle: entityAngle,
            distance: entityDist,
            time: entityT,
            shared: entityShared,
          }));
        },
        [
          windowIdx, levelData, tileType, entityW, entityH, entityAngle,
          entityDist, entityT, entityShared
        ]);
    // Parse JSON input and set the level data.
    const parseJson = useCallback((json) => {
      setLevelData(JSON.parse(json));
      setWindowIdx(0);
    });
    // Callback when right click button pressed on the main edit area.
    const levelRightClicked = useCallback((e) => {
      const windowData = levelData.windows[windowIdx];
      e.preventDefault();
      if (e.button == 2) {
        var rect =
            window.document.getElementById('map').getBoundingClientRect();
        var x = e.clientX - rect.left;  // x position within the element.
        var y = e.clientY - rect.top;   // y position within the element.
        windowData.entities.forEach((entity, i) => {
          if (entity.x - windowData.x <= x &&
              x <= entity.x - windowData.x + entity.width &&
              entity.y - windowData.y <= y &&
              y <= entity.y - windowData.y + entity.height) {
            setWindowProperty(p => p.entities.splice(i, 1));
          }
        });
      }
    });
    const setLevelText = level_text => {
      setLevelData(Object.assign({}, levelData, {level_text}));
    };
    const addWindow = useCallback(e => {
      levelData.windows.push(newWindow());
      setLevelData(structuredClone(levelData));
    }, [levelData]);
    useEffect(() => {
      setEntityShared(tileType === 'PlayerEntity');
    }, [tileType]);
    useEffect(() => {
      setOutputJson(JSON.stringify(levelData, null, 2));
    }, [levelData]);
    // Display a table grid based on the selected grid size.
    const Grid = () => {
      const windowData = levelData.windows[windowIdx];
      return html`
            <table class="grid">
                ${
          Array.from(Array(windowData.width / snapGridSize))
              .map(
                  (v, y) => html`<tr>
                    ${
                      Array.from(Array(windowData.height / snapGridSize))
                          .map(
                              (v, x) => html`<td onClick="${(e) => {
                                if (!e.ctrlKeyArg) {
                                  addEntity(x * snapGridSize, y * snapGridSize);
                                }
                              }}" style="width: ${snapGridSize}px; height: ${
                                  snapGridSize}px;"></td>`)}
                </tr>`)}
            </table>
        `;
    };
    // Render the main UI.
    const windowData = levelData.windows[windowIdx];
    return html`
        <div>
            Right click to delete objects.
            <div class="toolbar">
                tip: <input onInput=${
        (e) =>
            setLevelText(e.target.value)} value=${levelData.level_text} /> <br/>
                ${
        levelData.windows.map(
            (e, i) => html`<button style="font-weight: "${
                windowIdx == i ? 'bold' : ''}";" onClick="${
                () => setWindowIdx(
                    i)}">Window ${i}</button>`)} <button onClick="${
        () => addWindow()}">Add window</button><br/>
                window (x): <input onInput=${
        (e) => setWindowProperty(
            d => d.x = parseInt(e.target.value))} value=${windowData.x}/>
                window (y): <input onInput=${
        (e) => setWindowProperty(
            d => d.y = parseInt(e.target.value))} value=${windowData.y} />
                window (w): <input onInput=${
        (e) => setWindowProperty(
            d => d.width =
                parseInt(e.target.value))} value=${windowData.width} />
                window (h): <input onInput=${
        (e) => setWindowProperty(
            d => d.height =
                parseInt(e.target.value))} value=${windowData.height} />
                <br/>
                obj: <select onInput=${
        (e) => setTileType(e.target.value)} value=${tileType}>
                        ${
        entityTypes.map(
            e => html`<option value="${e.type.name}">${e.type.name}</option>`)}
                </select>
                (w): <input onInput=${
        (e) => setEntityW(parseInt(e.target.value))} value=${entityW} />
                (h): <input onInput=${
        (e) => setEntityH(parseInt(e.target.value))} value=${entityH} /> <br/>
                (angle): <input onInput=${
        (e) => setEntityAngle(
            parseInt(e.target.value))} value=${entityAngle} /> <br/>
                (distance): <input onInput=${
        (e) => setEntityDist(
            parseInt(e.target.value))} value=${entityDist} /> <br/>
                (time): <input onInput=${
        (e) => setEntityT(parseInt(e.target.value))} value=${entityT} /> <br/>
                (shared): <input type="checkbox" onInput=${
        (e) =>
            setEntityShared(e.target.checked)} checked=${entityShared} /> <br/>
                grid size: <input onInput=${
        (e) => setSnapGridSize(
            parseInt(e.target.value))} value=${snapGridSize} /> (min: 8)

            </div>
            <div id="map" style="width: ${windowData.width}px; height: ${
        windowData.height}px;" oncontextmenu="${(e) => levelRightClicked(e)}">
                <div class="map" style="width: ${windowData.width}px; height: ${
        windowData.height}px; position: absolute;" >
                ${
        windowData.entities.map(
            e => html`<span style="position: absolute; left: ${
                e.x - windowData.x}; top: ${e.y - windowData.y}; width: ${
                e.width}px; height: ${e.height}px; background: ${
                entityTypes.find(f => f.type.name == e.type)?.color}" />`)}
                </div>
                <${Grid} />
            </div>
        </div>
        <textarea class="output" onInput=${
        (e) => parseJson(e.target.value)} value=${outputJson} />
            `;
  }
}
