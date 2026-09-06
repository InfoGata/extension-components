import React, { createContext, useEffect, useRef, useState } from "react";
import type { ExtensionProviderProps, ExtensionContextType } from "./types";

export const ExtensionContext = createContext<ExtensionContextType | undefined>(
  undefined
);

export const ExtensionProvider: React.FC<ExtensionProviderProps> = ({
  children,
  hasExtension,
  initialPollInterval = 100,
  slowPollInterval = 2000,
  initialPollDuration = 3000,
}) => {
  const [extensionDetected, setExtensionDetected] = useState<boolean | null>(
    null
  );

  // Held in a ref so the detection cycle below is not a dependency of the
  // caller's function identity. Consumers commonly pass an inline arrow, and
  // restarting the effect on every render would restart initialPollDuration
  // too, leaving extensionDetected stuck at null forever.
  const hasExtensionRef = useRef(hasExtension);
  useEffect(() => {
    hasExtensionRef.current = hasExtension;
  }, [hasExtension]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    let timeoutId: ReturnType<typeof setTimeout>;
    let detected = false;

    const checkExtension = (): void => {
      // The predicate is the consumer's code and typically reads globals the
      // extension writes. Called from a timer it has no caller to catch it, so
      // a throw becomes an uncaught exception -- which is how a predicate
      // reading `window` after a test environment is torn down fails a whole
      // run. A predicate that cannot answer has not found the extension, so
      // treat it as absent and keep polling: the next tick may well succeed.
      let present: boolean;
      try {
        present = hasExtensionRef.current();
      } catch {
        return;
      }

      if (present) {
        detected = true;
        setExtensionDetected(true);
        clearInterval(intervalId);
      }
    };

    // Check immediately
    checkExtension();

    if (!detected) {
      // Initial aggressive polling
      intervalId = setInterval(checkExtension, initialPollInterval);

      // After initial duration, switch to slower continuous polling
      timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        if (!detected) {
          setExtensionDetected(false);
          // Continue checking at slower interval indefinitely
          intervalId = setInterval(checkExtension, slowPollInterval);
        }
      }, initialPollDuration);
    }

    return () => {
      clearInterval(intervalId);
      // Must also clear the phase-switch timeout: if it fires after cleanup it
      // reports a stale "not detected" and starts an interval nothing can clear.
      clearTimeout(timeoutId);
    };
  }, [initialPollInterval, slowPollInterval, initialPollDuration]);

  return (
    <ExtensionContext.Provider value={{ extensionDetected }}>
      {children}
    </ExtensionContext.Provider>
  );
};
