# Citizen Complaint Management System Frontend

A premium, modern, and highly interactive citizen complaint tracking system frontend built using semantic **HTML5**, custom **Vanilla CSS** design system, and **Vanilla JavaScript** logic.

---

## 🌟 Key Features

1. **Integrated Auth Portal (`login.html`)**
   - High-fidelity visual form switching with elegant tabs.
   - Credentials validation (Email or Citizen ID).
   - In-app session control with automatic page access locks (redirects to login if non-authenticated).
   - Standard mock user account seeded on load: `citizen@example.com` / `password123`.

2. **Citizen Command Center (`index.html`)**
   - **Interactive Stats Board**: Dynamic widgets tracking *Total Filed*, *Pending*, *In Progress*, and *Resolved* complaints.
   - **Complaint Submission Deck**: Categorized reporting with severity selection, location inputs, details, and drag-and-drop file upload previews.
   - **Track & Filter Board**: Live list filter chips (All, Pending, In Progress, Resolved) and instant search.
   - **Interactive Status Timeline**: Sidebar detail drawer showing complete progress logs step-by-step from submission to closure.

3. **Background Admin Loop Simulator**
   - Submitting a new complaint automatically fires administrative timelines.
   - Simulates moving to *Under Review* (8s), *Action Initiated* (20s) with active dispatcher dispatch logs, and *Resolved* (40s) with official closure statements. The detail timeline updates in real-time.

---

## 📂 File Architecture

- [login.html](file:///Users/ovindujayaweera/Documents/GitHub/Citizen-Management-System-FE/login.html) — Portal login and sign-up form.
- [index.html](file:///Users/ovindujayaweera/Documents/GitHub/Citizen-Management-System-FE/index.html) — Main application home dashboard.
- [style.css](file:///Users/ovindujayaweera/Documents/GitHub/Citizen-Management-System-FE/style.css) — Custom modern UI components, glassmorphism, responsive grid layouts, animations.
- [auth.js](file:///Users/ovindujayaweera/Documents/GitHub/Citizen-Management-System-FE/auth.js) — LocalStorage authentication, session validations, tabs, and error alerts.
- [app.js](file:///Users/ovindujayaweera/Documents/GitHub/Citizen-Management-System-FE/app.js) — Main dashboard states, database seeding, submissions, filters, drawers, and real-time state simulator.

---

## 🚀 How to Run Locally

Since this is built with clean Vanilla HTML/CSS/JS, **no installation or build steps are required**. 

Simply open [login.html](file:///Users/ovindujayaweera/Documents/GitHub/Citizen-Management-System-FE/login.html) in your browser:
- Double click [login.html](file:///Users/ovindujayaweera/Documents/GitHub/Citizen-Management-System-FE/login.html) from your directory.
- Or use a local web server extension (e.g. VS Code Live Server).

### 🔑 Demo Account
- **Citizen ID / Email**: `citizen@example.com`
- **Password**: `password123`
- *Or click the "Register" tab to create a custom citizen profile.*