# 💼 Portfolio Optimizer: Knapsack + Branch & Bound

A browser app that picks the **best set of projects under a fixed budget** using the **0/1 Knapsack problem solved with Branch & Bound**. It also shows *how* the algorithm thinks, step by step.

Built with plain **HTML, CSS and JavaScript**. No libraries, no server, no install.

## ✨ Features

| Feature | What it does |
|---|---|
| Optimal portfolio | Finds the maximum-return project set within the budget |
| Locks | Mark a project **Must include** or **Skip**, and the optimizer respects it |
| Avoid high-risk | One checkbox removes risky projects from consideration |
| Strategy comparison | Compares against greedy rules to show where simple thinking fails |
| Budget advisor | Tells you how much extra money improves the return, or how much you can cut with no loss |
| What-if chart | Best return for every possible budget |
| Animated search tree | Watch Branch & Bound explore, prune and find the optimum, with step-by-step explanations |
| Verification | Every answer is cross-checked with Dynamic Programming |
| Charts | Category donut and cost-vs-return bars (hand-drawn SVG) |
| Presets | Company, Startup, College fest, Farmer, NGO, Random |
| Import / Export | CSV and JSON in, CSV / JSON / printable PDF report out |
| Dark and light theme | Saved automatically, along with your data |

## ▶ How to run

**Option A (easiest):** double-click `index.html`.

**Option B (VS Code):**
1. Open the folder in VS Code (`File → Open Folder`).
2. Install the **Live Server** extension.
3. Right-click `index.html` → **Open with Live Server**.

**Run the tests (needs Node.js):**
```bash
node test.js
```
It checks Branch & Bound against brute force on 3000 random cases.

## 🧠 How the algorithm works

1. **Sort** projects by return ÷ cost.
2. **Branch:** each project has two choices, take it or skip it, which forms a binary tree.
3. **Bound:** for each branch, estimate the maximum return it could reach (fill the budget greedily, allowing a *fraction* of the last item).
4. **Prune:** if that bound cannot beat the best answer so far, discard the whole branch. Discard branches that exceed the budget too.
5. The best answer at the end is **provably optimal**.

Brute force checks 2ⁿ⁺¹−1 nodes. Branch & Bound usually visits a small fraction of them.

## 🌍 Real-world uses

- Companies choosing which projects to fund
- Startups deciding where limited cash goes
- Students planning a college-fest or personal budget
- Farmers choosing inputs with limited capital
- NGOs and governments maximizing impact per rupee

## 📁 Files

```
index.html   page structure
style.css    design, themes, print layout
solver.js    Branch & Bound, DP and greedy logic (no DOM, testable)
app.js       UI, charts, animation, import/export
test.js      automated tests
```

## 📥 CSV import format

```
name,category,risk,cost,return
Solar Plant,Infrastructure,Low,20,40
```
Category is one of Technology, Infrastructure, Marketing, People, Research, Operations. Risk is Low, Medium or High. A header row is optional.

## 🚀 Put it on GitHub (and a live website)

```bash
cd portfolio-optimizer
git init
git add .
git commit -m "Portfolio Optimizer: Knapsack with Branch and Bound"
git branch -M main
git remote add origin https://github.com/<your-username>/portfolio-optimizer.git
git push -u origin main
```
Create the empty repo `portfolio-optimizer` on github.com first. For a free live link, go to **Settings → Pages → Branch: main / root → Save**. Your app will be at `https://<your-username>.github.io/portfolio-optimizer/`.

## 📜 License
MIT. Free to use and learn from.
