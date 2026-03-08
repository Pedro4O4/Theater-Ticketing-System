'use client';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api from '@/services/api';

export type Language = 'en' | 'ar';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => Promise<void>;
    t: (key: string) => string;
    isRTL: boolean;
}

// ─── Translations ───────────────────────────────────────────────────────────
const translations: Record<Language, Record<string, string>> = {
    en: {
        // Navbar
        'nav.home': 'Home',
        'nav.user': 'User',
        'nav.organizer': 'Organizer',
        'nav.admin': 'Admin',
        'nav.login': 'Login',
        'nav.register': 'Register',
        'nav.profile': 'Profile',
        'nav.logout': 'Logout',
        'nav.explore': 'Explore Events',
        'nav.bookings': 'My Bookings',
        'nav.myEvents': 'My Events',
        'nav.createEvent': 'Create Event',
        'nav.analytics': 'Analytics',
        'nav.manageEvents': 'Manage Events',
        'nav.manageUsers': 'Manage Users',
        'nav.manageTheaters': 'Manage Theaters',
        // Language picker
        'lang.switchLabel': 'Language',
        'lang.en': 'English',
        'lang.ar': 'العربية',
        // Logout dialog
        'logout.title': 'Logout Confirmation',
        'logout.confirm': 'Are you sure you want to logout?',
        'logout.yes': 'Yes',
        'logout.no': 'No',
        'logout.loading': 'Logging out...',
        // Choose language page
        'chooseLang.title': 'Choose Your Language',
        'chooseLang.subtitle': 'You can change this anytime from the top bar',
        'chooseLang.en.name': 'English',
        'chooseLang.en.sample': 'Welcome to EventTix',
        'chooseLang.ar.name': 'العربية',
        'chooseLang.ar.sample': 'مرحباً بك في EventTix',
        'chooseLang.continue': 'Continue',
        // Homepage — hero
        'home.hero.title': 'Experience the Magic of Live Performance',
        'home.hero.subtitle': 'Discover extraordinary events that will leave you breathless',
        'home.hero.browse': 'Browse Events',
        'home.hero.start': 'Get Started',
        // Homepage — stats
        'home.stats.tickets': 'Tickets Sold',
        'home.stats.customers': 'Happy Customers',
        'home.stats.events': 'Events Hosted',
        'home.stats.rating': 'Average Rating',
        // Homepage — features
        'home.features.title': 'Why Choose EventTix?',
        'home.features.premium': 'Premium Events',
        'home.features.premium.desc': 'Access to the most exclusive and highly-rated events in your area',
        'home.features.prices': 'Best Prices',
        'home.features.prices.desc': 'Competitive pricing with no hidden fees. What you see is what you pay',
        'home.features.diverse': 'Diverse Selection',
        'home.features.diverse.desc': 'From concerts to theater, sports to festivals - we have it all',
        'home.features.booking': 'Easy Booking',
        'home.features.booking.desc': 'Simple, fast, and secure booking process in just a few clicks',
        // Homepage — featured
        'home.featured.title': 'Featured Shows',
        'home.featured.loading': 'Loading events...',
        'home.featured.empty': 'No events available at the moment.',
        'home.featured.noEvents': 'No events found',
        'home.featured.viewDetails': 'View Details',
        'home.featured.loginToView': 'Login to View',
        'home.featured.viewFull': 'Click to view full image',
        'home.loginPrompt.title': 'Login Required',
        'home.loginPrompt.message': 'Please log in to view event details for',
        'home.loginPrompt.login': 'Login',
        'home.loginPrompt.register': 'Register',
        'home.loginPrompt.cancel': 'Cancel',
        // Footer
        'footer.tagline': 'Your go-to platform for booking event tickets online.',
        'footer.quickLinks': 'Quick Links',
        'footer.link.events': 'Events',
        'footer.link.about': 'About Us',
        'footer.link.contact': 'Contact',
        'footer.contactUs': 'Contact Us',
        'footer.followUs': 'Follow Us',
        'footer.rights': 'All rights reserved.',
        // Login form
        'login.title': 'Welcome Back',
        'login.email': 'Email Address',
        'login.email.placeholder': 'Enter your email',
        'login.password': 'Password',
        'login.password.placeholder': 'Enter your password',
        'login.submit': 'Sign In',
        'login.submit.loading': 'Signing In...',
        'login.noAccount': "Don't have an account?",
        'login.register': 'Register',
        'login.forgot': 'Forgot your password?',
        'login.reset': 'Reset Password',
        // Register form
        'register.title': 'Join the Theater',
        'register.name': 'Full Name',
        'register.name.placeholder': 'Enter your full name',
        'register.phone': 'Phone Number',
        'register.confirmPassword': 'Confirm Password',
        'register.confirmPassword.placeholder': 'Repeat your password',
        'register.passwordMismatch': 'Passwords do not match',
        'register.submit': 'Join Now',
        'register.submit.loading': 'Creating Account...',
        'register.haveAccount': 'Already part of our community?',
        'register.signIn': 'Sign In',
        // OTP shared
        'otp.title': 'Verify Your Email',
        'otp.login.title': 'Verify Your Account',
        'otp.enter': 'Enter verification code',
        'otp.verify': 'Verify',
        'otp.verifying': 'Verifying...',
        'otp.resend': "Didn't receive a code? Resend",
        // My Events page
        'myEvents.title': 'My Events',
        'myEvents.search': 'Search my events...',
        'myEvents.viewAll': 'View All Events',
        'myEvents.create': 'Create New Event',
        'myEvents.analytics': 'Analytics',
        'myEvents.loading': 'Loading your events...',
        'myEvents.edit': 'Edit',
        'myEvents.delete': 'Delete',
        'myEvents.deleting': 'Deleting...',
        'myEvents.viewBookings': 'View Bookings',
        'myEvents.editTooltip': 'Approved events cannot be edited',
        'myEvents.notFound': 'No events found matching',
        'myEvents.tryDifferent': 'Try a different search term or create a new event.',
        'myEvents.noEvents': "You haven't created any events yet",
        'myEvents.noEventsDesc': 'Create your first event to start selling tickets and managing registrations.',
        'myEvents.createFirst': 'Create Your First Event',
        'myEvents.otp.header': 'Verify OTP',
        'myEvents.otp.message': 'Please enter the 6-digit OTP sent to your email to confirm event deletion',
        'myEvents.otp.verifyDelete': 'Verify & Delete',
        'myEvents.otp.verifying': 'Verifying...',
        'myEvents.otp.cancel': 'Cancel',
        // Event status
        'status.approved': 'approved',
        'status.declined': 'declined',
        'status.pending': 'pending',
        // Event card
        'card.details': 'Details',
        'card.bookNow': 'Book Now',
        'card.soldOut': 'Sold Out',
        'card.available': 'available',
        'card.left': 'left!',
        'card.ticketsLeft': 'tickets left',
        // Events list page
        'events.search': 'Search events...',
        'events.myEvents': 'My Events',
        'events.scanQR': 'Scan QR',
        'events.selectToScan': 'Select event to scan',
        'events.noEventsFound': 'No events found',
        'events.loading': 'Loading amazing events...',
        'events.noMatch': 'No events matching',
        'events.checkLater': 'Check back later for new events',
        'events.showing': 'Showing',
        'events.event': 'event',
        'events.events': 'events',
        'events.welcomeBack': 'Welcome back,',
        // Booking page
        'booking.loadingEvent': 'Loading event details...',
        'booking.eventNotFound': 'Event Not Found',
        'booking.eventNotFoundDesc': "The event you're looking for doesn't exist or has been removed.",
        'booking.browseEvents': 'Browse Events',
        // Bookings list
        'bookings.noBookings': 'No Bookings Found',
        'bookings.noBookingsDesc': "You haven't made any bookings yet. Start exploring events now!",
        'bookings.browseEvents': 'Browse Events',
        // Admin events
        'admin.eventAdmin': 'Event Admin',
        'admin.manageSubmissions': 'Manage submissions',
        'admin.users': 'Users',
        'admin.theaters': 'Theaters',
        'admin.total': 'Total',
        'admin.pending': 'Pending',
        'admin.approved': 'Approved',
        'admin.declined': 'Declined',
        'admin.approve': 'Approve',
        'admin.decline': 'Decline',
        'admin.revoke': 'Revoke',
        'admin.details': 'Details',
        // Profile page
        'profile.exploreEvents': 'Explore Events',
        'profile.myBookings': 'My Bookings',
        'profile.myEvents': 'My Events',
        'profile.createEvent': 'Create Event',
        'profile.manageEvents': 'Manage Events',
        'profile.manageUsers': 'Manage Users',
        'profile.theaters': 'Theaters',
        'profile.quickActions': 'Quick Actions',
        'profile.editProfile': 'Edit Profile',
        'profile.backToEvents': 'Back to Events',
        'profile.loadingProfile': 'Loading your profile...',
        // About page
        'about.title': 'About Event Tickets',
        'about.intro': 'Welcome to <strong>Event Tickets</strong>, your premier destination for experiencing the magic of live performances. We are dedicated to connecting audiences with the events they love, providing a seamless and secure ticketing experience.',
        'about.desc': 'Our platform offers an intuitive interface for browsing, booking, and managing tickets for theaters, concerts, and exclusive events. With our state-of-the-art theater seating maps and secure payment processing, you can focus on enjoying the show.',
        'about.missionTitle': 'Our Mission',
        'about.mission': 'To bring people together through the power of live entertainment, making it accessible, enjoyable, and memorable for everyone.',
        // Search
        'search.placeholder': 'Search events or categories...',
        'search.button': 'Search',
    },
    ar: {
        // Navbar
        'nav.home': 'الرئيسية',
        'nav.user': 'المستخدم',
        'nav.organizer': 'المنظم',
        'nav.admin': 'الإدارة',
        'nav.login': 'تسجيل الدخول',
        'nav.register': 'إنشاء حساب',
        'nav.profile': 'الملف الشخصي',
        'nav.logout': 'تسجيل الخروج',
        'nav.explore': 'استكشاف العروض المسرحية',
        'nav.bookings': 'حجوزاتي',
        'nav.myEvents': 'عروضي المسرحية',
        'nav.createEvent': 'إنشاء عرض مسرحي',
        'nav.analytics': 'التحليلات',
        'nav.manageEvents': 'إدارة العروض المسرحية',
        'nav.manageUsers': 'إدارة المستخدمين',
        'nav.manageTheaters': 'إدارة المسارح',
        // Language picker
        'lang.switchLabel': 'اللغة',
        'lang.en': 'English',
        'lang.ar': 'العربية',
        // Logout dialog
        'logout.title': 'تأكيد تسجيل الخروج',
        'logout.confirm': 'هل أنت متأكد أنك تريد تسجيل الخروج؟',
        'logout.yes': 'نعم',
        'logout.no': 'لا',
        'logout.loading': 'جارٍ الخروج...',
        // Choose language page
        'chooseLang.title': 'اختر لغتك',
        'chooseLang.subtitle': 'يمكنك تغيير هذا في أي وقت من الشريط العلوي',
        'chooseLang.en.name': 'English',
        'chooseLang.en.sample': 'Welcome to EventTix',
        'chooseLang.ar.name': 'العربية',
        'chooseLang.ar.sample': 'مرحباً بك في EventTix',
        'chooseLang.continue': 'متابعة',
        // Homepage — hero
        'home.hero.title': 'اكتشف سحر الأداء الحي',
        'home.hero.subtitle': 'اكتشف عروض مسرحية استثنائية ستأسرك وتبهرك',
        'home.hero.browse': 'تصفح العروض المسرحية',
        'home.hero.start': 'ابدأ الآن',
        // Homepage — stats
        'home.stats.tickets': 'تذكرة مباعة',
        'home.stats.customers': 'عميل سعيد',
        'home.stats.events': 'عروض مسرحية مستضافة',
        'home.stats.rating': 'متوسط التقييم',
        // Homepage — features
        'home.features.title': 'لماذا تختار EventTix؟',
        'home.features.premium': 'عروض مسرحية مميزة',
        'home.features.premium.desc': 'وصول إلى أكثر العروض المسرحية حصريةً وتقييمًا في منطقتك',
        'home.features.prices': 'أفضل الأسعار',
        'home.features.prices.desc': 'أسعار تنافسية بدون رسوم مخفية — ما تراه هو ما تدفع',
        'home.features.diverse': 'تنوع في الاختيار',
        'home.features.diverse.desc': 'من الحفلات إلى المسرح، الرياضة إلى المهرجانات — لدينا كل شيء',
        'home.features.booking': 'حجز سهل',
        'home.features.booking.desc': 'عملية حجز بسيطة وسريعة وآمنة في بضع نقرات فقط',
        // Homepage — featured
        'home.featured.title': 'العروض المميزة',
        'home.featured.loading': 'جارٍ تحميل العروض المسرحية...',
        'home.featured.empty': 'لا توجد عروض مسرحية متاحة حالياً.',
        'home.featured.noEvents': 'لا توجد عروض مسرحية',
        'home.featured.viewDetails': 'عرض التفاصيل',
        'home.featured.loginToView': 'سجّل دخولك للعرض',
        'home.featured.viewFull': 'اضغط لعرض الصورة كاملة',
        'home.loginPrompt.title': 'تسجيل الدخول مطلوب',
        'home.loginPrompt.message': 'يرجى تسجيل الدخول لعرض تفاصيل',
        'home.loginPrompt.login': 'تسجيل الدخول',
        'home.loginPrompt.register': 'إنشاء حساب',
        'home.loginPrompt.cancel': 'إلغاء',
        // Footer
        'footer.tagline': 'منصتك الأولى لحجز تذاكر العروض المسرحية عبر الإنترنت.',
        'footer.quickLinks': 'روابط سريعة',
        'footer.link.events': 'العروض المسرحية',
        'footer.link.about': 'عنّا',
        'footer.link.contact': 'اتصل بنا',
        'footer.contactUs': 'تواصل معنا',
        'footer.followUs': 'تابعنا',
        'footer.rights': 'جميع الحقوق محفوظة.',
        // Login form
        'login.title': 'مرحباً بعودتك',
        'login.email': 'البريد الإلكتروني',
        'login.email.placeholder': 'أدخل بريدك الإلكتروني',
        'login.password': 'كلمة المرور',
        'login.password.placeholder': 'أدخل كلمة المرور',
        'login.submit': 'تسجيل الدخول',
        'login.submit.loading': 'جارٍ تسجيل الدخول...',
        'login.noAccount': 'ليس لديك حساب؟',
        'login.register': 'سجّل الآن',
        'login.forgot': 'نسيت كلمة المرور؟',
        'login.reset': 'إعادة التعيين',
        // Register form
        'register.title': 'انضم إلى المسرح',
        'register.name': 'الاسم الكامل',
        'register.name.placeholder': 'أدخل اسمك الكامل',
        'register.phone': 'رقم الهاتف',
        'register.confirmPassword': 'تأكيد كلمة المرور',
        'register.confirmPassword.placeholder': 'أعد إدخال كلمة المرور',
        'register.passwordMismatch': 'كلمتا المرور غير متطابقتين',
        'register.submit': 'انضم الآن',
        'register.submit.loading': 'جارٍ إنشاء الحساب...',
        'register.haveAccount': 'هل أنت بالفعل عضو لدينا؟',
        'register.signIn': 'تسجيل الدخول',
        // OTP shared
        'otp.title': 'تحقق من بريدك الإلكتروني',
        'otp.login.title': 'تحقق من حسابك',
        'otp.enter': 'أدخل رمز التحقق',
        'otp.verify': 'تحقق',
        'otp.verifying': 'جارٍ التحقق...',
        'otp.resend': 'لم تستلم رمزاً؟ أعد الإرسال',
        // My Events page
        'myEvents.title': 'عروضي المسرحية',
        'myEvents.search': 'ابحث في عروضي المسرحية...',
        'myEvents.viewAll': 'عرض كل العروض المسرحية',
        'myEvents.create': 'إنشاء عرض مسرحي جديد',
        'myEvents.analytics': 'التحليلات',
        'myEvents.loading': 'جارٍ تحميل عروضك المسرحية...',
        'myEvents.edit': 'تعديل',
        'myEvents.delete': 'حذف',
        'myEvents.deleting': 'جارٍ الحذف...',
        'myEvents.viewBookings': 'عرض الحجوزات',
        'myEvents.editTooltip': 'لا يمكن تعديل العروض المسرحية المعتمدة',
        'myEvents.notFound': 'لا توجد عروض مسرحية تطابق',
        'myEvents.tryDifferent': 'جرّب مصطلح بحث مختلف أو أنشئ عرض مسرحي جديد.',
        'myEvents.noEvents': 'لم تنشئ أي عروض مسرحية بعد',
        'myEvents.noEventsDesc': 'أنشئ عرضك المسرحي الأول لبدء بيع التذاكر وإدارة التسجيلات.',
        'myEvents.createFirst': 'إنشاء عرضك المسرحي الأول',
        'myEvents.otp.header': 'التحقق من الرمز',
        'myEvents.otp.message': 'أدخل الرمز المكون من 6 أرقام المرسل إلى بريدك الإلكتروني لتأكيد حذف العرض المسرحي',
        'myEvents.otp.verifyDelete': 'تحقق واحذف',
        'myEvents.otp.verifying': 'جارٍ التحقق...',
        'myEvents.otp.cancel': 'إلغاء',
        // Event status
        'status.approved': 'معتمدة',
        'status.declined': 'مرفوضة',
        'status.pending': 'قيد المراجعة',
        // Event card
        'card.details': 'التفاصيل',
        'card.bookNow': 'احجز الآن',
        'card.soldOut': 'نفدت التذاكر',
        'card.available': 'متاح',
        'card.left': 'متبقي!',
        'card.ticketsLeft': 'تذكرة متبقية',
        // Events list page
        'events.search': 'ابحث عن عروض مسرحية...',
        'events.myEvents': 'عروضي المسرحية',
        'events.scanQR': 'مسح QR',
        'events.selectToScan': 'اختر عرض مسرحي للمسح',
        'events.noEventsFound': 'لا توجد عروض مسرحية',
        'events.loading': 'جارٍ تحميل العروض المسرحية...',
        'events.noMatch': 'لا توجد عروض مسرحية تطابق',
        'events.checkLater': 'تحقق لاحقاً من العروض المسرحية الجديدة',
        'events.showing': 'عرض',
        'events.event': 'عرض مسرحي',
        'events.events': 'عروض مسرحية',
        'events.welcomeBack': 'مرحباً بعودتك،',
        // Booking page
        'booking.loadingEvent': 'جارٍ تحميل تفاصيل العرض المسرحي...',
        'booking.eventNotFound': 'العرض المسرحي غير موجود',
        'booking.eventNotFoundDesc': 'العرض المسرحي الذي تبحث عنه غير موجود أو تمت إزالته.',
        'booking.browseEvents': 'تصفح العروض المسرحية',
        // Bookings list
        'bookings.noBookings': 'لا توجد حجوزات',
        'bookings.noBookingsDesc': 'لم تقم بأي حجوزات بعد. ابدأ باستكشاف العروض المسرحية الآن!',
        'bookings.browseEvents': 'تصفح العروض المسرحية',
        // Admin events
        'admin.eventAdmin': 'إدارة العروض المسرحية',
        'admin.manageSubmissions': 'إدارة الطلبات',
        'admin.users': 'المستخدمين',
        'admin.theaters': 'المسارح',
        'admin.total': 'الإجمالي',
        'admin.pending': 'قيد المراجعة',
        'admin.approved': 'معتمدة',
        'admin.declined': 'مرفوضة',
        'admin.approve': 'اعتماد',
        'admin.decline': 'رفض',
        'admin.revoke': 'إلغاء الاعتماد',
        'admin.details': 'التفاصيل',
        // Profile page
        'profile.exploreEvents': 'استكشاف العروض المسرحية',
        'profile.myBookings': 'حجوزاتي',
        'profile.myEvents': 'عروضي المسرحية',
        'profile.createEvent': 'إنشاء عرض مسرحي',
        'profile.manageEvents': 'إدارة العروض المسرحية',
        'profile.manageUsers': 'إدارة المستخدمين',
        'profile.theaters': 'المسارح',
        'profile.quickActions': 'إجراءات سريعة',
        'profile.editProfile': 'تعديل الملف الشخصي',
        'profile.backToEvents': 'العودة للعروض المسرحية',
        'profile.loadingProfile': 'جارٍ تحميل ملفك الشخصي...',
        // About page
        'about.title': 'عن تذاكر العروض المسرحية',
        'about.intro': 'مرحباً بك في <strong>تذاكر العروض المسرحية</strong>، وجهتك المفضلة لتجربة سحر العروض الحية. نحن ملتزمون بربط الجمهور بالعروض المسرحية التي يحبونها، وتقديم تجربة حجز تذاكر سلسة وآمنة.',
        'about.desc': 'توفر منصتنا واجهة سهلة الاستخدام لتصفح وحجز وإدارة تذاكر المسارح والحفلات والعروض المسرحية الحصرية. مع خرائط مقاعد المسرح المتطورة ومعالجة الدفع الآمنة، يمكنك التركيز على الاستمتاع بالعرض.',
        'about.missionTitle': 'مهمتنا',
        'about.mission': 'الجمع بين الناس من خلال قوة الترفيه الحي، وجعله متاحاً وممتعاً ولا يُنسى للجميع.',
        // Search
        'search.placeholder': 'ابحث عن عروض مسرحية أو فئات...',
        'search.button': 'بحث',
    },
};

// ─── Context ─────────────────────────────────────────────────────────────────
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLangState] = useState<Language>('en');

    useEffect(() => {
        const saved = (localStorage.getItem('language') ?? 'en') as Language;
        const lang: Language = saved === 'ar' ? 'ar' : 'en';
        applyToDOM(lang);
        setLangState(lang);
    }, []);

    const applyToDOM = (lang: Language) => {
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        localStorage.setItem('language', lang);
    };

    const setLanguage = async (lang: Language) => {
        applyToDOM(lang);
        setLangState(lang);
    };

    const t = (key: string): string =>
        translations[language][key] ?? translations['en'][key] ?? key;

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, isRTL: language === 'ar' }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
    return ctx;
};
