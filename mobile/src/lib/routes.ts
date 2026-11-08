import type { Href } from "expo-router";

/**
 * Shared code (quests, notifications) links with web paths like "/student/vocab". This maps them to
 * app screens, so a link added on the web keeps working in the app; unknown ones open the website.
 */
const MAP: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^\/student\/?$/, () => "/today"],
  [/^\/student\/vocab\/?$/, () => "/vocab"],
  [/^\/student\/practice(\/games)?\/?$/, () => "/practice"],
  [/^\/student\/settings\/?$/, () => "/account"],
  [/^\/student\/learn\/([0-9a-f-]{36})\/?$/, (m) => `/lesson/${m[1]}`],
  [/^\/student\/quiz\/([0-9a-f-]{36})\/?$/, (m) => `/quiz/${m[1]}`],
  [/^\/student\/[^/]+\/unit\/([0-9a-f-]{36})\/?$/, (m) => `/unit/${m[1]}`],
  [/^\/student\/[^/]+\/?$/, () => "/learn"],
];

export function appRoute(webPath: string): Href | null {
  for (const [re, to] of MAP) {
    const m = webPath.match(re);
    if (m) return to(m) as Href;
  }
  return null;
}
