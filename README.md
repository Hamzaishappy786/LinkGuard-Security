# 🛡️ LinkGuard — Phishing URL Detection System

> AI-powered phishing detection with real-time URL analysis, quishing (QR phishing), homograph attacks, and an AI Analyst chatbot.

---

## 🚀 Getting Started (For Boss 👩‍💼)

Don't worry, it's easier than it looks. Follow these steps **in order** and you'll be up and running in minutes!

---

### Step 1 — Clone the Repo 📥

```bash
git clone https://github.com/Hamzaishappy786/LinkGuard-Security.git
```

Then open the cloned folder.

---

### Step 2 — Set Up the Secret Keys 🔑

Inside the `backend/` folder, you'll find a file called `.env.example`.

Make a **copy** of it, rename the copy to `.env` (no `.example`), and fill in your API keys.

> It already has the working keys inside `.env.example` — just copy, rename, done. ✅

---

### Step 3 — Install Python Dependencies 🐍

Open a terminal **inside the project folder** and run:

```bash
pip install -r backend/requirements.txt
```

Grab a coffee ☕ — this one takes a minute.

---

### Step 4 — Install Frontend Dependencies 🌐

Still in the same terminal, run:

```bash
cd fyp-frontend
npm install
```

Another short wait... 🥁

---

### Step 5 — Launch the App 🎉

Go back to the main project folder and double-click:

```
Start LinkGuard (Local).bat
```

That's it. The app will open in your browser automatically! 🚀

---

## 🗂️ Project Structure

```
LinkGuard/
├── backend/              # Python Flask API + ML models
│   ├── app.py            # Main server
│   ├── analyst.py        # AI Analyst (Gemini / Claude)
│   ├── models/           # Trained ML model files
│   ├── .env.example      # 👈 Copy this to .env and fill in keys
│   └── requirements.txt  # Python dependencies
│
├── fyp-frontend/         # React frontend (Vite + Tailwind)
│   └── src/
│       ├── pages/        # All pages
│       └── components/   # Reusable UI components
│
└── Start LinkGuard (Local).bat  # 👈 Double-click to run everything
```

---

## 🧠 Features

| Feature | Description |
|---|---|
| 🔗 URL Scanner | Real-time phishing detection using a stacking ML ensemble |
| 🤖 AI Analyst | Chat with Gemini/Claude about any suspicious URL |
| 📷 Quishing | Scan QR codes for hidden phishing URLs |
| 🔤 Homograph | Detect lookalike character attacks |
| 📜 History | Full scan history per user account |
| 🌙 Dark Mode | Because of course |

---

## ⚠️ Troubleshooting

**App won't start?**
- Make sure you ran both `pip install` and `npm install` first
- Make sure `backend/.env` exists (not just `.env.example`)

**Python errors on startup?**
- Make sure you're using Python 3.10+ (`python --version`)

**Port already in use?**
- Restart your PC and try again (classic) 😅

---

*Built with 💙 as a Final Year Project — LinkGuard Security*
