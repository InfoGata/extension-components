# @infogata/extension-components

React context and hook for browser extension detection with configurable polling.

## Installation

```bash
npm install @infogata/extension-components
```

## Usage

### Basic Setup

Wrap your application with `ExtensionProvider`. It detects the InfoGata extension by default:

```tsx
import { ExtensionProvider } from "@infogata/extension-components";

function App() {
  return (
    <ExtensionProvider>
      <YourApp />
    </ExtensionProvider>
  );
}
```

Pass your own `hasExtension` to detect something else:

```tsx
const hasMyExtension = () => {
  return typeof window !== "undefined" && typeof window.MyExtensionAPI !== "undefined";
};

<ExtensionProvider hasExtension={hasMyExtension}>
  <YourApp />
</ExtensionProvider>;
```

### Testing the no-extension path

Load any page with `?noextension` and the default detection reports the extension as absent, even with it installed — the app takes the code path a user without it gets. The choice is kept in `sessionStorage`, so it survives the app rewriting the address and later reloads in that tab; `?noextension=0` clears it.

It applies to production builds too. Suppression only ever takes capabilities away from the page, and it is the only way to exercise that path against a deployed site.

Call `hasExtension()` outside React (for a one-off request decision) and `isExtensionSuppressed()` to read the switch directly:

```tsx
import { hasExtension, isExtensionSuppressed } from "@infogata/extension-components";
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
| `hasExtension` | `() => boolean` | library detection | Function that returns true when extension is detected |
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

The default `hasExtension` looks for `window.InfoGata` and returns `false` while suppression is on. It is safe to call from a timer or a torn-down test environment: a missing `window` or an unreadable `sessionStorage` counts as "no extension" rather than throwing.

`hasExtension` is called through a ref, so passing an inline arrow is safe — re-rendering the provider does not restart the detection cycle, and the most recently rendered function is the one polled.

Because detection can resolve after the first paint, read `extensionDetected` from `useExtension()` rather than calling your own detection function during render. A direct call renders once against whatever the page looked like at mount and never updates.

## Type Exports

```tsx
import type {
  ExtensionProviderProps,
  ExtensionContextType
} from "@infogata/extension-components";
```

## License

MIT
