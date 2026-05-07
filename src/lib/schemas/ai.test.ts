import { describe, it, expect } from "vitest";
import { ChatBodySchema, WritingFeedbackBodySchema, RephraseBodySchema, wordCount } from "./ai";

describe("wordCount", () => {
  it("returns 0 for empty/whitespace", () => {
    expect(wordCount("")).toBe(0);
    expect(wordCount("   ")).toBe(0);
  });
  it("counts whitespace-separated tokens", () => {
    expect(wordCount("hello world")).toBe(2);
    expect(wordCount("  one  two\nthree\t four ")).toBe(4);
  });
});

describe("ChatBodySchema (cap: 20 words / 150 chars)", () => {
  it("accepts a normal short prompt", () => {
    expect(ChatBodySchema.safeParse({ message: "Help me practice English" }).success).toBe(true);
  });
  it("accepts exactly the word/char boundary", () => {
    const twentyWords = Array.from({ length: 20 }, (_, i) => `w${i}`).join(" ");
    expect(twentyWords.length).toBeLessThanOrEqual(150);
    expect(ChatBodySchema.safeParse({ message: twentyWords }).success).toBe(true);
  });
  it("rejects 21 words", () => {
    const twentyOne = Array.from({ length: 21 }, () => "w").join(" ");
    expect(ChatBodySchema.safeParse({ message: twentyOne }).success).toBe(false);
  });
  it("rejects over 150 chars", () => {
    const long = "a".repeat(151);
    expect(ChatBodySchema.safeParse({ message: long }).success).toBe(false);
  });
});

describe("WritingFeedbackBodySchema (cap: 50 words / 200 chars)", () => {
  it("accepts a 50-word input", () => {
    const fifty = Array.from({ length: 50 }, () => "w").join(" ");
    expect(WritingFeedbackBodySchema.safeParse({ text: fifty }).success).toBe(true);
  });
  it("rejects 51 words", () => {
    const fiftyOne = Array.from({ length: 51 }, () => "w").join(" ");
    expect(WritingFeedbackBodySchema.safeParse({ text: fiftyOne }).success).toBe(false);
  });
  it("rejects over 200 chars", () => {
    expect(WritingFeedbackBodySchema.safeParse({ text: "a".repeat(201) }).success).toBe(false);
  });
});

describe("RephraseBodySchema (cap: 30 words / 200 chars)", () => {
  it("accepts a normal sentence", () => {
    expect(RephraseBodySchema.safeParse({ sentence: "I like apples.", style: "formal" }).success).toBe(true);
  });
  it("rejects 31 words", () => {
    const long = Array.from({ length: 31 }, () => "w").join(" ");
    expect(RephraseBodySchema.safeParse({ sentence: long, style: "casual" }).success).toBe(false);
  });
  it("rejects unknown style", () => {
    expect(
      RephraseBodySchema.safeParse({ sentence: "Hi", style: "fancy" as unknown as "formal" }).success,
    ).toBe(false);
  });
});
