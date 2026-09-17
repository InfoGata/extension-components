export interface ExtensionProviderProps {
  children: React.ReactNode;
  /** Defaults to the library's own detection, which honours `?noextension`. */
  hasExtension?: () => boolean;
  initialPollInterval?: number;
  slowPollInterval?: number;
  initialPollDuration?: number;
}

export interface ExtensionContextType {
  extensionDetected: boolean | null;
}
