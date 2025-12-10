const express = require("express");
const path = require("path");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};
let currentPlayer = "w";
let timers = {};
let timerInterval = null;

const startTimers = () => {
    clearInterval(timerInterval);
    timers = { w: 600, b: 600 }; // 10 minutes per player
    timerInterval = setInterval(() => {
        timers[currentPlayer]--;
        if (timers[currentPlayer] <= 0) {
            clearInterval(timerInterval);
            io.emit("gameOver", `Time's up! ${currentPlayer === "w" ? "Black" : "White"} wins.`);
        }
        io.emit("timeUpdate", timers);
    }, 1000);
};

const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")))

app.get("/", (req, res) => {
    res.render("index", { title: "Chess Game" })
})

io.on("connection", function (unique) {
    console.log("connected");
    if (!players.white) {
        players.white = unique.id
        unique.emit("playerRole", "w");
    } else if (!players.black) {
        players.black = unique.id
        unique.emit("playerRole", "b");
        startTimers();
    } else {
        unique.emit("spectatorRole");
    }

    unique.on("disconnect", function () {
        if (unique.id === players.white) {
            delete players.white
        } else if (unique.id === players.black) {
            delete players.black
        }
    })
    unique.on("move", function (move) {
        try {
            if (chess.turn() === "w" && unique.id !== players.white) return;
            if (chess.turn() === "b" && unique.id !== players.black) return;
            const result = chess.move(move)
            if (result) {
                currentPlayer = chess.turn();
                io.emit("move", move)
                io.emit("boardState", chess.fen())
            } else {
                console.log("Invalid move : ", move);
                unique.emit("InvalidMove", move)
            }
        } catch (err) {
            console.log(err);
            unique.emit("InvalidMove", move);
        }
    })

    unique.on("reset", () => {
        chess.reset();
        currentPlayer = "w";
        clearInterval(timerInterval);
        timerInterval = null;
        timers = {};
        if (players.white && players.black) {
            startTimers();
        }
        io.emit("boardState", chess.fen());
        io.emit("reset");
    });

    unique.on("chatMessage", (message) => {
        io.emit("chatMessage", message);
    });
})

server.listen(PORT, function () {
    console.log('listening on port "http://localhost:3000"')
})