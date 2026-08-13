/** Shared network-config.yaml template for node onboarding (GUI + web). */
export const NETWORK_CONFIG_TEMPLATE = `# Network configuration for AICW node

environment: development
event_initiator_algorithm: ed25519
event_initiator_pubkey: "085e3dd81362735e85deba4745751bb2fe2f947ab223be27d412f5adfced963d"
chain_code: "5c22c2856d3657a2835bfb05cb2a6dbc9456f9d582550f9f6c06670417ee4086"

nats:
  url: "nats://158.247.251.191:4222"

consul:
  address: "158.247.251.191:8500"

mpc_threshold: 2

eligibility:
  membership:
    mode: whitelist
    source: consul
    consul_path: mpc_eligibility/membership_whitelist/
`;
