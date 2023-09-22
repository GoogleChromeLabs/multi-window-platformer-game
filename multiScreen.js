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


class MultiScreenUtil {
  // Note: This uses `window` from the caller's context.
  static async GetScreenDetails() {
    if (MultiScreenUtil.#screen_details === undefined) {
      try {
        MultiScreenUtil.#screen_details = await window.getScreenDetails();
      } catch (e) {
        MultiScreenUtil.#screen_details = null;
        // console.warn('Unable to use "window.getScreenDetails"');
      }
    }
    return MultiScreenUtil.#screen_details;
  }

  // Note: This uses `window` from the caller's context.
  static async GetMultiScreenBoundaries() {
    let bounds = {
      top: window.screen.availTop,
      left: window.screen.availLeft,
      right: window.screen.availLeft + window.screen.availWidth,
      bottom: window.screen.availTop + window.screen.availHeight,
    };
    let details = await MultiScreenUtil.GetScreenDetails();
    if (details) {
      for (const screen of details.screens) {
        bounds.top = Math.min(bounds.top, screen.top);
        bounds.left = Math.min(bounds.left, screen.left);
        bounds.right = Math.max(bounds.right, screen.left + screen.width);
        bounds.bottom = Math.max(bounds.bottom, screen.top + screen.height);
      }
    }
    bounds.width = bounds.right - bounds.left;
    bounds.height = bounds.bottom - bounds.top;
    return bounds;
  }

  static #screen_details = undefined;
};

export {MultiScreenUtil};
