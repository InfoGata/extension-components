import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { ExtensionProvider } from "../ExtensionProvider";
import { useExtension } from "../useExtension";

// Test component to access extension context
function TestComponent() {
  const { extensionDetected } = useExtension();
  return (
    <div>
      <span data-testid="status">
        {extensionDetected === null
          ? "loading"
          : extensionDetected
            ? "detected"
            : "not-detected"}
      </span>
    </div>
  );
}

describe("ExtensionProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("should show loading initially when extension not immediately detected", () => {
    const hasExtension = vi.fn().mockReturnValue(false);

    render(
      <ExtensionProvider hasExtension={hasExtension}>
        <TestComponent />
      </ExtensionProvider>
    );

    expect(screen.getByTestId("status").textContent).toBe("loading");
  });

  it("should detect extension immediately when present", () => {
    const hasExtension = vi.fn().mockReturnValue(true);

    render(
      <ExtensionProvider hasExtension={hasExtension}>
        <TestComponent />
      </ExtensionProvider>
    );

    expect(screen.getByTestId("status").textContent).toBe("detected");
  });

  it("should set not-detected after initial poll duration", async () => {
    const hasExtension = vi.fn().mockReturnValue(false);

    render(
      <ExtensionProvider
        hasExtension={hasExtension}
        initialPollDuration={3000}
      >
        <TestComponent />
      </ExtensionProvider>
    );

    expect(screen.getByTestId("status").textContent).toBe("loading");

    await act(async () => {
      vi.advanceTimersByTime(3100);
    });

    expect(screen.getByTestId("status").textContent).toBe("not-detected");
  });

  it("should detect extension during initial polling phase", async () => {
    let detected = false;
    const hasExtension = vi.fn().mockImplementation(() => detected);

    render(
      <ExtensionProvider
        hasExtension={hasExtension}
        initialPollInterval={100}
      >
        <TestComponent />
      </ExtensionProvider>
    );

    expect(screen.getByTestId("status").textContent).toBe("loading");

    // Simulate extension becoming available after 500ms
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    detected = true;

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByTestId("status").textContent).toBe("detected");
  });

  it("should detect extension during slow polling phase", async () => {
    let detected = false;
    const hasExtension = vi.fn().mockImplementation(() => detected);

    render(
      <ExtensionProvider
        hasExtension={hasExtension}
        initialPollDuration={3000}
        slowPollInterval={2000}
      >
        <TestComponent />
      </ExtensionProvider>
    );

    // Wait for initial phase to end
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });

    expect(screen.getByTestId("status").textContent).toBe("not-detected");

    // Extension becomes available
    detected = true;

    // Wait for slow poll
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });

    expect(screen.getByTestId("status").textContent).toBe("detected");
  });

  it("should use custom polling intervals", async () => {
    const hasExtension = vi.fn().mockReturnValue(false);

    render(
      <ExtensionProvider
        hasExtension={hasExtension}
        initialPollInterval={50}
        initialPollDuration={1000}
      >
        <TestComponent />
      </ExtensionProvider>
    );

    // With 50ms interval for 1000ms, we should have ~20 calls
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Initial call + polling calls
    expect(hasExtension.mock.calls.length).toBeGreaterThan(5);
  });
});

describe("useExtension", () => {
  afterEach(() => {
    cleanup();
  });

  it("should throw error when used outside ExtensionProvider", () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useExtension must be used within an ExtensionProvider");

    spy.mockRestore();
  });

  it("should return context when used within ExtensionProvider", () => {
    const hasExtension = vi.fn().mockReturnValue(true);

    render(
      <ExtensionProvider hasExtension={hasExtension}>
        <TestComponent />
      </ExtensionProvider>
    );

    expect(screen.getByTestId("status")).toBeDefined();
  });
});
