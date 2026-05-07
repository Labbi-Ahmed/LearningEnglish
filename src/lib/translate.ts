import "server-only";

const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

type MyMemoryResponse = {
  responseData: { translatedText: string };
  responseStatus: number;
};

export async function translateTobn(text: string): Promise<string | null> {
  if (!text.trim()) return null;
  try {
    const url = `${MYMEMORY_URL}?q=${encodeURIComponent(text)}&langpair=en|bn`;
    const res = await fetch(url, { next: { revalidate: 0 } } as RequestInit);
    if (!res.ok) return null;
    const json = (await res.json()) as MyMemoryResponse;
    const translated = json?.responseData?.translatedText?.trim();
    if (!translated) return null;
    return translated;
  } catch {
    return null;
  }
}
