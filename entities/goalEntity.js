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

import {BLACK_COLOR, WHITE_COLOR} from '../constants.js';
import {GameEntity} from '../game.js';
import {PlaySound} from '../sound.js';

import {RippleEntity} from './rippleEntity.js';

export const GOAL_MODAL_COLOR = 'rgba(200, 200, 200, 0.75)';
export const GOAL_MODAL_BUTTON_COLOR = 'rgb(150, 150, 150)';

// A checkered flag entity that ends the level once the player reaches it.
class GoalEntity extends GameEntity {
  constructor(game_context, x, y, w, h) {
    super(game_context, x, y);
    this.#width = w;
    this.#height = h;
    this.#goal_reached = false;
    this.SetZOrder(100);
    this.#rippleInterval = setInterval(() => {
      this.CreateRipple();
    }, 3000);
  }
  Update(context) {
    if (!this.#goal_reached) {
      return;
    }

    if (context.InputManager().WasKeyPressed(' ')) {
      this.GetOwningGameWindow().GetController().SetLoadNextLevel();
      return;
    }
    if (context.InputManager().WasKeyPressed('r')) {
      this.GetOwningGameWindow().GetController().SetRetryLevel();
      return;
    }

    // Check if a button in the modal has been clicked.
    const mouseCoordinates = context.InputManager().GetMouseCoordinates();
    if (mouseCoordinates.mouseIsDown) {
      // Mouse coordinates are local to the window.
      let owningWindow = this.GetOwningGameWindow().GetWindow();
      const x = owningWindow.GetX() + mouseCoordinates.x;
      const y = owningWindow.GetY() + mouseCoordinates.y;
      if (this.#wasButtonClicked(x, y, this.#next_button_box)) {
        this.GetOwningGameWindow().GetController().SetLoadNextLevel();
        return;
      }
      if (this.#wasButtonClicked(x, y, this.#retry_button_box)) {
        this.GetOwningGameWindow().GetController().SetRetryLevel();
        return;
      }
    }
  }
  Draw(ctx) {
    this.#drawCheckeredFlag(ctx);
    if (this.#goal_reached) {
      this.#drawLevelEndModal(ctx);
    }
  }
  GetCollisionBox() {
    return {
      x1: this.GetX(),
      y1: this.GetY(),
      x2: this.GetX() + this.#width,
      y2: this.GetY() + this.#height,
      isBlocking: false,
      onCollision: this.OnCollision.bind(this),
    };
  }
  OnCollision(context, collided_with) {
    if (this.#goal_reached) {
      return;
    }
    if (collided_with.GetOwningGameWindow() != this.GetOwningGameWindow()) {
      return;  // Must be in the same game window as this entity.
    }
    clearInterval(this.#rippleInterval);
    let rippleEntity = new RippleEntity(
        context, this.GetX(), this.GetY(), /*style=*/ 'rainbow');
    context.AddEntity(rippleEntity);
    this.#goal_reached = true;
    PlaySound('clap');
  }
  CreateRipple() {
    let context = this.GetGameContext();
    context.AddEntity(new RippleEntity(context, this.GetX(), this.GetY()));
  }
  #drawCheckeredFlag(ctx) {
    let xStep = this.#width / 4;
    let yStep = this.#height / 4;
    let nextColor = WHITE_COLOR;
    for (let i = 0; i < this.#width; i += xStep) {
      for (let j = 0; j < this.#height; j += yStep) {
        ctx.fillStyle = nextColor;
        nextColor = nextColor === WHITE_COLOR ? BLACK_COLOR : WHITE_COLOR;
        const xCoord = this.GetX() + i;
        const yCoord = this.GetY() + j;
        ctx.fillRect(xCoord, yCoord, xStep, yStep);
      }
      nextColor = nextColor === WHITE_COLOR ? BLACK_COLOR : WHITE_COLOR;
    }
  }
  #drawModalBox(ctx, x, y, w, h) {
    ctx.fillStyle = GOAL_MODAL_COLOR;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = BLACK_COLOR;
    ctx.strokeRect(x, y, w, h);
  }
  #drawGoalMessage(ctx, x, y, w, text) {
    let rainbowGradient = ctx.createLinearGradient(x - w / 2, y, x + w / 2, y);
    for (let colorStop of RippleEntity.CreateRainbowColorStop()) {
      rainbowGradient.addColorStop(colorStop.position, colorStop.color);
    }

    ctx.font = '36px Comic Sans MS';
    ctx.textAlign = 'center';
    ctx.fillStyle = rainbowGradient;
    ctx.fillText(text, x, y);
    ctx.strokeStyle = BLACK_COLOR;
    ctx.strokeText(text, x, y);
  }
  #drawButton(ctx, x, y, w, h, text) {
    ctx.fillStyle = GOAL_MODAL_BUTTON_COLOR;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = BLACK_COLOR;
    ctx.strokeRect(x, y, w, h);

    ctx.font = '12px Comic Sans MS';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = BLACK_COLOR;
    ctx.fillText(text, x + w / 2, y + h / 2, (w * 5) / 6);
  }
  #drawLevelEndModal(ctx) {
    const owningWindow = this.GetOwningGameWindow().GetWindow();
    const windowX = owningWindow.GetX();
    const windowY = owningWindow.GetY();
    const windowWidth = owningWindow.GetWidth();
    const windowHeight = owningWindow.GetHeight();

    // Draw the modal box.
    const boxX = windowX + windowWidth / 10;
    const boxY = windowY + windowHeight / 4;
    const boxWidth = (windowWidth * 4) / 5;
    const boxHeight = windowHeight / 2;
    this.#drawModalBox(ctx, boxX, boxY, boxWidth, boxHeight);

    // Print the goal message.
    const textX = boxX + boxWidth / 2;
    const textY = boxY + boxHeight / 2;
    const textWidth = (boxWidth * 2) / 3;
    const goalMessage = 'Goal reached!';
    this.#drawGoalMessage(ctx, textX, textY, textWidth, goalMessage);

    // Draw the next level button.
    let btnX = boxX + (boxWidth * 2) / 3;
    const btnY = boxY + (boxHeight * 3) / 4;
    const btnWidth = boxWidth / 6;
    const btnHeight = boxHeight / 8;
    const nextBtnText = 'Next';
    this.#drawButton(ctx, btnX, btnY, btnWidth, btnHeight, nextBtnText);
    this.#next_button_box = {
      x1: btnX,
      y1: btnY,
      x2: btnX + btnWidth,
      y2: btnY + btnHeight,
    };

    // Draw the retry level button.
    btnX = boxX + boxWidth / 3 - btnWidth;
    const retryBtnText = 'Retry';
    this.#drawButton(ctx, btnX, btnY, btnWidth, btnHeight, retryBtnText);
    this.#retry_button_box = {
      x1: btnX,
      y1: btnY,
      x2: btnX + btnWidth,
      y2: btnY + btnHeight,
    };
  }
  #wasButtonClicked(mouseX, mouseY, btnBox) {
    return (
        mouseX >= btnBox.x1 && mouseX <= btnBox.x2 && mouseY >= btnBox.y1 &&
        mouseY <= btnBox.y2);
  }

  #width;
  #height;
  #goal_reached;
  #next_button_box;
  #retry_button_box;
  #rippleInterval;
}

export {GoalEntity};
