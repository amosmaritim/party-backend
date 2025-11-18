# 🎬 Tushy Cinema Booking System

A modern cinema booking and event management system with M-Pesa payment integration.

## ✨ Features

- 🎟️ Movie event ticket booking
- 🏛️ Premium space booking for private events
- 💳 M-Pesa STK Push payment integration
- 📱 Responsive design for all devices
- 🖼️ Interactive gallery with filters
- 💾 Supabase database integration

## 🚀 Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js Serverless Functions (Vercel)
- **Database**: Supabase
- **Payment**: Safaricom Daraja API (M-Pesa)
- **Hosting**: Vercel

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js (v16 or higher)
- npm or yarn
- A Supabase account
- Safaricom Daraja API credentials (sandbox or production)
- Vercel CLI (optional, for local testing)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Aubrey359/Tushy-backup.git
   cd Tushy-backup
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   
   Then fill in your credentials in `.env`:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   DAR_CONSUMER_KEY=your_consumer_key
   DAR_CONSUMER_SECRET=your_consumer_secret
   DAR_BUSINESS_SHORTCODE=your_shortcode
   DAR_PASSKEY=your_passkey
   CALLBACK_BASE_URL=http://localhost:3000
   ```

4. **Set up Supabase Database**
   
Create a `payments` table in Supabase (or run the SQL below to migrate your existing table):
```sql
CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  amount INTEGER NOT NULL,
  qty INTEGER DEFAULT 1,
  event_name TEXT,
  currency TEXT DEFAULT 'KES',
  merchant_request_id TEXT,
  checkout_request_id TEXT,
  status TEXT DEFAULT 'pending',
  status_reason TEXT,
  mpesa_receipt TEXT,
  paid_amount INTEGER,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS payments_checkout_request_id_idx
  ON payments (checkout_request_id)
  WHERE checkout_request_id IS NOT NULL;
```

## 🏃 Running Locally

### Option 1: Using Vercel CLI (Recommended)
```bash
npm run dev
```
Visit `http://localhost:3000`

### Option 2: Simple HTTP Server
```bash
# Serve static files only (API won't work)
npx serve .
```

## 📦 Deployment

### Deploy to Vercel

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   npm run deploy
   ```

4. **Set Environment Variables in Vercel**
   
   Go to your Vercel project dashboard → Settings → Environment Variables and add all the variables from your `.env` file.

## 📱 M-Pesa Testing

For testing, use Safaricom's sandbox environment:

1. Register at [Daraja Portal](https://developer.safaricom.co.ke/)
2. Create a sandbox app
3. Use test credentials provided
4. Test phone numbers: Use format `2547XXXXXXXX`

## 📂 Project Structure

```
Tushy-backup/
├── api/
│   ├── stk-push.js      # M-Pesa STK Push endpoint
│   └── callback.js      # M-Pesa callback handler
├── images/              # Gallery images
├── index.html           # Main HTML file
├── styles.css           # Styles
├── script.js            # Frontend JavaScript
├── package.json         # Dependencies
├── vercel.json          # Vercel configuration
├── .gitignore          # Git ignore rules
├── .env.example        # Environment variables template
└── README.md           # This file
```

## 🔒 Security Notes

- ⚠️ **Never commit `.env` files** to git
- 🔐 Use environment variables for all secrets
- 🛡️ Use Supabase Service Role Key (not anon key) for server-side
- 📞 Validate phone numbers before processing
- 💰 Implement proper error handling for payments

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

ISC License

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

Made with ❤️ for Tushy Cinema