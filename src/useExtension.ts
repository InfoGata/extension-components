import { useContext } from "react";
import { ExtensionContext } from "./ExtensionProvider";
import type { ExtensionContextType } from "./types";

export const useExtension = (): ExtensionContextType => {
  const context = useContext(ExtensionContext);
  if (context === undefined) {
    throw new Error("useExtension must be used within an ExtensionProvider");
  }
  return context;
};
