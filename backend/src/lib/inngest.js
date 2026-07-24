import { Inngest } from "inngest";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "futurehire-dev" });

const syncUser = inngest.createFunction(
  { id: "sync-user" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    await connectDB;

    const { id, first_name, last_name, image_url, email_addresses } = event.data;

    const newUser = {
      clerkId: id,
      name: `${first_name || ""} ${last_name || ""}`,
      email: email_addresses[0]?.email_address,
      profileImage: image_url
    }

    await User.create(newUser);
  }
);

const deleteUserFromDB = inngest.createFunction(
  { id: "delete-user-from-db" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    await connectDB;

    const { id } = event.data;

    await User.deleteOne({ clerkId: id });
  }
);

export const functons = [syncUser, deleteUserFromDB];