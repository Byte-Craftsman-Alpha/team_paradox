export function initParticles() {
    const canvas = document.getElementById("particles-canvas");
    const ctx = canvas.getContext("2d");
    const particles = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener("resize", resize);

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 1.5 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.speedY = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random() * 0.4 + 0.1;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.x > canvas.width) this.x = 0;
            if (this.x < 0) this.x = canvas.width;
            if (this.y > canvas.height) this.y = 0;
            if (this.y < 0) this.y = canvas.height;
        }

        draw() {
            ctx.fillStyle = `rgba(99, 102, 241, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    const count = window.innerWidth < 768 ? 40 : 80;
    for (let index = 0; index < count; index += 1) {
        particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach((particle) => {
            particle.update();
            particle.draw();
        });

        for (let i = 0; i < particles.length; i += 1) {
            for (let j = i + 1; j < particles.length; j += 1) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 120) {
                    const opacity = (1 - dist / 120) * 0.08;
                    ctx.strokeStyle = `rgba(99, 102, 241, ${opacity})`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(animate);
    }

    animate();
}

export function initScrollAnimations() {
    const nav = document.querySelector(".nav-glass");
    window.addEventListener("scroll", () => {
        nav.style.borderBottomColor = window.scrollY > 50 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)";
    });

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
    window.addEventListener("scroll", () => {
        const sections = document.querySelectorAll("section");
        const navLinks = document.querySelectorAll("nav a[href^='#']");
        let current = "";

        sections.forEach((section) => {
            const sectionTop = section.offsetTop - 100;
            if (window.scrollY >= sectionTop) {
                current = section.getAttribute("id");
            }
        });

        navLinks.forEach((link) => {
            link.classList.remove("text-white");
            link.classList.add("text-gray-400");
            if (link.getAttribute("href") === `#${current}`) {
                link.classList.remove("text-gray-400");
                link.classList.add("text-white");
            }
        });
    });
}

