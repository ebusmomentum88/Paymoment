const API_BASE_URL = "https://paymomentbackend.onrender.com/api";
const PAYSTACK_PUBLIC_KEY = "pk_live_6285198feb88d1bf9515732e6eea990012a8344e";

let authToken = localStorage.getItem("Paymoment_token");
let currentUser = JSON.parse(localStorage.getItem("Paymoment_user")) || null;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  updateNavbar();
  if(authToken && currentUser){
    showDashboard();
    loadUserData();
  } else {
    showAuth();
  }
  setupEventListeners();
  loadNews();
});

// Navbar update
function updateNavbar(){
  const authSection = document.getElementById("auth-section");
  if(authToken && currentUser){
    authSection.innerHTML = `
      <span>👋 Hi, ${currentUser.name}</span>
      <button id="logoutBtn" class="btn-secondary">Sign Out</button>
    `;
    document.getElementById("logoutBtn").addEventListener("click", handleLogout);
  } else {
    authSection.innerHTML = `<a href="#" id="showLogin">Login</a>`;
    document.getElementById("showLogin")?.addEventListener("click", e => { e.preventDefault(); showAuth(); });
  }
}

// Views
function showAuth(){ document.getElementById("authContainer").style.display="flex"; document.getElementById("dashboard").style.display="none"; }
function showDashboard(){ document.getElementById("authContainer").style.display="none"; document.getElementById("dashboard").style.display="block"; }
function showSignup(){ document.getElementById("loginCard").style.display="none"; document.getElementById("signupCard").style.display="block"; }
function showLogin(){ document.getElementById("signupCard").style.display="none"; document.getElementById("loginCard").style.display="block"; }

// Event listeners
function setupEventListeners(){
  document.getElementById("showSignup")?.addEventListener("click", e=>{e.preventDefault(); showSignup();});
  document.getElementById("showLogin")?.addEventListener("click", e=>{e.preventDefault(); showLogin();});
  document.getElementById("signupForm")?.addEventListener("submit", handleSignup);
  document.getElementById("loginForm")?.addEventListener("submit", handleLogin);
  document.getElementById("depositBtn")?.addEventListener("click", ()=>document.getElementById("depositModal").classList.add("active"));
  document.getElementById("closeModal")?.addEventListener("click", ()=>document.getElementById("depositModal").classList.remove("active"));
  document.getElementById("depositForm")?.addEventListener("submit", handleDeposit);
}

// Signup
async function handleSignup(e){
  e.preventDefault();
  const name = document.getElementById("signupName").value;
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;
  try{
    const res = await fetch(`${API_BASE_URL}/auth/signup`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({name,email,password})
    });
    const data = await res.json();
    if(res.ok){ alert("✅ Account created! Login now."); showLogin(); document.getElementById("signupForm").reset();}
    else alert(data.message||"Signup failed");
  }catch(err){ console.error(err); alert("Error creating account"); }
}

// Login
async function handleLogin(e){
  e.preventDefault();
  const email=document.getElementById("loginEmail").value;
  const password=document.getElementById("loginPassword").value;
  try{
    const res = await fetch(`${API_BASE_URL}/auth/login`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email,password})
    });
    const data = await res.json();
    if(res.ok){
      authToken=data.token;
      currentUser=data.user;
      localStorage.setItem("Paymoment_token",authToken);
      localStorage.setItem("Paymoment_user",JSON.stringify(currentUser));
      updateNavbar(); showDashboard(); loadUserData();
    } else alert(data.message||"Login failed");
  }catch(err){ console.error(err); alert("Login error"); }
}

// Logout
function handleLogout(){
  localStorage.removeItem("Paymoment_token");
  localStorage.removeItem("Paymoment_user");
  authToken=null; currentUser=null;
  updateNavbar();
  showAuth();
}

// Load profile
async function loadUserData(){
  if(!authToken) return;
  try{
    const res=await fetch(`${API_BASE_URL}/user/profile`,{ headers:{Authorization:`Bearer ${authToken}`}});
    if(res.ok){
      const data=await res.json();
      currentUser=data.user;
      document.getElementById("userName").textContent=currentUser.name;
      document.getElementById("userEmail").textContent=currentUser.email;
      document.getElementById("balanceAmount").textContent=currentUser.balance.toFixed(2);
    }
  }catch(err){ console.error(err); }
}

// Load News
async function loadNews(){
  const container=document.getElementById("newsList");
  container.innerHTML="<p style='text-align:center;'>Loading latest news...</p>";
  try{
    const res=await fetch(`${API_BASE_URL}/news`);
    const data=await res.json();
    if(data.success && data.news.length>0){
      container.innerHTML=data.news.map(n=>{
        return `
          <div class="news-card" data-id="${n.id}">
            ${n.imageUrl ? `<img src="${API_BASE_URL.replace("/api","")}${n.imageUrl}" class="news-img">` : ''}
            <h3>${n.title}</h3>
            <div class="news-content">${n.content}</div>
            <span class="read-more">Read More</span>
            <small>${new Date(n.createdAt || n.publishedAt).toLocaleDateString()}</small>
          </div>
        `;
      }).join("");

      // Attach Read More toggle
      document.querySelectorAll(".news-card .read-more").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const card = e.target.closest(".news-card");
          card.classList.toggle("expanded");
          e.target.textContent = card.classList.contains("expanded") ? "Show Less" : "Read More";
        });
      });

    } else {
      container.innerHTML="<p style='text-align:center;'>No news yet.</p>";
    }
  }catch(err){
    container.innerHTML="<p style='color:red;'>Error loading news.</p>";
    console.error(err);
  }
}

// Deposit Money
function handleDeposit(e){
  e.preventDefault();
  const amountInput = document.getElementById("depositAmount");
  const amount = parseFloat(amountInput.value);
  if(!amount || amount < 100) return alert("Minimum deposit is ₦100");
  if(!currentUser || !currentUser.email) return alert("Please login to deposit.");

  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: currentUser.email,
    amount: amount * 100,
    currency: "NGN",
    ref: "PAY_" + Math.floor(Math.random()*1000000000),
    onClose: function(){ alert("Transaction cancelled"); },
    callback: function(response){ verifyPayment(response.reference, amount); }
  });

  handler.openIframe();
}

// Verify payment
async function verifyPayment(reference, amount){
  try{
    const res = await fetch(`${API_BASE_URL}/payments/verify`,{
      method:"POST",
      headers:{ Authorization:`Bearer ${authToken}`, "Content-Type":"application/json" },
      body: JSON.stringify({ reference, amount })
    });
    const data = await res.json();
    if(res.ok && data.success){
      await processDeposit(amount, reference);
      alert(`✅ Deposit successful! ₦${amount.toFixed(2)} added.`);
      document.getElementById("depositModal").classList.remove("active");
      document.getElementById("depositForm").reset();
    } else alert(data.message || "Payment verification failed");
  }catch(err){ console.error(err); alert("Error verifying payment."); }
}

// Process deposit (update backend)
async function processDeposit(amount, reference){
  try{
    const res = await fetch(`${API_BASE_URL}/transactions/deposit`,{
      method:"POST",
      headers:{ Authorization:`Bearer ${authToken}`, "Content-Type":"application/json" },
      body: JSON.stringify({ amount, reference })
    });
    const data = await res.json();
    if(res.ok) loadUserData();
    else alert(data.message || "Deposit failed");
  }catch(err){ console.error(err); alert("Error processing deposit."); }
}

