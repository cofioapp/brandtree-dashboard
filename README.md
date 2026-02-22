# 📊 Biz Dashboard

Your personal business dashboard for managing sales, inventory, expenses, and profit.

---

## 🚀 Quick Start (First Time)

### Step 1 — Install Node.js
Download and install from: https://nodejs.org  
Choose the **LTS** version. Just click through the installer.

### Step 2 — Open Terminal
- **Mac**: Press `Cmd + Space`, type "Terminal", hit Enter
- **Windows**: Press `Win + R`, type "cmd", hit Enter

### Step 3 — Navigate to this folder
```
cd path/to/biz-dashboard
```
(Drag the folder into the terminal window after typing `cd ` — it'll fill the path automatically)

### Step 4 — Install dependencies (only once)
```
npm install
```

### Step 5 — Run the dashboard
```
npm run dev
```

Then open your browser and go to: **http://localhost:5173**

---

## 🔁 Every Time After That

Just open terminal, navigate to the folder, and run:
```
npm run dev
```

---

## 💾 Your Data

All data is saved in your **browser's local storage** — it stays on your computer and persists between sessions. No internet required once set up.

To back up your data: open the browser console (F12 → Console) and run:
```js
JSON.stringify(localStorage)
```
Copy and save that output somewhere safe.

---

## 📦 CSV Import Templates

Download templates directly from the Import CSV buttons inside the app.

**Sales CSV columns:**
`date, sku, product, qty, sales price, shipping charged, shipping cost, vat rate, commission, misc cost, platform, notes`

**Products CSV columns:**
`sku, name, brand, category, cost, price, initial stock`
"# brandtree-dashboard" 
 
