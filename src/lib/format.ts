export function money(value: number | null | undefined) {
  const n = Number(value ?? 0);
  return `$${n.toFixed(2).replace(/\.00$/, "")}`;
}

export function moneyExact(value: number | null | undefined) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

export function whatsappLink(message: string, phone = "584121234567") {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
