/**
 * Arcade Room Background - animations natives
 * 3 joysticks procéduraux indépendants + parallaxe multi-couches
 * + génération de particules + clignotement aléatoire des boutons.
 * Aucune dépendance externe, aucun Canvas.
 */

(function () {
    'use strict';

    // ============================================================
    // UTILITAIRES
    // ============================================================
    function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    function randRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    // ============================================================
    // GÉNÉRATION DES PARTICULES DE POUSSIÈRE LUMINEUSE
    // ============================================================
    const particlesContainer = document.querySelector('.particles-container');
    const PARTICLE_COUNT = 70;
    const PARTICLE_COLORS = ['', 'magenta', 'purple'];
    const particles = [];

    function createParticles() {
        if (!particlesContainer) return;
        particlesContainer.innerHTML = '';
        particles.length = 0;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const p = document.createElement('div');
            const cls = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
            p.className = 'dust-particle' + (cls ? ' ' + cls : '');

            const size = randRange(2, 5);
            p.style.width = size + 'px';
            p.style.height = size + 'px';

            const x = randRange(0, 100);
            const y = randRange(0, 100);
            p.style.left = x + '%';
            p.style.top = y + '%';

            const duration = randRange(7, 16);
            const delay = randRange(0, 10);
            p.style.animation = `floatParticle ${duration}s ease-in-out ${delay}s infinite`;

            particlesContainer.appendChild(p);
            particles.push({
                el: p,
                baseX: x,
                baseY: y,
                phase: randRange(0, Math.PI * 2),
                speed: randRange(0.2, 0.8)
            });
        }
    }

    function updateParticles(time) {
        particles.forEach(p => {
            const t = time * 0.0003 * p.speed + p.phase;
            const dx = Math.sin(t) * 2;
            const dy = Math.cos(t * 0.7) * 3;
            p.el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
        });
    }

    // ============================================================
    // JOYSTICKS PROCÉDURAUX INDÉPENDANTS
    // ============================================================
    class Joystick {
        constructor(element) {
            this.stick = element;
            this.tiltX = 0;
            this.tiltY = 0;
            this.targetX = 0;
            this.targetY = 0;
            this.speed = randRange(0.07, 0.14);
            this.timer = 0;
            this.nextChange = 0;
            this.maxTilt = randRange(12, 20);
            this.pickTarget();
        }

        pickTarget() {
            // 30% de chance de revenir au centre (pause / idle)
            if (Math.random() < 0.3) {
                this.targetX = 0;
                this.targetY = 0;
                this.nextChange = randRange(300, 900);
            } else {
                const angle = Math.random() * Math.PI * 2;
                const intensity = Math.random() * 0.7 + 0.3;
                this.targetX = Math.cos(angle) * this.maxTilt * intensity;
                this.targetY = Math.sin(angle) * this.maxTilt * intensity;
                this.nextChange = randRange(120, 450);
            }
        }

        update(dt) {
            this.timer += dt;
            if (this.timer >= this.nextChange) {
                this.timer = 0;
                this.pickTarget();
            }

            this.tiltX += (this.targetX - this.tiltX) * this.speed;
            this.tiltY += (this.targetY - this.tiltY) * this.speed;

            this.stick.style.transform =
                `translate(-50%, -100%) translateZ(4px) ` +
                `rotateX(${(-this.tiltY).toFixed(2)}deg) rotateY(${this.tiltX.toFixed(2)}deg)`;
        }
    }

    const joysticks = Array.from(document.querySelectorAll('.joystick-stick')).map(
        stick => new Joystick(stick)
    );

    // ============================================================
    // CLIGNOTEMENT ALÉATOIRE DES BOUTONS (en plus du CSS)
    // ============================================================
    function randomizeButtons() {
        document.querySelectorAll('.arcade-button').forEach(btn => {
            if (Math.random() < 0.15) {
                btn.style.opacity = randRange(0.7, 1).toFixed(2);
            }
        });
        setTimeout(randomizeButtons, randRange(200, 600));
    }

    // ============================================================
    // PARALLAXE SOURIS MULTI-COUCHES
    // ============================================================
    const cabinets = document.querySelectorAll('.arcade-cabinet');
    const backWall = document.querySelector('.room-back-wall');
    const roomFloor = document.querySelector('.room-floor');
    const ceiling = document.querySelector('.room-ceiling');

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    document.addEventListener('mousemove', (e) => {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        targetX = (e.clientX - cx) / cx; // -1 à 1
        targetY = (e.clientY - cy) / cy; // -1 à 1
    }, { passive: true });

    function getCabinetBaseTransform(cabinet) {
        if (cabinet.classList.contains('cabinet-left')) {
            return { rotX: 6, rotY: 14, transY: 0, transZ: -30 };
        }
        if (cabinet.classList.contains('cabinet-right')) {
            return { rotX: 6, rotY: -14, transY: 0, transZ: -30 };
        }
        return { rotX: 4, rotY: 0, transY: 0, transZ: 60 };
    }

    function updateParallax() {
        currentX += (targetX - currentX) * 0.05;
        currentY += (targetY - currentY) * 0.05;

        // Couches lointaines : mur, sol, plafond bougent peu
        if (backWall) {
            backWall.style.transform = `translateZ(-350px) translateX(${-currentX * 8}px) translateY(${-currentY * 4}px)`;
        }
        if (roomFloor) {
            roomFloor.style.transform = `rotateX(65deg) translateZ(-20px) translateX(${-currentX * 15}px)`;
        }
        if (ceiling) {
            ceiling.style.transform = `rotateX(20deg) translateZ(-200px) translateX(${-currentX * 10}px)`;
        }

        // Bornes : parallaxe différenciée (latérales bougent plus)
        cabinets.forEach((cabinet) => {
            const factor = parseFloat(cabinet.dataset.parallax) || 0.03;
            const base = getCabinetBaseTransform(cabinet);
            const depth = parseFloat(cabinet.dataset.depth) || 1;

            const rotY = base.rotY + currentX * (factor * 250);
            const rotX = base.rotX - currentY * (factor * 120);
            const transX = -50 + currentX * (factor * -15);
            const transZ = base.transZ;

            cabinet.style.transform =
                `translateX(${transX.toFixed(2)}%) ` +
                `rotateX(${rotX.toFixed(2)}deg) ` +
                `rotateY(${rotY.toFixed(2)}deg) ` +
                `translateZ(${transZ * depth}px)`;
        });
    }

    // ============================================================
    // BOUCLE PRINCIPALE
    // ============================================================
    let lastTime = 0;

    function loop(timestamp) {
        const dt = timestamp - lastTime;
        lastTime = timestamp;

        updateParallax();
        joysticks.forEach(j => j.update(dt));
        updateParticles(timestamp);

        requestAnimationFrame(loop);
    }

    // Démarrage
    createParticles();
    randomizeButtons();
    requestAnimationFrame(loop);
})();
