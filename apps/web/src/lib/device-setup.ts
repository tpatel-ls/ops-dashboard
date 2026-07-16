export type DeviceSetupId = 's24-ultra' | 'tab-s10-ultra' | 'galaxy-watch' | 'mac' | 'windows';
export type ReadinessState = 'ready' | 'installed' | 'offline' | 'unavailable';

export interface AppShortcut {
  name: string;
  shortName: string;
  description: string;
  url: string;
}

export interface DeviceSetup {
  id: DeviceSetupId;
  name: string;
  role: string;
  primaryAction: string;
  installSteps: string[];
  strengths: string[];
  limitations: string[];
}

export interface CapabilityFacts {
  standalone: boolean;
  serviceWorker: boolean;
  mediaRecorder: boolean;
  speechRecognition: boolean;
  notification: boolean;
  online: boolean;
}

export interface InstallReadiness {
  install: ReadinessState;
  voice: ReadinessState;
  notifications: ReadinessState;
  sync: ReadinessState;
}

export const APP_SHORTCUTS: AppShortcut[] = [
  {
    name: 'Life Command',
    shortName: 'Command',
    description: 'Open the all-in-one management cockpit.',
    url: '/dashboard',
  },
  {
    name: 'Open Briefing',
    shortName: 'Briefing',
    description: 'Start the day from the operating cockpit.',
    url: '/today',
  },
  {
    name: 'Capture',
    shortName: 'Capture',
    description: 'Drop a task, note, journal entry, or idea into the triage pipeline.',
    url: '/today?capture=1',
  },
  {
    name: 'Tasks',
    shortName: 'Tasks',
    description: 'Work through open tasks.',
    url: '/tasks',
  },
  {
    name: 'Projects',
    shortName: 'Projects',
    description: 'Review outcomes, next actions, due dates, and progress.',
    url: '/projects',
  },
  {
    name: 'Identity Calendar',
    shortName: 'Identity',
    description: 'Open the habit score and activity ledger.',
    url: '/habits',
  },
  {
    name: 'Routines',
    shortName: 'Routines',
    description: 'Run repeatable daily and weekly operating routines.',
    url: '/routines',
  },
  {
    name: 'Log Food',
    shortName: 'Food',
    description: 'Open meal capture and macro tracking.',
    url: '/food',
  },
  {
    name: 'Inbox',
    shortName: 'Inbox',
    description: 'Clear captures that need review or routing.',
    url: '/inbox',
  },
  {
    name: 'Ask',
    shortName: 'Ask',
    description: 'Chat with the dashboard context.',
    url: '/ask',
  },
];

export const DEVICE_SETUPS: DeviceSetup[] = [
  {
    id: 's24-ultra',
    name: 'Galaxy S24 Ultra',
    role: 'Primary capture surface',
    primaryAction: 'Install the PWA, keep the mic button one thumb away, and use voice/text capture all day.',
    installSteps: [
      'Open the deployed app in Chrome.',
      'Tap the browser menu, then Add to home screen or Install app.',
      'Allow microphone access the first time you use voice capture.',
      'Sign in once so Supabase sync can fan out changes to tablet, desktop, and watch-triggered captures.',
    ],
    strengths: ['Fast thumb capture', 'Voice transcription', 'Push notification bridge to watch'],
    limitations: ['Background sync depends on Android battery/network rules. Open the app if a stale badge appears.'],
  },
  {
    id: 'tab-s10-ultra',
    name: 'Galaxy Tab S10 Ultra',
    role: 'Planning and review board',
    primaryAction: 'Use landscape mode for two-pane work: list on the left, detail/review on the right.',
    installSteps: [
      'Open the app in Chrome or Samsung Internet.',
      'Install it to the home screen.',
      'Use landscape orientation for the persistent sidebar and docked detail panes.',
      'Keep sync enabled so captures from phone/watch appear live.',
    ],
    strengths: ['Large briefing board', 'Project review', 'Calendar and whiteboard work'],
    limitations: ['Use Chrome if install prompts or service worker updates feel inconsistent in Samsung Internet.'],
  },
  {
    id: 'galaxy-watch',
    name: 'Galaxy Watch Ultra / Watch 7 Ultra',
    role: 'One-tap field capture',
    primaryAction: 'Create a Tasker or HTTP Shortcuts tile that POSTs spoken text to /api/capture.',
    installSteps: [
      'Install Tasker or HTTP Shortcuts on the paired S24 Ultra.',
      'Create a voice input action on the phone.',
      'POST the text to https://APP.vercel.app/api/capture with Authorization: Bearer OPS_API_SECRET.',
      'Add the Tasker/shortcut trigger to a Wear OS tile or complication.',
    ],
    strengths: ['Fastest possible capture', 'Great for errands, workouts, and walking ideas'],
    limitations: [
      'The watch does not run the full PWA.',
      'Reliable capture is paired phone bridged; the phone makes the authenticated HTTPS request.',
    ],
  },
  {
    id: 'mac',
    name: 'Mac',
    role: 'Keyboard-first command center',
    primaryAction: 'Install the PWA in Chrome and use Cmd+K for command/capture flow.',
    installSteps: [
      'Open the deployed app in Chrome.',
      'Click the install icon in the address bar.',
      'Pin the installed app to the Dock.',
      'Use Cmd+K for command palette capture and desktop review.',
    ],
    strengths: ['Keyboard capture', 'Deep project editing', 'Weekly reviews'],
    limitations: ['Safari PWA behavior varies; Chrome is the most predictable target for this app.'],
  },
  {
    id: 'windows',
    name: 'Windows',
    role: 'Desktop execution station',
    primaryAction: 'Install the PWA in Edge or Chrome and keep it pinned beside your working apps.',
    installSteps: [
      'Open the deployed app in Edge or Chrome.',
      'Install the app from the address bar.',
      'Pin it to the taskbar.',
      'Use Ctrl+K for command palette capture.',
    ],
    strengths: ['Stable desktop PWA install', 'Taskbar launch', 'Keyboard-driven capture'],
    limitations: ['Browser notification settings must allow the app domain before push can work.'],
  },
];

export function getInstallReadiness(facts: CapabilityFacts): InstallReadiness {
  return {
    install: facts.standalone ? 'installed' : facts.serviceWorker ? 'ready' : 'unavailable',
    voice: facts.mediaRecorder || facts.speechRecognition ? 'ready' : 'unavailable',
    notifications: facts.notification ? 'ready' : 'unavailable',
    sync: facts.online ? 'ready' : 'offline',
  };
}
