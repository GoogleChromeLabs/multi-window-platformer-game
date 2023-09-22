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

import {BLACK_COLOR, BLUE_COLOR, GREEN_COLOR, INDIGO_COLOR, ORANGE_COLOR, RED_COLOR, VIOLET_COLOR, WHITE_COLOR, YELLOW_COLOR,} from '../constants.js';
import {GameContext, GameEntity} from '../game.js';

// Simple animation paramaterization helper.
// TODO: Add interesting types: repeat count, timing curves, reversing, etc.
class Animation {
  constructor(durationMS = 1000, repeat = false) {
    this.#start = Date.now();
    this.#duration_ms = durationMS;
    this.#repeat = repeat;
  }
  // Returns the fraction of the animation's duration elapsed from construction.
  GetValue() {
    let timePassedMS = Date.now() - this.#start;
    if (this.#repeat)
      timePassedMS %= this.#duration_ms;
    return Math.min(1, timePassedMS / this.#duration_ms);
  }
  IsDone() {
    return !this.#repeat && (Date.now() - this.#start) >= this.#duration_ms;
  }
  #start;
  #duration_ms;
  #repeat;
}

// A animating ripple effect
class RippleEntity extends GameEntity {
  constructor(
      game_context, x, y, style = undefined, radius = 1000, repeat = false) {
    super(game_context, x, y);
    this.#radius = radius;
    this.#animation = new Animation(/*durationMS=*/ radius * 2, repeat);
    this.SetZOrder(0);
    if (style === 'rainbow') {
      this.#colorStops = RippleEntity.CreateRainbowColorStop(
          /*stepStart=*/ 0.6, /*stepEnd=*/ 1);
    } else {
      // Set the default gradient color stops.
      this.#colorStops = [
        {position: 0.600, color: '#ffffff00'},
        {position: 0.800, color: '#ffffff20'},
        {position: 0.895, color: '#ffffffaa'},
        {position: 0.900, color: '#ffffff20'},
        {position: 1.000, color: '#ffffff00'}
      ];
    }
  }
  async Update(ctx) {
    if (this.#animation.IsDone())
      this.GetGameContext().RemoveEntity(this);
  }
  Draw(ctx) {
    let animationValue = this.#animation.GetValue();
    let gradientX = this.GetX(), gradientY = this.GetY(),
        gradientR = this.#radius / 10;
    let gradientX1 = gradientX, gradientY1 = gradientY,
        gradientR1 = this.#radius;
    let gradient = ctx.createRadialGradient(
        gradientX, gradientY, gradientR * animationValue, gradientX1,
        gradientY1, gradientR1 * animationValue);
    for (let colorStop of this.#colorStops)
      gradient.addColorStop(colorStop.position, colorStop.color);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(
        this.GetX(), this.GetY(), this.#radius * animationValue, 0,
        2 * Math.PI);
    ctx.fill();
  }

  static CreateRainbowColorStop(stepStart = 0.0, stepEnd = 1.0) {
    const TRANSPARENT_COLOR = '#FFFFFF00';
    const colors = [
      VIOLET_COLOR,
      INDIGO_COLOR,
      BLUE_COLOR,
      GREEN_COLOR,
      YELLOW_COLOR,
      ORANGE_COLOR,
      RED_COLOR,
    ];
    const stepAmount = (stepEnd - stepStart) / (colors.length - 1);
    let colorStops = new Array();
    if (stepStart > 0.0) {
      colorStops.push({position: 0.0, color: TRANSPARENT_COLOR});
      colorStops.push({position: stepStart, color: TRANSPARENT_COLOR});
    }
    for (let i = 0; i < colors.length; i++) {
      let colorStop = {
        position: stepStart + i * stepAmount,
        color: colors[i],
      };
      colorStops.push(colorStop);
    }
    if (stepEnd < 1.0) {
      colorStops.push({position: stepEnd, color: TRANSPARENT_COLOR});
      colorStops.push({position: 1.0, color: TRANSPARENT_COLOR});
    }
    return colorStops;
  }

  #radius;
  #animation;
  #colorStops;
}

export {RippleEntity};
