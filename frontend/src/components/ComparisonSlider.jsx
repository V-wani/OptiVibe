import React, { useState, useRef, useEffect } from 'react';
import { ChevronsLeftRight } from 'lucide-react';

const ComparisonSlider = ({ before, after }) => {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef(null);

  const handleMove = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  const onMouseMove = (e) => handleMove(e.clientX);
  const onTouchMove = (e) => handleMove(e.touches[0].clientX);

  return (
    <div 
      ref={containerRef}
      className="comparison-container"
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
    >
      {/* Background (After) */}
      <div 
        className="comparison-image after-image" 
        style={{ backgroundImage: `url(${after})` }} 
      />
      
      {/* Foreground (Before) with Clip */}
      <div 
        className="comparison-image before-image" 
        style={{ 
          backgroundImage: `url(${before})`,
          clipPath: `inset(0 ${100 - sliderPos}% 0 0)`
        }} 
      />
      
      <div 
        className="slider-handle" 
        style={{ left: `${sliderPos}%` }}
      >
        <div className="handle-circle">
          <ChevronsLeftRight size={20} />
        </div>
      </div>

      <span className="comparison-label label-before">Original</span>
      <span className="comparison-label label-after">Optimized</span>
    </div>
  );
};

export default ComparisonSlider;
