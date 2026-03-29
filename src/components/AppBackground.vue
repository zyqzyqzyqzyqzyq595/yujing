<template>
  <canvas ref="bgCanvas" class="particle-canvas"></canvas>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const bgCanvas = ref(null);
let animationFrame = null;

onMounted(() => {
  const canvas = bgCanvas.value;
  const ctx = canvas.getContext('2d');
  let pts = [];

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  window.addEventListener('resize', resize);
  resize();

  // 初始化粒子
  for (let i = 0; i < 90; i++) {
    pts.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5
    });
  }

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pts.forEach(p1 => {
      p1.x += p1.vx;
      p1.y += p1.vy;
      if (p1.x < 0 || p1.x > canvas.width) p1.vx *= -1;
      if (p1.y < 0 || p1.y > canvas.height) p1.vy *= -1;

      ctx.beginPath();
      ctx.arc(p1.x, p1.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(133, 198, 241, 0.4)';
      ctx.fill();

      pts.forEach(p2 => {
        let d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (d < 180) {
          ctx.strokeStyle = `rgba(133, 198, 241, ${0.12 - d / 1500})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      });
    });
    animationFrame = requestAnimationFrame(draw);
  };

  draw();
});

onUnmounted(() => {
  cancelAnimationFrame(animationFrame);
  window.removeEventListener('resize', resize);
});
</script>

<style scoped>
.particle-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
  background: #f4f7fb;
}
</style>