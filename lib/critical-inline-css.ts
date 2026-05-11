/**
 * 与 app/globals.css 中 :root / body 对齐的极简兜底样式。
 * 当 dev 环境下偶发 `_next/static/css/app/layout.css` 404 时，页面仍保持深色底与可读性。
 */
export const CRITICAL_INLINE_CSS = `
:root {
  --background: 228 36% 7%;
  --surface: 230 28% 10%;
  --surface-raised: 232 24% 14%;
  --border: 236 16% 22%;
  --accent: 261 92% 66%;
  --accent-muted: 261 58% 44%;
  --foreground: 220 30% 96%;
  --muted: 224 12% 63%;
}
html { color-scheme: dark; }
body {
  margin: 0;
  min-height: 100vh;
  background-color: hsl(228 36% 7%);
  background-image:
    radial-gradient(ellipse 120% 80% at 10% -20%, hsl(261 78% 24% / 0.32), transparent 55%),
    radial-gradient(ellipse 90% 60% at 100% 0%, hsl(194 80% 22% / 0.18), transparent 50%);
  color: hsl(220 30% 96%);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}
a { color: hsl(261 92% 72%); }
`;
