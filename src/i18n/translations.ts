import type { Language } from '../types';

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  hi: 'हिन्दी',
  te: 'తెలుగు',
};

export interface Translations {
  appName: string;
  tagline: string;
  nav: {
    home: string;
    reels: string;
    messages: string;
    notifications: string;
    create: string;
    profile: string;
    signOut: string;
    darkMode: string;
    lightMode: string;
    language: string;
  };
  auth: {
    welcomeTitle: string;
    welcomeSubtitle: string;
    continueGoogle: string;
    orDivider: string;
    loginTab: string;
    registerTab: string;
    emailLabel: string;
    passwordLabel: string;
    displayNameLabel: string;
    usernameLabel: string;
    signInBtn: string;
    createAccountBtn: string;
    verifyNoticeTitle: string;
    verifyNoticeBody: string;
    resendVerification: string;
    checkVerified: string;
    emailAuthDisabledHint: string;
  };
  feed: {
    yourStory: string;
    addStory: string;
    likes: string;
    like: string;
    shareSingular: string;
    sharesLabel: string;
    viewComments: string;
    addComment: string;
    postComment: string;
    follow: string;
    following: string;
    suggestedForYou: string;
    noPostsYet: string;
    createFirstPost: string;
    copiedLink: string;
    shareToDm: string;
    sendViaDm: string;
    editCaption: string;
    deletePost: string;
    saveChanges: string;
    cancel: string;
    pullToRefresh: string;
    releaseToRefresh: string;
    refreshingFeed: string;
    feedUpdated: string;
    trendingTopics: string;
    trendingEmpty: string;
    postSingular: string;
    postPlural: string;
    filteringBy: string;
    clearFilter: string;
    more: string;
    less: string;
  };
  reels: {
    title: string;
    originalAudio: string;
    tapToPause: string;
    muted: string;
    soundOn: string;
    noReels: string;
    uploadReel: string;
    save: string;
    saved: string;
  };
  create: {
    modalTitle: string;
    postTab: string;
    reelTab: string;
    storyTab: string;
    uploadLabel: string;
    uploadHint: string;
    captionPlaceholder: string;
    locationPlaceholder: string;
    audioPlaceholder: string;
    publishBtn: string;
    publishing: string;
    optimizing: string;
    uploadComplete: string;
    filterLabel: string;
  };
  messages: {
    title: string;
    newChat: string;
    searchConversations: string;
    searchPeople: string;
    selectConversation: string;
    selectConversationHint: string;
    typeMessage: string;
    send: string;
    emptyInbox: string;
    sharedPost: string;
    filterAll: string;
    filterFollowing: string;
    filterUnread: string;
    activeNow: string;
    tapToChat: string;
  };
  notes: {
    modalTitle: string;
    yourNote: string;
    addNote: string;
    placeholder: string;
    saveNote: string;
    clearNote: string;
  };
  notifications: {
    title: string;
    markAllRead: string;
    emptyTitle: string;
    emptyHint: string;
    likedYourPost: string;
    commentedOnPost: string;
    startedFollowing: string;
    sentYouMessage: string;
    sharedYourPost: string;
  };
  profile: {
    posts: string;
    followers: string;
    following: string;
    editProfile: string;
    shareProfile: string;
    profileCopied: string;
    yourDashboard: string;
    dashboardSummary: string;
    highlights: string;
    newHighlight: string;
    message: string;
    tabPosts: string;
    tabReels: string;
    tabSaved: string;
    emptyPosts: string;
    emptyReels: string;
    emptySaved: string;
    displayName: string;
    username: string;
    bio: string;
    website: string;
    changeAvatar: string;
    saveProfile: string;
    verified: string;
    verifyUser: string;
    removeVerification: string;
  };
}

export const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    appName: 'SnapTop',
    tagline: 'Moments in focus. Stories in motion.',
    nav: {
      home: 'Home',
      reels: 'Reels',
      messages: 'Messages',
      notifications: 'Activity',
      create: 'Create',
      profile: 'Profile',
      signOut: 'Sign out',
      darkMode: 'Dark mode',
      lightMode: 'Light mode',
      language: 'Language',
    },
    auth: {
      welcomeTitle: 'Share your world on SnapTop',
      welcomeSubtitle: 'Photos, vertical reels, stories, and real-time conversations.',
      continueGoogle: 'Continue with Google',
      orDivider: 'or',
      loginTab: 'Sign In',
      registerTab: 'Create Account',
      emailLabel: 'Email',
      passwordLabel: 'Password',
      displayNameLabel: 'Full name',
      usernameLabel: 'Username',
      signInBtn: 'Sign In',
      createAccountBtn: 'Create Account',
      verifyNoticeTitle: 'Verify your email to continue',
      verifyNoticeBody: 'A verification link was sent to your email. Verify it and tap Check status below, or continue with Google.',
      resendVerification: 'Resend link',
      checkVerified: 'Check verification status',
      emailAuthDisabledHint: 'Enable Email/Password in Firebase Console (Authentication -> Sign-in method) or sign in with Google above.',
    },
    feed: {
      yourStory: 'Your story',
      addStory: 'Add story',
      likes: 'likes',
      like: 'like',
      shareSingular: 'share',
      sharesLabel: 'shares',
      viewComments: 'View all comments',
      addComment: 'Add a comment...',
      postComment: 'Post',
      follow: 'Follow',
      following: 'Following',
      suggestedForYou: 'People on SnapTop',
      noPostsYet: 'Your feed is ready. Share your first photo or video to get started.',
      createFirstPost: 'Create your first post',
      copiedLink: 'Link copied to clipboard',
      shareToDm: 'Share',
      sendViaDm: 'Send in Messages',
      editCaption: 'Edit caption',
      deletePost: 'Delete post',
      saveChanges: 'Done',
      cancel: 'Cancel',
      pullToRefresh: 'Pull to refresh',
      releaseToRefresh: 'Release to refresh',
      refreshingFeed: 'Refreshing feed...',
      feedUpdated: 'Feed updated',
      trendingTopics: 'Trending Topics',
      trendingEmpty: 'Add #hashtags in post captions to surface trending topics.',
      postSingular: 'post',
      postPlural: 'posts',
      filteringBy: 'Filtering by',
      clearFilter: 'Clear',
      more: 'more',
      less: 'less',
    },
    reels: {
      title: 'Reels',
      originalAudio: 'Original audio',
      tapToPause: 'Tap to play or pause',
      muted: 'Muted',
      soundOn: 'Sound on',
      noReels: 'No reels yet. Upload a vertical video to start the stream.',
      uploadReel: 'Upload Reel',
      save: 'Save',
      saved: 'Saved',
    },
    create: {
      modalTitle: 'New Share',
      postTab: 'Post',
      reelTab: 'Reel',
      storyTab: 'Story',
      uploadLabel: 'Choose photo or video',
      uploadHint: 'JPG, PNG, WebP, MP4, or MOV',
      captionPlaceholder: 'Write a caption...',
      locationPlaceholder: 'Location (optional)',
      audioPlaceholder: 'Audio title (optional)',
      publishBtn: 'Share',
      publishing: 'Uploading...',
      optimizing: 'Optimizing video...',
      uploadComplete: 'Uploaded!',
      filterLabel: 'Tone',
    },
    messages: {
      title: 'Messages',
      newChat: 'New message',
      searchConversations: 'Search conversations or people...',
      searchPeople: 'Search people...',
      selectConversation: 'Direct Messages',
      selectConversationHint: 'Select a conversation or start a new chat with anyone on SnapTop.',
      typeMessage: 'Message...',
      send: 'Send',
      emptyInbox: 'No conversations yet. Tap the compose button to message someone.',
      sharedPost: 'Shared a post',
      filterAll: 'All',
      filterFollowing: 'Following',
      filterUnread: 'Unread',
      activeNow: 'Active',
      tapToChat: 'Tap to chat',
    },
    notes: {
      modalTitle: 'Share a note',
      yourNote: 'Your note',
      addNote: 'Note...',
      placeholder: 'Share a thought...',
      saveNote: 'Share note',
      clearNote: 'Clear',
    },
    notifications: {
      title: 'Activity',
      markAllRead: 'Mark all read',
      emptyTitle: 'No activity yet',
      emptyHint: 'Likes, comments, new followers, and shares appear here in real time.',
      likedYourPost: 'liked your post.',
      commentedOnPost: 'commented:',
      startedFollowing: 'started following you.',
      sentYouMessage: 'sent a message.',
      sharedYourPost: 'shared your post.',
    },
    profile: {
      posts: 'posts',
      followers: 'followers',
      following: 'following',
      editProfile: 'Edit profile',
      shareProfile: 'Share profile',
      profileCopied: 'Profile link copied',
      yourDashboard: 'Your dashboard',
      dashboardSummary: 'total interactions across your posts',
      highlights: 'Stories',
      newHighlight: 'New',
      message: 'Message',
      tabPosts: 'Posts',
      tabReels: 'Reels',
      tabSaved: 'Saved',
      emptyPosts: 'No posts yet.',
      emptyReels: 'No reels yet.',
      emptySaved: 'Posts you save appear here.',
      displayName: 'Name',
      username: 'Username',
      bio: 'Bio',
      website: 'Link',
      changeAvatar: 'Change photo',
      saveProfile: 'Save',
      verified: 'Verified',
      verifyUser: 'Verify',
      removeVerification: 'Unverify',
    },
  },
  hi: {
    appName: 'SnapTop',
    tagline: 'हर पल को संजोएं। कहानियां जो साथ चलें।',
    nav: {
      home: 'होम',
      reels: 'रील्स',
      messages: 'संदेश',
      notifications: 'गतिविधि',
      create: 'बनाएं',
      profile: 'प्रोफ़ाइल',
      signOut: 'लॉग आउट',
      darkMode: 'डार्क मोड',
      lightMode: 'लाइट मोड',
      language: 'भाषा',
    },
    auth: {
      welcomeTitle: 'SnapTop पर अपनी दुनिया साझा करें',
      welcomeSubtitle: 'फ़ोटो, वर्टिकल रील्स, स्टोरीज़ और रीयल-टाइम बातचीत।',
      continueGoogle: 'Google के साथ जारी रखें',
      orDivider: 'या',
      loginTab: 'साइन इन',
      registerTab: 'खाता बनाएं',
      emailLabel: 'ईमेल',
      passwordLabel: 'पासवर्ड',
      displayNameLabel: 'पूरा नाम',
      usernameLabel: 'यूज़रनेम',
      signInBtn: 'साइन इन करें',
      createAccountBtn: 'खाता बनाएं',
      verifyNoticeTitle: 'आगे बढ़ने के लिए ईमेल सत्यापित करें',
      verifyNoticeBody: 'आपके ईमेल पर एक सत्यापन लिंक भेजा गया है। कृपया उसे सत्यापित करें या Google से साइन इन करें।',
      resendVerification: 'लिंक फिर से भेजें',
      checkVerified: 'सत्यापन स्थिति जांचें',
      emailAuthDisabledHint: 'Firebase Console में ईमेल/पासवर्ड चालू करें या ऊपर Google के साथ जारी रखें।',
    },
    feed: {
      yourStory: 'आपकी स्टोरी',
      addStory: 'स्टोरी जोड़ें',
      likes: 'लाइक्स',
      like: 'लाइक',
      shareSingular: 'शेयर',
      sharesLabel: 'शेयर',
      viewComments: 'सभी टिप्पणियां देखें',
      addComment: 'टिप्पणी लिखें...',
      postComment: 'पोस्ट',
      follow: 'फ़ॉलो करें',
      following: 'फ़ॉलोइंग',
      suggestedForYou: 'SnapTop पर लोग',
      noPostsYet: 'आपका फ़ीड तैयार है। शुरुआत करने के लिए अपनी पहली फ़ोटो या वीडियो साझा करें।',
      createFirstPost: 'पहली पोस्ट बनाएं',
      copiedLink: 'लिंक कॉपी किया गया',
      shareToDm: 'शेयर',
      sendViaDm: 'संदेश में भेजें',
      editCaption: 'कैप्शन संपादित करें',
      deletePost: 'पोस्ट हटाएं',
      saveChanges: 'हो गया',
      cancel: 'रद्द करें',
      pullToRefresh: 'रीफ़्रेश करने के लिए नीचे खींचें',
      releaseToRefresh: 'रीफ़्रेश करने के लिए छोड़ें',
      refreshingFeed: 'फ़ीड रीफ़्रेश हो रहा है...',
      feedUpdated: 'फ़ीड अपडेट हो गया',
      trendingTopics: 'ट्रेंडिंग टॉपिक्स',
      trendingEmpty: 'ट्रेंडिंग टॉपिक्स देखने के लिए पोस्ट कैप्शन में #हैशटैग जोड़ें।',
      postSingular: 'पोस्ट',
      postPlural: 'पोस्ट',
      filteringBy: 'फ़िल्टर:',
      clearFilter: 'साफ़ करें',
      more: 'अधिक',
      less: 'कम',
    },
    reels: {
      title: 'रील्स',
      originalAudio: 'मूल ऑडियो',
      tapToPause: 'चलाने या रोकने के लिए टैप करें',
      muted: 'म्यूट',
      soundOn: 'आवाज़ चालू',
      noReels: 'अभी कोई रील नहीं है। पहली वर्टिकल वीडियो अपलोड करें!',
      uploadReel: 'रील अपलोड करें',
      save: 'सहेजें',
      saved: 'सहेजा गया',
    },
    create: {
      modalTitle: 'नया साझा करें',
      postTab: 'पोस्ट',
      reelTab: 'रील',
      storyTab: 'स्टोरी',
      uploadLabel: 'फ़ोटो या वीडियो चुनें',
      uploadHint: 'JPG, PNG, WebP, MP4, या MOV',
      captionPlaceholder: 'कैप्शन लिखें...',
      locationPlaceholder: 'स्थान (वैकल्पिक)',
      audioPlaceholder: 'ऑडियो शीर्षक (वैकल्पिक)',
      publishBtn: 'साझा करें',
      publishing: 'अपलोड हो रहा है...',
      optimizing: 'वीडियो ऑप्टिमाइज़ हो रहा है...',
      uploadComplete: 'अपलोड हो गया!',
      filterLabel: 'टोन',
    },
    messages: {
      title: 'संदेश',
      newChat: 'नया संदेश',
      searchConversations: 'बातचीत या लोग खोजें...',
      searchPeople: 'लोगों को खोजें...',
      selectConversation: 'सीधे संदेश',
      selectConversationHint: 'SnapTop पर किसी के भी साथ बातचीत शुरू करें।',
      typeMessage: 'संदेश...',
      send: 'भेजें',
      emptyInbox: 'अभी कोई बातचीत नहीं है। नया संदेश शुरू करें।',
      sharedPost: 'एक पोस्ट साझा की',
      filterAll: 'सभी',
      filterFollowing: 'फ़ॉलोइंग',
      filterUnread: 'अपठित',
      activeNow: 'सक्रिय',
      tapToChat: 'चैट करने के लिए टैप करें',
    },
    notes: {
      modalTitle: 'नोट साझा करें',
      yourNote: 'आपका नोट',
      addNote: 'नोट...',
      placeholder: 'कोई विचार लिखें...',
      saveNote: 'साझा करें',
      clearNote: 'हटाएं',
    },
    notifications: {
      title: 'गतिविधि',
      markAllRead: 'सभी पढ़ा हुआ चिह्नित करें',
      emptyTitle: 'अभी कोई गतिविधि नहीं',
      emptyHint: 'लाइक्स, टिप्पणियां, नए फ़ॉलोअर्स और शेयर यहां दिखेंगे।',
      likedYourPost: 'ने आपकी पोस्ट पसंद की।',
      commentedOnPost: 'ने टिप्पणी की:',
      startedFollowing: 'ने आपको फ़ॉलो किया।',
      sentYouMessage: 'ने संदेश भेजा।',
      sharedYourPost: 'ने आपकी पोस्ट साझा की।',
    },
    profile: {
      posts: 'पोस्ट',
      followers: 'फ़ॉलोअर्स',
      following: 'फ़ॉलोइंग',
      editProfile: 'प्रोफ़ाइल संपादित करें',
      shareProfile: 'प्रोफ़ाइल शेयर करें',
      profileCopied: 'प्रोफ़ाइल लिंक कॉपी हो गया',
      yourDashboard: 'आपका डैशबोर्ड',
      dashboardSummary: 'आपकी पोस्ट पर कुल इंटरैक्शन',
      highlights: 'स्टोरीज़',
      newHighlight: 'नया',
      message: 'संदेश',
      tabPosts: 'पोस्ट्स',
      tabReels: 'रील्स',
      tabSaved: 'सहेजे गए',
      emptyPosts: 'अभी तक कोई पोस्ट नहीं।',
      emptyReels: 'अभी तक कोई रील नहीं।',
      emptySaved: 'सहेजी गई पोस्ट यहां दिखेंगी।',
      displayName: 'नाम',
      username: 'यूज़रनेम',
      bio: 'परिचय',
      website: 'लिंक',
      changeAvatar: 'फ़ोटो बदलें',
      saveProfile: 'सहेजें',
      verified: 'सत्यापित',
      verifyUser: 'सत्यापित करें',
      removeVerification: 'सत्यापन हटाएं',
    },
  },
  te: {
    appName: 'SnapTop',
    tagline: 'ప్రతి క్షణాన్ని బంధించండి. కథలను పంచుకోండి.',
    nav: {
      home: 'హోమ్',
      reels: 'రీల్స్',
      messages: 'సందేశాలు',
      notifications: 'కార్యాచరణ',
      create: 'సృష్టించండి',
      profile: 'ప్రొఫైల్',
      signOut: 'లాగ్ అవుట్',
      darkMode: 'డార్క్ మోడ్',
      lightMode: 'లైట్ మోడ్',
      language: 'భాష',
    },
    auth: {
      welcomeTitle: 'SnapTop లో మీ ప్రపంచాన్ని పంచుకోండి',
      welcomeSubtitle: 'ఫోటోలు, వర్టికల్ రీల్స్, స్టోరీలు మరియు రియల్-టైమ్ సంభాషణలు.',
      continueGoogle: 'Google తో కొనసాగండి',
      orDivider: 'లేదా',
      loginTab: 'సైన్ ఇన్',
      registerTab: 'ఖాతా సృష్టించండి',
      emailLabel: 'ఇమెయిల్',
      passwordLabel: 'పాస్‌వర్డ్',
      displayNameLabel: 'పూర్తి పేరు',
      usernameLabel: 'యూజర్‌నేమ్',
      signInBtn: 'సైన్ ఇన్',
      createAccountBtn: 'ఖాతా సృష్టించండి',
      verifyNoticeTitle: 'కొనసాగడానికి మీ ఇమెయిల్‌ను ధృవీకరించండి',
      verifyNoticeBody: 'మీ ఇమెయిల్‌కు ధృవీకరణ లింక్ పంపబడింది. ధృవీకరించండి లేదా Google తో సైన్ ఇన్ చేయండి.',
      resendVerification: 'లింక్ మళ్లీ పంపండి',
      checkVerified: 'ధృవీకరణ స్థితిని తనిఖీ చేయండి',
      emailAuthDisabledHint: 'Firebase Console లో ఇమెయిల్/పాస్‌వర్డ్ ఎనేబుల్ చేయండి లేదా పైన Google తో కొనసాగండి.',
    },
    feed: {
      yourStory: 'మీ స్టోరీ',
      addStory: 'స్టోరీ జోడించండి',
      likes: 'లైక్‌లు',
      like: 'లైక్',
      shareSingular: 'షేర్',
      sharesLabel: 'షేర్లు',
      viewComments: 'అన్ని కామెంట్లను చూడండి',
      addComment: 'కామెంట్ రాయండి...',
      postComment: 'పోస్ట్',
      follow: 'ఫాలో',
      following: 'ఫాలోయింగ్',
      suggestedForYou: 'SnapTop లో వ్యక్తులు',
      noPostsYet: 'మీ ఫీడ్ సిద్ధంగా ఉంది. ప్రారంభించడానికి మీ మొదటి ఫోటో లేదా వీడియోను షేర్ చేయండి.',
      createFirstPost: 'మొదటి పోస్ట్ సృష్టించండి',
      copiedLink: 'లింక్ కాపీ చేయబడింది',
      shareToDm: 'షేర్',
      sendViaDm: 'సందేశాల్లో పంపండి',
      editCaption: 'క్యాప్షన్ సవరించండి',
      deletePost: 'పోస్ట్ తొలగించండి',
      saveChanges: 'పూర్తయింది',
      cancel: 'రద్దు',
      pullToRefresh: 'రిఫ్రెష్ చేయడానికి క్రిందికి లాగండి',
      releaseToRefresh: 'రిఫ్రెష్ చేయడానికి వదలండి',
      refreshingFeed: 'ఫీడ్ రిఫ్రెష్ అవుతోంది...',
      feedUpdated: 'ఫీడ్ అప్‌డేట్ చేయబడింది',
      trendingTopics: 'ట్రెండింగ్ టాపిక్స్',
      trendingEmpty: 'ట్రెండింగ్ టాపిక్స్ చూడటానికి పోస్ట్ క్యాప్షన్లలో #హ్యాష్‌ట్యాగ్‌లు చేర్చండి.',
      postSingular: 'పోస్ట్',
      postPlural: 'పోస్టులు',
      filteringBy: 'ఫిల్టర్:',
      clearFilter: 'క్లియర్',
      more: 'మరింత',
      less: 'తక్కువ',
    },
    reels: {
      title: 'రీల్స్',
      originalAudio: 'అసలు ఆడియో',
      tapToPause: 'ప్లే లేదా పాజ్ చేయడానికి ట్యాప్ చేయండి',
      muted: 'మ్యూట్',
      soundOn: 'ధ్వని ఆన్',
      noReels: 'ఇంకా రీల్స్ లేవు. మొదటి వర్టికల్ వీడియోను అప్‌లోడ్ చేయండి!',
      uploadReel: 'రీల్ అప్‌లోడ్ చేయండి',
      save: 'సేవ్',
      saved: 'సేవ్ అయింది',
    },
    create: {
      modalTitle: 'కొత్త షేర్',
      postTab: 'పోస్ట్',
      reelTab: 'రీల్',
      storyTab: 'స్టోరీ',
      uploadLabel: 'ఫోటో లేదా వీడియో ఎంచుకోండి',
      uploadHint: 'JPG, PNG, WebP, MP4, లేదా MOV',
      captionPlaceholder: 'క్యాప్షన్ రాయండి...',
      locationPlaceholder: 'ప్రదేశం (ఐచ్ఛికం)',
      audioPlaceholder: 'ఆడియో పేరు (ఐచ్ఛికం)',
      publishBtn: 'షేర్ చేయండి',
      publishing: 'అప్‌లోడ్ అవుతోంది...',
      optimizing: 'వీడియో ఆప్టిమైజ్ అవుతోంది...',
      uploadComplete: 'అప్‌లోడ్ పూర్తయింది!',
      filterLabel: 'టోన్',
    },
    messages: {
      title: 'సందేశాలు',
      newChat: 'కొత్త సందేశం',
      searchConversations: 'చాట్‌లు లేదా వ్యక్తులను వెతకండి...',
      searchPeople: 'వ్యక్తులను వెతకండి...',
      selectConversation: 'డైరెక్ట్ మెసేజ్‌లు',
      selectConversationHint: 'SnapTop లో ఎవరితోనైనా సంభాషణ ప్రారంభించండి.',
      typeMessage: 'సందేశం...',
      send: 'పంపండి',
      emptyInbox: 'ఇంకా సంభాషణలు లేవు. కొత్త చాట్ ప్రారంభించండి.',
      sharedPost: 'ఒక పోస్ట్ షేర్ చేశారు',
      filterAll: 'అన్నీ',
      filterFollowing: 'ఫాలోయింగ్',
      filterUnread: 'చదవనివి',
      activeNow: 'యాక్టివ్',
      tapToChat: 'చాట్ చేయడానికి ట్యాప్ చేయండి',
    },
    notes: {
      modalTitle: 'నోట్ షేర్ చేయండి',
      yourNote: 'మీ నోట్',
      addNote: 'నోట్...',
      placeholder: 'ఒక ఆలోచన పంచుకోండి...',
      saveNote: 'షేర్ చేయండి',
      clearNote: 'క్లియర్',
    },
    notifications: {
      title: 'కార్యాచరణ',
      markAllRead: 'అన్నీ చదివినట్లు గుర్తించు',
      emptyTitle: 'ఇంకా కార్యాచరణ లేదు',
      emptyHint: 'లైక్‌లు, కామెంట్లు, కొత్త ఫాలోవర్లు మరియు షేర్‌లు ఇక్కడ కనిపిస్తాయి.',
      likedYourPost: 'మీ పోస్ట్‌ను లైక్ చేశారు.',
      commentedOnPost: 'కామెంట్ చేశారు:',
      startedFollowing: 'మిమ్మల్ని ఫాలో చేశారు.',
      sentYouMessage: 'సందేశం పంపారు.',
      sharedYourPost: 'మీ పోస్ట్‌ను షేర్ చేశారు.',
    },
    profile: {
      posts: 'పోస్టులు',
      followers: 'ఫాలోవర్లు',
      following: 'ఫాలోయింగ్',
      editProfile: 'ప్రొఫైల్ సవరించండి',
      shareProfile: 'ప్రొఫైల్ షేర్ చేయండి',
      profileCopied: 'ప్రొఫైల్ లింక్ కాపీ అయింది',
      yourDashboard: 'మీ డ్యాష్‌బోర్డ్',
      dashboardSummary: 'మీ పోస్టులపై మొత్తం ఇంటరాక్షన్లు',
      highlights: 'స్టోరీలు',
      newHighlight: 'కొత్తది',
      message: 'సందేశం',
      tabPosts: 'పోస్టులు',
      tabReels: 'రీల్స్',
      tabSaved: 'సేవ్ చేసినవి',
      emptyPosts: 'ఇంకా పోస్టులు లేవు.',
      emptyReels: 'ఇంకా రీల్స్ లేవు.',
      emptySaved: 'మీరు సేవ్ చేసిన పోస్టులు ఇక్కడ కనిపిస్తాయి.',
      displayName: 'పేరు',
      username: 'యూజర్‌నేమ్',
      bio: 'బయో',
      website: 'లింక్',
      changeAvatar: 'ఫోటో మార్చండి',
      saveProfile: 'సేవ్ చేయండి',
      verified: 'ధృవీకరించబడింది',
      verifyUser: 'ధృవీకరించు',
      removeVerification: 'ధృవీకరణ తొలగించు',
    },
  },
};
