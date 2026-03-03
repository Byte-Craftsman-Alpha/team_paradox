export function initParticles() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    const canvas = document.getElementById("particles-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!ctx) return;

    const particles = [];
    const linkDistance = 110;
    const linkDistanceSq = linkDistance * linkDistance;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    const targetFrameTime = 1000 / 45;

    let rafId = 0;
    let isPaused = false;
    let lastTs = 0;

    function resize() {
        canvas.width = Math.floor(window.innerWidth * pixelRatio);
        canvas.height = Math.floor(window.innerHeight * pixelRatio);
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }

    resize();

    let resizeTimer;
    window.addEventListener(
        "resize",
        () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(resize, 80);
        },
        { passive: true }
    );

    class Particle {
        constructor() {
            this.x = Math.random() * window.innerWidth;
            this.y = Math.random() * window.innerHeight;
            this.size = Math.random() * 1.5 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.speedY = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random() * 0.4 + 0.1;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.x > window.innerWidth) this.x = 0;
            if (this.x < 0) this.x = window.innerWidth;
            if (this.y > window.innerHeight) this.y = 0;
            if (this.y < 0) this.y = window.innerHeight;
        }

        draw() {
            ctx.fillStyle = `rgba(99, 102, 241, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    const area = window.innerWidth * window.innerHeight;
    const count = Math.min(window.innerWidth < 768 ? 30 : 55, Math.max(20, Math.round(area / 42000)));
    for (let index = 0; index < count; index += 1) {
        particles.push(new Particle());
    }

    function drawConnections() {
        const grid = new Map();
        const cellSize = linkDistance;
        const getKey = (cx, cy) => `${cx},${cy}`;

        particles.forEach((particle, idx) => {
            const cx = Math.floor(particle.x / cellSize);
            const cy = Math.floor(particle.y / cellSize);
            const key = getKey(cx, cy);
            if (!grid.has(key)) grid.set(key, []);
            grid.get(key).push(idx);
        });

        particles.forEach((particle, i) => {
            const cx = Math.floor(particle.x / cellSize);
            const cy = Math.floor(particle.y / cellSize);

            for (let ox = -1; ox <= 1; ox += 1) {
                for (let oy = -1; oy <= 1; oy += 1) {
                    const bucket = grid.get(getKey(cx + ox, cy + oy));
                    if (!bucket) continue;

                    for (let b = 0; b < bucket.length; b += 1) {
                        const j = bucket[b];
                        if (j <= i) continue;

                        const dx = particle.x - particles[j].x;
                        const dy = particle.y - particles[j].y;
                        const distSq = dx * dx + dy * dy;

                        if (distSq < linkDistanceSq) {
                            const opacity = (1 - Math.sqrt(distSq) / linkDistance) * 0.08;
                            ctx.strokeStyle = `rgba(99, 102, 241, ${opacity})`;
                            ctx.lineWidth = 0.5;
                            ctx.beginPath();
                            ctx.moveTo(particle.x, particle.y);
                            ctx.lineTo(particles[j].x, particles[j].y);
                            ctx.stroke();
                        }
                    }
                }
            }
        });
    }

    function animate(ts) {
        if (isPaused) return;

        if (ts - lastTs < targetFrameTime) {
            rafId = requestAnimationFrame(animate);
            return;
        }

        lastTs = ts;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        particles.forEach((particle) => {
            particle.update();
            particle.draw();
        });

        drawConnections();
        rafId = requestAnimationFrame(animate);
    }

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            isPaused = true;
            if (rafId) cancelAnimationFrame(rafId);
        } else {
            isPaused = false;
            lastTs = 0;
            rafId = requestAnimationFrame(animate);
        }
    });

    rafId = requestAnimationFrame(animate);
}

export function initScrollAnimations() {
    const nav = document.querySelector(".nav-glass");
    if (nav) {
        let ticking = false;
        window.addEventListener(
            "scroll",
            () => {
                if (ticking) return;
                ticking = true;
                requestAnimationFrame(() => {
                    nav.style.borderBottomColor = window.scrollY > 50 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)";
                    ticking = false;
                });
            },
            { passive: true }
        );
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = "1";
                    entry.target.style.transform = "translateY(0)";
                }
            });
        },
        { threshold: 0.1 }
    );

    document.querySelectorAll("section").forEach((section) => {
        observer.observe(section);
    });
}

export function initActiveNavLink() {
    const sections = [...document.querySelectorAll("section[id]")];
    const navLinks = [...document.querySelectorAll("nav a[href^='#']")];
    if (sections.length === 0 || navLinks.length === 0) return;

    let sectionOffsets = [];
    let currentActiveId = "";
    let ticking = false;

    const updateOffsets = () => {
        sectionOffsets = sections.map((section) => ({
            id: section.getAttribute("id"),
            top: section.offsetTop - 100
        }));
    };

    const updateActive = () => {
        const y = window.scrollY;
        let current = sectionOffsets[0]?.id || "";

        for (let i = 0; i < sectionOffsets.length; i += 1) {
            if (y >= sectionOffsets[i].top) {
                current = sectionOffsets[i].id;
            }
        }

        if (current === currentActiveId) return;
        currentActiveId = current;

        navLinks.forEach((link) => {
            const isActive = link.getAttribute("href") === `#${current}`;
            link.classList.toggle("text-white", isActive);
            link.classList.toggle("text-gray-400", !isActive);
        });
    };

    updateOffsets();
    updateActive();

    window.addEventListener(
        "scroll",
        () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                updateActive();
                ticking = false;
            });
        },
        { passive: true }
    );
    window.addEventListener("resize", updateOffsets, { passive: true });
    window.addEventListener("load", updateOffsets, { passive: true });
}
