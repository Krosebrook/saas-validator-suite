import { describe, it, expect } from "vitest";
import {
  validateRequired,
  validateString,
  validateNumber,
  validateEmail,
  validateUrl,
  validateEnum,
  validateArray,
  sanitizeString,
  sanitizeHtml
} from "../logging/validation";
import { ValidationError } from "../logging/errors";

describe("Validation utilities", () => {
  describe("validateRequired", () => {
    it("should pass for valid values", () => {
      expect(() => validateRequired("test", "field")).not.toThrow();
      expect(() => validateRequired(0, "field")).not.toThrow();
      expect(() => validateRequired(false, "field")).not.toThrow();
    });

    it("should throw for invalid values", () => {
      expect(() => validateRequired(undefined, "field")).toThrow(ValidationError);
      expect(() => validateRequired(null, "field")).toThrow(ValidationError);
      expect(() => validateRequired("", "field")).toThrow(ValidationError);
    });
  });

  describe("validateString", () => {
    it("should pass for valid strings", () => {
      expect(() => validateString("test", "field")).not.toThrow();
    });

    it("should throw for non-strings", () => {
      expect(() => validateString(123, "field")).toThrow(ValidationError);
      expect(() => validateString(null, "field")).toThrow(ValidationError);
    });

    it("should validate minimum length", () => {
      expect(() => validateString("test", "field", { minLength: 3 })).not.toThrow();
      expect(() => validateString("te", "field", { minLength: 3 })).toThrow(ValidationError);
    });

    it("should validate maximum length", () => {
      expect(() => validateString("test", "field", { maxLength: 5 })).not.toThrow();
      expect(() => validateString("toolong", "field", { maxLength: 5 })).toThrow(ValidationError);
    });

    it("should validate pattern", () => {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(() => validateString("test@example.com", "field", { pattern: emailPattern })).not.toThrow();
      expect(() => validateString("invalid-email", "field", { pattern: emailPattern })).toThrow(ValidationError);
    });
  });

  describe("validateNumber", () => {
    it("should pass for valid numbers", () => {
      expect(() => validateNumber(123, "field")).not.toThrow();
      expect(() => validateNumber(0, "field")).not.toThrow();
      expect(() => validateNumber(-5, "field")).not.toThrow();
    });

    it("should throw for non-numbers", () => {
      expect(() => validateNumber("123", "field")).toThrow(ValidationError);
      expect(() => validateNumber(NaN, "field")).toThrow(ValidationError);
    });

    it("should validate integer constraint", () => {
      expect(() => validateNumber(123, "field", { integer: true })).not.toThrow();
      expect(() => validateNumber(123.5, "field", { integer: true })).toThrow(ValidationError);
    });

    it("should validate min/max constraints", () => {
      expect(() => validateNumber(5, "field", { min: 0, max: 10 })).not.toThrow();
      expect(() => validateNumber(-1, "field", { min: 0 })).toThrow(ValidationError);
      expect(() => validateNumber(15, "field", { max: 10 })).toThrow(ValidationError);
    });
  });

  describe("validateEmail", () => {
    it("should pass for valid emails", () => {
      expect(() => validateEmail("test@example.com")).not.toThrow();
      expect(() => validateEmail("user.name+tag@domain.co.uk")).not.toThrow();
    });

    it("should throw for invalid emails", () => {
      expect(() => validateEmail("invalid-email")).toThrow(ValidationError);
      expect(() => validateEmail("@domain.com")).toThrow(ValidationError);
      expect(() => validateEmail("user@")).toThrow(ValidationError);
    });
  });

  describe("validateUrl", () => {
    it("should pass for valid URLs", () => {
      expect(() => validateUrl("https://example.com")).not.toThrow();
      expect(() => validateUrl("http://localhost:3000")).not.toThrow();
    });

    it("should pass for empty/undefined (optional)", () => {
      expect(() => validateUrl("")).not.toThrow();
      expect(() => validateUrl(undefined)).not.toThrow();
    });

    it("should throw for invalid URLs", () => {
      expect(() => validateUrl("not-a-url")).toThrow(ValidationError);
      expect(() => validateUrl("ftp://example.com")).toThrow(ValidationError);
    });
  });

  describe("validateEnum", () => {
    const validValues = ["option1", "option2", "option3"];

    it("should pass for valid enum values", () => {
      expect(() => validateEnum("option1", validValues, "field")).not.toThrow();
      expect(() => validateEnum("option2", validValues, "field")).not.toThrow();
    });

    it("should throw for invalid enum values", () => {
      expect(() => validateEnum("invalid", validValues, "field")).toThrow(ValidationError);
      expect(() => validateEnum("", validValues, "field")).toThrow(ValidationError);
    });
  });

  describe("validateArray", () => {
    it("should pass for valid arrays", () => {
      expect(() => validateArray([1, 2, 3], "field")).not.toThrow();
      expect(() => validateArray([], "field")).not.toThrow();
    });

    it("should throw for non-arrays", () => {
      expect(() => validateArray("not-array", "field")).toThrow(ValidationError);
      expect(() => validateArray(123, "field")).toThrow(ValidationError);
    });

    it("should validate array length", () => {
      expect(() => validateArray([1, 2], "field", { minLength: 1, maxLength: 3 })).not.toThrow();
      expect(() => validateArray([], "field", { minLength: 1 })).toThrow(ValidationError);
      expect(() => validateArray([1, 2, 3, 4], "field", { maxLength: 3 })).toThrow(ValidationError);
    });

    it("should validate array items", () => {
      const itemValidator = (item: any) => {
        if (typeof item !== "number") {
          throw new ValidationError("Item must be a number");
        }
      };

      expect(() => validateArray([1, 2, 3], "field", { itemValidator })).not.toThrow();
      expect(() => validateArray([1, "2", 3], "field", { itemValidator })).toThrow(ValidationError);
    });
  });

  describe("sanitizeString", () => {
    it("should trim whitespace and normalize spaces", () => {
      expect(sanitizeString("  hello   world  ")).toBe("hello world");
      expect(sanitizeString("test\n\tstring")).toBe("test string");
    });
  });

  describe("sanitizeHtml", () => {
    it("should remove script tags", () => {
      expect(sanitizeHtml("<script>alert('xss')</script>hello")).toBe("hello");
      expect(sanitizeHtml("before<script src='evil.js'></script>after")).toBe("beforeafter");
    });

    it("should remove javascript: protocol", () => {
      expect(sanitizeHtml("javascript:alert('xss')")).toBe("alert('xss')");
    });

    it("should remove event handlers", () => {
      expect(sanitizeHtml('<div onclick="alert()" onload="evil()">content</div>'))
        .toBe('<div>content</div>');
    });
  });
});