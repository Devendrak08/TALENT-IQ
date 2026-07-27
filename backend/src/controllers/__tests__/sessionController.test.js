import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the Session model used by the controller.
vi.mock("../../models/Session.js", () => ({
  default: {
    findById: vi.fn(),
  },
}));

// Mock the Stream chat/video clients used by the controller.
vi.mock("../../lib/stream.js", () => ({
  chatClient: {
    channel: vi.fn(),
  },
  streamClient: {
    video: {
      call: vi.fn(),
    },
  },
}));

import Session from "../../models/Session.js";
import { chatClient, streamClient } from "../../lib/stream.js";
import { endSession } from "../sessionController.js";

function createMockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function createMockReq({ id = "session123", userId = "user1" } = {}) {
  return {
    params: { id },
    user: { _id: userId },
  };
}

/**
 * NOTE: These tests exercise the current implementation of the catch block
 * in `endSession`, which references the undefined identifier `conselo`
 * instead of `console`. Because of this typo, any error caught inside the
 * try block causes the catch handler itself to throw a ReferenceError
 * ("conselo is not defined") *before* it ever reaches `res.status(400)`.
 * As a result, `endSession` rejects instead of sending an HTTP response.
 * These tests document and pin down that observable behavior.
 */
describe("endSession", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("rejects with a ReferenceError instead of sending a response when Session.findById fails", async () => {
    const dbError = new Error("DB connection lost");
    Session.findById.mockRejectedValue(dbError);

    const req = createMockReq();
    const res = createMockRes();

    let caughtError;
    try {
      await endSession(req, res);
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(ReferenceError);
    expect(caughtError.message).toMatch(/conselo is not defined/);
  });

  it("never calls res.status/res.json when the catch block throws due to the typo", async () => {
    Session.findById.mockRejectedValue(new Error("DB connection lost"));

    const req = createMockReq();
    const res = createMockRes();

    try {
      await endSession(req, res);
    } catch {
      // expected: the catch handler itself throws before responding
    }

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("never logs via console.error, since `conselo.error` throws before any logging occurs", async () => {
    Session.findById.mockRejectedValue(new Error("DB connection lost"));

    const req = createMockReq();
    const res = createMockRes();

    try {
      await endSession(req, res);
    } catch {
      // expected
    }

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("propagates the same ReferenceError even when the failure originates later in the flow (video call deletion)", async () => {
    const mockSession = {
      _id: "session123",
      host: { toString: () => "user1" },
      status: "active",
      callId: "call_123",
      save: vi.fn().mockResolvedValue(true),
    };
    Session.findById.mockResolvedValue(mockSession);

    const mockCall = {
      delete: vi.fn().mockRejectedValue(new Error("Stream video delete failed")),
    };
    streamClient.video.call.mockReturnValue(mockCall);

    const req = createMockReq({ id: "session123", userId: "user1" });
    const res = createMockRes();

    let caughtError;
    try {
      await endSession(req, res);
    } catch (err) {
      caughtError = err;
    }

    expect(streamClient.video.call).toHaveBeenCalledWith("default", "call_123");
    expect(mockCall.delete).toHaveBeenCalledWith({ hard: true });
    expect(caughtError).toBeInstanceOf(ReferenceError);
    expect(caughtError.message).toMatch(/conselo is not defined/);
    // The flow aborted before the session was ever marked completed/saved.
    expect(mockSession.save).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(400);
  });

  it("propagates the same ReferenceError when the chat channel deletion fails", async () => {
    const mockSession = {
      _id: "session123",
      host: { toString: () => "user1" },
      status: "active",
      callId: "call_123",
      save: vi.fn().mockResolvedValue(true),
    };
    Session.findById.mockResolvedValue(mockSession);

    const mockCall = { delete: vi.fn().mockResolvedValue(true) };
    streamClient.video.call.mockReturnValue(mockCall);

    const mockChannel = {
      delete: vi.fn().mockRejectedValue(new Error("Channel delete failed")),
    };
    chatClient.channel.mockReturnValue(mockChannel);

    const req = createMockReq({ id: "session123", userId: "user1" });
    const res = createMockRes();

    let caughtError;
    try {
      await endSession(req, res);
    } catch (err) {
      caughtError = err;
    }

    expect(chatClient.channel).toHaveBeenCalledWith("messaging", "call_123");
    expect(caughtError).toBeInstanceOf(ReferenceError);
    expect(caughtError.message).toMatch(/conselo is not defined/);
    expect(mockSession.save).not.toHaveBeenCalled();
  });
});