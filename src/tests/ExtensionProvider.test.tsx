import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import React from "react";
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

  it("should stop polling after unmount", async () => {
    const hasExtension = vi.fn().mockReturnValue(false);

    const { unmount } = render(
      <ExtensionProvider hasExtension={hasExtension}>
        <TestComponent />
      </ExtensionProvider>
    );

    unmount();
    const callsAtUnmount = hasExtension.mock.calls.length;

    // Advance well past initialPollDuration so the phase-switch timeout would
    // have fired and started the slow interval.
    await act(async () => {
      vi.advanceTimersByTime(20000);
    });

    expect(hasExtension.mock.calls.length).toBe(callsAtUnmount);
  });

  it("should not restart detection when hasExtension changes identity", async () => {
    const detect = vi.fn().mockReturnValue(false);

    const { rerender } = render(
      <ExtensionProvider hasExtension={() => detect()} initialPollDuration={3000}>
        <TestComponent />
      </ExtensionProvider>
    );

    // A parent re-rendering mid-detection hands down a fresh arrow each time.
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      rerender(
        <ExtensionProvider hasExtension={() => detect()} initialPollDuration={3000}>
          <TestComponent />
        </ExtensionProvider>
      );
    }

    // 3000ms of real elapsed time have passed, so the initial phase is over
    // regardless of how many times the parent re-rendered.
    expect(screen.getByTestId("status").textContent).toBe("not-detected");
  });

  it("should call the latest hasExtension after a rerender", async () => {
    const stale = vi.fn().mockReturnValue(false);
    const fresh = vi.fn().mockReturnValue(true);

    const { rerender } = render(
      <ExtensionProvider hasExtension={stale}>
        <TestComponent />
      </ExtensionProvider>
    );

    expect(screen.getByTestId("status").textContent).toBe("loading");

    rerender(
      <ExtensionProvider hasExtension={fresh}>
        <TestComponent />
      </ExtensionProvider>
    );

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(fresh).toHaveBeenCalled();
    expect(screen.getByTestId("status").textContent).toBe("detected");
  });

  it("should not revert to not-detected when remounted under StrictMode", async () => {
    let detected = false;
    const hasExtension = vi.fn().mockImplementation(() => detected);

    render(
      <React.StrictMode>
        <ExtensionProvider hasExtension={hasExtension}>
          <TestComponent />
        </ExtensionProvider>
      </React.StrictMode>
    );

    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    detected = true;

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByTestId("status").textContent).toBe("detected");

    // The discarded first effect's timeout fires around here.
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByTestId("status").textContent).toBe("detected");
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
