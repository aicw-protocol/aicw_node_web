/** Shorten a base58 wallet address for display (e.g. Ab12…xYz9). */
export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 1) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

/** Shorten a node UUID for table display (e.g. ccded004…01c28). */
export function truncateNodeId(nodeId: string, head = 8, tail = 6): string {
  if (nodeId.length <= head + tail + 1) return nodeId;
  return `${nodeId.slice(0, head)}…${nodeId.slice(-tail)}`;
}
