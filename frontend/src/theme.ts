export const C = {
  bg: "#12100E",
  card: "#1D1A16",
  raised: "#282420",
  text: "#F7F4F0",
  muted: "#C4BFB6",
  brand: "#D96B3E",
  brandDark: "#A64620",
  green: "#77B58A",
  border: "#4A3E38",
  red: "#E77D7D",
  yellow: "#E8B85F",
  info: "#7FB2C6",
};

export const today = () => new Date().toISOString().slice(0, 10);
export const monthStart = () => `${today().slice(0, 8)}01`;
export const money = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
export const moneyFine = (n: number) => `₹${(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
