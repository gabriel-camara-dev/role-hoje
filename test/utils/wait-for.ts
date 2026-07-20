/**
 * Reruns the assertions until they pass or the deadline is hit. Domain-event
 * subscribers fire asynchronously (fire-and-forget), so a side effect they cause
 * is not observable the instant the triggering call returns.
 */
export async function waitFor(assertions: () => void | Promise<void>, maxDuration = 1000): Promise<void> {
  return new Promise((resolve, reject) => {
    let elapsed = 0;

    const interval = setInterval(async () => {
      elapsed += 10;

      try {
        await assertions();
        clearInterval(interval);
        resolve();
      } catch (error) {
        if (elapsed >= maxDuration) {
          clearInterval(interval);
          reject(error);
        }
      }
    }, 10);
  });
}
