import type { CartItem } from '../types/product';

// The server's cart DTO carries no productId (its `id` is the cart-entry guid),
// so guest-local and server lines can only be matched on content: same size and
// same product name. Names are compared with startsWith tolerance because the
// product-detail page stores "name + subtitle" while the server returns the
// bare title.
const norm = (s?: string) => (s ?? '').toLowerCase().trim();

export const cartLineMatches = (a: CartItem, b: CartItem): boolean => {
    if (norm(a.size) !== norm(b.size)) return false;
    const an = norm(a.name);
    const bn = norm(b.name);
    return an === bn || an.startsWith(bn) || bn.startsWith(an);
};

// Server lines win; local-only lines (ones the server has no equivalent for)
// are appended so nothing the guest added ever disappears.
export const unionCartLines = (server: CartItem[], local: CartItem[]): CartItem[] =>
    [...server, ...local.filter((l) => !server.some((s) => cartLineMatches(l, s)))];
