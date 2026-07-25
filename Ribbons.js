import { Renderer, Transform, Vec3, Color, Polyline } from 'https://esm.sh/ogl';

export default class Ribbons {
  constructor(container, options = {}) {
    this.container = container;
    if (!this.container) return;

    // Default options from React Bits component
    this.colors = options.colors || ['#FC8EAC'];
    this.baseSpring = options.baseSpring !== undefined ? options.baseSpring : 0.03;
    this.baseFriction = options.baseFriction !== undefined ? options.baseFriction : 0.9;
    this.baseThickness = options.baseThickness !== undefined ? options.baseThickness : 30;
    this.offsetFactor = options.offsetFactor !== undefined ? options.offsetFactor : 0.05;
    this.maxAge = options.maxAge !== undefined ? options.maxAge : 500;
    this.pointCount = options.pointCount !== undefined ? options.pointCount : 50;
    this.speedMultiplier = options.speedMultiplier !== undefined ? options.speedMultiplier : 0.6;
    this.enableFade = options.enableFade !== undefined ? options.enableFade : false;
    this.enableShaderEffect = options.enableShaderEffect !== undefined ? options.enableShaderEffect : false;
    this.effectAmplitude = options.effectAmplitude !== undefined ? options.effectAmplitude : 2;
    this.backgroundColor = options.backgroundColor || [0, 0, 0, 0];

    this.renderer = null;
    this.gl = null;
    this.scene = null;
    this.lines = [];
    this.mouse = new Vec3();
    this.frameId = null;
    this.lastTime = performance.now();

    // Bind event handlers
    this.resize = this.resize.bind(this);
    this.updateMouse = this.updateMouse.bind(this);
    this.update = this.update.bind(this);

    this.init();
  }

  init() {
    this.renderer = new Renderer({ dpr: window.devicePixelRatio || 2, alpha: true });
    this.gl = this.renderer.gl;

    if (Array.isArray(this.backgroundColor) && this.backgroundColor.length === 4) {
      this.gl.clearColor(this.backgroundColor[0], this.backgroundColor[1], this.backgroundColor[2], this.backgroundColor[3]);
    } else {
      this.gl.clearColor(0, 0, 0, 0);
    }

    this.gl.canvas.style.position = 'absolute';
    this.gl.canvas.style.top = '0';
    this.gl.canvas.style.left = '0';
    this.gl.canvas.style.width = '100%';
    this.gl.canvas.style.height = '100%';
    this.gl.canvas.style.pointerEvents = 'none'; // so click events pass through
    this.container.appendChild(this.gl.canvas);

    this.scene = new Transform();

    const vertex = `
      precision highp float;
      
      attribute vec3 position;
      attribute vec3 next;
      attribute vec3 prev;
      attribute vec2 uv;
      attribute float side;
      
      uniform vec2 uResolution;
      uniform float uDPR;
      uniform float uThickness;
      uniform float uTime;
      uniform float uEnableShaderEffect;
      uniform float uEffectAmplitude;
      
      varying vec2 vUV;
      
      vec4 getPosition() {
          vec4 current = vec4(position, 1.0);
          vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
          vec2 nextScreen = next.xy * aspect;
          vec2 prevScreen = prev.xy * aspect;
          vec2 tangent = normalize(nextScreen - prevScreen);
          vec2 normal = vec2(-tangent.y, tangent.x);
          normal /= aspect;
          normal *= mix(1.0, 0.1, pow(abs(uv.y - 0.5) * 2.0, 2.0));
          float dist = length(nextScreen - prevScreen);
          normal *= smoothstep(0.0, 0.02, dist);
          float pixelWidthRatio = 1.0 / (uResolution.y / uDPR);
          float pixelWidth = current.w * pixelWidthRatio;
          normal *= pixelWidth * uThickness;
          current.xy -= normal * side;
          if(uEnableShaderEffect > 0.5) {
            current.xy += normal * sin(uTime + current.x * 10.0) * uEffectAmplitude;
          }
          return current;
      }
      
      void main() {
          vUV = uv;
          gl_Position = getPosition();
      }
    `;

    const fragment = `
      precision highp float;
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uEnableFade;
      varying vec2 vUV;
      void main() {
          float fadeFactor = 1.0;
          if(uEnableFade > 0.5) {
              fadeFactor = 1.0 - smoothstep(0.0, 1.0, vUV.y);
          }
          gl_FragColor = vec4(uColor, uOpacity * fadeFactor);
      }
    `;

    const center = (this.colors.length - 1) / 2;
    this.colors.forEach((color, index) => {
      const spring = this.baseSpring + (Math.random() - 0.5) * 0.05;
      const friction = this.baseFriction + (Math.random() - 0.5) * 0.05;
      const thickness = this.baseThickness + (Math.random() - 0.5) * 3;
      const mouseOffset = new Vec3(
        (index - center) * this.offsetFactor + (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.1,
        0
      );

      const line = {
        spring,
        friction,
        mouseVelocity: new Vec3(),
        mouseOffset
      };

      const count = this.pointCount;
      const points = [];
      for (let i = 0; i < count; i++) {
        points.push(new Vec3());
      }
      line.points = points;

      line.polyline = new Polyline(this.gl, {
        points,
        vertex,
        fragment,
        uniforms: {
          uColor: { value: new Color(color) },
          uThickness: { value: thickness },
          uOpacity: { value: 1.0 },
          uTime: { value: 0.0 },
          uEnableShaderEffect: { value: this.enableShaderEffect ? 1.0 : 0.0 },
          uEffectAmplitude: { value: this.effectAmplitude },
          uEnableFade: { value: this.enableFade ? 1.0 : 0.0 }
        }
      });
      line.polyline.mesh.setParent(this.scene);
      this.lines.push(line);
    });

    window.addEventListener('resize', this.resize);
    this.resize();

    // Mouse/Touch events listen on the whole window
    window.addEventListener('mousemove', this.updateMouse);
    window.addEventListener('touchstart', this.updateMouse);
    window.addEventListener('touchmove', this.updateMouse, { passive: true });

    this.lastTime = performance.now();
    this.update();
  }

  resize() {
    if (!this.container || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.renderer.setSize(width, height);
    this.lines.forEach(line => line.polyline.resize());
  }

  updateMouse(e) {
    if (!this.container) return;
    let x, y;
    const rect = this.container.getBoundingClientRect();
    if (e.changedTouches && e.changedTouches.length) {
      x = e.changedTouches[0].clientX - rect.left;
      y = e.changedTouches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.mouse.set((x / width) * 2 - 1, (y / height) * -2 + 1, 0);
  }

  update() {
    this.frameId = requestAnimationFrame(this.update);
    const currentTime = performance.now();
    const dt = currentTime - this.lastTime;
    this.lastTime = currentTime;

    const tmp = new Vec3();

    this.lines.forEach(line => {
      tmp.copy(this.mouse).add(line.mouseOffset).sub(line.points[0]).multiply(line.spring);
      line.mouseVelocity.add(tmp).multiply(line.friction);
      line.points[0].add(line.mouseVelocity);

      for (let i = 1; i < line.points.length; i++) {
        if (isFinite(this.maxAge) && this.maxAge > 0) {
          const segmentDelay = this.maxAge / (line.points.length - 1);
          const alpha = Math.min(1, (dt * this.speedMultiplier) / segmentDelay);
          line.points[i].lerp(line.points[i - 1], alpha);
        } else {
          line.points[i].lerp(line.points[i - 1], 0.9);
        }
      }
      if (line.polyline.mesh.program.uniforms.uTime) {
        line.polyline.mesh.program.uniforms.uTime.value = currentTime * 0.001;
      }
      line.polyline.updateGeometry();
    });

    if (this.renderer && this.scene) {
      this.renderer.render({ scene: this.scene });
    }
  }

  destroy() {
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('mousemove', this.updateMouse);
    window.removeEventListener('touchstart', this.updateMouse);
    window.removeEventListener('touchmove', this.updateMouse);
    
    if (this.container) {
      if (this.gl && this.gl.canvas && this.gl.canvas.parentNode === this.container) {
        this.container.removeChild(this.gl.canvas);
      }
    }
    cancelAnimationFrame(this.frameId);
  }
}
