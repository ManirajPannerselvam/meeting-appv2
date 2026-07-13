import { log } from "$lib/debug/logger";

export function scanButtons() {
  if (typeof document === 'undefined') return [];

  const nodes = Array.from(document.querySelectorAll('button, [role="button"]')) as HTMLElement[];
  const list = nodes.map((el) => {
    const info: any = {
      tag: el.tagName,
      id: el.id || null,
      text: el.textContent?.trim() || null,
      classes: el.className || null,
      dataset: { ...((el as any).dataset || {}) }
    };

    // Attempt to detect inline onclick
    if ((el as any).onclick) info.onclick = true;
    else info.onclick = false; // note: frameworks often attach listeners not accessible here

    // detect data-action attribute pattern used by some codebases
    info.dataAction = el.getAttribute('data-action') || el.getAttribute('data-action-name') || null;

    return info;
  });

  logger.log('BUTTON_HEALTH', `Scanned ${list.length} buttons`);
  return list;
}

export default { scanButtons };
