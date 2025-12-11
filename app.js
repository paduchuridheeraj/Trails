/* app.js
 Single-file SPA for CareerNav frontend
 - Hash routing
 - Pages: login, register, dashboard, profile, mbti(60 q), skills, generate, recommendations, career details, 404
 - Uses fetch to call backend at http://localhost:8000/api (fallback mock)
*/

/* ========== Configuration ========== */
const API_BASE = "http://localhost:8000/api"; // backend base; change if needed

/* ========== Utilities ========== */
function qs(sel, root = document) {
  return root.querySelector(sel);
}
function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}
function navigate(hash) {
  location.hash = hash;
}
function setToken(token) {
  localStorage.setItem("token", token);
}
function getToken() {
  return localStorage.getItem("token");
}
function clearToken() {
  localStorage.removeItem("token");
}
function apiHeaders() {
  const headers = { "Content-Type": "application/json" };
  const t = getToken();
  if (t) headers["Authorization"] = `Bearer ${t}`;
  return headers;
}

/* ========== Mock helpers (used when no backend available) ========== */
const MOCK = {
  careers: [
    {
      id: "c1",
      career_name: "Data Scientist",
      description: "Analyze complex data...",
      avg_salary: "12 LPA",
      required_skills: ["Python", "ML", "Statistics"],
      growth_rate: "High (28%)",
      job_outlook: "Excellent",
    },
    {
      id: "c2",
      career_name: "Software Engineer",
      description: "Build software...",
      avg_salary: "10 LPA",
      required_skills: ["Java", "DSA", "SQL"],
      growth_rate: "High (22%)",
      job_outlook: "Excellent",
    },
    {
      id: "c3",
      career_name: "Product Manager",
      description: "Lead product...",
      avg_salary: "15 LPA",
      required_skills: ["Strategy", "Analytics"],
      growth_rate: "High (25%)",
      job_outlook: "Excellent",
    },
  ],
  users: [{ email: "sai@gmail.com", password: "12345", name: "Sai Demo" }],
};

/* ========== API wrapper with fallback to mock if fetch fails ========== */
async function apiRequest(path, opts = {}) {
  const url = API_BASE + path;
  const merged = Object.assign({ headers: apiHeaders() }, opts);

  try {
    const res = await fetch(url, merged);
    if (!res.ok) {
      // If server returns JSON error, forward it
      const text = await res.text();
      try {
        return { ok: false, error: JSON.parse(text) };
      } catch (e) {
        return { ok: false, error: text };
      }
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    // fallback to mock behavior for certain endpoints
    console.warn("API unreachable, using mock for", path);
    return mockFallback(path, opts);
  }
}

function mockFallback(path, opts) {
  // simple mocks for endpoints used in frontend
  if (path.startsWith("/auth/login/")) {
    const body = JSON.parse(opts.body || "{}");
    const user = MOCK.users.find(
      (u) => u.email === body.email && u.password === body.password
    );
    if (user)
      return {
        ok: true,
        data: {
          token: "mock-token",
          user: { email: user.email, name: user.name },
        },
      };
    return { ok: false, error: { message: "Invalid credentials (mock)" } };
  }
  if (path.startsWith("/profile/")) {
    if (opts.method === "POST") {
      const body = JSON.parse(opts.body || "{}");
      localStorage.setItem("mock_profile", JSON.stringify(body));
      return { ok: true, data: body };
    }
    // GET
    const p = JSON.parse(localStorage.getItem("mock_profile") || "null");
    return { ok: true, data: p };
  }
  if (path.startsWith("/mbti/submit/")) {
    const body = JSON.parse(opts.body || "{}");
    // build simple MBTI result
    const scores = { ei_score: 0, sn_score: 0, tf_score: 0, jp_score: 0 };
    for (const r of body.responses || []) {
      const q = r.question_id;
      const a = r.answer;
      if (q <= 15) scores.ei_score += a === "A" ? 1 : -1;
      else if (q <= 30) scores.sn_score += a === "A" ? 1 : -1;
      else if (q <= 45) scores.tf_score += a === "A" ? 1 : -1;
      else scores.jp_score += a === "A" ? 1 : -1;
    }
    const type =
      (scores.ei_score > 0 ? "E" : "I") +
      (scores.sn_score > 0 ? "S" : "N") +
      (scores.tf_score > 0 ? "T" : "F") +
      (scores.jp_score > 0 ? "J" : "P");
    localStorage.setItem(
      "mock_mbti",
      JSON.stringify({ personality_type: type, scores })
    );
    return { ok: true, data: { personality_type: type, scores } };
  }
  if (path.startsWith("/skills/")) {
    if (opts.method === "POST") {
      const body = JSON.parse(opts.body || "{}");
      localStorage.setItem("mock_skills", JSON.stringify(body));
      return { ok: true, data: body };
    }
    const s = JSON.parse(localStorage.getItem("mock_skills") || "null");
    return { ok: true, data: s };
  }
  if (path.startsWith("/recommendations/generate/")) {
    // create fake recommendations based on profile/skills/mbti
    const profile = JSON.parse(localStorage.getItem("mock_profile") || "{}");
    const mbti = JSON.parse(localStorage.getItem("mock_mbti") || "{}");
    const skills = JSON.parse(localStorage.getItem("mock_skills") || "{}");
    const recs = MOCK.careers.map((c, i) => ({
      career_id: c.id,
      career_name: c.career_name,
      match_score: Math.round(70 + Math.random() * 25 - i * 3),
      rank: i + 1,
      reasoning: {
        mbti_match: `Your ${
          mbti.personality_type || "N/A"
        } personality fits analytical roles`,
        skill_match: `You have relevant skills`,
        academic_match: `Profile CGPA: ${profile.cgpa || "N/A"}`,
      },
      learning_roadmap: [
        "Learn core skills",
        "Build projects",
        "Apply to internships",
      ],
      career_details: {
        description: c.description,
        avg_salary: c.avg_salary,
        growth_rate: c.growth_rate,
        job_outlook: c.job_outlook,
      },
    }));
    localStorage.setItem("mock_recs", JSON.stringify(recs));
    return { ok: true, data: recs };
  }
  if (path.startsWith("/recommendations/")) {
    const r = JSON.parse(localStorage.getItem("mock_recs") || "[]");
    return { ok: true, data: r };
  }
  if (path.startsWith("/careers/")) {
    return { ok: true, data: MOCK.careers };
  }
  return { ok: false, error: { message: "No mock for " + path } };
}

/* ========== Simple Router ========== */
const routes = {
  "/": renderDashboard,
  "/dashboard": renderDashboard,
  "/login": renderLogin,
  "/register": renderRegister,
  "/profile": renderProfile,
  "/mbti": renderMBTITest,
  "/skills": renderSkills,
  "/generate": renderGenerate,
  "/recommendations": renderRecommendationsList,
  "/career": renderCareerDetails, // expects id as hash like #/career?id=c1
};

function router() {
  const hash = location.hash.replace(/^#/, "") || "/dashboard";
  const [path, query] = hash.split("?");
  const fn = routes[path] || renderNotFound;
  // update nav
  renderNav();
  fn({ path, query });
}

window.addEventListener("hashchange", router);
window.addEventListener("load", router);

/* ========== Nav Component ========== */
function renderNav() {
  const nav = qs("#nav-links");
  const token = getToken();
  nav.innerHTML = "";
  const links = [];
  if (token) {
    links.push({ t: "Dashboard", h: "#/dashboard" });
    links.push({ t: "Profile", h: "#/profile" });
    links.push({ t: "MBTI Test", h: "#/mbti" });
    links.push({ t: "Skills", h: "#/skills" });
    links.push({ t: "Generate", h: "#/generate" });
    links.push({ t: "Recommendations", h: "#/recommendations" });
    links.push({ t: "Logout", h: "#/logout" });
  } else {
    links.push({ t: "Login", h: "#/login" });
    links.push({ t: "Register", h: "#/register" });
  }
  links.forEach((l) => {
    const a = document.createElement("a");
    a.href = l.h;
    a.textContent = l.t;
    a.onclick = (e) => {
      if (l.t === "Logout") {
        e.preventDefault();
        clearToken();
        navigate("#/login");
        return false;
      }
    };
    nav.appendChild(a);
  });
}

/* ========== Page Renderers ========== */

function mount(contentHtml) {
  const view = qs("#view");
  view.innerHTML = contentHtml;
}

function renderLogin() {
  if (getToken()) {
    navigate("#/dashboard");
    return;
  }
  mount(`
    <div class="card col-12">
      <h1>Login</h1>
      <p class="small">Use demo: <strong>sai@gmail.com</strong> / <strong>12345</strong> (mock)</p>
      <div class="form-row">
        <div class="form-field">
          <label>Email</label><input id="login-email" type="email" placeholder="you@example.com" />
        </div>
        <div class="form-field">
          <label>Password</label><input id="login-pass" type="password" placeholder="password" />
        </div>
      </div>
      <div class="actions">
        <button class="btn" id="login-btn">Login</button>
        <button class="btn secondary" onclick="navigate('#/register')">Create account</button>
      </div>
      <div id="login-msg" class="small" style="margin-top:8px"></div>
    </div>
  `);

  qs("#login-btn").onclick = async () => {
    const email = qs("#login-email").value.trim();
    const password = qs("#login-pass").value.trim();
    qs("#login-msg").textContent = "Signing in...";
    const res = await apiRequest("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      setToken(res.data.token || "mock-token");
      qs("#login-msg").textContent = "Login successful!";
      setTimeout(() => navigate("#/dashboard"), 600);
    } else {
      qs("#login-msg").textContent =
        "Login failed: " + (res.error?.message || JSON.stringify(res.error));
    }
  };
}

function renderRegister() {
  mount(`
    <div class="card">
      <h1>Create account</h1>
      <div class="form-row">
        <div class="form-field"><label>Name</label><input id="reg-name" type="text" /></div>
        <div class="form-field"><label>Email</label><input id="reg-email" type="email" /></div>
      </div>
      <div class="form-row">
        <div class="form-field"><label>Password</label><input id="reg-pass" type="password" /></div>
        <div class="form-field"><label>Confirm</label><input id="reg-pass2" type="password" /></div>
      </div>
      <div class="actions">
        <button class="btn" id="reg-btn">Register</button>
        <button class="btn secondary" onclick="navigate('#/login')">Back to login</button>
      </div>
      <div id="reg-msg" class="small" style="margin-top:8px"></div>
    </div>
  `);

  qs("#reg-btn").onclick = async () => {
    const name = qs("#reg-name").value.trim();
    const email = qs("#reg-email").value.trim();
    const pass = qs("#reg-pass").value,
      pass2 = qs("#reg-pass2").value;
    if (!name || !email || !pass) {
      qs("#reg-msg").textContent = "Fill all fields";
      return;
    }
    if (pass !== pass2) {
      qs("#reg-msg").textContent = "Passwords do not match";
      return;
    }
    // For demo, just login the user (mock)
    localStorage.setItem("mock_user", JSON.stringify({ name, email }));
    // call /auth/register/ if desired (not implemented in mock)
    setToken("mock-token");
    qs("#reg-msg").textContent = "Account created — signed in";
    setTimeout(() => navigate("#/dashboard"), 700);
  };
}

async function renderDashboard() {
  if (!getToken()) {
    navigate("#/login");
    return;
  }
  // get profile if exists
  const pRes = await apiRequest("/profile/", { method: "GET" });
  const profile = pRes.ok ? pRes.data : null;

  mount(`
    <div class="grid">
      <div class="col-8 card">
        <h1>Welcome${profile && profile.name ? ", " + profile.name : ""} 👋</h1>
        <p class="small">Your AI-powered career recommendations are one click away.</p>

        <div style="margin-top:18px" class="grid">
          <div class="col-12 card">
            <h2 class="small">Quick Actions</h2>
            <div class="actions">
              <button class="btn" onclick="navigate('#/profile')">Complete Profile</button>
              <button class="btn" onclick="navigate('#/mbti')">Take MBTI Test</button>
              <button class="btn" onclick="navigate('#/skills')">Add Skills</button>
              <button class="btn" onclick="navigate('#/generate')">Generate Recommendations</button>
              <button class="btn secondary" onclick="navigate('#/recommendations')">View Recommendations</button>
            </div>
          </div>

          <div class="col-12 card">
            <h2 class="small">Status</h2>
            <div class="kv"><div><strong>Profile</strong></div><div>${
              profile ? "Saved" : '<span class="small">Incomplete</span>'
            }</div></div>
            <div class="kv"><div><strong>MBTI</strong></div><div>${
              localStorage.getItem("mock_mbti") ? "Completed" : "Not taken"
            }</div></div>
            <div class="kv"><div><strong>Skills</strong></div><div>${
              localStorage.getItem("mock_skills") ? "Saved" : "Not added"
            }</div></div>
          </div>
        </div>

      </div>

      <div class="col-4 card">
        <h2 class="small">Tips</h2>
        <ul class="small">
          <li>Complete profile: helps tailor recommendations</li>
          <li>MBTI gives personality match</li>
          <li>Add real skills & proficiency</li>
        </ul>
        <div style="margin-top:12px">
          <button class="btn secondary" onclick="navigate('#/career?id=c1')">Explore Career: Data Scientist</button>
        </div>
      </div>
    </div>
  `);
}

function renderProfile() {
  if (!getToken()) {
    navigate("#/login");
    return;
  }
  // load existing
  apiRequest("/profile/", { method: "GET" }).then((res) => {
    const p = res.ok ? res.data : {};
    mount(`
      <div class="card">
        <h1>Profile</h1>
        <div class="form-row">
          <div class="form-field"><label>Name</label><input id="p-name" type="text" value="${
            p?.name || ""
          }" /></div>
          <div class="form-field"><label>Email</label><input id="p-email" type="email" value="${
            p?.email || ""
          }" /></div>
        </div>
        <div class="form-row">
          <div class="form-field"><label>Degree</label><input id="p-degree" type="text" value="${
            p?.degree || ""
          }" /></div>
          <div class="form-field"><label>CGPA</label><input id="p-cgpa" type="text" value="${
            p?.cgpa || ""
          }" /></div>
        </div>
        <div class="form-row">
          <div class="form-field"><label>Specialization</label><input id="p-spec" type="text" value="${
            p?.specialization || ""
          }" /></div>
          <div class="form-field"><label>Year of Study</label><input id="p-year" type="text" value="${
            p?.year_of_study || ""
          }" /></div>
        </div>
        <div class="form-row">
          <div class="form-field"><label>College</label><input id="p-college" type="text" value="${
            p?.college || ""
          }" /></div>
        </div>
        <div class="actions">
          <button class="btn" id="save-profile">Save Profile</button>
          <button class="btn secondary" onclick="navigate('#/dashboard')">Cancel</button>
        </div>
        <div id="profile-msg" class="small" style="margin-top:8px"></div>
      </div>
    `);

    qs("#save-profile").onclick = async () => {
      const profile = {
        name: qs("#p-name").value.trim(),
        email: qs("#p-email").value.trim(),
        degree: qs("#p-degree").value.trim(),
        cgpa: qs("#p-cgpa").value.trim(),
        specialization: qs("#p-spec").value.trim(),
        year_of_study: qs("#p-year").value.trim(),
        college: qs("#p-college").value.trim(),
      };
      qs("#profile-msg").textContent = "Saving...";
      const res = await apiRequest("/profile/", {
        method: "POST",
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        qs("#profile-msg").textContent = "Profile saved";
        setTimeout(() => navigate("#/dashboard"), 600);
      } else
        qs("#profile-msg").textContent =
          "Error: " + (res.error?.message || JSON.stringify(res.error));
    };
  });
}

function renderMBTITest() {
  if (!getToken()) {
    navigate("#/login");
    return;
  }
  // create 60 sample questions (A/B)
  const questions = [];
  for (let i = 1; i <= 60; i++) {
    questions.push({
      id: i,
      text: `Question ${i}: Which option describes you better?`,
    });
  }
  const qHtml = questions
    .map(
      (q) => `
    <div class="mbti-q">
      <div style="display:flex;justify-content:space-between;align-items:center"><div><strong>Q${q.id}</strong></div><div class="badge">Choose A or B</div></div>
      <div style="margin-top:8px">${q.text}</div>
      <div style="margin-top:8px">
        <label><input type="radio" name="q${q.id}" value="A" checked /> A</label>
        <label style="margin-left:14px"><input type="radio" name="q${q.id}" value="B" /> B</label>
      </div>
    </div>
  `
    )
    .join("");

  mount(`
    <div class="card">
      <h1>MBTI Personality Test</h1>
      <p class="small">60 questions — pick A or B. Backend will calculate your MBTI.</p>
      <div class="mbti-grid">${qHtml}</div>
      <div class="actions" style="margin-top:12px">
        <button class="btn" id="submit-mbti">Submit Test</button>
        <button class="btn secondary" onclick="navigate('#/dashboard')">Cancel</button>
      </div>
      <div id="mbti-msg" class="small" style="margin-top:8px"></div>
    </div>
  `);

  qs("#submit-mbti").onclick = async () => {
    const responses = [];
    for (let i = 1; i <= 60; i++) {
      const el = qs(`input[name="q${i}"]:checked`);
      if (el) responses.push({ question_id: i, answer: el.value });
    }
    qs("#mbti-msg").textContent = "Submitting...";
    const res = await apiRequest("/mbti/submit/", {
      method: "POST",
      body: JSON.stringify({ responses }),
    });
    if (res.ok) {
      qs("#mbti-msg").textContent =
        "Test submitted. Personality: " + (res.data.personality_type || "N/A");
      setTimeout(() => navigate("#/dashboard"), 900);
    } else {
      qs("#mbti-msg").textContent =
        "Error: " + (res.error?.message || JSON.stringify(res.error));
    }
  };
}

function renderSkills() {
  if (!getToken()) {
    navigate("#/login");
    return;
  }
  const existing =
    JSON.parse(localStorage.getItem("mock_skills") || "{}") || {};
  const skillsList = existing.skills || [
    { skill_name: "Python", proficiency_level: 8 },
  ];

  function renderForm(skills) {
    const rows = skills
      .map(
        (s, idx) => `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
        <input data-idx="${idx}" class="skill-name" placeholder="Skill name" value="${
          s.skill_name || ""
        }" />
        <input data-idx="${idx}" class="skill-level" type="number" min="0" max="10" placeholder="0-10" value="${
          s.proficiency_level || 0
        }" style="width:88px" />
        <button class="btn secondary remove" data-idx="${idx}">Remove</button>
      </div>
    `
      )
      .join("");
    mount(`
      <div class="card">
        <h1>Skills & Proficiency</h1>
        <p class="small">Add your skills and rate 0-10</p>
        <div id="skills-wrap">${rows}</div>
        <div class="actions">
          <button class="btn" id="add-skill">Add skill</button>
          <button class="btn" id="save-skills">Save</button>
          <button class="btn secondary" onclick="navigate('#/dashboard')">Cancel</button>
        </div>
        <div id="skills-msg" class="small" style="margin-top:8px"></div>
      </div>
    `);

    qsa(".remove").forEach(
      (b) =>
        (b.onclick = (e) => {
          const idx = +b.dataset.idx;
          skills.splice(idx, 1);
          renderForm(skills);
        })
    );

    qs("#add-skill").onclick = () => {
      skills.push({ skill_name: "", proficiency_level: 1 });
      renderForm(skills);
    };

    qs("#save-skills").onclick = async () => {
      // read fields
      const names = qsa(".skill-name").map((el) => el.value.trim());
      const levels = qsa(".skill-level").map((el) => Number(el.value));
      const payload = {
        skills: names.map((n, i) => ({
          skill_name: n || "Unknown",
          proficiency_level: levels[i] || 0,
        })),
      };
      qs("#skills-msg").textContent = "Saving...";
      const res = await apiRequest("/skills/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        qs("#skills-msg").textContent = "Skills saved";
        setTimeout(() => navigate("#/dashboard"), 600);
      } else
        qs("#skills-msg").textContent =
          "Error: " + (res.error?.message || JSON.stringify(res.error));
    };
  }

  renderForm(skillsList);
}

async function renderGenerate() {
  if (!getToken()) {
    navigate("#/login");
    return;
  }
  mount(`
    <div class="card">
      <h1>Generate Recommendations</h1>
      <p class="small">Click the button to run the recommendation engine (ML + rule-based) on the backend.</p>
      <div class="actions">
        <button class="btn" id="gen-btn">Generate</button>
        <button class="btn secondary" onclick="navigate('#/recommendations')">View existing</button>
      </div>
      <div id="gen-msg" class="small" style="margin-top:8px"></div>
    </div>
  `);

  qs("#gen-btn").onclick = async () => {
    qs("#gen-msg").textContent = "Generating...";
    const res = await apiRequest("/recommendations/generate/", {
      method: "POST",
      body: "{}",
    });
    if (res.ok) {
      qs("#gen-msg").textContent = "Recommendations generated!";
      setTimeout(() => navigate("#/recommendations"), 700);
    } else {
      qs("#gen-msg").textContent =
        "Error: " + (res.error?.message || JSON.stringify(res.error));
    }
  };
}

async function renderRecommendationsList() {
  if (!getToken()) {
    navigate("#/login");
    return;
  }
  const res = await apiRequest("/recommendations/", { method: "GET" });
  const recs = res.ok ? res.data : [];
  mount(`
    <div class="card">
      <h1>Recommendations</h1>
      <div class="list" id="rec-list">
        ${
          recs.length
            ? recs
                .map(
                  (r) => `
          <div class="career-card" data-id="${r.career_id}">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div><strong>${r.career_name}</strong><div class="small">${
                    r.reasoning?.overall || ""
                  }</div></div>
              <div style="text-align:right">
                <div class="score-pill">${r.match_score}%</div>
                <div class="small">Rank ${r.rank}</div>
              </div>
            </div>
            <div style="margin-top:8px" class="small">${
              r.career_details?.description || ""
            }</div>
            <div style="margin-top:8px" class="actions">
              <button class="btn" onclick="navigate('#/career?id=${
                r.career_id
              }')">View</button>
            </div>
          </div>
        `
                )
                .join("")
            : '<div class="small">No recommendations yet. Generate them from Dashboard.</div>'
        }
      </div>
    </div>
  `);
}

async function renderCareerDetails({ path, query }) {
  const params = new URLSearchParams(query || "");
  const id = params.get("id");
  if (!id) {
    renderNotFound();
    return;
  }
  // try fetching careers endpoint
  const cRes = await apiRequest("/careers/", { method: "GET" });
  const careers = cRes.ok ? cRes.data : [];
  const career =
    careers.find(
      (c) => c.id === id || String(c._id) === id || c.career_name === id
    ) || careers[0];
  if (!career) {
    renderNotFound();
    return;
  }
  mount(`
    <div class="card">
      <h1>${career.career_name}</h1>
      <div class="small">${career.description}</div>
      <div style="margin-top:12px" class="kv"><div><strong>Salary</strong></div><div>${
        career.avg_salary || "N/A"
      }</div></div>
      <div class="kv"><div><strong>Growth</strong></div><div>${
        career.growth_rate || "N/A"
      }</div></div>
      <div class="kv"><div><strong>Job Outlook</strong></div><div>${
        career.job_outlook || "N/A"
      }</div></div>
      <div style="margin-top:12px">
        <h2 class="small">Required skills</h2>
        <ul>${(career.required_skills || [])
          .map((s) => `<li>${s}</li>`)
          .join("")}</ul>
      </div>
      <div style="margin-top:12px" class="actions">
        <button class="btn" onclick="navigate('#/generate')">Get Recommendations</button>
        <button class="btn secondary" onclick="navigate('#/dashboard')">Back</button>
      </div>
    </div>
  `);
}

function renderNotFound() {
  mount(`
    <div class="card">
      <h1>404 — Page not found</h1>
      <p class="small">The page you're looking for doesn't exist.</p>
      <div class="actions">
        <button class="btn" onclick="navigate('#/dashboard')">Go to Dashboard</button>
      </div>
    </div>
  `);
}
