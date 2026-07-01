/**
 * lib/utils.ts
 * OpusHunter — Shared utilities
 * 2026-07-01
 *
 * `cn()` — conditional className joiner for NativeWind.
 * Several existing components (ProfileDropdown, PageContainer, AdaptiveLayout)
 * imported this from a file that never existed in the repo, which meant any
 * screen that pulled them in would fail to build. This is the real thing.
 *
 * No new dependency required — this is intentionally dependency-free so it
 * works immediately without an `npm install`. If you later want proper
 * Tailwind class de-duplication (e.g. `"p-2 p-4"` → `"p-4"`), swap this
 * implementation for `twMerge(clsx(inputs))` after adding `clsx` and
 * `tailwind-merge` to package.json — every call site here stays identical.
 */

type ClassValue = string | number | null | undefined | false | ClassValue[];

function flatten(inputs: ClassValue[]): string[] {
    const out: string[] = [];
    for (const input of inputs) {
        if (!input) continue;
        if (Array.isArray(input)) {
            out.push(...flatten(input));
        } else {
            out.push(String(input));
        }
    }
    return out;
}

export function cn(...inputs: ClassValue[]): string {
    return flatten(inputs).join(' ').trim();
}