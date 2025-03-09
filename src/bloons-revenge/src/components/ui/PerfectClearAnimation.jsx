import React, { useEffect } from 'react';

const PerfectClearAnimation = ({ onComplete }) => {
  useEffect(() => {
    // Create particle effect
    const particles = [];
    const colors = ['#FFD700', '#00BFFF', '#FF4500', '#7CFC00', '#FF1493'];
    
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        size: 5 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: -5 + Math.random() * 10,
        vy: -5 + Math.random() * 10,
        gravity: 0.1,
        opacity: 1
      });
    }
    
    const canvas = document.getElementById('perfect-clear-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    let animationFrame;
    let startTime = Date.now();
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw text
      const elapsed = Date.now() - startTime;
      const scale = 1 + 0.2 * Math.sin(elapsed / 300);
      
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(scale, scale);
      ctx.font = 'bold 48px Arial';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PERFECT CLEAR!', 0, 0);
      ctx.restore();
      
      // Draw bonus text
      if (elapsed > 1000) {
        ctx.save();
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+200 BONUS!', canvas.width / 2, canvas.height / 2 + 60);
        ctx.restore();
      }
      
      // Update and draw particles
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.opacity -= 0.005;
        
        if (p.opacity > 0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, '0');
          ctx.fill();
        }
      });
      
      if (elapsed < 3000) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        cancelAnimationFrame(animationFrame);
        onComplete();
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [onComplete]);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <canvas 
        id="perfect-clear-canvas" 
        className="absolute inset-0 z-10"
      />
    </div>
  );
};

export default PerfectClearAnimation;