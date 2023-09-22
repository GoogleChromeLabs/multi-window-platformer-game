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

class Window {
  static Create(
      lock_id, innerWidth, innerHeight, screenX, screenY, allow_resize = false,
      fullscreen = false) {
    // Known issue: fireworks are not fullscreen, due to gesture requirements.
    // TODO: Open one from the active window, and wait for new API features:
    // https://github.com/w3c/window-management/blob/many-windows-many-screens/EXPLAINER_many_windows_many_screens.md
    const dom_window = window.open(
        'empty.html', '_blank',
        `popup,width=${innerWidth},height=${innerHeight},left=${screenX},top=${
            screenY},fullscreen=${fullscreen ? 1 : 0}`);
    if (!dom_window)
      return Promise.resolve(null);
    var new_window =
        new Window(dom_window, screenX || 0, screenY || 0, allow_resize);
    return new_window.Initialize(lock_id);
  }
  constructor(dom_window, x, y, allow_resize) {
    this.#dom_window = dom_window;
    this.#x = x;
    this.#y = y;
    this.#allow_resize = allow_resize;
    this.#focus = false;
  }
  Initialize(lock_id) {
    this.#dom_window.addEventListener('resize', (event) => {
      this.OnWindowResized();
    });
    this.#dom_window.addEventListener('focus', (event) => {
      this.#focus = true;
    });
    this.#dom_window.addEventListener('blur', (event) => {
      this.#focus = false;
    });

    return new Promise(r => {
      // TODO(resolve early if window is already ready to add elements to.);
      // TODO: Avoid 100ms setTimeout workaround for racing with window bounds.
      this.#dom_window.addEventListener('load', () => {
        setTimeout(() => {
          // Have the child window try to acquire our game lock; if successful
          // it means we have closed, and the child can self-close.
          const script = this.#dom_window.document.createElement('script');
          script.innerText = `navigator.locks.request('${lock_id}', lock => { self.close(); });`;
          this.#dom_window.document.body.append(script);

          this.#canvas = this.#dom_window.document.createElement('CANVAS');
          this.#dom_window.document.body.append(this.#canvas);
          // TODO: Polyfill? Fail more gracefully?
          if ('getScreenDetails' in this.#dom_window) {
            this.#dom_window.getScreenDetails()
            .then(sD => { this.#screen_details = sD; })
            .catch(ex => { /*console.warn('Unable to use "window.getScreenDetails"');*/ });
          }
          // Store the offset of the actual x/y vs the requested one to
          // compensate for the browser window decorations.
          this.#offset_x = this.#x - this.GetDomWindow().screenX;
          this.#offset_y = this.#y - this.GetDomWindow().screenY;

          // Store outer window dimensions to re-apply when resize is
          // disallowed.
          this.#original_outer_width = this.GetDomWindow().outerWidth;
          this.#original_outer_height = this.GetDomWindow().outerHeight;
          this.UpdateCanvas();
          r(this);
        }, 100);
      });
    });
  }
  GetCanvas() {
    return this.#canvas;
  }
  GetDomWindow() {
    return this.#dom_window;
  }
  UpdateCanvas() {
    if (this.#canvas) {
      this.#canvas.width = this.#dom_window.innerWidth;
      this.#canvas.height = this.#dom_window.innerHeight;
    }
  }
  OnWindowResized() {
    if (this.#allow_resize) {
      this.UpdateCanvas();
    } else if (!this.#original_outer_width || !this.#original_outer_height) {
      // Window load may fire with outerWidth|Height of 0 in some cases?
      // (observed with cross-screen fullscreen + window.open())
      this.#original_outer_width = this.GetDomWindow().outerWidth;
      this.#original_outer_height = this.GetDomWindow().outerHeight;
      this.UpdateCanvas();
    } else {
      this.SetSize(this.#original_outer_width, this.#original_outer_height);
    }
  }
  Update(context) {
    if (this.IsFocused()) {
      const input = context.InputManager();
      const dx = input.IsKeyDown('a') ? -1 : input.IsKeyDown('d') ? 1 : 0;
      const dy = input.IsKeyDown('w') ? -1 : input.IsKeyDown('s') ? 1 : 0;
      if (dx || dy) {
        this.#dom_window.moveBy(dx * 5, dy * 5);
      }
    }
  }
  Sync() {
    this.#x = this.GetDomWindow().screenX + this.#offset_x;
    this.#y = this.GetDomWindow().screenY + this.#offset_y;
  }
  SetSize(width, height) {
    this.#dom_window.resizeTo(width, height);
    this.UpdateCanvas();
  }
  GetX() {
    return this.#x;
  }
  GetY() {
    return this.#y;
  }
  GetWidth() {
    return this.#dom_window.innerWidth;
  }
  GetHeight() {
    return this.#dom_window.innerHeight;
  }
  Contains(x, y) {
    return this.GetX() <= x && x <= this.GetX() + this.GetWidth() &&
        this.GetY() <= y && y <= this.GetY() + this.GetHeight();
  }
  IsFocused() {
    return this.#focus;
  }
  Focus() {
    this.#dom_window.focus();
  }
  GetScreenDetails() {
    return this.#screen_details;
  }
  IsClosed() {
    return this.#dom_window.closed;
  }
  ShowToast(title, text) {
    console.log(title);
    const toast = this.GetDomWindow().document.getElementById('toast');
    toast.classList.remove('fade-in-out');
    toast.classList.add('fade-in-out');
    toast.querySelector('h5').innerText = title;
    toast.querySelector('p').innerText = text;
  }
  SetTitle(title) {
    this.GetDomWindow().document.querySelector('title').innerText = title;
  }
  #dom_window;
  #canvas;
  #offset_x;
  #offset_y;
  #original_outer_width;
  #original_outer_height;
  #x;
  #y;
  #allow_resize;
  #focus;
  #screen_details;
};


class WindowManager {
  constructor() {
    this.#windows = new Array();

    // Acquire and hold a lock until this is disposed. Child windows will
    // attempt to aquire the lock and self-close if they succeed.
    this.#lock_id = `game_window_lock-${Math.random()}`;
    navigator.locks.request(this.#lock_id, lock => {
      return new Promise(() => {}); // never resolved
    });
  }
  // Initializes the window manager. Ensures
  async Initialize() {
    // await window.getScreenDetails();
    if (!this.#isWindowManagementGranted()) {
    }
  }
  AddWindow(width, height, x, y, allow_resize = false, fullscreen = false) {
    const windowPromise = Window.Create(
        this.#lock_id, width, height, x, y, allow_resize, fullscreen);
    windowPromise.then(window => {
      if (window)
        this.#windows.push(window);
    });
    return windowPromise;
  }
  GetWindows() {
    return this.#windows;
  }

  async #isWindowManagementGranted() {
    try {
      return (await navigator.permissions.query({
               name: 'window-management'
             })).state === 'granted';
    } catch (ex) {
      return false;
    }
  }

  CycleFocus(delta) {
    const num = this.#windows.length;
    if (!num)
      return;
    for (let i = 0; i < num; ++i) {
      if (this.#windows[i].IsFocused()) {
        this.#windows[(i + delta + num) % num].Focus();
        return;
      }
    }
    // Pick an arbitrary window.
    this.#windows[0].Focus();
  }

  #windows;
  #last_button_state;
  #lock_id;
};
export {Window, WindowManager};
