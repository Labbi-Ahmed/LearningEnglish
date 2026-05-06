import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DictionaryParseError,
  WordNotFoundError,
  lookupWord,
} from "./lookup";

const sampleEntry = [
  {
    word: "hello",
    phonetics: [
      { text: "/həˈləʊ/", audio: "https://example/hello-uk.mp3" },
      { text: "/həˈloʊ/", audio: "https://example/hello-us.mp3" },
    ],
    meanings: [
      {
        partOfSpeech: "noun",
        definitions: [
          { definition: "A greeting.", example: "Say hello to her.", synonyms: ["hi", "Hi"] },
        ],
        synonyms: ["greetings"],
        antonyms: ["goodbye"],
      },
    ],
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("lookupWord", () => {
  it("returns a normalized payload on a 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(sampleEntry), { status: 200 })),
    );
    const out = await lookupWord("Hello");
    expect(out.word).toBe("hello");
    expect(out.pos).toBe("noun");
    expect(out.ipa_uk).toBe("/həˈləʊ/");
    expect(out.ipa_us).toBe("/həˈloʊ/");
    expect(out.meaning).toBe("A greeting.");
    expect(out.example).toBe("Say hello to her.");
    expect(out.synonyms).toEqual(expect.arrayContaining(["hi", "greetings"]));
    expect(out.synonyms).toHaveLength(2);
    expect(out.antonyms).toEqual(["goodbye"]);
  });

  it("throws WordNotFoundError on 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ title: "No Definitions" }), { status: 404 })),
    );
    await expect(lookupWord("asdfqq")).rejects.toBeInstanceOf(WordNotFoundError);
  });

  it("throws DictionaryParseError on a malformed payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ not: "an array" }), { status: 200 })),
    );
    await expect(lookupWord("hello")).rejects.toBeInstanceOf(DictionaryParseError);
  });
});
