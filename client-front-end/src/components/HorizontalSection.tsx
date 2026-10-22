import { Children, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import SectionHeader from './SectionHeader';

interface HorizontalSectionProps {
  title: string;
  children: ReactNode;
  itemClassName: string;
  linkTo?: string;
  extra?: ReactNode;
}

// Dùng chung cho danh mục, khuyến mãi và sản phẩm. Vuốt được trên điện thoại.
const HorizontalSection = ({ title, children, itemClassName, linkTo, extra }: HorizontalSectionProps) => {
  const id = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });
  const items = Children.toArray(children);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const update = () => {
      const left = viewport.scrollLeft > 2;
      const right = viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 2;
      setCanScroll((previous) => (previous.left === left && previous.right === right ? previous : { left, right }));
    };
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    observer.observe(track);
    viewport.addEventListener('scroll', update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      viewport.removeEventListener('scroll', update);
    };
  }, [items.length]);

  const scroll = (direction: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollBy({
      left: direction * viewport.clientWidth * 0.85,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };

  return (
    <section>
      <SectionHeader title={title} linkTo={linkTo} extra={extra} />
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          className="shrink-0 bg-white shadow-sm"
          shape="circle"
          icon={<LeftOutlined />}
          disabled={!canScroll.left}
          aria-label={`${title}: Cuộn sang trái`}
          aria-controls={id}
          onClick={() => scroll(-1)}
        />
        <div
          id={id}
          ref={viewportRef}
          tabIndex={0}
          role="region"
          aria-label={title}
          className="horizontal-scroll min-w-0 flex-1 overflow-x-auto overscroll-x-contain pb-3"
        >
          <div ref={trackRef} className="flex w-max min-w-full gap-4">
            {items.map((item, index) => (
              <div key={index} className={`shrink-0 ${itemClassName}`}>
                {item}
              </div>
            ))}
          </div>
        </div>
        <Button
          className="shrink-0 bg-white shadow-sm"
          shape="circle"
          icon={<RightOutlined />}
          disabled={!canScroll.right}
          aria-label={`${title}: Cuộn sang phải`}
          aria-controls={id}
          onClick={() => scroll(1)}
        />
      </div>
    </section>
  );
};

export default HorizontalSection;
