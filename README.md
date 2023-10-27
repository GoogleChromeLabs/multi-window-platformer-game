### Disclaimer

This is not an officially supported Google product.

# Multi-window Platformer Game

This repository hosts a simple platformer game that makes use of multiple windows and screens.
It is intended as an API showcase to inspire and increase multi-screen awareness on the Web through a unique game experience.
It exercises a variety of Web APIs, including:

- [Window Management API](https://w3c.github.io/window-management/): getScreenDetails(), cross-screen window placement.
- [Popup Window APIs](https://developer.mozilla.org/en-US/docs/Web/API/Window): open(), moveTo(), moveBy(), resizeTo(), focus(), close().
- [\<canvas\>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas): drawing and transforms relative to multi-screen space.
- [HTMLAudioElement/Audio](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAudioElement/Audio): sound effects, with pre-loading.
- [Gamepad API](https://w3c.github.io/gamepad/): buttons and axes.

## Instructions on how to run / play it

Play [here](https://googlechromelabs.github.io/multi-window-platformer-game/) or host your own local clone:

```console
$ git clone https://github.com/googlechromelabs/multi-window-platformer-game.git
$ cd multi-window-platformer-game
$ python -m http.server &
$ chrome -- "http://localhost:8000"
```

Goal of the game: Just move 🟥 to 🏁 through levels. Look for temporary hints at the bottom of each level's window.

## Basic Game Design

- Contains a `GameContext` which stores a global list of `GameEntity`.
- A `GameEntity` is owned by one `GameWindow` at a time.
- The `GameController` controls the main logic update loop for each entity in `GameContext`, and each `GameWindow` handles the drawing of all `GameEntity` (_owned_ and _unowned_) into its own window (canvas).
- A `GameWindow` is responsible for updating all of its _owned_ entities when the window is moved around by the player.

### Note

You can use the editor at `tile-editor/index.html` if you want to design your own tiles for levels.

## Disclaimer

It has been tested for basic functionality and for gaming fun :-). Some bugs are expected.
