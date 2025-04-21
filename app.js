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
let currentPlayer = "w"

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
                unique.emit("move", move)
            }
        } catch (err) {
            console.log(err);
            unique.emit("InvalidMove", move);
        }
    })
})

server.listen(PORT, function () {
    console.log('listening on port "http://localhost:3000"')
})