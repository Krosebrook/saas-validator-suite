import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger, LogLevel } from "../logging/logger";
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
  InsufficientCreditsError,
  ExternalServiceError,
  DatabaseError,
  ErrorCode
} from "../logging/errors";

describe("Logger", () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, "log").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {})
    };
  });

  it("should log debug messages when level is DEBUG", () => {
    logger.setLevel(LogLevel.DEBUG);
    logger.debug("test message");
    
    expect(consoleSpy.log).toHaveBeenCalled();
    const loggedData = JSON.parse(consoleSpy.log.mock.calls[0][0]);
    expect(loggedData.level).toBe("DEBUG");
    expect(loggedData.message).toBe("test message");
  });

  it("should not log debug messages when level is INFO", () => {
    logger.setLevel(LogLevel.INFO);
    logger.debug("test message");
    
    expect(consoleSpy.log).not.toHaveBeenCalled();
  });

  it("should log with context information", () => {
    logger.setLevel(LogLevel.INFO);
    logger.info("test message", {
      service: "test-service",
      endpoint: "test-endpoint",
      data: { key: "value" }
    });
    
    expect(consoleSpy.log).toHaveBeenCalled();
    const loggedData = JSON.parse(consoleSpy.log.mock.calls[0][0]);
    expect(loggedData.service).toBe("test-service");
    expect(loggedData.endpoint).toBe("test-endpoint");
    expect(loggedData.data).toEqual({ key: "value" });
  });

  it("should log errors with stack trace", () => {
    logger.setLevel(LogLevel.ERROR);
    const error = new Error("test error");
    logger.error("error occurred", { error });
    
    expect(consoleSpy.error).toHaveBeenCalled();
    const loggedData = JSON.parse(consoleSpy.error.mock.calls[0][0]);
    expect(loggedData.error.name).toBe("Error");
    expect(loggedData.error.message).toBe("test error");
    expect(loggedData.error.stack).toBeDefined();
  });
});

describe("Error classes", () => {
  describe("AppError", () => {
    it("should create error with correct properties", () => {
      const error = new AppError(ErrorCode.VALIDATION_ERROR, "test message", 400, { field: "test" });
      
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.message).toBe("test message");
      expect(error.statusCode).toBe(400);
      expect(error.data).toEqual({ field: "test" });
      expect(error.name).toBe("AppError");
    });
  });

  describe("ValidationError", () => {
    it("should create validation error with field", () => {
      const error = new ValidationError("invalid field", "email");
      
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.data).toEqual({ field: "email" });
    });
  });

  describe("NotFoundError", () => {
    it("should create not found error", () => {
      const error = new NotFoundError("User", "123");
      
      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("User not found");
      expect(error.data).toEqual({ resource: "User", id: "123" });
    });
  });

  describe("UnauthorizedError", () => {
    it("should create unauthorized error", () => {
      const error = new UnauthorizedError("custom message");
      
      expect(error.code).toBe(ErrorCode.AUTHORIZATION_ERROR);
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe("custom message");
    });

    it("should use default message", () => {
      const error = new UnauthorizedError();
      
      expect(error.message).toBe("Unauthorized");
    });
  });

  describe("ConflictError", () => {
    it("should create conflict error", () => {
      const error = new ConflictError("resource already exists");
      
      expect(error.code).toBe(ErrorCode.CONFLICT);
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe("resource already exists");
    });
  });

  describe("InsufficientCreditsError", () => {
    it("should create insufficient credits error", () => {
      const error = new InsufficientCreditsError(5, 2);
      
      expect(error.code).toBe(ErrorCode.INSUFFICIENT_CREDITS);
      expect(error.statusCode).toBe(402);
      expect(error.message).toBe("Insufficient credits. Required: 5, Available: 2");
      expect(error.data).toEqual({ required: 5, available: 2 });
    });

    it("should use default values", () => {
      const error = new InsufficientCreditsError();
      
      expect(error.message).toBe("Insufficient credits. Required: 1, Available: 0");
    });
  });

  describe("ExternalServiceError", () => {
    it("should create external service error", () => {
      const originalError = new Error("network timeout");
      const error = new ExternalServiceError("OpenAI", originalError);
      
      expect(error.code).toBe(ErrorCode.EXTERNAL_SERVICE_ERROR);
      expect(error.statusCode).toBe(502);
      expect(error.message).toBe("External service error: OpenAI");
      expect(error.data?.service).toBe("OpenAI");
      expect(error.data?.originalError).toBe("network timeout");
    });
  });

  describe("DatabaseError", () => {
    it("should create database error", () => {
      const originalError = new Error("connection failed");
      const error = new DatabaseError("user creation", originalError);
      
      expect(error.code).toBe(ErrorCode.DATABASE_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe("Database error during user creation");
      expect(error.data?.operation).toBe("user creation");
      expect(error.data?.originalError).toBe("connection failed");
    });
  });
});