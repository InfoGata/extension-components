export interface ExtensionProviderProps {
  children: React.ReactNode;
  hasExtension: () => boolean;
  initialPollInterval?: number;
  slowPollInterval?: number;
  initialPollDuration?: number;
}

export interface ExtensionContextType {
  extensionDetected: boolean | null;
}
