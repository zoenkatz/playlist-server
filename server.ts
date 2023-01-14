require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");

const cors = require("cors");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origins: "*:*",
    method: ["GET", "POST", "PUT", "PATCH"],
    transports: ["websocket", "polling", "flashsocket"],
    allowedHeaders: ["authorization"],
    credentials: true,
  },
});

const uri = `mongodb+srv://${process.env.USERNAME}:${process.env.PASSWORD}@cluster0.mdhkktc.mongodb.net/?retryWrites=true&w=majority`;

MongoClient.connect(uri, {
  useUnifiedTopology: true,
})
  .then((client) => {
    let serviseSocket = null;
    console.log("Connected to Database");
    const db = client.db("playlist-app-db");
    const playlistCollection = db.collection("playlist");

    app.get("/playlist", (req, res) => {
      return playlistCollection
        .find()
        .toArray()
        .then(async (results) => {
          res.status(200).send({ results });
        })

        .catch(() => {
          return res.status(500).send({ message: "Error occurred" });
        });
    });
    app.post("/playlist", async (req) => {
      const reqBody = req?.body;
      try {
        const result = await playlistCollection.findOne({ id: reqBody.id });
        if (!result) {
          await playlistCollection.insertOne(reqBody);
          console.log(req.body);
        }

        const updatedPlaylist = await playlistCollection.find().toArray();
        console.log(updatedPlaylist);

        serviseSocket.emit("updatedPlaylist", {
          playlist: updatedPlaylist,
        });
      } catch (e) {
        console.error(e);
      }
    });

    app.delete("/playlist", async (req, res) => {
      try {
        const result = await playlistCollection.deleteOne({ id: req.body.id });

        if (result?.deletedCount === 0) {
          return res.json("No item to delete");
        }
        res.status(200).send({ message: "Video was deleted successfully" });
      } catch (e) {
        console.error(e);
      }
    });

    io.sockets.on("connection", async (socket) => {
      serviseSocket = socket;
      const updatedPlaylist = await playlistCollection.find().toArray();
      serviseSocket.emit("updatedPlaylist", {
        playlist: updatedPlaylist,
      });
    });

    server.listen(process.env.PORT, () => {
      console.log(`listening on ${process.env.PORT}`);
    });
  })
  .catch((err) => console.log("Not Connected to Database ERROR! ", err));
