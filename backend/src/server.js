import express from "express";
import { ENV } from "./lib/env.js";
import { connectDB } from "./config/db.js";

const app = express();

const PORT = ENV.PORT || 5001;


app.get("/", (req, res) => {
  res.status(200).json({ message: "Success runnning from api" })
})


const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server is running on Port: ${PORT}`);
    })

  } catch (error) {
    console.error("Error starting the server", error);
  }
}

startServer();