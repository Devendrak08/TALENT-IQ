import express from "express";
// import cors from "cors";
import { serve } from "inngest/express";
import path from "path";

import { ENV } from "./lib/env.js";
import { connectDB } from "./config/db.js";
import { inngest, functions } from "./lib/inngest.js";

const app = express();

const PORT = ENV.PORT || 5001;

const __dirname = path.resolve();

//middleware
app.use(express.json());
// credentials true meaning >> server allows a browser to  include cookies on request
// app.use(cors({ origin: ENV.CLIENT_URL, credentials: true }));

app.use("/api/inngest", serve({ client: inngest, functions }))

app.get("/books", (_, res) => {
  res.status(200).json({ message: "API is working" })
})
app.get("/health", (_, res) => {
  res.status(200).json({ message: "API is working" })
})

// deployment config
if (ENV.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("/{*any}", (_, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  })
}


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