# OpenAI API Setup - Step by Step Visual Guide

## 🔑 Step 1: Get Your API Key

1. Go to: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the ENTIRE key (it will look like the example below)

---

## 📝 Step 2: Create the .env File

### Option A: Using Terminal (Recommended)

Open Terminal and navigate to your project:

```bash
cd fantasy-dashboard-v2
```

Then create the `.env` file with this EXACT command:

```bash
echo 'VITE_OPENAI_API_KEY=sk-proj-YOUR_ACTUAL_KEY_GOES_HERE_1234567890abcdef' > .env
```

### Real Example (What It Looks Like):

```bash
echo 'VITE_OPENAI_API_KEY=sk-proj-Ab3dEf9GhIjKlMnOpQrStUvWxYz1234567890aBcDeFgHiJkLmNoPqRsTuVwXyZ' > .env
```

**Replace the RED part with your actual key:**

```
VITE_OPENAI_API_KEY=🔴sk-proj-YOUR_KEY_HERE🔴
```

---

### Option B: Create File Manually

1. **Open your fantasy-dashboard-v2 folder**
2. **Create a new file named `.env`** (note the dot at the start!)
3. **Paste this into the file:**

```
VITE_OPENAI_API_KEY=sk-proj-YOUR_ACTUAL_KEY_GOES_HERE
```

4. **Replace `🔴sk-proj-YOUR_ACTUAL_KEY_GOES_HERE🔴` with your real key**

---

## 📋 Real World Example

### ❌ WRONG (Fake Key - This Won't Work):

```
VITE_OPENAI_API_KEY=sk-proj-FAKE_KEY_DELETE_THIS_AND_PUT_REAL_KEY
```

### ✅ CORRECT (Example Structure):

```
VITE_OPENAI_API_KEY=sk-proj-Ab3dEf9GhIjKlMnOpQrStUvWxYz1234567890aBcDeFgHiJkLmNoPqRsTuVwXyZ
```

**Your real key will:**
- Start with `sk-proj-` or `sk-`
- Be 50-100 characters long
- Have random letters and numbers
- Have NO spaces
- Have NO quotes around it

---

## 🎨 Visual Example with Color Coding

Here's what your `.env` file should look like:

```
VITE_OPENAI_API_KEY=🔴sk-proj-1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t🔴
```

**The 🔴 RED part** = Replace with your actual OpenAI API key

---

## ✅ Step 3: Verify It's Working

### Check 1: File Exists

```bash
ls -la | grep .env
```

You should see:
```
-rw-r--r--  1 josh  staff  67 Dec  5 15:30 .env
```

### Check 2: File Contents

```bash
cat .env
```

You should see:
```
VITE_OPENAI_API_KEY=sk-proj-[your key here]
```

### Check 3: Key is Loaded in Browser

1. Start server: `npm run dev`
2. Open browser: http://localhost:5173
3. Press F12 (open DevTools)
4. In Console tab, type:
```javascript
console.log(import.meta.env.VITE_OPENAI_API_KEY)
```

**You should see your key printed!**

If you see `undefined`, the `.env` file isn't working.

---

## 🔍 Troubleshooting

### Problem: "API key not configured"

**Cause:** `.env` file doesn't exist or isn't loaded

**Solution:**
```bash
# Make sure you're in the right folder
pwd
# Should show: /path/to/fantasy-dashboard-v2

# Create .env file
echo 'VITE_OPENAI_API_KEY=sk-proj-YOUR_ACTUAL_KEY' > .env

# Verify it exists
cat .env

# Restart server
npm run dev
```

---

### Problem: Key shows as `undefined` in console

**Possible causes:**

1. **.env file in wrong location**
   - Must be in `fantasy-dashboard-v2/` root folder
   - NOT in `fantasy-dashboard-v2/src/`

2. **Forgot to restart server**
   - Stop server (Ctrl+C)
   - Start again (npm run dev)

3. **Wrong format**
   - Must start with `VITE_`
   - No spaces
   - No quotes
   - No equals sign in the key itself

---

### Problem: "Failed to fetch" or CORS error

**This is NORMAL for local development!**

OpenAI blocks direct browser requests. You have two options:

**Option 1: Use a Proxy (Recommended for Testing)**

I can give you a simple proxy server code if you want to test locally.

**Option 2: Deploy to Vercel (For Production)**

When deployed, we'll use Vercel serverless functions which work perfectly.

---

## 📸 Screenshot Examples

### ✅ Correct .env File Location:

```
fantasy-dashboard-v2/
├── .env                  ← HERE! (root level)
├── node_modules/
├── public/
├── src/
├── index.html
├── package.json
└── vite.config.ts
```

### ❌ Wrong .env File Location:

```
fantasy-dashboard-v2/
├── node_modules/
├── public/
├── src/
│   └── .env             ← NOT HERE!
├── index.html
└── package.json
```

---

## 🧪 Test It!

Once you have your `.env` file set up:

1. **Restart server:**
   ```bash
   npm run dev
   ```

2. **Go to Power Rankings tab**

3. **Select a season and week**

4. **Click "Generate Analysis →"**

5. **Wait 3-5 seconds**

6. **See AI-generated content!**

---

## 💰 Cost Check

**After you test it, check your OpenAI usage:**
- Go to: https://platform.openai.com/usage
- Each request costs ~$0.01
- Very affordable!

---

## 🆘 Still Not Working?

Tell me:
1. **What error message do you see?** (exact text)
2. **What does this show:** `cat .env`
3. **What does this show in browser console:** `import.meta.env.VITE_OPENAI_API_KEY`

And I'll help you fix it!

---

## 📝 Quick Copy-Paste Template

```bash
# Navigate to project
cd fantasy-dashboard-v2

# Create .env file (replace YOUR_KEY_HERE with real key)
echo 'VITE_OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE' > .env

# Verify
cat .env

# Restart server
npm run dev
```

**Remember:** Replace `YOUR_KEY_HERE` with your actual OpenAI API key!
