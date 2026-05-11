## 1. ProBadge component

- [x] 1.1 Create `src/components/pro-badge.tsx` — a server-renderable `<span>` with amber/gold styling:
  ```tsx
  export function ProBadge() {
    return (
      <span className="ml-auto rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 text-[10px] font-bold px-1.5 py-0.5 leading-none tracking-wide">
        PRO
      </span>
    );
  }
  ```

## 2. ProGate component

- [x] 2.1 Create `src/components/pro-gate.tsx` — centered locked-feature card (no `"use client"`):
  - Lock icon (🔒), bold title `Pro feature`, description sentence, disabled outline CTA "Upgrade to Pro — coming soon"
  - Use `max-w-sm mx-auto mt-16 text-center space-y-4 rounded-xl border bg-card p-8` for layout
  - Import `Button` from `@/components/ui/button`

## 3. Fix pronunciation — rewrite speech.ts

- [x] 3.1 Rewrite `src/lib/speech.ts`:
  - Keep `Accent`, `cancelSpeech()`, and `isSupported()` unchanged
  - Add private `getVoicesReady(): Promise<SpeechSynthesisVoice[]>`:
    - If `getVoices()` is non-empty → `Promise.resolve(voices)`
    - Else attach one-time `voiceschanged` listener, 2 s timeout fallback
  - Rewrite `speak(text, accent)` to call `void getVoicesReady().then(voices => { ...pick voice + speak... })`
  - Public signature `speak(text: string, accent: Accent): void` stays identical — no call sites change

## 4. Extend layout to derive isFree and pass it down

- [x] 4.1 In `src/app/(dashboard)/layout.tsx`:
  - The existing query already reads `tier`; after the `isAuthor` check add: `const isFree = !sub || (sub as { tier?: string } | null)?.tier === "free" || !(sub as { tier?: string } | null)?.tier;`  
    — or more cleanly derive from the existing `tier` variable. Cast the fetched tier as `Tier` from `@/lib/quotas/limits` and compare: `const tier = ((sub as …)?.tier ?? "free") as Tier; const isFree = tier === "free";`
  - Pass `isFree={isFree}` to `<MobileNav … />`
- [x] 4.2 In the sidebar nav render (inside the `<aside>`), define the set of pro-locked hrefs:
  ```tsx
  const PRO_LOCKED = new Set(["/chat", "/writing", "/speaking"]);
  ```
  In the `.map()` for nav items, when `isFree && PRO_LOCKED.has(href)`, render `<ProBadge />` after the label (inside the flex row, `ml-auto`)
- [x] 4.3 Import `ProBadge` at the top of `layout.tsx`

## 5. Update MobileNav to show ProBadge

- [x] 5.1 In `src/components/nav/mobile-nav.tsx`:
  - Add `isFree: boolean` to the `Props` type
  - Add `isFree` to the destructured props in `MobileNav`
  - Define `const PRO_LOCKED = new Set(["/chat", "/writing", "/speaking"])` inside the component
  - In the nav item `.map()`, after the label `<span>`, add: `{isFree && PRO_LOCKED.has(href) && <ProBadge />}` (import `ProBadge`)

## 6. Gate /chat page

- [x] 6.1 In `src/app/(dashboard)/chat/page.tsx`:
  - Import `getTier` from `@/lib/quotas/get-tier`
  - Import `ProGate` from `@/components/pro-gate`
  - After `getUser()`, call `const tier = await getTier(supabase, user.id)`
  - If `tier === "free"`, return:
    ```tsx
    <ProGate
      feature="AI Tutor Chat"
      description="Chat with an AI English tutor to practise conversation, ask grammar questions, and get instant feedback."
    />
    ```
  - Otherwise render the existing page JSX unchanged

## 7. Gate /writing page

- [x] 7.1 In `src/app/(dashboard)/writing/page.tsx`:
  - Same pattern as task 6.1
  - `ProGate` description: `"Get AI-powered grammar feedback on your writing and rephrase individual sentences with one click."`

## 8. Gate /speaking page

- [x] 8.1 In `src/app/(dashboard)/speaking/page.tsx`:
  - Same pattern as task 6.1
  - `ProGate` description: `"Record yourself reading English prompts and receive an AI accuracy score to track your pronunciation progress."`

## 9. Typecheck and lint

- [x] 9.1 Run `npm run typecheck` — must pass
- [x] 9.2 Run `npm run lint` — must pass

## 10. Smoke test

- [ ] 10.1 As a **free** user (default tier): desktop sidebar shows "PRO" amber badge on Chat, Writing, Speaking nav items
- [ ] 10.2 As a **free** user: mobile nav also shows "PRO" badge on those three items
- [ ] 10.3 As a **free** user: navigate to `/chat` → see ProGate wall, NO network request to `/api/ai/chat`
- [ ] 10.4 As a **free** user: navigate to `/writing` → see ProGate wall
- [ ] 10.5 As a **free** user: navigate to `/speaking` → see ProGate wall
- [ ] 10.6 As a **free** user: navigate to `/vocabulary` → search a word, click 🔊 UK / 🔊 US buttons → hear correct accent voice (Chrome: verify voice picks correctly on first click, not silent)
- [ ] 10.7 As a **pro** or **author** user: no badge on nav items, full feature pages load normally
- [ ] 10.8 Direct URL navigation to `/chat` as free user → gate wall (not the chat UI)
