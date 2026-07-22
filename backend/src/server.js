import express from "express";
import { ENV } from "./lib/env.js";

const app = express();

const PORT = ENV.PORT || 5001;


app.get("/", (req, res) => {
  res.status(200).json({ message: "Success runnning from api" })
})

app.listen(PORT, () => {
  console.log(`Server is running on Port: ${PORT}`);
})