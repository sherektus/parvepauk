# AGENTS.md

## About this project
A web app party drinking game, built during a beginner AI hackathon.
The person building this is NOT a developer. Explain things in plain, simple language. Never ask them technical questions. Make sensible technical decisions yourself.
The user decides everything about the game itself: rules, content, flow, look, how it's played. Don't add game features, screens or rules they didn't ask for. If something about the game is unclear, ask them.
Game text language: the same language the user writes in.

## Stack (do not change)
- React + TypeScript (.tsx) + Vite
- Tailwind CSS v4 via `@tailwindcss/vite`
- Frontend only: no backend, no database, no login, no API keys. Use localStorage if something needs saving.
- Keep dependencies minimal. OK to use `framer-motion` (animations) and `lucide-react` (icons). Avoid anything else unless clearly necessary.

## Speed rules
- NO tests. Never write, install, or run tests or test frameworks.
- NO ESLint, Prettier, or any linter/formatter. Don't install, configure, or run them.
- The only check: run `npx tsc --noEmit` after bigger changes and fix any errors yourself before saying you're done.
- Don't ask permission for small technical decisions. Just build.
- Make focused edits. Don't rewrite files that already work.

## Layout & code
- Built for desktop/laptop screens. No mobile design needed, but layouts should adapt reasonably to different laptop sizes (small 13" up to large monitors) and never break, overflow or get cut off.
- No placeholder text, no lorem ipsum, no TODOs, no buttons that do nothing.
- Keep every screen light: little text and one clear focus. Don't pile up pills, badges, titles, subtitles, paragraphs and text-heavy cards in one place (a popup with a pill, a title, a subtitle, a paragraph, badges and several cards is far too much to read). This goes for every screen: game, home, settings and popups. It should feel like a real game, not an overloaded AI-generated dashboard.
- Keep game text content in `src/data/` so it's easy to edit.

## Subagents
- For bigger tasks: first set up the shared foundation yourself (project structure, game state, list of screens, colors and fonts). Then split the independent parts across parallel subagents (for example: screens, game content, sounds, animations, images) and make sure everything fits together at the end.
- Tell every subagent to read and follow AGENTS.md.

## Images, sound and music
- Images: if the user wants visuals (backgrounds, card art, logos, characters), generate real images with your image generation tool or subagent and save them in `src/assets/`. Don't use placeholder images or download images from the internet.
- Sound and music: if the user wants them, generate them in code with the Web Audio API (no audio files, no downloads) unless the user provides files. Start audio only after the player's first click, and add a mute button.

## Workflow
- After every working change, commit with a short message and push to GitHub.
- Start the dev server in the background with `npm run dev` and give the user the local link.
- The first time the server starts: check whether this computer is Mac or Windows, then ask the user if they want you to open the game in their browser. If yes, open it with the correct command for their system (Mac: `open <url>`, Windows: `start <url>`).
- After each change, say in 1–3 plain sentences what changed and what to try.
