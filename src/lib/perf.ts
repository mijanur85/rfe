// Removes `backdrop-blur*` utility classes from a class string.
//
// Why this exists: `backdrop-blur` is a real-time GPU compositing effect.
// On a single fixed element (header, bottom nav, a modal) it's basically
// free. Applied to every tile in a scrolling photo grid (dozens of tiles
// on screen at once, all opaque images that fully cover it anyway) it's
// pure wasted GPU work recalculated every frame during scroll -- which is
// what caused the janky/stuck scrolling. Use this wherever a theme class
// gets applied to a *repeated* grid item instead of a lone fixed element.
export function stripBackdropBlur(classNames: string): string {
  return classNames
    .split(' ')
    .filter((cls) => !/^backdrop-blur/.test(cls))
    .join(' ');
}

// Runs `fn` when the browser is actually idle (falls back to a short
// setTimeout on engines without requestIdleCallback, e.g. some WebViews).
// Used to push non-urgent work (like writing to localStorage) off the exact
// tick a tap/click is being handled on, so a button press never has to wait
// behind a disk write before it visibly responds.
export function runWhenIdle(fn: () => void, timeoutMs: number = 300): void {
  const w = window as any;
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(() => fn(), { timeout: timeoutMs });
  } else {
    setTimeout(fn, 0);
  }
}

// Debounces + idle-schedules a persistence write. Rapid-fire state updates
// (e.g. a background rescan followed immediately by the user tapping
// favorite) end up writing to localStorage only once, after things settle,
// instead of once per state change -- keeping big JSON.stringify/write calls
// off the critical path of every tap.
export function createIdleDebouncedWriter<T>(write: (value: T) => void, delayMs: number = 250) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let latest: T;
  return (value: T) => {
    latest = value;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      runWhenIdle(() => write(latest));
    }, delayMs);
  };
}
