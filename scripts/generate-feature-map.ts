/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';

// Parse actual routes from App.tsx Router component
const APP_TSX = path.resolve(process.cwd(), 'client/src/App.tsx');
const outPath = path.resolve(process.cwd(), 'reports/feature-map.json');

type Entry = {
  route: string;
  screen: string;
  states: string[];
  critical_flows: string[];
  deps: string[];
};

// Critical flow mappings based on business logic
const CRITICAL_FLOWS: Record<string, string[]> = {
  '/training': ['start_workout', 'pause_resume', 'next_exercise', 'view_readiness'],
  '/training/start': ['select_workout', 'configure_exercises', 'begin_session'],
  '/workout/:id': ['log_set', 'pause_resume', 'skip_exercise', 'complete_workout'],
  '/': ['view_dashboard', 'navigate_to_training', 'view_insights'],
  '/insights': ['view_daily', 'view_trends', 'ai_chat'],
  '/meals': ['view_plan', 'log_meal', 'generate_plan'],
  '/recovery': ['view_muscle_recovery', 'schedule_protocol'],
  '/biomarkers': ['view_trends', 'add_biomarker', 'analyze'],
  '/goals': ['create_goal', 'track_progress', 'update_goal'],
  '/settings': ['change_preferences', 'manage_privacy', 'logout'],
};

function parseRoutesFromApp(): Entry[] {
  const content = fs.readFileSync(APP_TSX, 'utf8');
  const routes: Entry[] = [];
  
  // Match patterns like: <Route path="/training" component={Training} />
  const routePattern = /<Route\s+path="([^"]+)"\s+component=\{([^}]+)\}/g;
  let match;
  
  while ((match = routePattern.exec(content)) !== null) {
    const [, path, component] = match;
    
    // Skip NotFound catch-all route
    if (component === 'NotFound') continue;
    
    routes.push({
      route: path,
      screen: component,
      states: ['loading', 'content', 'error', 'empty'],
      critical_flows: CRITICAL_FLOWS[path] || [],
      deps: detectDeps(component),
    });
  }
  
  return routes;
}

function detectDeps(component: string): string[] {
  const deps: string[] = [];
  
  // Common dependencies based on component patterns
  const componentPath = path.resolve(process.cwd(), `client/src/pages/${component}.tsx`);
  
  if (fs.existsSync(componentPath)) {
    const content = fs.readFileSync(componentPath, 'utf8');
    if (content.includes('lucide-react')) deps.push('Lucide');
    if (content.includes('--color-') || content.includes('tokens')) deps.push('tokens');
    if (content.includes('Capacitor') || content.includes('@capacitor')) deps.push('Capacitor');
    if (content.includes('@tanstack/react-query')) deps.push('TanStack Query');
  }
  
  return Array.from(new Set(deps));
}

function main() {
  const map = parseRoutesFromApp();
  
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(map, null, 2));
  
  console.log(`✅ Feature map written: ${outPath}`);
  console.log(`📊 Found ${map.length} routes`);
  console.log(`🎯 Critical flows identified: ${map.filter(m => m.critical_flows.length > 0).length} routes`);
}

main();
