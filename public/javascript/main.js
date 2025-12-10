const socket = io();
const chess = new Chess()
const boardElement = document.querySelector(".chessboard")

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";
    board.forEach((row, rowIndex) => {
        row.forEach((square, squareIndex) => {
            let squareElement = document.createElement("div")
            squareElement.classList.add("square", (rowIndex + squareIndex) % 2 === 0 ? "bg-[#f0d9b5]" : "bg-[#b58863]");

            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = squareIndex;

            if (square) {
                let pieceElement = document.createElement("div");
                pieceElement.classList.add("piece", square.color === "w" ? "white" : "black");
                pieceElement.innerHTML = getPieceSvg(square);
                pieceElement.draggable = playerRole === square.color;
                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowIndex, col: squareIndex }
                        e.dataTransfer.setData("text/plain", "")
                    }
                })
                pieceElement.addEventListener("dragend", () => {
                    draggedPiece = null;
                    sourceSquare = null;
                })
                squareElement.appendChild(pieceElement)
            }

            squareElement.addEventListener("dragover", (e) => {
                e.preventDefault()
            })

            squareElement.addEventListener("drop", (e) => {
                e.preventDefault()
                if (draggedPiece) {
                    const targetSource = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col)
                    };
                    handleMove(sourceSquare, targetSource)
                };
            });
            boardElement.appendChild(squareElement);
        });
    });
    if (playerRole === "b") {
        boardElement.classList.add("rotate-180");
        document.querySelectorAll(".piece").forEach(piece => {
            piece.classList.add("rotate-180");
        });
    } else {
        boardElement.classList.remove("rotate-180");
        document.querySelectorAll(".piece").forEach(piece => {
            piece.classList.remove("rotate-180");
        });
    }
}

const promotionDialog = document.getElementById("promotion-dialog");
let promotionMove = null;

const handleMove = (source, target) => {
    const from = `${String.fromCharCode(97 + source.col)}${8 - source.row}`;
    const to = `${String.fromCharCode(97 + target.col)}${8 - target.row}`;
    const piece = chess.get(from);

    if (piece && piece.type === 'p' && (to[1] === '8' || to[1] === '1')) {
        promotionMove = { from, to };
        promotionDialog.classList.remove("hidden");
    } else {
        const move = { from, to, promotion: "q" };
        const result = chess.move(move);
        if (result) {
            socket.emit("move", move);
            renderBoard();
        }
    }
}

promotionDialog.addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON") {
        const promotion = e.target.getAttribute("data-promotion");
        if (promotionMove) {
            const move = { ...promotionMove, promotion };
            const result = chess.move(move);
            if (result) {
                socket.emit("move", move);
                renderBoard();
            }
            promotionDialog.classList.add("hidden");
            promotionMove = null;
        }
    }
});

const getPieceSvg = (piece) => {
    const svgPieces = {
        'p': {
            'w': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
            'b': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg'
        },
        'r': {
            'w': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
            'b': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg'
        },
        'n': {
            'w': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
            'b': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg'
        },
        'b': {
            'w': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
            'b': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg'
        },
        'q': {
            'w': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
            'b': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg'
        },
        'k': {
            'w': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
            'b': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg'
        }
    };
    const svgUrl = svgPieces[piece.type]?.[piece.color];
    if (svgUrl) {
        return `<img src="${svgUrl}" alt="${piece.type}" class="w-full h-full">`;
    }
    return "";
};

socket.on("playerRole", function (role) {
    playerRole = role;
    renderBoard();
})

socket.on("spectatorRole", function () {
    playerRole = null;
    renderBoard();
})

socket.on("boardState", function (fen) {
    chess.load(fen)
    renderBoard();
})

socket.on("move", function (move) {
    chess.move(move)
    renderBoard();
})

socket.on("InvalidMove", () => {
    const boardElement = document.querySelector(".chessboard");
    boardElement.classList.add("shake");
    setTimeout(() => {
        boardElement.classList.remove("shake");
    }, 1000);
});

const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatBox = document.getElementById("chat-box");

chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const message = chatInput.value;
    if (message) {
        socket.emit("chatMessage", message);
        chatInput.value = "";
    }
});

socket.on("chatMessage", (message) => {
    const messageElement = document.createElement("div");
    messageElement.classList.add("text-white", "mb-2");
    messageElement.textContent = message;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
});

renderBoard();
