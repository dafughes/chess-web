// import Game from wasm
const { Game } = wasm_bindgen;

function squareRank(square) {
  return square.charCodeAt(1) - "1".charCodeAt(0);
}

function squareFile(square) {
  return square.charCodeAt(0) - "a".charCodeAt(0);
}

function makeSquare(rank, file) {
  return `${String.fromCharCode("a".charCodeAt(0) + file)}${rank + 1}`;
}

class Clock {
  constructor(timeSeconds) {
    this.time = {
      "white": timeSeconds,
      "black": timeSeconds,
    };

    this.startTime = null;
    this.turn = "white";
  }

  getTime(player) {
    if (this.startTime && (player === this.turn)) {
      const d = (new Date() - this.startTime) / 1000;

      const t = this.time[player] - d;
      return t < 0 ? 0 : t; // Clamp positive
    } else {
      const t = this.time[player];
      return t < 0 ? 0 : t; // Clamp positive
    }
  }

  toggle() {
    if (this.startTime) {
      const d = (new Date() - this.startTime) / 1000;
      this.time[this.turn] -= d;
    }

    this.startTime = new Date();
    this.turn = this.turn === "white" ? "black" : "white";
  }

  static timeString(t) {
    if (t >= 60) {
      const min = Math.floor(t / 60);
      const sec = Math.floor(t % 60);
      const leadingZeros = sec < 10 ? "0" : "";
      return `${min}:${leadingZeros}${sec}`;
    } else {
      return `${t.toFixed(1)}`;
    }
  }
}

class UI {
  static interval = null;

  constructor(playerColor, timeSeconds, onPlayerMove) {
    this.playerColor = playerColor;
    this.timeSeconds = timeSeconds;
    this.game = new Game();
    this.clock = new Clock(timeSeconds);

    this.fromSquare = null;
    this.toSquare = null;

    this.gameOver = false;

    // This is called when the human player makes a move through the GUI
    this.onPlayerMove = onPlayerMove;

    this.buildBoard();
    this.updateBoard();
    this.buildPromotionPopup();

    const blackClock = playerColor === "white" ? "top-clock" : "bottom-clock";
    document.getElementById(blackClock).classList.add("black-text");

    if (UI.interval) {
      clearInterval(UI.interval);
    }
    UI.interval = setInterval(() => {
      const whiteTime = Clock.timeString(this.clock.getTime("white"));
      const blackTime = Clock.timeString(this.clock.getTime("black"));

      if (whiteTime <= 0) {
        this.gameOver = true;
        this.showGameOver("black wins!");
      } else if (blackTime <= 0) {
        this.gameOver = true;
        this.showGameOver("white wins!");
      }

      if (playerColor === "white") {
        document.getElementById("bottom-clock").firstElementChild.textContent =
          whiteTime;
        document.getElementById("top-clock").firstElementChild.textContent =
          blackTime;
      } else {
        document.getElementById("bottom-clock").firstElementChild.textContent =
          blackTime;
        document.getElementById("top-clock").firstElementChild.textContent =
          whiteTime;
      }
    }, 100);
  }

  buildBoard() {
    const board = document.getElementById("board");
    // Clear previous stuff
    board.innerHTML = "";

    for (let i = 0; i < 64; i++) {
      const square = document.createElement("div");
      square.classList.add("square");

      const rank = this.playerColor === "white"
        ? 7 - Math.floor(i / 8)
        : Math.floor(i / 8);
      const file = this.playerColor === "white" ? i % 8 : 7 - i % 8;

      const squareId = makeSquare(rank, file);

      square.setAttribute("id", squareId);

      // Light or dark?
      let isDark = file % 2 === 0;
      if (rank % 2 === 1) {
        isDark = !isDark;
      }

      square.classList.add(isDark ? "dark" : "light");

      square.onclick = (event) => {
        if (this.gameOver) {
          return;
        }

        const squareId = event.target.id;
        if (this.fromSquare) {
          this.toSquare = squareId;
          const move = `${this.fromSquare}${this.toSquare}`;
          const moves = this.game.legal_moves().filter((m) =>
            m.startsWith(move)
          );

          if (moves.length === 1) {
            this.makeMove(move);

            this.fromSquare = null;
            this.toSquare = null;
          } else if (moves.length === 4) {
            // Promotion
            this.showPromotionPopup();
          } else {
            this.clearSelected();
            this.clearHighlights();
            this.hidePromotionPopup();
            this.fromSquare = null;
            this.toSquare = null;
          }
        } else {
          this.setSelected(squareId);
        }
      };
      board.appendChild(square);
    }
  }

  buildPromotionPopup() {
    const promotionPopup = document.getElementById("promotion-popup");
    // Clear previous stuff
    promotionPopup.innerHTML = "";

    [["queen", "q"], ["rook", "r"], ["bishop", "b"], ["knight", "n"]].forEach(
      ([kind, k]) => {
        const square = document.createElement("div");
        square.classList.add("square");

        const img = document.createElement("img");
        img.classList.add(kind);

        img.src = `./assets/${this.playerColor}-${kind}.svg`;

        square.onclick = (e) => {
          const move = `${this.fromSquare}${this.toSquare}${k}`;
          this.makeMove(move);
          this.hidePromotionPopup();
          this.clearSelected();
          this.fromSquare = null;
          this.toSquare = null;
        };
        square.appendChild(img);

        promotionPopup.appendChild(square);
      },
    );
  }

  setSelected(squareId) {
    if (
      this.game.get_piece(squareId)?.color() === this.playerColor &&
      this.game.color_to_move() === this.playerColor
    ) {
      this.fromSquare = squareId;
      document.getElementById(squareId).classList.add("selected");

      this.game.legal_moves().filter((move) => {
        if (move.startsWith(squareId)) {
          const dest = move.slice(2, 4);
          document.getElementById(dest).classList.add("highlight");
        }
      });
    }
  }

  clearSelected() {
    document.getElementById(this.fromSquare).classList.remove("selected");
  }

  clearHighlights() {
    document.querySelectorAll(".square").forEach((square) =>
      square.classList.remove("highlight")
    );
  }

  showPromotionPopup() {
    document.getElementById("board").classList.add("blur", "pointer");
    document.getElementById("promotion-popup").classList.add(
      "popup-show",
    );
  }

  hidePromotionPopup() {
    document.getElementById("board").classList.remove("blur");
    document.getElementById("promotion-popup").classList.remove(
      "popup-show",
    );
  }

  makeMove(move) {
    this.game.make_move(move);
    this.clock.toggle();

    this.updateBoard();
    this.clearSelected();
    this.clearHighlights();
    this.onPlayerMove(move);

    // Check result
    if (this.game.legal_moves().length === 0) {
      if (this.game.is_check()) {
        const winner = this.game.color_to_move() === "white"
          ? "black"
          : "white";
        const msg = `${winner} wins!`;
        this.showGameOver(msg);
      } else {
        this.showGameOver("Stalemate");
      }
    }
  }

  showGameOver(msg) {
    clearInterval(UI.interval);
    UI.interval = null;

    document.getElementById("board").classList.add("blur");
    const gameOver = document.getElementById("gameover");
    gameOver.classList.add("popup-show");
    gameOver.firstElementChild.firstElementChild.innerHTML =
      `Game over, ${msg}`;
  }

  hideGameOver() {
    document.getElementById("gameover").classList.remove("popup-show");
  }

  makeEngineMove(move) {
    this.game.make_move(move);
    this.clock.toggle();

    this.updateBoard();

    // Check result
    if (this.game.legal_moves().length === 0) {
      if (this.game.is_check()) {
        const winner = this.game.color_to_move() === "white"
          ? "black"
          : "white";
        const msg = `${winner} wins!`;
        this.showGameOver(msg);
      } else {
        this.showGameOver("Stalemate");
      }
    }
  }

  updateBoard() {
    document.querySelectorAll("#board .square").forEach((square) => {
      const piece = this.game.get_piece(square.id);
      if (piece) {
        square.innerHTML =
          `<img class="${piece.kind()} ${piece.color()}" src="./assets/${piece.color()}-${piece.kind()}.svg">`;
      } else {
        square.innerHTML = "";
      }
    });
  }
}

function positionCommand(game) {
  const moves = game.move_history();

  let movePart = "";
  if (moves.length > 0) {
    movePart = `moves ${moves.join(" ")}`;
  }

  // return `position startpos ${movePart}`;
  return `position fen 4k3/P3N3/8/8/8/8/8/R3K2R w KQ - 0 1 ${movePart}`;
}

function goCommand(clock) {
  const wtime = Math.floor(clock.getTime("white") * 1000);
  const btime = Math.floor(clock.getTime("black") * 1000);
  return `go wtime ${wtime} btime ${btime}`;
}

var ui = null;
var worker;

async function run() {
  // Load the Wasm file by awaiting the Promise returned by `wasm_bindgen`
  // `wasm_bindgen` was imported in `index.html`
  await wasm_bindgen();

  worker = new Worker("./worker.js");

  // I have no idea how to do web worker stuff, wait a small time so worker gets initialized.
  await new Promise((r) => setTimeout(r, 100));

  document.getElementById("menu").classList.add("popup-show");

  ui = new UI("white", 60, (move) => {
    worker.postMessage(positionCommand(ui.game));
    worker.postMessage(goCommand(ui.clock));
  });

  worker.onmessage = (msg) => {
    const bestmove = msg.data.slice(9);
    ui.makeEngineMove(bestmove);
  };
}

run();

function menuPlay() {
  document.getElementById("menu").classList.remove("popup-show");
  document.getElementById("setup").classList.add("popup-show");
}

function go() {
  // Get game configs
  const playerColor =
    document.querySelector('input[name="color"]:checked').value;

  const time = Number(
    document.querySelector('input[name="time"]:checked').value,
  );

  document.getElementById("setup").classList.remove("popup-show");
  ui = new UI(playerColor, time, (move) => {
    worker.postMessage(positionCommand(ui.game));
    worker.postMessage(goCommand(ui.clock));
  });
  worker.onmessage = (msg) => {
    const bestmove = msg.data.slice(9);
    console.log("Engine move: " + bestmove);
    ui.makeEngineMove(bestmove);
  };
  document.getElementById("board").classList.remove("blur");

  if (playerColor === "black") {
    worker.postMessage(positionCommand(ui.game));
    worker.postMessage(goCommand(ui.clock));
  }
}

function playAgain() {
  document.getElementById("gameover").classList.remove("popup-show");
  document.getElementById("setup").classList.add("popup-show");
}
