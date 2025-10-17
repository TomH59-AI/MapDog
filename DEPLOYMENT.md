# 🚀 MapDog Deployment Guide

## 📋 Pre-Deployment Checklist

✅ **Project Built**: MapDog is fully functional in sandbox  
✅ **Database Schema**: D1 migrations ready  
✅ **API Integration**: MapWise API integrated with real key  
✅ **Git Repository**: All code committed locally  
⏳ **GitHub Push**: Waiting for GitHub authorization  
⏳ **Cloudflare Deploy**: Waiting for API key setup  

---

## 🔐 Step 1: GitHub Setup

### Option A: Use GitHub UI Authorization (Recommended)
1. Go to **#github tab** in the sidebar
2. Complete GitHub authorization
3. Come back and I'll push the code

### Option B: Personal Access Token
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it these scopes:
   - `repo` (full control)
   - `workflow` (if using Actions)
4. Copy the token and give it to me

### Push Command (Manual)
```bash
cd /home/user/mapdog

# Create repo on GitHub first at: https://github.com/new
# Name: mapdog
# Description: 🐕 Site Acquisition Parcel Intelligence for Wireless Industry

# Add remote and push
git remote add origin https://github.com/TomH59-AI/mapdog.git
git branch -M main
git push -u origin main
```

---

## ☁️ Step 2: Cloudflare Pages Deployment

### Setup Cloudflare API Key
1. Go to **Deploy tab** in the sidebar
2. Follow instructions to create Cloudflare API token
3. Enter and save your API key

### Create Production D1 Database
```bash
cd /home/user/mapdog

# Create database
npx wrangler d1 create mapdog-production

# You'll get output like:
# database_id = "abc123..."

# Copy the database_id and update wrangler.jsonc
```

### Update wrangler.jsonc
```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "mapdog-production",
      "database_id": "YOUR_DATABASE_ID_HERE"  // ← Paste here
    }
  ]
}
```

### Run Production Migrations
```bash
npm run db:migrate:prod
```

### Set MapWise API Key Secret
```bash
npx wrangler pages secret put MAPWISE_API_KEY --project-name mapdog
# When prompted, paste: d7e8121ef5e0324b8e009fb179bd20aaa062317adb5ce7780c82e3841263090d
```

### Create Cloudflare Pages Project
```bash
npx wrangler pages project create mapdog \
  --production-branch main \
  --compatibility-date 2024-01-01
```

### Deploy to Production
```bash
npm run deploy:prod
```

### Expected Output
```
✨ Success! Uploaded 2 files
✨ Deployment complete! Take a peek at https://mapdog.pages.dev
```

---

## 🌐 Step 3: Verify Deployment

### Test Production URLs
```bash
# Homepage
curl https://mapdog.pages.dev

# API search test
curl "https://mapdog.pages.dev/api/parcels/search?county=ORANGE&limit=1"

# Stats endpoint
curl https://mapdog.pages.dev/api/stats
```

### Access Live Application
Open: https://mapdog.pages.dev

Try searching for:
- ALACHUA
- ORANGE
- MIAMI-DADE
- PALM BEACH

---

## 🔧 Post-Deployment Configuration

### Custom Domain (Optional)
```bash
npx wrangler pages domain add yourdomain.com --project-name mapdog
```

### Monitor Deployment
- **Dashboard**: https://dash.cloudflare.com/
- **Analytics**: Pages → mapdog → Analytics
- **Logs**: Pages → mapdog → Functions → Logs

### Update Secrets
```bash
# List secrets
npx wrangler pages secret list --project-name mapdog

# Update API key
npx wrangler pages secret put MAPWISE_API_KEY --project-name mapdog

# Delete secret
npx wrangler pages secret delete MAPWISE_API_KEY --project-name mapdog
```

---

## 🐛 Troubleshooting

### Database Not Found
```bash
# Check database exists
npx wrangler d1 list

# Verify migrations
npx wrangler d1 migrations list mapdog-production
```

### API Key Not Working
```bash
# Verify secret is set
npx wrangler pages secret list --project-name mapdog

# Re-add secret
npx wrangler pages secret put MAPWISE_API_KEY --project-name mapdog
```

### Build Failures
```bash
# Clean and rebuild
cd /home/user/mapdog
rm -rf dist node_modules .wrangler
npm install
npm run build
```

### Port Conflicts (Local)
```bash
# Kill all PM2 processes
pm2 delete all

# Clean port 3000
fuser -k 3000/tcp
```

---

## 📊 Production URLs Structure

Once deployed, your URLs will be:

- **Production**: `https://mapdog.pages.dev`
- **Branch Deploys**: `https://main.mapdog.pages.dev`
- **API Endpoints**: `https://mapdog.pages.dev/api/*`

### API Endpoints
- `GET /api/parcels/search?county=ALACHUA&limit=10`
- `POST /api/parcels/save`
- `GET /api/parcels/saved`
- `DELETE /api/parcels/saved/:id`
- `GET /api/searches/history`
- `GET /api/stats`

---

## 🔄 Continuous Deployment

### Manual Redeploy
```bash
cd /home/user/mapdog
npm run build
npm run deploy:prod
```

### With GitHub (Future)
Once GitHub is connected, you can set up:
1. **GitHub Actions** for automatic deployment on push
2. **Preview Deployments** for pull requests
3. **Branch Previews** for feature testing

---

## 📈 Next Steps After Deployment

1. **Test all features** with real parcel searches
2. **Save some test parcels** to verify D1 persistence
3. **Export CSV** to confirm data export works
4. **Check statistics** to verify metrics tracking
5. **Monitor logs** in Cloudflare dashboard
6. **Set up custom domain** if desired
7. **Share URL** with your team

---

## 💡 Pro Tips

- **Development**: Always test locally before deploying
- **Secrets**: Never commit `.dev.vars` (already in .gitignore)
- **Database**: Use `--local` flag for D1 development
- **Logs**: Check Cloudflare dashboard for production errors
- **Rollback**: Use Cloudflare dashboard to rollback to previous deployment

---

## 🎯 Current Status

**Sandbox URL**: https://3000-iib39u02refqtw9zer0xb-d0b9e1e2.sandbox.novita.ai  
**Production URL**: *Pending deployment*  
**GitHub Repo**: *Pending push*  

**Ready to deploy when you:**
1. Set up Cloudflare API key in Deploy tab
2. Authorize GitHub (optional, for code backup)

---

**🐕 MapDog is ready to hunt! Let's deploy this beast.** 🚀
