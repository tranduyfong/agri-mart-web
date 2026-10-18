// Bay ảnh / trái tim từ nút vừa bấm đến biểu tượng tương ứng trên thanh điều hướng
export const animateShoppingAction = (source: HTMLElement | null, kind: 'cart' | 'wishlist', imageUrl?: string | null) => {
  if (!source?.isConnected || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const target = Array.from(document.querySelectorAll<HTMLElement>(`[data-shopping-target="${kind}"]`))
    .find((element) => element.getBoundingClientRect().width > 0);
  if (!target) return;
  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const particle = document.createElement('div');
  particle.className = 'shopping-particle';
  particle.style.left = `${from.left + from.width / 2 - 22}px`;
  particle.style.top = `${from.top + from.height / 2 - 22}px`;
  if (imageUrl && kind === 'cart') {
    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = '';
    particle.append(image);
  } else {
    particle.textContent = kind === 'wishlist' ? '♥' : '🛒';
  }
  document.body.append(particle);
  const x = to.left + to.width / 2 - (from.left + from.width / 2);
  const y = to.top + to.height / 2 - (from.top + from.height / 2);
  const animation = particle.animate([
    { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    { transform: `translate(${x * 0.45}px, ${Math.min(y * 0.5, -80)}px) scale(1.15)`, opacity: 1, offset: 0.45 },
    { transform: `translate(${x}px, ${y}px) scale(0.2)`, opacity: 0 },
  ], { duration: 700, easing: 'cubic-bezier(0.2, 0.65, 0.3, 1)' });
  animation.onfinish = () => particle.remove();
  animation.oncancel = () => particle.remove();
};
