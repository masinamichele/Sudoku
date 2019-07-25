class Grid {
  constructor() {
    this.rows = [];
    this.columns = [];
    this.sectors = [];
    this.cells = [];
    this.build();
  }

  build() {
    for (let i = 0; i < 81; i++) {
      this.cells.push(new Cell(i));
    }
    this.rows = Row.from(this.cells);
    this.columns = Column.from(this.cells);
    this.sectors = Sector.from(this.cells);

    function findCell(array, cell) {
      let found = undefined;
      array.forEach(item => {
        if (found) return;
        found = K.flatten(item.cells).find(x => x.id === cell.id);
        if (found) found = item;
      });
      return found;
    }

    for (const cell of this.cells) {
      const row = findCell(this.rows, cell);
      const col = findCell(this.columns, cell);
      const sec = findCell(this.sectors, cell);
      cell.assignPosition(row, col, sec);
    }

    this.show();
  }

  generate(c) {
    let current = c || 0;
    if (current >= this.cells.length) {
      return true;
    } else {
      const cell = this.cells[current];
      if (cell.value !== null) {
        if (this.generate(current + 1)) return true;
      } else {
        const legalValues = K.shuffle(cell.findLegalValues());
        for (const v of legalValues) {
          cell.value = v;
          if (this.generate(current + 1)) return true;
        }
        cell.value = null;
      }
    }
    return false;
  }

  prepareGame() {
    // 1. Start with a complete, valid board (filled with 81 numbers).
    // 2. Make a list of all 81 cell positions and shuffle it randomly.
    const shuffledCells = K.shuffle(this.cells);
    let current = 0;
    let backup = null;

    while (current < 81) {
      // html.log(`${current + 1}/81`);
      console.log(current + 1);

      // 3. As long as the list is not empty, take the next position from the list and remove the number from the related cell.
      backup = shuffledCells[current].value;
      shuffledCells[current].value = null;

      // 4. Test uniqueness using a fast backtracking solver.
      const isUnique = this.checkUnique(shuffledCells);

      // 5. If the current board has still just one solution, goto step 3) and repeat.
      // 6. If the current board has more than one solution, undo the last removal (step 3), and continue step 3 with the next position from the list
      if (!isUnique) {
        shuffledCells[current].value = backup;
      }

      current++;
    }

    // 7. Stop when you have tested all 81 positions.
    this.lock();
  }

  checkUnique(cells) {
    const solutions = [];
    let loop = 0;
    while (loop < 4) {
      const testGrid = new Grid();
      testGrid.load(cells);
      testGrid.generate();
      solutions.push(testGrid.getValueString());

      if (!solutions.every(v => v === solutions[0])) return false;

      loop++;
    }

    return true;
  }

  getValueString() {
    let r = "";
    this.cells.forEach(cell => {
      r += cell.value ? cell.value : 0;
    });
    return r;
  }

  validate() {
    for (const cell of this.cells) {
      if (!cell.validate(cell.value)) return false;
    }
    return true;
  }

  clearInserted() {
    this.cells.filter(x => !x.locked).forEach(cell => {
      cell.value = null;
    });
    this.show();
  }

  lock() {
    this.cells.filter(x => x.value !== null).forEach(cell => {
      cell.locked = true;
    });
    this.show();
  }
  unlock() {
    this.cells.filter(x => x.locked).forEach(cell => {
      cell.locked = false;
    });
    this.show();
  }

  load(values) {
    if (typeof values === "string") {
      if (values.length !== 81) return;
      for (const val in values) {
        if (values[val] !== "0") this.cells[val].value = Number(values[val]);
      }
      this.lock();
      this.show();
    } else if (typeof values === "object") {
      values.forEach(val => {
        this.cells.find(x => x.id === val.id).value = val.value;
      });
    }
  }

  getCellAddress(eventId) {
    return [Number(eventId[1]), Number(eventId[2])];
  }

  show() {
    const wrapper = K("<div>").addClass("table-wrapper");
    const table = K("<table>");
    for (let i = 0; i < 9; i++) {
      const row = K("<tr>");
      for (let j = 0; j < 9; j++) {
        const input = K("<input>", {
          type: "text",
          id: `_${i}${j}`,
          value: this.cells[j + i * 9].value ? this.cells[j + i * 9].value : "",
          onKeyPress: "return checkInput(event)",
          onKeyDown: "keyDown(event)",
          maxLength: "1",
          onFocus: "this.select()"
        }).css({
          "background-color":
            (Math.floor(i / 3) + Math.floor(j / 3)) % 2 === 0
              ? "#ecf0f1"
              : "#ffffff"
        });

        if (this.cells[j + i * 9].locked) {
          input.set({
            readonly: true
          });
        }

        row.append(K("<td>").append(input));
      }
      table.append(row);
    }
    wrapper.append(table);
    area.empty();
    area.append(wrapper);
  }
}

class Cell {
  constructor(id) {
    this.id = id;
    this.value = null;
    this.row = undefined;
    this.column = undefined;
    this.sector = undefined;
    this.locked = false;
  }

  assignPosition(row, col, sec) {
    this.row = row;
    this.column = col;
    this.sector = sec;
  }

  validate(value, generation = false) {
    if (!value) return false;
    return !(
      K.count(this.row.getValues(), false)[value] > (generation ? 0 : 1) ||
      K.count(this.column.getValues(), false)[value] > (generation ? 0 : 1) ||
      K.count(this.sector.getValues(), false)[value] > (generation ? 0 : 1)
    );
  }

  findLegalValues() {
    const valid = [];
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    values.forEach(val => {
      if (this.validate(val, true)) {
        valid.push(val);
      }
    });
    return valid;
  }
}

class Row {
  constructor(id, arr) {
    this.id = id;
    this.cells = arr;
  }

  static from(arr) {
    arr = K.chunk(arr, 9);
    const r = [];
    arr.forEach((row, index) => {
      r.push(new Row(index, row));
    });
    return r;
  }

  getValues() {
    const r = [];
    this.cells.forEach(cell => {
      r.push(cell.value);
    });

    return K.clean(r);
  }
}

class Column {
  constructor(id, arr) {
    this.id = id;
    this.cells = arr;
  }

  static from(arr) {
    arr = K.transpose(K.chunk(arr, 9));
    const r = [];
    arr.forEach((col, index) => {
      r.push(new Column(index, col));
    });
    return r;
  }

  getValues() {
    const r = [];
    this.cells.forEach(cell => {
      r.push(cell.value);
    });

    return K.clean(r);
  }
}

class Sector {
  constructor(id, arr) {
    this.id = id;
    this.cells = arr;
  }

  static from(arr) {
    arr = K.chunk(arr, 3);
    let s = [];

    for (let i = 0; i < 27; i += 9) {
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k <= 6; k += 3) {
          s.push(arr[i + j + k]);
        }
      }
    }

    s = K.chunk(s, 3);

    const r = [];
    s.forEach((sec, index) => {
      r.push(new Sector(index, sec));
    });
    return r;
  }

  getValues() {
    const r = [];
    this.cells.forEach(cellRow => {
      cellRow.forEach(cell => {
        r.push(cell.value);
      });
    });

    return K.clean(r);
  }
}

const area = K("sudoku-area");
const overlay = K(".overlay");
const currentBoard = K("#currentBoard");
let grid = new Grid();

function checkInput(e) {
  const charCode = e.which ? e.which : e.keyCode;
  if (charCode > 31 && (charCode < 48 || charCode > 57)) {
    return false;
  }
  const i = Number(e.target.id[1]);
  const j = Number(e.target.id[2]);
  const cell = grid.cells[j + i * 9];

  if (cell.value !== null) return false;

  cell.value = Number(e.key);

  cell.validate(cell.value);
  console.log(cell.validate(cell.value));

  updateBoardString();

  return true;
}

function keyDown(e) {
  const charCode = e.which ? e.which : e.keyCode;
  const [i, j] = grid.getCellAddress(e.target.id);

  if (charCode === 38) {
    // UP
    const newCell = K(`#_${i - 1}${j}`);
    if (newCell.val.constructor.name === "HTMLInputElement")
      newCell.val.focus();
  } else if (charCode === 40) {
    // DOWN
    const newCell = K(`#_${i + 1}${j}`);
    if (newCell.val.constructor.name === "HTMLInputElement")
      newCell.val.focus();
  } else if (charCode === 37) {
    // LEFT
    const newCell = K(`#_${i}${j - 1}`);
    if (newCell.val.constructor.name === "HTMLInputElement")
      newCell.val.focus();
  } else if (charCode === 39) {
    // RIGHT
    const newCell = K(`#_${i}${j + 1}`);
    if (newCell.val.constructor.name === "HTMLInputElement")
      newCell.val.focus();
  } else if (charCode === 8) {
    // BACKSPACE
    const cell = grid.cells[j + i * 9];
    cell.value = null;
    updateBoardString();
  } else if (!checkInput(e)) {
    console.log(charCode);
  }
}

function solveGame() {
  html.log("Solving...");
  grid.generate();
  grid.show();
  updateBoardString();
  html.log("Done");
}

function newGame() {
  overlay.css({
    display: "flex"
  });

  html.log("Generating...");

  setTimeout(() => {
    grid = new Grid();
    grid.generate();
    grid.prepareGame();
    grid.show();
    overlay.css({
      display: "none"
    });
    updateBoardString();
    html.log("Done");
  }, 100);
}

function clearBoard() {
  grid = new Grid();
  grid.show();
  updateBoardString();
  html.log("Board cleared");
}

function validateBoard() {
  const status = grid.validate();
  html.log(status ? "Perfect!" : "Nope!");
}

function restartGame() {
  grid.clearInserted();
  updateBoardString();
  html.log("Restarted");
}

function lockNumbers() {
  grid.lock();
  html.log("Board locked");
}

function unlockNumbers() {
  grid.unlock();
  html.log("Board unlocked");
}

function importBoard() {
  grid = new Grid();
  const textarea = K("#importer");
  const values = textarea.val.value.trim().replace(/\r?\n/g, "");
  grid.load(values);
  textarea.val.value = "";
  updateBoardString();
  html.log("Board loaded");
}

function updateBoardString() {
  currentBoard.text(grid.getValueString());
}

currentBoard.on("click", function() {
  K.copy(currentBoard.val.innerText);
});

K(document).on("DOMContentLoaded", function() {
  html = {
    panel: K("#console"),
    log: function(m) {
      var newline = K("<div>").html("&gt; " + m);
      this.panel.append(newline);
      this.panel.val.scrollTop = this.panel.val.scrollHeight;
    }
  };

  updateBoardString();

  html.log("Ready");
});
