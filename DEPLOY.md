# TaskFlow — Deploy Guide (Supabase + Render + Vercel)

Database on **Supabase**, backend on **Render**, frontend on **Vercel**. Sab free tier pe ho sakta hai.

Order matters — pehle database, phir backend, phir frontend (backend ko database ka URL chahiye,
frontend ko backend ka URL chahiye).

---

## 1. Database — Supabase

1. [supabase.com](https://supabase.com) pe free account banao → **New Project**
2. Naam do (`taskflow`), ek strong database password set karo (isse yaad rakhna — connection
   string mein lagega), region select karo (jo Render ke region ke qareeb ho)
3. Project ban jaane ke baad: **Project Settings → Database → Connection String**
4. **"Session pooler"** wala tab select karo (port `5432`, `Transaction pooler` nahi) — ye Render
   jaisi hamesha-chalti-hui service ke liye sahi hai, IPv4 pe bhi kaam karta hai:
   ```
   postgresql://postgres.xxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-xxxxx.pooler.supabase.com:5432/postgres
   ```
5. `[YOUR-PASSWORD]` ki jagah apna real password daal do — yehi poora string tumhara
   `DATABASE_URL` banega (Step 2 mein lagega)

> Session pooler (5432) use karo, Transaction pooler (6543) nahi — Transaction mode mein Prisma
> migrations fail ho sakti hain. Session pooler dono (migrations + normal queries) ke liye kaam karta hai.

---

## 2. Backend — Render

1. [render.com](https://render.com) pe account banao (GitHub se sign in karna aasan hai)
2. **New +** → **Web Service** → apna `taskflow-backend` repo connect karo
3. Settings:
   | Field | Value |
   |---|---|
   | Root Directory | *(khali chhodo)* |
   | Build Command | `npm install && npx prisma generate && npm run build` |
   | Start Command | `npx prisma migrate deploy && npx prisma db seed && npm start` |
   | Instance Type | Free |

4. **Environment** tab mein ye variables add karo:
   ```
   DATABASE_URL=<Step 1 ka Supabase connection string>
   JWT_SECRET=<koi lamba random string, khud generate karo>
   PORT=4000
   CORS_ORIGIN=<abhi khali/placeholder rehne do, Step 3 ke baad update karenge>
   ```
5. **Create Web Service** — pehla deploy shuru ho jayega (2-4 minute lagenge)
6. Deploy complete hone pe upar ek URL milega, kuch aisa: `https://taskflow-backend-xxxx.onrender.com`
   — ye copy kar lo, Step 3 mein chahiye hoga

7. Seed data (demo accounts) automatically ban jayenge — Start Command (Step 2.3) mein `prisma db seed`
   already shamil hai, har deploy pe khud chal jata hai. Ye idempotent hai (upsert use karta hai), to
   dobara chalne se koi duplicate ya masla nahi hota. Free tier pe Shell access nahi hota, isi liye ye
   Start Command mein bake kiya gaya hai.

> **Free tier note:** Render ki free web services 15 minute inactivity ke baad "sleep" ho jati hain
> — pehli request pe wapas jagne mein ~30-50 second lag sakte hain. Normal hai, paid tier pe ye
> masla nahi hota.

---

## 3. Frontend — Vercel

1. [vercel.com](https://vercel.com) pe account banao (GitHub se sign in)
2. **Add New → Project** → apna `taskflow-frontend` repo import karo
3. Framework Preset: Vercel khud **Vite** detect kar lega (agar na kare, manually select kar dena)
4. **Environment Variables** mein add karo:
   ```
   VITE_API_URL=https://taskflow-backend-xxxx.onrender.com/api
   ```
   *(Step 2 wala Render URL + `/api` end mein)*
5. **Deploy** dabao — 1-2 minute mein live ho jayega
6. Deploy hone pe Vercel ek URL dega: `https://taskflow-frontend-xxxx.vercel.app`

---

## 4. Connect karna — CORS wapas set karo

Ab dono deployed hain, wapas Render pe jao:

1. Backend service → **Environment** tab
2. `CORS_ORIGIN` ko update karo Vercel wale URL se:
   ```
   CORS_ORIGIN=https://taskflow-frontend-xxxx.vercel.app
   ```
3. Save karo — service khud restart ho jayegi

Ab Vercel wala frontend URL kholo, login karo (`ali@syntralogic.com` ya `arooj@syntralogic.com` / `ALLAH.pk87`)
— sab kaam karna chahiye.

---

## Troubleshooting

| Masla | Wajah |
|---|---|
| Frontend pe "Network Error" | `VITE_API_URL` galat hai, ya Render service abhi "sleeping" hai (30-50 sec wait karo) |
| Login pe CORS error | `CORS_ORIGIN` Render pe Vercel URL se exactly match nahi karta (https://, trailing slash check karo) |
| Backend deploy fail, Prisma error | `DATABASE_URL` mein password galat hai, ya Transaction pooler (6543) use kar liya — Session pooler (5432) use karo |
| "relation does not exist" DB errors | Start Command mein `prisma migrate deploy` missing hai — Step 2.3 check karo |

## Redeploying after code changes

Dono Render aur Vercel GitHub se auto-connected hain — jab bhi `main` branch pe push karoge, dono
khud naya deploy trigger kar denge. Kuch manually karne ki zaroorat nahi.
