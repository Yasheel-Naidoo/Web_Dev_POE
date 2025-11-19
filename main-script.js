// Select elements
const hamburger = document.getElementById("hamburger");
const navLinksContainer = document.getElementById("nav-links");
const navLinks = document.querySelectorAll(".nav-links a");

// Toggle mobile menu & animate hamburger
hamburger.addEventListener("click", () => {
    navLinksContainer.classList.toggle("show");
    hamburger.classList.toggle("active");
});

// Handle active link highlighting + close menu on click
navLinks.forEach(link => {
    link.addEventListener("click", function () {
        // Remove "active" from all
        navLinks.forEach(nav => nav.classList.remove("active"));
        // Add to clicked one
        this.classList.add("active");

        // ✅ On mobile: close the menu after clicking
        navLinksContainer.classList.remove("show");
        hamburger.classList.remove("active");
    });
});

