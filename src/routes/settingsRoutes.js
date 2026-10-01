import express from 'express';
import { query } from '../db/db.js';

const router = express.Router();

// Get Public App Settings & Branding from Supabase PostgreSQL
router.get('/public', async (req, res) => {
  try {
    const resSettings = await query(`SELECT setting_key, setting_value FROM app_settings WHERE is_public = TRUE`);

    const settingsMap = {};
    resSettings.rows.forEach(r => {
      settingsMap[r.setting_key] = r.setting_value;
    });

    res.json({
      success: true,
      branding: settingsMap.app_branding || {},
      features: settingsMap.feature_flags || {},
      maintenance: settingsMap.maintenance_mode || { enabled: false },
      version: settingsMap.version_control || { min_version: '1.0.0' }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Legal and Policy Documents
router.get('/legal/:docType', (req, res) => {
  const { docType } = req.params;

  const legalDocs = {
    'privacy-policy': {
      title: 'VoraTok Privacy Policy',
      lastUpdated: 'September 2026',
      content: `
# VoraTok Privacy Policy

Welcome to VoraTok ("we", "our", or "us"). We are committed to protecting your personal information and your right to privacy.

### 1. Information We Collect
- **Account Information:** Name, username, mobile number, date of birth, and profile bio.
- **Content:** Videos you create, captions, audio selections, comments, and drafts.
- **Usage Data:** Videos watched, likes, shares, watch duration, and interaction metrics.
- **Device & Technical Information:** Device type, operating system version, and anonymous crash analytics.

### 2. How We Use Your Data
- To provide, personalize, and improve the VoraTok vertical video feed.
- To secure accounts using OTP mobile verification.
- To detect and prevent spam, fraud, harassment, and abuse.
- To deliver relevant sponsored content and advertisements.

### 3. Data Protection & Security
We use industry-standard encryption, tokenized sessions, and secure server hashing (bcrypt) to ensure that your sensitive data and passwords remain secure.
      `
    },
    'terms': {
      title: 'VoraTok Terms & Conditions',
      lastUpdated: 'September 2026',
      content: `
# VoraTok Terms & Conditions

### 1. Acceptance of Terms
By accessing or using VoraTok, you agree to comply with and be bound by these Terms of Service.

### 2. User Accounts
You are responsible for safeguarding your login credentials. You must be at least 13 years old to create an account.

### 3. Content Ownership & Permissions
You retain ownership of the original content you post on VoraTok. By posting, you grant VoraTok a worldwide license to host, display, and distribute your content across our platform.
      `
    },
    'community-guidelines': {
      title: 'VoraTok Community Guidelines',
      lastUpdated: 'September 2026',
      content: `
# VoraTok Community Guidelines

Our mission is to create a vibrant, safe, and inspiring global short-video community.

### What is strictly prohibited:
- **Harassment and Bullying:** Targeting individuals with malicious, hateful, or abusive behavior.
- **Hate Speech:** Content attacking protected attributes including race, religion, gender, or nationality.
- **Dangerous Content:** Incitement of violence, illegal acts, or dangerous stunts.
- **Copyright Infringement:** Re-uploading intellectual property without authorization.
      `
    },
    'account-deletion': {
      title: 'Account Deletion & Data Retention Policy',
      lastUpdated: 'September 2026',
      content: `
# Account Deletion Workflow

You have the complete right to delete your VoraTok account at any time via Settings -> Delete Account.
Upon confirming deletion:
- Your profile, videos, comments, and likes are immediately hidden.
- After a 14-day grace period, all associated personal records are permanently erased from active production databases.
      `
    }
  };

  const doc = legalDocs[docType];
  if (!doc) {
    return res.status(404).json({ success: false, error: 'Document not found.' });
  }

  res.json({ success: true, document: doc });
});

export default router;
