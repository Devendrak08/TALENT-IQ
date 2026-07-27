import Session from "../models/Session.js";
import { chatClient, streamClient } from "../lib/stream.js";

export async function createSession(req, res) {
  try {
    const { problem, difficulty } = req.body;
    const userId = req.user._id;
    const clerkId = req.user.clerkId;

    if (!problem || !difficulty) {
      return res.status(400).json({ message: "Problem and Diffculty are required" })
    }

    // Genrate a unique call id for stream video 
    const callId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // create session in db
    const session = await Session.create({ problem, difficulty, host: userId, callId });

    // create stream for video call
    await streamClient.video.call("default", callId).getOrCreate({
      data: {
        created_by_id: clerkId,
        custom: { problem, difficulty, sessionId: session._id.toString() }
      }
    });

    // chat messaging

    const channel = chatClient.channel("messaging", callId, {
      name: `${problem} session`,
      created_by_id: clerkId,
      members: [clerkId]
    });

    await channel.create();

    res.status(201).json({ session: session });
  } catch (error) {
    console.error("Error in createSession controller::", error);
    res.status(500).json({ message: "Internal Server Error" })
  }
}

export async function getActiveSessions(req, res) {
  try {
    const sessions = await Session.find({ status: "active" })
      .populate("host", "name profileImage email clerkId ")
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ sessions })
  } catch (error) {
    console.error("Error in GetActiveSessions controller::", error);
    res.status(500).json({ message: "Internal Server Error" })
  }
}

export async function getMyRecentSessions(req, res) {
  try {
    const userId = req.user._id;

    // get session where user is either host or participant
    const sessions = await Session.find({
      status: "completed",
      $or: [{ host: userId }, { participant: userId }]
    }).sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ sessions });

  } catch (error) {
    console.error("Error in getMyRecentSessions controller::", error);
    res.status(500).json({ message: "Internal Server Error" })
  }
}

export async function getSessionById(req, res) {
  try {
    const { id } = req.params;

    const session = await Session.findById(id)
      .populate("host", "name email profileImage clerkId")
      .populate("participant", "name email profileImage clerkId")

    if (!session) return res.status(404).json({ message: "Session not found" });

    res.status(200).json({ session });
  } catch (error) {
    console.error("Error in getSessionById controller::", error);
    res.status(500).json({ message: "Internal Server Error" })
  }
}

export async function joinSession(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const clerkId = req.user.clerkId;

    const session = await Session.findById(id);

    if (!session) return res.status(404).json({ message: "Session not found" });

    if (session.status !== "active") {
      return res.status(400).json({ message: "Cannot join a  completed session" });
    }

    // check is session already full
    if (session.participant) return res.status(409).json({ message: "Session is full" });

    const channel = chatClient.channel("messaging", session.callId);

    await channel.addMembers([clerkId]);

    session.participant = userId;
    await session.save();

    res.status(200).json({ session });

  } catch (error) {
    console.error("Error in joinSession controller::", error);
    res.status(500).json({ message: "Internal Server Error" })
  }
}

export async function endSession(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const session = await Session.findById(id);

    if (!session) return res.status(404).json({ message: "Session not found" });

    // check if user is the host
    if (session.host.toString() !== userId.toString()) {
      res.status(403).json({ message: "Only the host can end the session" });
    }

    // check if session is already completed
    if (session.status === "completed") {
      res.status(400).json({ message: "Session is already completed" });
    }

    // delete stream video call
    const call = streamClient.video.call("default", session.callId)
    await call.delete({ hard: true })

    // delete stream chat channel 
    const channel = chatClient.channel("messaging", session.callId)
    await channel.delete();

    session.status = "completed";
    await session.save();

    res.status(200).json({ session, message: "Session ended successfully" });

  } catch (error) {
    conselo.error("Error in endSession controller::", error);
    res.status(400).json({ message: "Internal Server Error" })
  }
}