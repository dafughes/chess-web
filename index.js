// import Game from wasm
const { Game } = wasm_bindgen;

class ChessGame {
  constructor(white_time_ms, black_time_ms) {
    this.game = new Game();

    this.time = {
      "white": white_time_ms,
      "black": black_time_ms,
    };

    this.startTime = null;
  }

  /**
   * Returns the current player to make a move.
   * @example
   * let game = new ChessGame(); // Creates a new game with standard starting position.
   * console.assert(game.colorToMove() === "white");
   * game.makeMove("e2e4");
   * console.assert(game.colorToMove() === "black");
   * @returns {string}
   */
  colorToMove() {
    return this.game.color_to_move();
  }

  isOver() {
    return this.game.legal_moves().length === 0;
  }

  /**
   * Returns an array of all legal moves in current position.
   * @example
   * let game = new ChessGame(); // Creates a new game with standard starting position.
   * console.assert(game.legalMoves().length === 20);
   * @param {string} move
   * @returns {Array.<string>}
   */
  legalMoves() {
    return this.game.legal_moves();
  }

  /**
   * Checks if a move is legal in current position.
   * @example
   * let game = new ChessGame(); // Creates a new game with standard starting position.
   * console.assert(game.isLegalMove("a7a5") === false);  // White to move currently.
   * console.assert(game.isLegalMove("e2e4") === true);
   * @param {string} move
   * @returns {boolean}
   */
  isLegalMove(move) {
    return this.game.legal_moves().includes(move);
  }

  /**
   * Makes a move.
   * @example
   * let game = new ChessGame(); // Creates a new game with standard starting position.
   * console.assert(game.colorToMove() === "white");
   * game.makeMove("e2e4");  // Makes the move "white pawn to e4".
   * console.assert(game.colorToMove() === "black");
   * @param {string} move
   */
  makeMove(move) {
    if (this.isLegalMove(move)) {
      this.game.make_move(move);
    }
  }

  /**
   * Returns the piece on `square`.
   * @example
   * let game = new ChessGame(); // Creates a new game with standard starting position.
   * console.assert(game.getPiece("e4") === undefined);
   * console.assert(game.getPiece("a1") === "R");
   * @param {string} square
   * @returns {string | undefined}
   */
  getPiece(square) {
    return this.game.get_piece(square);
  }

  /**
   * UCI command telling engine what the current position is. Must be sent before every "go"-command.
   * @example
   * let game = new ChessGame(); // Creates a new game with standard starting position.
   * console.assert(game.positionCommand() === "position startpos");
   * game.makeMove("e2e4");
   * console.assert(game.positionCommand() === "position startpos moves e2e4");
   * @returns {string}
   */
  positionCommand() {
    const moves = this.game.move_history().join(" ");
    if (moves === "") {
      return "position startpos";
    } else {
      return `position startpos moves ${moves}`;
    }
  }

  /**
   * UCI command telling engine what the current position is. Must be sent before every "go"-command.
   * UCI protocol has many search related parameters but this engine only cares about time left for players.
   * @example
   * let game = new ChessGame(60000, 60000); // Creates a new game with standard starting position.
   * console.assert(game.goCommand() === "go wtime 60000 btime 60000");
   * @returns {string}
   */
  goCommand() {
    return `go wtime ${this.time["white"]} btime ${this.time["black"]}`;
  }

  result() {
    if (this.game.legal_moves().length === 0) {
      if (this.game.is_check()) {
        return this.colorToMove() === "white" ? "black" : "white";
      } else {
        return "draw";
      }
    }

    return "ongoing";
  }

  startTimer() {
    this.startTime = Date.now();
  }

  stopTimer() {
    if (this.startTime) {
      const elapsed = Date.now() - this.startTime;

      this.time[this.colorToMove()] -= elapsed;

      this.startTime = null;
    }
  }

  getTime(color) {
    if (this.startTime) {
      const elapsed = Date.now() - this.startTime;

      if (color === this.colorToMove()) {
        return this.time[color] - elapsed;
      } else {
        return this.time[color];
      }
    } else {
      return this.time[color];
    }
  }
}

class UI {
  constructor(game, playerIsWhite) {
    this.onPlayerMove = null;

    const board = document.getElementById("board");

    for (let i = 0; i < 64; i++) {
      const squareElement = document.createElement("div");
      squareElement.classList.add("square");

      const rank = playerIsWhite ? 7 - Math.floor(i / 8) : Math.floor(i / 8);
      const file = playerIsWhite ? i % 8 : 7 - i % 8;

      const square = `${String.fromCharCode("a".charCodeAt(0) + file)}${
        rank + 1
      }`;

      squareElement.setAttribute("id", square);

      // Light or dark?
      let isDark = file % 2 === 0;
      if (rank % 2 === 1) {
        isDark = !isDark;
      }

      squareElement.classList.add(isDark ? "dark" : "light");

      board.appendChild(squareElement);
    }

    this.update(game);

    // Stores the starting square for move;
    this.from = null;

    const squares = document.querySelectorAll("#board .square");
    squares.forEach((s) => {
      s.onclick = (e) => {
        if (this.from) {
          const to = e.target.id;
          const move = `${this.from.id}${to}`;

          if (this.isLegalMove(move, game)) {
            this.onPlayerMove(move);
          }
          // Remove all highlights
          squares.forEach((sq) => {
            sq.classList.remove("highlight");
          });
          this.from?.classList.remove("highlight");
          this.from = null;
        } else {
          // Check that selected piece has valid moves so it can be highlighted
          const playerColor = playerIsWhite ? "white" : "black";
          const selectableSquares = new Set(
            Array.from(document.querySelectorAll(".square")).filter((s) => {
              return s.firstElementChild?.id.startsWith(playerColor);
            }).map((s) => s.id),
          );

          if (
            selectableSquares.has(s.id) && game.colorToMove() === playerColor
          ) {
            this.from = e.target;
            this.from.classList.add("highlight");

            // Highlight all destination squares
            const destinations = game.legalMoves().filter((move) =>
              move.startsWith(e.target.id)
            ).map((move) => move.slice(2));

            destinations.forEach((d) =>
              document.getElementById(d).classList.add("highlight")
            );
          }
        }
      };
    });
  }

  isLegalMove(move, game) {
    // TODO: Promotions!!!
    return game.legalMoves().includes(move);
  }

  // Updates the piece positions.
  update(game) {
    for (let i = 0; i < 64; i++) {
      const rank = 7 - Math.floor(i / 8);
      const file = i % 8;

      const square = `${String.fromCharCode("a".charCodeAt(0) + file)}${
        rank + 1
      }`;

      const squareElement = document.getElementById(square);

      const pieces = {
        "P": "white-pawn",
        "N": "white-knight",
        "B": "white-bishop",
        "R": "white-rook",
        "Q": "white-queen",
        "K": "white-king",
        "p": "black-pawn",
        "n": "black-knight",
        "b": "black-bishop",
        "r": "black-rook",
        "q": "black-queen",
        "k": "black-king",
      };

      const p = game.getPiece(square);
      if (p) {
        squareElement.innerHTML = `
            <div class="piece" id="${pieces[p]}" draggable="true">
              <img src=./assets/${pieces[p]}.svg draggable="true">
            </div>
        `;
      } else {
        squareElement.innerHTML = "";
      }
    }
  }
}

function formatTime(timeMilliseconds) {
  // Clamp time to zero
  timeMilliseconds = timeMilliseconds < 0 ? 0 : timeMilliseconds;

  const seconds = timeMilliseconds / 1000;
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const secondsRemainder = Math.floor(seconds % 60);
    const leadingZeros = secondsRemainder < 10 ? "0" : "";
    return `${minutes}:${leadingZeros}${secondsRemainder}`;
  } else {
    return `${seconds.toFixed(1)}`;
  }
}

function gameOverMessage(result) {
  console.log(result);
}

async function run() {
  // Load the Wasm file by awaiting the Promise returned by `wasm_bindgen`
  // `wasm_bindgen` was imported in `index.html`
  await wasm_bindgen();

  const worker = new Worker("./worker.js");

  // I have no idea how to do web worker stuff, wait a small time so worker gets initialized.
  await new Promise((r) => setTimeout(r, 100));

  const game = new ChessGame(600000, 600000);
  const playerIsWhite = true;
  const ui = new UI(game, playerIsWhite);

  if (playerIsWhite) {
    if (!playerIsWhite) {
      worker.postMessage(game.positionCommand());
      game.startTimer();
      worker.postMessage(game.goCommand());
    }
  }

  let gameOver = false;

  setInterval(() => {
    if (gameOver) {
      return;
    }
    // Check if out of time
    if (game.getTime("white") <= 0 || game.getTime("black") <= 0) {
      gameOver = true;
      game.stopTimer();
      const winner = game.colorToMove() === "white" ? "black" : "white";
      gameOverMessage(`Time out - ${winner} wins!`);
    }

    const title = `${formatTime(game.getTime("white"))} ${
      formatTime(game.getTime("black"))
    }`;
    document.title = title;
  }, 100);

  ui.onPlayerMove = (move) => {
    if (gameOver) {
      return;
    }

    if (
      (playerIsWhite && game.colorToMove() === "black") ||
      (!playerIsWhite && game.colorToMove() === "white")
    ) {
      return;
    }

    game.stopTimer();

    console.log(`Player made move ${move}`);

    game.makeMove(move);
    ui.update(game);

    // Check if game is over
    if (game.isOver()) {
      gameOver = true;
      gameOverMessage(`${game.result()} wins!`);
      return;
    }

    worker.postMessage(game.positionCommand());
    game.startTimer();
    worker.postMessage(game.goCommand());
  };

  worker.onmessage = (e) => {
    game.stopTimer();

    const engineMove = e.data.slice(9);
    console.log(`Engine made move ${engineMove}`);

    game.makeMove(engineMove);
    ui.update(game);

    // Check if game is over
    if (game.isOver()) {
      gameOverMessage(`${game.result()} wins!`);

      return;
    }

    game.startTimer();
  };
}

run();
