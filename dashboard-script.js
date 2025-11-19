// --- GLOBAL VARIABLES ---
const contentDiv = document.getElementById('mainContent');
const cartCountElement = document.getElementById('cartCount');
const viewCartButton = document.getElementById('viewCartBtn');

// SEPARATE TIMERS (Fixes the conflict between Map and Log)
let mapInterval; 
let logInterval;
let threatMap;      
let threatMarker;   

// SESSION STATE
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let isServiceActive = localStorage.getItem('isServiceActive') === 'true'; 
let isSystemRunning = false; // Tracks if the "Start Monitoring" switch is ON

updateCartCount();

// --- 1. AUTHENTICATION & SESSION LOGIC ---
const currentUser = JSON.parse(localStorage.getItem('currentUser'));

if (!currentUser) {
    window.location.href = "index.html";
} else {
    const loginTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    document.getElementById('userWelcome').innerHTML = `
        <div class="user-session-badge">
            <span class="status-dot"></span>
            <span>${currentUser.name}</span>
            <span style="font-size: 10px; color: #ccc;">(Login: ${loginTime})</span>
        </div>
    `;
}

document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('currentUser'); 
    localStorage.removeItem('cart');
    localStorage.removeItem('isServiceActive'); // Reset on logout for demo purposes
    window.location.href = "main.html";   
});

// --- MASTER PRODUCT CATALOG ---
const MASTER_PRODUCTS = [
    { id: 1, name: "AI-Driven WAF", price: 99, desc: "Automated web traffic filtering.", icon: "fa-brain", stock: 10 },
    { id: 2, name: "Threat Intel Feed", price: 49, desc: "Real-time blacklists.", icon: "fa-satellite-dish", stock: 5 }, 
    { id: 3, name: "Cloud Security Posture", price: 79, desc: "Azure/AWS monitoring.", icon: "fa-cloud-arrow-up", stock: 20 },
    { id: 4, name: "Endpoint DLP", price: 65, desc: "Data Loss Prevention.", icon: "fa-laptop-code", stock: 0 }, 
    { id: 5, name: "Managed SIEM", price: 149, desc: "Security Info Management.", icon: "fa-chart-line", stock: 8 },
    { id: 6, name: "Phishing Simulation", price: 35, desc: "Employee testing program.", icon: "fa-envelope-open-text", stock: 15 }
];

// --- SEARCH FUNCTIONALITY ---
function renderProducts(query) {
    const container = document.getElementById('productListContainer');
    if (!container) return;

    const lowerQuery = query ? query.toLowerCase().trim() : '';

    const filteredProducts = MASTER_PRODUCTS.filter(product => {
        if (!lowerQuery) return true;
        const words = product.name.toLowerCase().split(/[\s-]+/);
        return words.some(word => word.startsWith(lowerQuery));
    });

    const productsHtml = filteredProducts.map(product => {
        let stockBadge = product.stock === 0 
            ? '<span class="stock-badge out-stock">Out of Stock</span>' 
            : (product.stock < 6 ? `<span class="stock-badge low-stock">Low Stock: ${product.stock}</span>` : '<span class="stock-badge in-stock">In Stock</span>');
            
        let btnState = product.stock === 0 ? 'disabled' : '';
        let btnText = product.stock === 0 ? 'Unavailable' : `Deploy ($${product.price}/mo)`;

        return `
        <div class="product-item">
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <i class="fas ${product.icon} fa-2x" style="color:#0d3d7f;"></i>
                ${stockBadge}
            </div>
            <h4 style="margin: 10px 0 5px;">${product.name}</h4>
            <p style="font-size:12px; height: 40px;">${product.desc}</p>
            <button onclick="addToCart('${product.name}', ${product.price}, ${product.id})" 
                    class="logout-btn" style="padding:5px 15px; background:#0d3d7f; border-color:#0d3d7f; width:100%;" ${btnState}>
                ${btnText}
            </button>
        </div>`;
    }).join('');

    container.innerHTML = filteredProducts.length > 0 ? productsHtml : '<p style="text-align:center; width:100%; padding: 20px;">No products found.</p>';
}

// --- E-COMMERCE LOGIC ---

function updateCartCount() {
    cartCountElement.innerText = cart.length;
    localStorage.setItem('cart', JSON.stringify(cart));
}

function addToCart(name, price, id) {
    if(isSystemRunning) toggleSystem(); // Stop monitoring if adding to cart

    const product = MASTER_PRODUCTS.find(p => p.id === id);
    if (product && product.stock > 0) {
        product.stock--; 
        cart.push({ name, price, id: Date.now() });
        updateCartCount();
        
        // Refresh view if search is active
        const searchInput = document.getElementById('productSearch');
        if(searchInput) renderProducts(searchInput.value);

        alert(`✅ Added: ${name}`);
    } else {
        alert("❌ Item out of stock.");
    }
}

viewCartButton.addEventListener('click', () => { showSection('cart'); });

function viewCart() {
    if(isSystemRunning) toggleSystem(); // Stop monitoring

    if (cart.length === 0) {
        contentDiv.innerHTML = `<h2><i class="fas fa-shopping-cart"></i> Shopping Cart</h2><p>Your cart is empty.</p>`;
        return;
    }
    const cartItemsHtml = cart.map(item => `<div class="cart-item"><span>${item.name}</span><span>$${item.price}.00</span></div>`).join('');
    const total = cart.reduce((sum, item) => sum + item.price, 0);

    contentDiv.innerHTML = `
        <h2><i class="fas fa-shopping-cart"></i> Shopping Cart</h2>
        <div class="cart-summary">${cartItemsHtml}
            <div class="cart-item" style="font-weight: bold; margin-top: 10px;"><span>TOTAL:</span><span>$${total}.00</span></div>
        </div>
        <button onclick="checkout(${total})" class="logout-btn" style="margin-top: 20px; background: #0d3d7f; border-color: #0d3d7f;">Proceed to Checkout</button>
    `;
}

function checkout(total) {
    const receiptId = 'RCPT-' + Date.now().toString().substring(5);
    const receipt = { id: receiptId, date: new Date().toLocaleDateString(), items: [...cart], total: total };
    
    // ACTIVATE SERVICE ON CHECKOUT
    isServiceActive = true;
    localStorage.setItem('isServiceActive', 'true');

    localStorage.setItem('lastReceipt', JSON.stringify(receipt));
    cart = [];
    updateCartCount();
    showReceipt(receipt);
}

function showReceipt(receipt) {
    const itemsHtml = receipt.items.map(item => `<div class="cart-item"><span>${item.name}</span><span>$${item.price}.00</span></div>`).join('');
    contentDiv.innerHTML = `
        <h2><i class="fas fa-receipt"></i> Deployment Confirmation</h2>
        <div class="receipt-box">
            <p><strong>Deployment ID:</strong> ${receipt.id}</p>
            <p><strong>Date:</strong> ${receipt.date}</p>
            <hr>${itemsHtml}
            <div class="cart-item" style="font-weight: bold; margin-top: 15px; color: #0d3d7f;"><span>GRAND TOTAL:</span><span>$${receipt.total}.00</span></div>
        </div>
        <p style="margin-top: 30px;">Configuration files are being deployed now.</p>
        <button onclick="showSection('tracking')" class="logout-btn" style="background: #FF4B2B; border-color: #FF4B2B;">View Live Deployment Status</button>
    `;
}

// --- RESOURCE CLEANUP (Stops everything safely) ---
function cleanupResources() {
    if (mapInterval) clearInterval(mapInterval);
    if (logInterval) clearInterval(logInterval);
    
    if (threatMap) {
        threatMap.remove();
        threatMap = null;
    }
    isSystemRunning = false;
}

// --- DYNAMIC CONTENT SWITCHER ---
function showSection(section) {
    cleanupResources(); // Stop everything when switching tabs
    contentDiv.classList.add('active');

    if (section === 'tracking') {
        if (!isServiceActive) {
            // LOCKED STATE
            contentDiv.innerHTML = `
                <h2><i class="fas fa-shield-halved"></i> Live Threat Feed</h2>
                <div style="text-align:center; padding: 50px; background: #fff5f5; border: 1px solid #e53e3e; border-radius: 8px;">
                    <i class="fas fa-lock" style="font-size: 50px; color: #e53e3e; margin-bottom: 20px;"></i>
                    <h3 style="color: #c53030;">Service Offline</h3>
                    <p>Please purchase a tool from the catalog to activate.</p>
                    <button onclick="showSection('ordering')" class="logout-btn" style="background: #0d3d7f; border-color: #0d3d7f;">Go to Catalog</button>
                </div>`;
        } else {
            // CONTROL PANEL STATE (Service Ready)
            contentDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h2><i class="fas fa-shield-alt"></i> Threat Operations Center</h2>
                    <button id="sysToggleBtn" onclick="toggleSystem()" class="logout-btn" style="background: #009e60; border-color: #009e60;">
                        <i class="fas fa-power-off"></i> Start Monitoring
                    </button>
                </div>
                <div id="sysStatus" style="background:#eee; padding:10px; border-radius:5px; margin-bottom:20px; text-align:center; font-weight:bold; color:#555;">
                    SYSTEM STANDBY - WAITING FOR COMMAND
                </div>
                <div id="activeMonitorArea" style="display:none;">
                    <h3>Real-Time Asset Location</h3>
                    <div id="realTimeMap"></div> 
                    <h3>Live Security Log</h3>
                    <div id="securityLog" class="threat-log"></div>
                </div>
            `;
        }
    } 
    else if (section === 'ordering') {
        contentDiv.innerHTML = `
            <h2><i class="fas fa-robot"></i> AI Automation Catalog</h2>
            <p>Deploy our machine learning defense tools instantly.</p>
            <div style="position: sticky; top: 0; background: white; padding: 10px 0; z-index: 10;">
                <input type="text" id="productSearch" placeholder="Search catalog..." onkeyup="renderProducts(this.value)" style="width: 100%; padding: 15px; border: 2px solid #0d3d7f; border-radius: 8px; font-size: 16px;">
            </div>
            <div id="productListContainer" class="dashboard-nav" style="gap: 20px; padding-top: 10px;"></div>
        `;
        renderProducts(""); 
    } 
    else if (section === 'services') {
        contentDiv.innerHTML = `
            <h2><i class="fas fa-lock"></i> Premium Security Services</h2>
            <ul style="line-height:2; text-align:left;">
                <li><i class="fas fa-check-circle" style="color:#ffd700;"></i> <strong>Penetration Testing</strong></li>
                <li><i class="fas fa-check-circle" style="color:#ffd700;"></i> <strong>Incident Response</strong></li>
                <li><i class="fas fa-check-circle" style="color:#ffd700;"></i> <strong>SOC Monitoring</strong></li>
            </ul>
        `;
    } 
    else if (section === 'enquiry') {
        contentDiv.innerHTML = `
            <h2><i class="fas fa-clipboard-question"></i> Make an Enquiry</h2>
            <div style="max-width: 600px; margin: 0 auto; text-align: left; background: #f9f9f9; padding: 30px; border-radius: 10px; border: 1px solid #ddd;">
                <form id="dashEnquiryForm" onsubmit="submitEnquiry(event)">
                    <label style="font-weight:bold;">Subject</label>
                    <select id="enqType" style="width: 100%; padding: 10px; margin-bottom: 15px;"><option>Quote</option><option>Support</option></select>
                    <label style="font-weight:bold;">Details</label>
                    <textarea id="enqDetails" rows="5" style="width: 100%; padding: 10px; margin-bottom: 15px;"></textarea>
                    <button type="submit" class="logout-btn" style="width: 100%; background: #0d3d7f; border-color: #0d3d7f;">Send</button>
                </form>
                <div id="enqResponse" style="margin-top: 15px; text-align: center;"></div>
            </div>`;
    }
    else if (section === 'cart') {
        viewCart();
    }
}

// --- SYSTEM TOGGLE LOGIC (Starts Map + Log) ---
function toggleSystem() {
    const btn = document.getElementById('sysToggleBtn');
    const statusDiv = document.getElementById('sysStatus');
    const monitorArea = document.getElementById('activeMonitorArea');

    if (!isSystemRunning) {
        // TURN ON
        isSystemRunning = true;
        btn.innerHTML = '<i class="fas fa-stop-circle"></i> Stop Monitoring';
        btn.style.backgroundColor = '#e53e3e'; // Red
        btn.style.borderColor = '#e53e3e';
        statusDiv.innerHTML = 'SYSTEM ACTIVE - SCANNING NETWORK...';
        statusDiv.style.backgroundColor = '#e6fffa';
        statusDiv.style.color = '#009e60';
        monitorArea.style.display = 'block';

        // Delay ensures HTML is painted before JS runs
        setTimeout(() => {
            const mapDiv = document.getElementById('realTimeMap');
            if (mapDiv) {
                mapDiv.style.height = '400px'; // Force height
                if (window.L) initializeTrackingMap();
            }
            startThreatFeed(); // Start Log
        }, 100);

    } else {
        // TURN OFF
        isSystemRunning = false;
        cleanupResources(); // Kill timers and map
        
        btn.innerHTML = '<i class="fas fa-power-off"></i> Start Monitoring';
        btn.style.backgroundColor = '#009e60'; // Green
        btn.style.borderColor = '#009e60';
        statusDiv.innerHTML = 'SYSTEM STANDBY - WAITING FOR COMMAND';
        statusDiv.style.backgroundColor = '#eee';
        statusDiv.style.color = '#555';
        monitorArea.style.display = 'none';
    }
}

// --- MAP LOGIC ---
function initializeTrackingMap() {
    const defaultCenter = [37.7749, -122.4194]; 
    try {
        if (document.getElementById('realTimeMap')) {
             threatMap = L.map('realTimeMap').setView(defaultCenter, 12);
        }
    } catch (e) {
        if (threatMap) { threatMap.setView(defaultCenter, 12); return; }
    }
    if (!threatMap) return;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(threatMap);

    threatMarker = L.marker(defaultCenter).addTo(threatMap)
        .bindPopup('Primary Security Asset Location').openPopup();

    threatMap.invalidateSize(); 
    simulateThreatMovement();
}

function simulateThreatMovement() {
    let lat = 37.7749;
    let lng = -122.4194;
    if (mapInterval) clearInterval(mapInterval); // Use specific map timer
    
    mapInterval = setInterval(() => {
        lat += (Math.random() - 0.5) * 0.005;
        lng += (Math.random() - 0.5) * 0.005;
        const newPosition = [lat, lng];
        if (threatMarker) { threatMarker.setLatLng(newPosition); threatMap.panTo(newPosition); }
    }, 3000);
}

// --- LOG LOGIC ---
const messages = [
    { text: "Connection attempt from 104.28.2.145 blocked by WAF.", type: "info" },
    { text: "Critical: Multiple failed login attempts on admin panel.", type: "critical" },
    { text: "Warning: High data transfer detected on East server.", type: "warning" },
    { text: "Info: Standard user policy applied.", type: "info" },
    { text: "Blocked: Malware signature detected.", type: "critical" }
];
let logCounter = 0;

function startThreatFeed() {
    const logElement = document.getElementById('securityLog');
    if (!logElement) return;
    
    logElement.innerHTML = `<p class='info'>${new Date().toLocaleTimeString()} - Security system initialized.</p>`;
    
    if (logInterval) clearInterval(logInterval); // Use specific log timer
    
    logInterval = setInterval(() => {
        const messageData = messages[logCounter % messages.length];
        const time = new Date().toLocaleTimeString();
        const logEntry = document.createElement('p');
        
        if (messageData.type === 'critical') logEntry.style.color = '#ff4444';
        if (messageData.type === 'warning') logEntry.style.color = '#ffcc00';
        if (messageData.type === 'info') logEntry.style.color = '#00ff00';

        logEntry.innerHTML = `[${messageData.type.toUpperCase()}] ${time} - ${messageData.text}`;
        logElement.appendChild(logEntry);
        logElement.scrollTop = logElement.scrollHeight;
        logCounter++;
    }, 1800);
}

// --- ENQUIRY FORM ---
function submitEnquiry(e) {
    e.preventDefault(); 
    const type = document.getElementById('enqType').value;
    const responseDiv = document.getElementById('enqResponse');
    const form = document.getElementById('dashEnquiryForm');
    responseDiv.innerText = "Sending request...";
    responseDiv.style.color = "#0d3d7f";
    setTimeout(() => {
        responseDiv.innerHTML = `<i class="fas fa-check-circle"></i> Success! Ticket created.`;
        responseDiv.style.color = "green";
        form.reset();
    }, 1500);
}