export function total(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

export function enabled(config) {
  return config.enabled === true;
}
