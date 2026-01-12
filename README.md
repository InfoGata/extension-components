# @infogata/extension-components

React context and hook for browser extension detection with configurable polling.

## Installation

```bash
npm install @infogata/extension-components
```

## Usage

### Basic Setup

Wrap your application with `ExtensionProvider` and provide a `hasExtension` function that returns `true` when the extension is detected:

```tsx
import { ExtensionProvider } from "@infogata/extension-components";

// Define your extension detection logic
const hasExtension = () => {
  return typeof window !== "undefined" && typeof window.MyExtensionAPI !== "undefined";
};

function App() {
  return (
    <ExtensionProvider hasExtension={hasExtension}>
      <YourApp />
    </ExtensionProvider>
  );
}
```

### Using the Hook

```tsx
import { useExtension } from "@infogata/extension-components";

function MyComponent() {
  const { extensionDetected } = useExtension();

  if (extensionDetected === null) {
    return <div>Checking for extension...</div>;
  }

  if (!extensionDetected) {
    return <div>Please install our browser extension</div>;
  }

  return <div>Extension detected! Full functionality available.</div>;
}
```

### Custom Polling Configuration

```tsx
<ExtensionProvider
  hasExtension={hasExtension}
  initialPollInterval={50}      // Poll every 50ms initially (default: 100ms)
  initialPollDuration={5000}    // Initial phase lasts 5 seconds (default: 3000ms)
  slowPollInterval={5000}       // After initial phase, poll every 5 seconds (default: 2000ms)
>
  <App />
</ExtensionProvider>
```

## API

### ExtensionProvider Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | required | Child components |
| `hasExtension` | `() => boolean` | required | Function that returns true when extension is detected |
| `initialPollInterval` | `number` | `100` | Polling interval in ms during initial phase |
| `initialPollDuration` | `number` | `3000` | Duration of initial aggressive polling phase in ms |
| `slowPollInterval` | `number` | `2000` | Polling interval in ms after initial phase |

### useExtension Return Value

| Property | Type | Description |
|----------|------|-------------|
| `extensionDetected` | `boolean \| null` | `null` during initial detection, `true` if detected, `false` if not detected |

## How It Works

1. On mount, immediately checks for extension
2. If not immediately detected, polls at `initialPollInterval` for `initialPollDuration`
3. After initial phase, sets `extensionDetected` to `false` but continues polling at `slowPollInterval`
4. Once detected, stops polling and sets `extensionDetected` to `true`

This allows for fast detection when the extension loads quickly, while still detecting extensions that load after the page.

## Type Exports

```tsx
import type {
  ExtensionProviderProps,
  ExtensionContextType
} from "@infogata/extension-components";
```

## License

MIT
