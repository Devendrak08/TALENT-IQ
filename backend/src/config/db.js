import mongoose, { mongo } from "mongoose";

import { ENV } from "../lib/env.js";


export const connectDB = async() => {
    try {
        const conn = await mongoose.connect(ENV.MONGO_URI);
        console.log("Database connected successfully", conn.connection.host);
    } catch (error) {
        console.error("MongoDB connecting error", error);
        process.exit(1); // 0 means success, 1 means failure
    }
}