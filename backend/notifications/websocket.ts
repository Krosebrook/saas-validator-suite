import { api, StreamInOut } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { logger } from "../logging/logger";
import { handleError } from "../logging/errors";

export interface NotificationMessage {
  type: "analysis_started" | "analysis_completed" | "analysis_failed" | "credits_updated" | "system_notification";
  data: {
    ideaId?: number;
    title?: string;
    overallScore?: number;
    creditsRemaining?: number;
    message?: string;
    timestamp: string;
  };
  userId: string;
}

// Store active connections per user
const userConnections = new Map<string, Set<StreamInOut<NotificationMessage, NotificationMessage>>>();

// Real-time notification stream
export const connect = api.streamInOut<NotificationMessage, NotificationMessage>(
  { auth: true, expose: true, path: "/notifications/connect" },
  async (stream) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    logger.info("User connected to notifications", {
      service: "notifications",
      endpoint: "connect",
      userId
    });

    // Add connection to user's set
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId)!.add(stream);

    // Send welcome message
    await stream.send({
      type: "system_notification",
      data: {
        message: "Connected to real-time notifications",
        timestamp: new Date().toISOString()
      },
      userId
    });

    try {
      // Listen for any incoming messages (heartbeat, ping, etc.)
      for await (const message of stream) {
        logger.debug("Received message from client", {
          service: "notifications",
          endpoint: "connect",
          userId,
          data: { messageType: message.type }
        });

        // Echo back pings for keepalive
        if (message.type === "system_notification" && message.data.message === "ping") {
          await stream.send({
            type: "system_notification",
            data: {
              message: "pong",
              timestamp: new Date().toISOString()
            },
            userId
          });
        }
      }
    } catch (error) {
      logger.warn("Notification stream error", {
        service: "notifications",
        endpoint: "connect",
        userId,
        error: error instanceof Error ? error : new Error(String(error))
      });
    } finally {
      // Clean up connection
      const connections = userConnections.get(userId);
      if (connections) {
        connections.delete(stream);
        if (connections.size === 0) {
          userConnections.delete(userId);
        }
      }

      logger.info("User disconnected from notifications", {
        service: "notifications",
        endpoint: "connect",
        userId
      });
    }
  }
);

// Send notification to specific user
export async function sendNotificationToUser(userId: string, notification: Omit<NotificationMessage, "userId">): Promise<void> {
  const connections = userConnections.get(userId);
  if (!connections || connections.size === 0) {
    logger.debug("No active connections for user", {
      service: "notifications",
      data: { userId, notificationType: notification.type }
    });
    return;
  }

  const message: NotificationMessage = {
    ...notification,
    userId
  };

  const failedConnections: StreamInOut<NotificationMessage, NotificationMessage>[] = [];

  // Send to all user connections
  for (const connection of connections) {
    try {
      await connection.send(message);
      logger.debug("Notification sent successfully", {
        service: "notifications",
        data: { userId, notificationType: notification.type }
      });
    } catch (error) {
      logger.warn("Failed to send notification", {
        service: "notifications",
        error: error instanceof Error ? error : new Error(String(error)),
        data: { userId, notificationType: notification.type }
      });
      failedConnections.push(connection);
    }
  }

  // Clean up failed connections
  for (const failedConnection of failedConnections) {
    connections.delete(failedConnection);
  }

  if (connections.size === 0) {
    userConnections.delete(userId);
  }
}

// Send notification to all connected users
export async function broadcastNotification(notification: Omit<NotificationMessage, "userId">): Promise<void> {
  logger.info("Broadcasting notification to all users", {
    service: "notifications",
    data: { notificationType: notification.type, connectedUsers: userConnections.size }
  });

  const promises: Promise<void>[] = [];
  
  for (const userId of userConnections.keys()) {
    promises.push(sendNotificationToUser(userId, notification));
  }

  await Promise.allSettled(promises);
}

// Get notification statistics
export const getStats = api<void, {
  connectedUsers: number;
  totalConnections: number;
  userStats: { userId: string; connections: number }[];
}>(
  { expose: true, method: "GET", path: "/notifications/stats" },
  async () => {
    try {
      const userStats = Array.from(userConnections.entries()).map(([userId, connections]) => ({
        userId,
        connections: connections.size
      }));

      const totalConnections = userStats.reduce((sum, stat) => sum + stat.connections, 0);

      return {
        connectedUsers: userConnections.size,
        totalConnections,
        userStats
      };
    } catch (error) {
      handleError(error, { service: "notifications", endpoint: "stats" });
    }
  }
);

// Send test notification (for development/testing)
export const sendTest = api<{
  userId?: string;
  type: NotificationMessage["type"];
  message: string;
}, { success: boolean; message: string }>(
  { expose: true, method: "POST", path: "/notifications/test" },
  async (req) => {
    try {
      const notification: Omit<NotificationMessage, "userId"> = {
        type: req.type,
        data: {
          message: req.message,
          timestamp: new Date().toISOString()
        }
      };

      if (req.userId) {
        await sendNotificationToUser(req.userId, notification);
        return {
          success: true,
          message: `Test notification sent to user ${req.userId}`
        };
      } else {
        await broadcastNotification(notification);
        return {
          success: true,
          message: "Test notification broadcast to all users"
        };
      }
    } catch (error) {
      handleError(error, { service: "notifications", endpoint: "test" });
    }
  }
);