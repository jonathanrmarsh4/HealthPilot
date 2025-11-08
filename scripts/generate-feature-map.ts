/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';

// Heuristic scanner: finds routes/screens by scanning src for react-router usage and screen components.
// Works even if you use lazy() chunks; it will still map files.
const SRC = path.resolve(process.cwd(), 'client/src');
const outPath = path.resolve(process.cwd(), 'reports/feature-map.json');

type Entry = {
  route: string;
  screen: string;
  states: string[];
  critical_flows: string[];
  deps: string[];
};

function walk(dir: string, acc: string[] = []): string[] {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    const p = path.join(dir, it.name);
    if (it.isDirectory()) walk(p, acc);
    else if (/\.(tsx?|jsx?)$/.test(p)) acc.push(p);
  }
  return acc;
}

function guessRoute(file: string): string | null {
  // crude patterns for react-router elements like <Route path="/today" ... />
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/<Route\s+path=["'`](.*?)["'`]/);
  if (m?.[1]) return m[1];
  // fallback: common screen naming
  const base = path.basename(file).toLowerCase();
  const known = ['today', 'training', 'insights', 'settings', 'onboarding', 'profile', 'recovery', 'nutrition', 'workout'];
  for (const k of known) if (base.includes(k)) return `/${k}`;
  return null;
}

function guessScreen(file: string): string {
  const name = path.basename(file).replace(/\.(tsx?|jsx?)$/, '');
  return name;
}

function depsFor(file: string): string[] {
  const text = fs.readFileSync(file, 'utf8');
  const d: string[] = [];
  if (text.includes('lucide-react')) d.push('Lucide');
  if (text.includes('tokens') || text.includes('--color-')) d.push('tokens');
  if (text.includes('Capacitor') || text.includes('@capacitor')) d.push('Capacitor');
  return Array.from(new Set(d));
}

function main() {
  const files = walk(SRC);
  const map: Entry[] = [];
  const seen = new Set<string>();

  for (const f of files) {
    const route = guessRoute(f);
    if (!route) continue;
    const key = `${route}::${f}`;
    if (seen.has(key)) continue;
    seen.add(key);

    map.push({
      route,
      screen: guessScreen(f),
      states: ['loading', 'content', 'error', 'empty'], // default; refine later
      critical_flows: route === '/training'
        ? ['start_workout', 'pause_resume', 'next_exercise']
        : route === '/today'
        ? ['view_summary', 'open_workout', 'open_insight']
        : [],
      deps: depsFor(f),
    });
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(map, null, 2));
  console.log(`Feature map written: ${outPath} (${map.length} entries)`);
}

main();
