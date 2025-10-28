Object.defineProperty(process, 'nextTick', {
  writable: true,
  value: null,
});
