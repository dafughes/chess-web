// The worker has its own scope and no direct access to functions/objects of the
// global scope. We import the generated JS file to make `wasm_bindgen`
// available which we need to initialize our Wasm code.
importScripts("./pkg/chess_web.js");

// In the worker, we have a different struct that we want to use as in
// `index.js`.
const { Engine } = wasm_bindgen;

async function init() {
  // Load the Wasm file by awaiting the Promise returned by `wasm_bindgen`.
  await wasm_bindgen("./pkg/chess_web_bg.wasm");

  let engine = new Engine();

  self.onmessage = (e) => {
    const command = e.data;
    console.log(`Received command '${command}'`);

    const response = engine.execute(command);

    if (response !== undefined) {
      self.postMessage(`bestmove ${response}`);
    }
  };
}

init();
