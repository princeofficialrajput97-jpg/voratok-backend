import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// Pre-computed hash for 'Password@123'
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('Password@123', 10);

export class VoraStore {
  constructor() {
    this.init();
  }

  init() {
    // 1. Content Categories
    this.content_categories = [
      { id: 'c1', name: 'Trending', slug: 'trending', icon: 'flame', display_order: 1, is_active: true },
      { id: 'c2', name: 'Comedy', slug: 'comedy', icon: 'laugh', display_order: 2, is_active: true },
      { id: 'c3', name: 'Dance', slug: 'dance', icon: 'music', display_order: 3, is_active: true },
      { id: 'c4', name: 'Music', slug: 'music', icon: 'headphones', display_order: 4, is_active: true },
      { id: 'c5', name: 'Gaming', slug: 'gaming', icon: 'gamepad-2', display_order: 5, is_active: true },
      { id: 'c6', name: 'Lifestyle', slug: 'lifestyle', icon: 'sparkles', display_order: 6, is_active: true },
      { id: 'c7', name: 'Technology', slug: 'tech', icon: 'cpu', display_order: 7, is_active: true },
      { id: 'c8', name: 'Food & Cooking', slug: 'food', icon: 'utensils', display_order: 8, is_active: true }
    ];

    // 2. Users
    this.users = [
      {
        id: 'u1',
        username: 'voratok_official',
        full_name: 'VoraTok Official',
        mobile_number: '+919876543210',
        password_hash: DEFAULT_PASSWORD_HASH,
        dob: '2000-01-01',
        bio: 'Official VoraTok HQ account 🚀 Watch. Create. Connect.',
        profile_photo_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
        cover_photo_url: '',
        is_verified: true,
        is_banned: false,
        is_suspended: false,
        suspension_reason: null,
        role: 'super_admin',
        fcm_token: null,
        created_at: new Date(Date.now() - 30 * 86400000).toISOString()
      },
      {
        id: 'u2',
        username: 'aarav_creates',
        full_name: 'Aarav Sharma',
        mobile_number: '+919811122233',
        password_hash: DEFAULT_PASSWORD_HASH,
        dob: '1998-05-14',
        bio: 'Cinematographer & VFX Artist 🎬 Mumbai, India ✨',
        profile_photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        cover_photo_url: '',
        is_verified: true,
        is_banned: false,
        is_suspended: false,
        suspension_reason: null,
        role: 'creator',
        fcm_token: null,
        created_at: new Date(Date.now() - 25 * 86400000).toISOString()
      },
      {
        id: 'u3',
        username: 'priya_grooves',
        full_name: 'Priya Patel',
        mobile_number: '+919844455566',
        password_hash: DEFAULT_PASSWORD_HASH,
        dob: '2001-09-22',
        bio: 'Choreographer & dancer 💃 Living in the beat!',
        profile_photo_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
        cover_photo_url: '',
        is_verified: true,
        is_banned: false,
        is_suspended: false,
        suspension_reason: null,
        role: 'creator',
        fcm_token: null,
        created_at: new Date(Date.now() - 20 * 86400000).toISOString()
      },
      {
        id: 'u4',
        username: 'rohit_comedy',
        full_name: 'Rohit Varma',
        mobile_number: '+919877788899',
        password_hash: DEFAULT_PASSWORD_HASH,
        dob: '1999-12-03',
        bio: 'Daily laughs & relatable comedy sketches 😂🔥',
        profile_photo_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
        cover_photo_url: '',
        is_verified: true,
        is_banned: false,
        is_suspended: false,
        suspension_reason: null,
        role: 'creator',
        fcm_token: null,
        created_at: new Date(Date.now() - 15 * 86400000).toISOString()
      },
      {
        id: 'u5',
        username: 'tech_neha',
        full_name: 'Neha Kapoor',
        mobile_number: '+919833344455',
        password_hash: DEFAULT_PASSWORD_HASH,
        dob: '1997-03-18',
        bio: 'AI, futuristic gadgets & mobile tech updates 📱⚡',
        profile_photo_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80',
        cover_photo_url: '',
        is_verified: true,
        is_banned: false,
        is_suspended: false,
        suspension_reason: null,
        role: 'creator',
        fcm_token: null,
        created_at: new Date(Date.now() - 10 * 86400000).toISOString()
      }
    ];

    // 3. Profiles
    this.profiles = [
      {
        id: 'p1',
        user_id: 'u1',
        website: 'https://voratok.app',
        instagram_handle: 'voratok_hq',
        youtube_handle: '',
        is_private: false,
        allow_comments: 'everyone',
        allow_messages: 'everyone',
        allow_downloads: true,
        show_activity_status: true,
        followers_count: 1245000,
        following_count: 12,
        likes_count: 8920000,
        videos_count: 4
      },
      {
        id: 'p2',
        user_id: 'u2',
        website: 'https://aaravsharma.com',
        instagram_handle: 'aarav_creates',
        youtube_handle: '',
        is_private: false,
        allow_comments: 'everyone',
        allow_messages: 'everyone',
        allow_downloads: true,
        show_activity_status: true,
        followers_count: 485000,
        following_count: 180,
        likes_count: 2400000,
        videos_count: 12
      },
      {
        id: 'p3',
        user_id: 'u3',
        website: 'https://instagram.com/priyagrooves',
        instagram_handle: 'priya_grooves',
        youtube_handle: '',
        is_private: false,
        allow_comments: 'everyone',
        allow_messages: 'everyone',
        allow_downloads: true,
        show_activity_status: true,
        followers_count: 732000,
        following_count: 95,
        likes_count: 4120000,
        videos_count: 18
      },
      {
        id: 'p4',
        user_id: 'u4',
        website: 'https://youtube.com/@rohitcomedy',
        instagram_handle: 'rohit_comedy',
        youtube_handle: '',
        is_private: false,
        allow_comments: 'everyone',
        allow_messages: 'everyone',
        allow_downloads: true,
        show_activity_status: true,
        followers_count: 612000,
        following_count: 210,
        likes_count: 3950000,
        videos_count: 25
      },
      {
        id: 'p5',
        user_id: 'u5',
        website: 'https://nehadigital.in',
        instagram_handle: 'tech_neha',
        youtube_handle: '',
        is_private: false,
        allow_comments: 'everyone',
        allow_messages: 'everyone',
        allow_downloads: true,
        show_activity_status: true,
        followers_count: 315000,
        following_count: 84,
        likes_count: 1800000,
        videos_count: 9
      }
    ];

    // 4. Hashtags
    this.hashtags = [
      { id: 'h1', tag_name: 'VoraTok', use_count: 542000, view_count: 14200000, is_trending: true },
      { id: 'h2', tag_name: 'India', use_count: 980000, view_count: 25800000, is_trending: true },
      { id: 'h3', tag_name: 'Dance', use_count: 740000, view_count: 18900000, is_trending: true },
      { id: 'h4', tag_name: 'Comedy', use_count: 890000, view_count: 22100000, is_trending: true },
      { id: 'h5', tag_name: 'Trending', use_count: 1200000, view_count: 31400000, is_trending: true },
      { id: 'h6', tag_name: 'TechTrends', use_count: 320000, view_count: 8400000, is_trending: false }
    ];

    // 5. Videos (Vertical 9:16 high quality sample videos)
    this.videos = [
      {
        id: 'v1',
        user_id: 'u2',
        category_id: 'c1',
        title: 'Cyberpunk Mumbai',
        caption: 'Cyberpunk neon night ride in Mumbai 🌃✨ Who wants the color grading LUT? #VoraTok #Trending #India',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnail_url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80',
        duration_seconds: 15.0,
        width: 1080,
        height: 1920,
        resolution: '1080x1920',
        file_size_bytes: 8420000,
        audio_title: 'Midnight Cyber Synth - Original',
        audio_artist: 'Aarav Sharma',
        audio_url: '',
        view_count: 245000,
        like_count: 48200,
        comment_count: 1240,
        share_count: 850,
        save_count: 3100,
        privacy: 'public',
        comment_permission: 'everyone',
        allow_download: true,
        status: 'published',
        processing_progress: 100,
        is_featured: true,
        score: 98.5,
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'v2',
        user_id: 'u3',
        category_id: 'c3',
        title: 'Desi Pulse Beat Dance',
        caption: 'Learn this hook step in 10 seconds! 💃 tag your bestie to try it 🔥 #Dance #Trending #VoraTok',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        thumbnail_url: 'https://images.unsplash.com/photo-1547153760-18fc86324498?w=600&auto=format&fit=crop&q=80',
        duration_seconds: 14.5,
        width: 1080,
        height: 1920,
        resolution: '1080x1920',
        file_size_bytes: 7890000,
        audio_title: 'Desi Pulse Beat - Priya Remix',
        audio_artist: 'Priya Patel',
        audio_url: '',
        view_count: 512000,
        like_count: 94100,
        comment_count: 3420,
        share_count: 2400,
        save_count: 8100,
        privacy: 'public',
        comment_permission: 'everyone',
        allow_download: true,
        status: 'published',
        processing_progress: 100,
        is_featured: true,
        score: 96.2,
        created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 6).toISOString()
      },
      {
        id: 'v3',
        user_id: 'u4',
        category_id: 'c2',
        title: 'Mom calls during rank match',
        caption: 'When your mom calls while playing competitive rank match 😂😭 #Comedy #India #VoraTok',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        thumbnail_url: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&auto=format&fit=crop&q=80',
        duration_seconds: 18.0,
        width: 1080,
        height: 1920,
        resolution: '1080x1920',
        file_size_bytes: 9200000,
        audio_title: 'Hilarious Sitcom Laughs',
        audio_artist: 'Rohit Varma',
        audio_url: '',
        view_count: 820000,
        like_count: 162000,
        comment_count: 5800,
        share_count: 4200,
        save_count: 12500,
        privacy: 'public',
        comment_permission: 'everyone',
        allow_download: true,
        status: 'published',
        processing_progress: 100,
        is_featured: true,
        score: 99.1,
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 12).toISOString()
      },
      {
        id: 'v4',
        user_id: 'u5',
        category_id: 'c7',
        title: 'Future Tech in your Pocket',
        caption: 'Top 3 AI features that feel like 2035 in your pocket ⚡📲 #TechTrends #VoraTok',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
        thumbnail_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
        duration_seconds: 20.0,
        width: 1080,
        height: 1920,
        resolution: '1080x1920',
        file_size_bytes: 10400000,
        audio_title: 'Future Ambient Tech Sound',
        audio_artist: 'Neha Tech',
        audio_url: '',
        view_count: 198000,
        like_count: 35400,
        comment_count: 890,
        share_count: 620,
        save_count: 2400,
        privacy: 'public',
        comment_permission: 'everyone',
        allow_download: true,
        status: 'published',
        processing_progress: 100,
        is_featured: false,
        score: 87.4,
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 24).toISOString()
      }
    ];

    // 6. Video Likes
    this.video_likes = [];

    // 7. Comments
    this.comments = [
      {
        id: 'cm1',
        video_id: 'v1',
        user_id: 'u3',
        parent_comment_id: null,
        content: 'That transition at 0:08 was INSANE 🔥🔥',
        like_count: 342,
        is_pinned: true,
        is_hidden: false,
        status: 'active',
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'cm2',
        video_id: 'v1',
        user_id: 'u2',
        parent_comment_id: 'cm1',
        content: 'Thanks Priya! Used the custom motion blur curve 🎬✨',
        like_count: 89,
        is_pinned: false,
        is_hidden: false,
        status: 'active',
        created_at: new Date(Date.now() - 3500000).toISOString()
      },
      {
        id: 'cm3',
        video_id: 'v2',
        user_id: 'u4',
        parent_comment_id: null,
        content: 'Tried the hook step and sprained my ankle, 10/10 choreography 😂💀',
        like_count: 820,
        is_pinned: false,
        is_hidden: false,
        status: 'active',
        created_at: new Date(Date.now() - 1800000).toISOString()
      }
    ];

    this.comment_likes = [];

    // 8. Follows
    this.follows = [
      { id: 'f1', follower_id: 'u1', following_id: 'u2', status: 'active', created_at: new Date().toISOString() },
      { id: 'f2', follower_id: 'u1', following_id: 'u3', status: 'active', created_at: new Date().toISOString() },
      { id: 'f3', follower_id: 'u2', following_id: 'u3', status: 'active', created_at: new Date().toISOString() }
    ];

    // 9. Notifications
    this.notifications = [
      {
        id: 'n1',
        recipient_id: 'u2',
        sender_id: 'u3',
        type: 'comment',
        reference_id: 'v1',
        reference_type: 'video',
        message: 'priya_grooves commented on your video: "That transition at 0:08 was INSANE 🔥🔥"',
        is_read: false,
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'n2',
        recipient_id: 'u2',
        sender_id: 'u1',
        type: 'follow',
        reference_id: null,
        reference_type: 'user',
        message: 'voratok_official started following you.',
        is_read: true,
        created_at: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: 'n3',
        recipient_id: 'u2',
        sender_id: null,
        type: 'system',
        reference_id: null,
        reference_type: 'system',
        message: 'Welcome to VoraTok! Start creating reels and connect with millions.',
        is_read: true,
        created_at: new Date(Date.now() - 86400000).toISOString()
      }
    ];

    // 10. Saved Videos
    this.saved_videos = [];

    // 11. Video Drafts
    this.video_drafts = [];

    // 12. OTP Verifications
    this.otp_verifications = [];

    // 13. Reports & Moderation
    this.reports = [];

    // 14. Blocked Users
    this.blocked_users = [];

    // 15. User Sessions
    this.user_sessions = [];

    // 16. Advertisements
    this.advertisements = [
      {
        id: 'ad1',
        title: 'CyberWatch Ultra 2',
        type: 'native',
        provider: 'admob',
        ad_unit_id: 'ca-app-pub-3940256099942544/6300978111',
        sponsor_name: 'Nova Gear India',
        sponsor_avatar: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&auto=format&fit=crop&q=80',
        click_url: 'https://example.com/cyberwatch',
        media_url: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&auto=format&fit=crop&q=80',
        caption: 'Experience next-gen titanium build with 14-day battery life. Limited launch offer!',
        cta_text: 'Shop Now',
        display_frequency: 4,
        is_active: true,
        test_mode: true,
        impressions_count: 1420,
        clicks_count: 85,
        created_at: new Date().toISOString()
      }
    ];

    // 17. Admin Logs
    this.admin_logs = [
      {
        id: 'log1',
        admin_id: 'u1',
        admin_username: 'voratok_official',
        action: 'SYSTEM_BOOT',
        entity_type: 'SYSTEM',
        entity_id: 'server',
        details_json: { message: 'VoraTok API Server initialized' },
        ip_address: '127.0.0.1',
        created_at: new Date().toISOString()
      }
    ];

    // 18. App Settings & Feature Flags
    this.app_settings = {
      app_branding: {
        name: 'VoraTok',
        tagline: 'Watch. Create. Connect.',
        primaryColor: '#8C52FF',
        accentColor: '#FF1B6B',
        logoUrl: '/assets/logo.svg'
      },
      feature_flags: {
        messaging: true,
        creator_monetization: false,
        downloads: true,
        ads_enabled: true,
        new_editor: true,
        live_streaming: false,
        virtual_gifts: false
      },
      maintenance_mode: {
        enabled: false,
        message: 'VoraTok is currently undergoing scheduled maintenance. We will be back shortly!'
      },
      version_control: {
        min_version: '1.0.0',
        latest_version: '1.2.0',
        force_update: false,
        update_url: 'https://play.google.com/store/apps/details?id=com.voratok.app'
      },
      ad_settings: {
        admob_app_id: 'ca-app-pub-3940256099942544~3347511713',
        banner_ad_unit: 'ca-app-pub-3940256099942544/6300978111',
        interstitial_ad_unit: 'ca-app-pub-3940256099942544/1033173712',
        rewarded_ad_unit: 'ca-app-pub-3940256099942544/5224354917',
        feed_ad_frequency: 4,
        test_mode: true
      }
    };

    // 19. Direct Messages
    this.conversations = [];
    this.direct_messages = [];
  }

  // --- Helper Query Methods ---

  getUserById(id) {
    return this.users.find(u => u.id === id);
  }

  getUserByUsername(username) {
    return this.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  getUserByMobile(mobile) {
    const cleanMobile = mobile.replace(/\s+/g, '');
    return this.users.find(u => u.mobile_number.replace(/\s+/g, '') === cleanMobile);
  }

  getProfileByUserId(userId) {
    return this.profiles.find(p => p.user_id === userId);
  }

  logAdminAction(adminUser, action, entityType, entityId, details = {}, ip = '127.0.0.1') {
    const logEntry = {
      id: uuidv4(),
      admin_id: adminUser?.id || null,
      admin_username: adminUser?.username || 'system',
      action,
      entity_type: entityType,
      entity_id: String(entityId),
      details_json: details,
      ip_address: ip,
      created_at: new Date().toISOString()
    };
    this.admin_logs.unshift(logEntry);
    return logEntry;
  }
}

export const db = new VoraStore();
