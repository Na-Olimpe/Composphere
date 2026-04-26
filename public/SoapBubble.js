import * as THREE from 'three';

const snoiseChunk = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}
`;

function createBubbleMaterial(seed) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uOpacity: { value: 1.0 },
            uSeed: { value: seed },
            uCpuLoad: { value: 0.0 },
            uAlertsActive: { value: 1.0 },
            uNightMode: { value: 0.0 }
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide, // Render both sides for a thicker "aquarium" glass effect
        vertexShader: `
            uniform float uTime;
            uniform float uSeed;
            uniform float uCpuLoad;
            uniform float uAlertsActive;
            uniform float uNightMode;
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            varying vec3 vLocalPosition;
            
            ${snoiseChunk}

            void main() {
                vLocalPosition = position;
                float speed = 0.4 + uCpuLoad * 1.5;
                float t = uTime * speed + uSeed;
                float noise = snoise(vec3(position.x * 1.5 + t, position.y * 1.5 - t * 0.5, position.z * 1.5 + t * 0.8));
                float distortion = noise * (0.035 + uCpuLoad * 0.08); 
                float criticalJitter = smoothstep(0.8, 1.1, uCpuLoad) * (sin(uTime * 20.0) * 0.045) * uAlertsActive;
                vec3 displaced = position + normal * (distortion + criticalJitter);
                vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                vViewPosition = -mvPosition.xyz;
                vNormal = normalMatrix * normal;
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform float uOpacity;
            uniform float uSeed;
            uniform float uCpuLoad;
            uniform float uAlertsActive;
            uniform float uNightMode;
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            varying vec3 vLocalPosition;

            ${snoiseChunk}

            vec3 palette( in float t ) {
                vec3 a = vec3(0.5, 0.5, 0.5);
                vec3 b = vec3(0.5, 0.5, 0.5);
                vec3 c = vec3(1.0, 1.0, 1.0);
                vec3 d = vec3(0.00, 0.33, 0.67);
                return a + b * cos( 6.28318 * (c * t + d) );
            }

            void main() {
                vec3 normal = normalize(vNormal);
                vec3 viewDir = normalize(vViewPosition);
                float dotNV = abs(dot(normal, viewDir));
                float fresnel = 1.0 - dotNV;
                float swirlSpeed = 0.1 + uCpuLoad * 0.3;
                float swirl = snoise(vec3(vLocalPosition.x * 1.0, vLocalPosition.y * 1.0 + uTime * swirlSpeed + uSeed, vLocalPosition.z * 1.0 - uTime * (swirlSpeed*0.5) + uSeed));
                float colorT = fract(uSeed) + dotNV * 0.8 + swirl * 0.5 + uTime * 0.1;
                vec3 color = palette(colorT);
                vec3 glassBase = vec3(0.9, 0.95, 1.0);
                float colorIntensity = mix(0.1, 1.0, pow(fresnel, 1.5));
                color = mix(glassBase, color, colorIntensity);
                color = mix(color, vec3(0.2, 0.4, 0.8), pow(fresnel, 5.0) * 0.4);

                vec3 alarmColor = vec3(1.0, 0.1, 0.0);
                float alarmFactor = smoothstep(0.7, 1.0, uCpuLoad); 
                float alarmMix = clamp(uCpuLoad * 0.5 + alarmFactor * 0.5, 0.0, 1.0) * uAlertsActive; 
                
                color = mix(color, alarmColor, alarmMix * pow(fresnel, 0.4)); 
                
                vec3 light1 = normalize(vec3(1.0, 1.0, 0.5));
                vec3 light2 = normalize(vec3(-1.0, 0.5, 1.0));
                vec3 refl = reflect(-viewDir, normal);
                
                float spec1 = pow(max(dot(refl, light1), 0.0), 100.0);
                float spec2 = pow(max(dot(refl, light2), 0.0), 80.0);
                
                color += vec3(1.0) * (spec1 + spec2 * 0.8);
                
                float alpha = mix(0.35, 0.20, pow(fresnel, 2.0));
                alpha += clamp(swirl * colorIntensity * 0.4, 0.0, 0.5);
                alpha += spec1 + spec2;
                
                // Deep Sea Mode: Intensify glow and neon effect
                if (uNightMode > 0.5) {
                    color = mix(color, palette(colorT * 1.5), 0.4); // More vivid colors
                    color += palette(colorT) * pow(fresnel, 3.0) * 0.8; // Neon rim light
                    alpha += pow(fresnel, 2.0) * 0.4; // Thicker atmosphere
                }

                // Make bubble slightly more opaque during alerts
                float masterAlpha = 0.6 + alarmMix * 0.2; 
                
                float finalAlpha = clamp(alpha, 0.0, 1.0) * masterAlpha * uOpacity;

                // Only glass here, liquid is rendered as a separate internal mesh
                gl_FragColor = vec4(color, finalAlpha);
            }
        `
    });
}

function createLiquidMaterial(seed) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uRamLoad: { value: 0.0 }, // 0.0 to 1.0
            uOpacity: { value: 1.0 },
            uNightMode: { value: 0.0 }
        },
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide, // Render only front side of water for cleaner look
        vertexShader: `
            uniform float uTime;
            varying vec3 vLocalPosition;
            varying vec3 vNormal;
            varying vec3 vViewPosition;

            void main() {
                vLocalPosition = position;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vViewPosition = -mvPosition.xyz;
                vNormal = normalMatrix * normal;
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform float uRamLoad;
            uniform float uOpacity;
            uniform float uNightMode;
            varying vec3 vLocalPosition;
            varying vec3 vNormal;
            varying vec3 vViewPosition;

            void main() {
                // Sphere radius is 1.0. Map 0-1 load to -1.0 to 1.0 vertical height.
                float level = -1.0 + (uRamLoad * 2.0);
                
                // Soft, pleasant waves
                float wave1 = sin(vLocalPosition.x * 5.0 + uTime * 2.5) * 0.02;
                float wave2 = cos(vLocalPosition.z * 5.0 + uTime * 1.8) * 0.02;
                float totalWave = wave1 + wave2;
                
                // Water level with waves
                float surfaceY = level + totalWave;
                
                // Discard pixels above the water surface
                if (vLocalPosition.y > surfaceY) discard;

                // Water colors (deep vs surface)
                vec3 waterDeep = vec3(0.0, 0.4, 0.8);
                vec3 waterSurface = vec3(0.3, 0.85, 1.0);
                
                // Smooth gradient across the whole depth
                float h = smoothstep(-1.0, surfaceY, vLocalPosition.y);
                vec3 color = mix(waterDeep, waterSurface, h);

                // Foam/Highlights at the water meniscus
                float edge = smoothstep(surfaceY - 0.04, surfaceY, vLocalPosition.y);

                // Deep Sea Mode water glow
                if (uNightMode > 0.5) {
                    color = mix(color, vec3(0.0, 0.05, 0.2), 0.6); // Darken deep water
                    color += vec3(0.0, 0.4, 0.8) * edge * 0.5; // Glowing surface meniscus
                }
                
                color = mix(color, vec3(0.9, 0.95, 1.0), edge);

                // Fresnel effect for volumetric edges
                vec3 normal = normalize(vNormal);
                vec3 viewDir = normalize(vViewPosition);
                float fresnel = 1.0 - abs(dot(normal, viewDir));

                // Intensify water color on edges
                color += vec3(0.1, 0.3, 0.5) * pow(fresnel, 3.0);

                // Base alpha is translucent, surface is thicker
                float baseAlpha = mix(0.35, 0.8, edge); 
                
                // Slow fade out when memory is extremely low
                float volumeAlpha = smoothstep(0.0, 0.05, uRamLoad);
                
                float finalAlpha = (baseAlpha + fresnel * 0.15) * volumeAlpha;

                // Discard artifacts at the very bottom
                if (uRamLoad < 0.02) discard;

                gl_FragColor = vec4(color, clamp(finalAlpha, 0.0, 1.0) * uOpacity);
            }
        `
    });
}

export class Bubble {
    constructor(container, env) {
        this.env = env;
        this.radius = 60;
        this.x = this.radius + Math.random() * (this.env.canvas.width - this.radius * 2);
        this.y = this.radius + Math.random() * (this.env.canvas.height - this.radius * 2);
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;

        this.isPoping = false;
        this.popProgress = 0.0;
        this.particles = [];
        this.isDragged = false;

        this.updateData(container);

        let seed = Math.random() * 1000.0;
        // Bubble shell (glass)
        this.material = createBubbleMaterial(seed);
        this.mesh = new THREE.Mesh(this.env.geometry, this.material);

        // Inner liquid volume
        this.liquidMaterial = createLiquidMaterial(seed);
        this.liquidMesh = new THREE.Mesh(this.env.geometry, this.liquidMaterial);
        this.liquidMesh.scale.set(0.96, 0.96, 0.96); // Slightly smaller to prevent Z-fighting

        this.mesh.rotation.y = Math.random() * Math.PI * 2;
        this.mesh.rotation.z = Math.random() * Math.PI * 2;

        this.env.scene.add(this.mesh);
        this.env.scene.add(this.liquidMesh);
    }

    updateData(c) {
        this.id = c.Id;
        this.name = c.Names && c.Names[0] ? c.Names[0].replace('/', '') : 'Unknown';
        this.state = c.State;
        this.cpu = c.cpu_usage || '0%';
        this.networks = c.network_list || [];
        this.netSpeed = c.net_speed || 0;
        this.composeProject = c.compose_project || null;

        if (this.composeProject === 'composphere') {
            if (this.name.endsWith('-app')) this.name = 'Dashboard';
            else if (this.name.endsWith('-worker')) this.name = 'Engine';
        }

        if (c.ram_stats) {
            this.ramPercent = parseFloat(c.ram_stats.percent) || 0;
        } else {
            this.ramPercent = 0;
        }
    }

    draw() {
        let cpuValue = parseFloat(this.cpu) || 0;
        let activeCpu = this.alertsEnabled === false ? 0 : cpuValue; // Ignore CPU visual load if alerts are disabled
        let baseR = 60 + (activeCpu * 0.8);

        if (this.isPoping) {
            baseR += this.popProgress * 40;
        }
        this.radius = baseR;

        const posX = this.x - window.innerWidth / 2;
        const posY = -(this.y - window.innerHeight / 2);

        this.mesh.position.set(posX, posY, 0);
        this.mesh.scale.set(this.radius, this.radius, this.radius);

        this.liquidMesh.position.set(posX, posY, 0);
        this.liquidMesh.scale.set(this.radius * 0.96, this.radius * 0.96, this.radius * 0.96);

        let globalAlpha = 1.0;
        if (this.isPoping) {
            globalAlpha = Math.max(0, 1.0 - this.popProgress);
            this.drawPopParticles();
        }

        this.material.uniforms.uOpacity.value = globalAlpha;
        this.liquidMaterial.uniforms.uOpacity.value = globalAlpha;

        this.env.ctx.save();
        this.env.ctx.translate(this.x, this.y);
        this.env.ctx.fillStyle = `rgba(30, 30, 30, ${0.9 * globalAlpha})`;
        this.env.ctx.font = 'bold 12px sans-serif';
        this.env.ctx.textAlign = 'center';
        this.env.ctx.shadowColor = `rgba(255, 255, 255, ${0.9 * globalAlpha})`;
        this.env.ctx.shadowBlur = 4;
        this.env.ctx.fillText(this.name, 0, -2);
        this.env.ctx.font = 'bold 10px sans-serif';
        this.env.ctx.fillStyle = this.state === 'running' ? `rgba(200, 30, 30, ${globalAlpha})` : `rgba(150, 150, 150, ${globalAlpha})`;
        this.env.ctx.fillText(this.cpu, 0, 14);
        this.env.ctx.restore();
    }

    drawPopParticles() {
        if (this.particles.length === 0 && this.popProgress < 0.2) {
            for (let i = 0; i < 20; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 5;
                this.particles.push({
                    x: 0, y: 0,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 2 + Math.random() * 4,
                    alpha: 1.0
                });
            }
        }

        this.env.ctx.save();
        this.env.ctx.translate(this.x, this.y);
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha *= 0.92;
            this.env.ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
            this.env.ctx.beginPath();
            this.env.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.env.ctx.fill();
            this.env.ctx.shadowColor = "rgba(135, 206, 235, 0.8)";
            this.env.ctx.shadowBlur = 10;
        });
        this.env.ctx.restore();
    }

    update(elapsedTime, bubbles, settings) {
        if (settings) {
            this.alertsEnabled = settings.alertsEnabled;
            this.material.uniforms.uNightMode.value = settings.nightModeEnabled ? 1.0 : 0.0;
            this.liquidMaterial.uniforms.uNightMode.value = settings.nightModeEnabled ? 1.0 : 0.0;
        }

        this.material.uniforms.uTime.value = elapsedTime;
        this.material.uniforms.uAlertsActive.value = this.alertsEnabled ? 1.0 : 0.0;

        // Toggle liquid visibility via settings
        if (settings && settings.liquidEnabled !== undefined) {
            this.liquidMesh.visible = settings.liquidEnabled;
        }

        this.liquidMaterial.uniforms.uTime.value = elapsedTime;
        this.liquidMaterial.uniforms.uRamLoad.value = Math.min(this.ramPercent / 100.0, 1.0);

        let cpuValue = parseFloat(this.cpu) || 0;
        let activeCpu = this.alertsEnabled === false ? 0 : cpuValue;
        this.material.uniforms.uCpuLoad.value = Math.min(activeCpu / 100.0, 1.0);

        if (this.isPoping) {
            this.popProgress += 0.08;
            if (this.popProgress >= 1.0) {
                this.env.scene.remove(this.mesh);
                this.env.scene.remove(this.liquidMesh);
                this.material.dispose();
                this.liquidMaterial.dispose();
                return true;
            }
            return false;
        }

        if (this.isDragged) return false;

        this.x += this.vx;
        this.y += this.vy;

        let speedSq = this.vx * this.vx + this.vy * this.vy;
        if (speedSq > 5) {
            this.vx *= 0.96;
            this.vy *= 0.96;
        } else if (speedSq < 0.2) {
            this.vx += (Math.random() - 0.5) * 0.1;
            this.vy += (Math.random() - 0.5) * 0.1;
        }

        if (this.x + this.radius > this.env.canvas.width) {
            this.x = this.env.canvas.width - this.radius;
            this.vx *= -1;
        } else if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx *= -1;
        }

        if (this.y + this.radius > this.env.canvas.height) {
            this.y = this.env.canvas.height - this.radius;
            this.vy *= -1;
        } else if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.vy *= -1;
        }

        bubbles.forEach(other => {
            if (other === this || this.isPoping || other.isPoping) return;
            let dx = other.x - this.x;
            let dy = other.y - this.y;
            let distance = Math.hypot(dx, dy);
            let minDist = this.radius + other.radius;

            if (distance < minDist) {
                let overlap = minDist - distance;
                let nx = dx / distance;
                let ny = dy / distance;
                this.x -= nx * (overlap / 2);
                this.y -= ny * (overlap / 2);
                other.x += nx * (overlap / 2);
                other.y += ny * (overlap / 2);
                let tx = -ny;
                let ty = nx;
                let v1n = this.vx * nx + this.vy * ny;
                let v1t = this.vx * tx + this.vy * ty;
                let v2n = other.vx * nx + other.vy * ny;
                let v2t = other.vx * tx + other.vy * ty;
                if (v1n - v2n < 0) return;
                let m1 = this.radius * this.radius;
                let m2 = other.radius * other.radius;
                let v1nAfter = (v1n * (m1 - m2) + 2 * m2 * v2n) / (m1 + m2);
                let v2nAfter = (v2n * (m2 - m1) + 2 * m1 * v1n) / (m1 + m2);
                this.vx = v1nAfter * nx + v1t * tx;
                this.vy = v1nAfter * ny + v1t * ty;
                other.vx = v2nAfter * nx + v2t * tx;
                other.vy = v2nAfter * ny + v2t * ty;
            }
        });

        if (this.composeProject && !this.isDragged) {
            bubbles.forEach(other => {
                if (other === this || !other.composeProject || other.composeProject !== this.composeProject || other.isPoping) return;
                let dx = other.x - this.x;
                let dy = other.y - this.y;
                let distance = Math.hypot(dx, dy);
                let targetDist = (this.radius + other.radius) * 1.8;
                if (distance > targetDist) {
                    let forceMag = Math.min((distance - targetDist) * 0.001, 0.3);
                    this.vx += (dx / distance) * forceMag;
                    this.vy += (dy / distance) * forceMag;
                }
            });
        }
        return false;
    }
}
