import React, { createContext, useEffect, useState } from "react";
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

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    let detected = false;

    const checkExtension = (): void => {
      if (hasExtension()) {
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
      setTimeout(() => {
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
    };
  }, [hasExtension, initialPollInterval, slowPollInterval, initialPollDuration]);

  return (
    <ExtensionContext.Provider value={{ extensionDetected }}>
      {children}
    </ExtensionContext.Provider>
  );
};
