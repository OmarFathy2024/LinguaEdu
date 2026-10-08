import './styles.css';
import { initPhase3 } from './phase3.js';
import { applyDocumentLanguage, getSavedLanguage, languageButtonLabel, nextLanguage, persistLanguage } from './i18n.js';

const state = {
  subject: 'spanish',
  uiLanguage: getSavedLanguage(),
  flashIndex: 0,
  flashFlipped: false,
  videoPlaying: false,
  videoProgress: 30,
  faqOpen: 0,
};

const dashboardState = {
  activeTab: 'overview',
  isAuthenticated: false,
  lessons: [],
  questions: [],
  students: [
    { name: 'Amira Hassan', email: 'amira.hassan@email.com', phone: '+20 101 555 0184', date: '28 Sep 2026', courses: 3, initials: 'AH' },
    { name: 'Omar Khaled', email: 'omar.khaled@email.com', phone: '+20 109 442 7710', date: '26 Sep 2026', courses: 2, initials: 'OK' },
    { name: 'Lina Samir', email: 'lina.samir@email.com', phone: '+20 115 208 4491', date: '24 Sep 2026', courses: 4, initials: 'LS' },
    { name: 'Youssef Nabil', email: 'youssef.nabil@email.com', phone: '+20 102 330 8814', date: '21 Sep 2026', courses: 1, initials: 'YN' },
    { name: 'Maya Adel', email: 'maya.adel@email.com', phone: '+20 111 900 2714', date: '19 Sep 2026', courses: 2, initials: 'MA' },
  ],
};

const copy = {
  en: {
    navMethod: 'Our method', navCourses: 'Courses', navPricing: 'Pricing', navFaq: 'FAQ',
    heroEyebrow: 'A softer way to become fluent', heroTitleOne: 'The world sounds', heroTitleEm: 'better', heroTitleTwo: 'in another language.',
    heroLede: 'Small, beautifully designed lessons for people who want to speak with more ease, travel with more curiosity, and feel at home in more places.',
    studentPortal: 'تسجيل دخول طالب', teacherPortal: 'دخول المدرس (الأدمن)', heroProof: 'Loved by curious learners in 42 countries', todayLesson: "TODAY'S LESSON", onTrack: 'On track', lessonTitle: 'Ordering<br />with confidence', lessonMeta: '7 min listen & speak', lessonFoot: 'Your momentum is real.', noteLabel: 'NEW VOCAB', noteCopy: 'the after-meal conversation', streakLabel: 'CURRENT STREAK', days: 'days',
    methodKicker: 'THE LINGUORA METHOD', methodTitle: 'Useful first.<br /><em>Beautiful always.</em>', methodCopy: 'No gamified noise. No awkward drills. Just a thoughtful rhythm of listening, speaking, and noticing the little things that make a language feel alive.', featureOneTitle: 'Designed for<br /><em>real life</em>', featureOneCopy: 'Order the coffee. Make the joke. Ask the question that matters.', featureTwoTitle: 'Your ear<br /><em>comes first</em>', featureTwoCopy: 'Train your instinct with short, human audio from the first hello.', featureThreeTitle: 'A rhythm<br /><em>that stays</em>', featureThreeCopy: 'Seven minutes a day becomes a voice you can trust everywhere.', exploreLessons: 'Explore lessons', tryPractice: 'Try a practice', seePlans: 'See plans',
    courseKicker: 'YOUR COURSE, IN MOTION', courseTitle: 'A few minutes.<br /><em>A fuller world.</em>', videoCaption: 'A walk through<br /><strong>Valencia</strong>', lessonType: 'LISTEN + NOTICE', pathLabel: 'YOUR PATH', courseProgress: 'Course progress', continueLesson: 'Continue your lesson',
    flashKicker: 'THE DAILY FLIP', flashTitle: 'Make room for<br /><em>one more word.</em>', flashCopy: 'A little ritual for the in-between moments. Flip a card, say it out loud, let it stick.', sessionLabel: "TODAY'S SESSION", flashHint: 'tap to reveal', meaningLabel: 'MEANING', flipHint: 'or click the card to flip',
    statOne: 'minutes to a new habit', statTwo: 'countries learning together', statThree: 'average learner rating', statFour: 'ways to say hello', pricingKicker: 'A PLAN THAT FEELS LIKE YOU', pricingTitle: 'Keep your<br /><em>curiosity close.</em>', pricingCopy: 'Start gently. Go further when you’re ready. Every plan includes the whole Linguora method.', priceFree: 'A LITTLE HELLO', perMonth: '/ forever', freeCopy: 'A soft landing for your first few phrases.', freeOne: '5 daily flashcards', freeTwo: 'One starter path', freeThree: 'Audio previews', startFree: 'Start for free', popular: 'MOST CURIOUS', priceFull: 'THE FULL FEELING', perMonthPaid: '/ month', fullCopy: 'A complete practice for a life with more places in it.', fullOne: 'All subject paths', fullTwo: 'Unlimited daily practice', fullThree: 'Weekly speaking prompts', tryMonth: 'Try one month', priceYear: 'THE LONG VIEW', perMonthYear: '/ month, yearly', yearCopy: 'For the version of you who likes to stay with a good thing.', yearOne: 'Everything in Full Feeling', yearTwo: 'A dedicated speaking club', yearThree: 'Save 33% annually', chooseYear: 'Choose yearly',
    faqKicker: 'A FEW GOOD QUESTIONS', faqTitle: 'Wondering<br /><em>out loud?</em>', faqCopy: 'Good. That’s how every conversation starts.', closingOverline: 'YOUR NEXT CHAPTER STARTS WITH A HELLO', closingTitle: 'Say it until<br /><em>it sounds like you.</em>', startLearning: 'Start learning', footerNote: 'A little practice. A lot more world.', footerAbout: 'About', footerHelp: 'Help', footerTerms: 'Terms', portalLabel: 'TEACHER PORTAL', loginTitle: 'Welcome back,<br /><em>teacher.</em>', loginCopy: 'Your classroom, waiting quietly.', usernameLabel: 'Admin username', passwordLabel: 'Password', loginButton: 'Enter portal', modalNote: 'Phase 1 preview · No account changes are made', usernameRequired: 'Enter your admin username to continue.', passwordRequired: 'Enter your password to continue.', loginSuccess: 'Preview access ready — welcome, teacher.', toastStudent: 'Student portal preview selected.', toastContinue: 'Lesson preview resumed.', toastPlan: 'Plan selection is ready for Phase 2.',
  },
  ar: {
    navMethod: 'طريقتنا', navCourses: 'الدورات', navPricing: 'الأسعار', navFaq: 'الأسئلة',
    heroEyebrow: 'طريقة ألطف لتصبح طليقاً', heroTitleOne: 'العالم يبدو', heroTitleEm: 'أجمل', heroTitleTwo: 'بلغة أخرى.',
    heroLede: 'دروس صغيرة ومصممة بعناية لمن يريد التحدث بسهولة أكبر، والسفر بفضول أكبر، والشعور بالانتماء إلى أماكن أكثر.',
    studentPortal: 'تسجيل دخول طالب', teacherPortal: 'دخول المدرس (الأدمن)', heroProof: 'يحبه متعلمون فضوليون في ٤٢ دولة', todayLesson: 'درس اليوم', onTrack: 'على المسار', lessonTitle: 'اطلب بثقة', lessonMeta: 'استمع وتحدث · ٧ دقائق', lessonFoot: 'زخمك حقيقي.', noteLabel: 'مفردة جديدة', noteCopy: 'حديث ما بعد الوجبة', streakLabel: 'سلسلة التعلّم', days: 'يوماً',
    methodKicker: 'طريقة لينغورا', methodTitle: 'مفيد أولاً.<br /><em>جميل دائماً.</em>', methodCopy: 'لا ضجيج ألعاب. لا تمارين محرجة. فقط إيقاع مدروس من الاستماع والتحدث وملاحظة التفاصيل التي تجعل اللغة حية.', featureOneTitle: 'مصمم<br /><em>للحياة</em>', featureOneCopy: 'اطلب القهوة. قل النكتة. اسأل السؤال المهم.', featureTwoTitle: 'أذنك<br /><em>أولاً</em>', featureTwoCopy: 'درّب حدسك بصوت إنساني قصير منذ أول تحية.', featureThreeTitle: 'إيقاع<br /><em>يبقى</em>', featureThreeCopy: 'سبع دقائق يومياً تصبح صوتاً تثق به في كل مكان.', exploreLessons: 'استكشف الدروس', tryPractice: 'جرّب تمريناً', seePlans: 'شاهد الخطط',
    courseKicker: 'دورتك تتحرك', courseTitle: 'بضع دقائق.<br /><em>عالم أوسع.</em>', videoCaption: 'جولة في<br /><strong>فالنسيا</strong>', lessonType: 'استمع + لاحظ', pathLabel: 'مسارك', courseProgress: 'تقدم الدورة', continueLesson: 'تابع درسك',
    flashKicker: 'قلب البطاقة اليومية', flashTitle: 'اترك مساحة<br /><em>لكلمة أخرى.</em>', flashCopy: 'طقس صغير بين اللحظات. اقلب البطاقة، قلها بصوت عالٍ، ودعها تثبت.', sessionLabel: 'جلسة اليوم', flashHint: 'اضغط للكشف', meaningLabel: 'المعنى', flipHint: 'أو اضغط البطاقة لقلبها',
    statOne: 'دقائق لعادات جديدة', statTwo: 'دولة تتعلم معاً', statThree: 'متوسط تقييم المتعلمين', statFour: 'طريقة لقول مرحباً', pricingKicker: 'خطة تشبهك', pricingTitle: 'أبقِ<br /><em>فضولك قريباً.</em>', pricingCopy: 'ابدأ بهدوء. تقدم عندما تكون مستعداً. كل خطة تشمل طريقة لينغورا كاملة.', priceFree: 'تحية صغيرة', perMonth: '/ إلى الأبد', freeCopy: 'بداية ناعمة لأول عباراتك.', freeOne: '٥ بطاقات يومية', freeTwo: 'مسار تمهيدي واحد', freeThree: 'معاينات صوتية', startFree: 'ابدأ مجاناً', popular: 'الأكثر فضولاً', priceFull: 'الشعور الكامل', perMonthPaid: '/ شهرياً', fullCopy: 'ممارسة كاملة لحياة فيها أماكن أكثر.', fullOne: 'كل المسارات', fullTwo: 'تدريب يومي بلا حدود', fullThree: 'محفزات تحدث أسبوعية', tryMonth: 'جرّب شهراً', priceYear: 'النظرة الطويلة', perMonthYear: '/ شهرياً، سنوياً', yearCopy: 'للنسخة منك التي تحب الاستمرار مع الأشياء الجميلة.', yearOne: 'كل مزايا الشعور الكامل', yearTwo: 'نادي تحدث مخصص', yearThree: 'وفّر ٣٣٪ سنوياً', chooseYear: 'اختر السنوي',
    faqKicker: 'بعض الأسئلة الجيدة', faqTitle: 'تتساءل<br /><em>بصوت عالٍ؟</em>', faqCopy: 'جيد. هكذا تبدأ كل محادثة.', closingOverline: 'فصلك القادم يبدأ بتحية', closingTitle: 'قلها حتى<br /><em>تشبه صوتك.</em>', startLearning: 'ابدأ التعلم', footerNote: 'تدريب قليل. عالم أكبر بكثير.', footerAbout: 'عنّا', footerHelp: 'مساعدة', footerTerms: 'الشروط', portalLabel: 'بوابة المدرس', loginTitle: 'أهلاً بعودتك،<br /><em>أيها المدرس.</em>', loginCopy: 'صفك بانتظارك بهدوء.', usernameLabel: 'اسم مستخدم الأدمن', passwordLabel: 'كلمة المرور', loginButton: 'دخول البوابة', modalNote: 'معاينة المرحلة الأولى · لا يتم تغيير أي حساب', usernameRequired: 'أدخل اسم المستخدم للمتابعة.', passwordRequired: 'أدخل كلمة المرور للمتابعة.', loginSuccess: 'المعاينة جاهزة — أهلاً بك أيها المدرس.', toastStudent: 'تم اختيار معاينة بوابة الطالب.', toastContinue: 'تم استئناف معاينة الدرس.', toastPlan: 'اختيار الخطة جاهز للمرحلة الثانية.',
  },
};

copy.es = {
  ...copy.en,
  navMethod: 'Nuestro método', navCourses: 'Cursos', navPricing: 'Precios', navFaq: 'Preguntas frecuentes',
  heroEyebrow: 'Una forma más amable de alcanzar la fluidez', heroTitleOne: 'El mundo suena', heroTitleEm: 'mejor', heroTitleTwo: 'en otro idioma.',
  studentPortal: 'Acceso del estudiante', teacherPortal: 'Acceso del profesor', heroProof: 'Elegido por estudiantes curiosos en 42 países',
  todayLesson: 'LECCIÓN DE HOY', onTrack: 'En camino', lessonMeta: '7 min para escuchar y hablar', lessonFoot: 'Tu ritmo es real.', noteLabel: 'VOCABULARIO NUEVO', streakLabel: 'RACHA ACTUAL', days: 'días',
  methodKicker: 'EL MÉTODO LINGUORA', methodTitle: 'Útil primero.<br /><em>Siempre hermoso.</em>', methodCopy: 'Sin ruido de juegos ni ejercicios incómodos. Solo un ritmo pensado de escuchar, hablar y notar los detalles que hacen que un idioma cobre vida.',
  exploreLessons: 'Explorar lecciones', tryPractice: 'Probar una práctica', seePlans: 'Ver planes', courseKicker: 'TU CURSO EN MOVIMIENTO', courseTitle: 'Unos minutos.<br /><em>Un mundo más amplio.</em>', lessonType: 'ESCUCHA + OBSERVA', pathLabel: 'TU RUTA', courseProgress: 'Progreso del curso', continueLesson: 'Continuar la lección',
  flashKicker: 'EL GIRO DIARIO', flashTitle: 'Haz espacio para<br /><em>una palabra más.</em>', flashCopy: 'Un pequeño ritual para los momentos intermedios. Dale la vuelta, dilo en voz alta y deja que se quede.', sessionLabel: 'SESIÓN DE HOY', flashHint: 'toca para revelar', meaningLabel: 'SIGNIFICADO', flipHint: 'o haz clic para girar',
  pricingKicker: 'UN PLAN QUE SE PARECE A TI', pricingTitle: 'Mantén tu<br /><em>curiosidad cerca.</em>', pricingCopy: 'Empieza con calma y avanza cuando estés listo.', startFree: 'Empezar gratis', tryMonth: 'Probar un mes', chooseYear: 'Elegir anual', faqKicker: 'ALGUNAS BUENAS PREGUNTAS', faqTitle: '¿Te preguntas<br /><em>en voz alta?</em>', startLearning: 'Empezar a aprender',
  portalLabel: 'PORTAL DEL PROFESOR', loginTitle: 'Bienvenido de nuevo,<br /><em>profesor.</em>', loginCopy: 'Tu aula te espera.', usernameLabel: 'Usuario', passwordLabel: 'Contraseña', loginButton: 'Entrar al portal', modalNote: 'Sesión segura · preferencias persistentes', usernameRequired: 'Introduce tu usuario para continuar.', passwordRequired: 'Introduce tu contraseña para continuar.', toastStudent: 'Portal del estudiante seleccionado.', toastContinue: 'Lección reanudada.'
};
const subjects = {
  spanish: {
    pulse: 'Spanish path', level: 'A2 / 12 WEEKS', title: 'The long way home', description: 'Build the kind of Spanish that carries you through a long lunch, a new neighborhood, and the unexpected.', language: 'ESPAÑOL', accent: '#e8755f', lessons: [{ label: 'The art of the hello', meta: 'Listen · 06 min', done: true }, { label: 'Ordering with confidence', meta: 'Speak · 07 min', active: true }, { label: 'A table for the unexpected', meta: 'Notice · 08 min' }], flash: [{ front: 'la sobremesa', back: 'the conversation that lingers after a meal', example: '“Nos quedamos de sobremesa hasta las seis.”' }, { front: 'qué guay', back: 'how cool / lovely', example: '“¡Qué guay este lugar!”' }, { front: 'a gusto', back: 'comfortable, at ease', example: '“Aquí me siento a gusto.”' }, { front: 'madrugar', back: 'to wake up early', example: '“Mañana toca madrugar.”' }, { front: 'aprovechar', back: 'to make the most of', example: '“Vamos a aprovechar el día.”' }], video: 'The long way home', caption: 'A walk through<br /><strong>Valencia</strong>'
  },
  english: {
    pulse: 'English path', level: 'B1 / 12 WEEKS', title: 'The room between words', description: 'Build the kind of English that lets you join the table, catch the nuance, and say what you really mean.', language: 'ENGLISH', accent: '#2f6f64', lessons: [{ label: 'A softer kind of hello', meta: 'Listen · 06 min', done: true }, { label: 'Say what you mean', meta: 'Speak · 07 min', active: true }, { label: 'The small talk detour', meta: 'Notice · 08 min' }], flash: [{ front: 'serendipity', back: 'a happy accident; a lucky discovery', example: '“We met by serendipity.”' }, { front: 'to linger', back: 'to stay a little longer', example: '“Let the conversation linger.”' }, { front: 'low-key', back: 'quietly; without drawing attention', example: '“I’m low-key excited.”' }, { front: 'to wander', back: 'to walk without a fixed plan', example: '“We wandered through the market.”' }, { front: 'at ease', back: 'relaxed and comfortable', example: '“You can be completely at ease.”' }], video: 'The room between words', caption: 'A walk through<br /><strong>London</strong>'
  },
  arabic: { pulse: 'Arabic path', level: 'A1 / 12 WEEKS', title: 'The language of connection', description: 'Build clear, confident Arabic for school, conversation, and the moments that bring people closer.', language: 'العربية', accent: '#bc8b3d', lessons: [{ label: 'A first greeting', meta: 'Listen · 06 min', done: true }, { label: 'Build a clear sentence', meta: 'Speak · 07 min', active: true }, { label: 'Words that connect', meta: 'Notice · 08 min' }], flash: [{ front: 'مرحبا', back: 'hello', example: '“مرحبا، كيف حالك؟”' }, { front: 'شكراً', back: 'thank you', example: '“شكراً على مساعدتك.”' }, { front: 'أهلاً وسهلاً', back: 'welcome', example: '“أهلاً وسهلاً بكم.”' }, { front: 'مدرسة', back: 'school', example: '“أذهب إلى المدرسة.”' }, { front: 'صديق', back: 'friend', example: '“هو صديقي.”' }], video: 'The language of connection', caption: 'A walk through<br /><strong>Cairo</strong>'
  }
};

const localizedSubjects = {
  spanish: {
    en: { pulse: 'Spanish path', level: 'A2 / 12 WEEKS', title: 'The long way home', description: 'Build the kind of Spanish that carries you through a long lunch, a new neighborhood, and the unexpected.', video: 'The long way home', caption: 'A walk through<br /><strong>Valencia</strong>', lessons: [['The art of the hello', 'Listen · 06 min'], ['Ordering with confidence', 'Speak · 07 min'], ['A table for the unexpected', 'Notice · 08 min']] },
    ar: { pulse: 'مسار الإسبانية', level: 'A2 / ١٢ أسبوعاً', title: 'الطريق الطويل إلى البيت', description: 'ابنِ إسبانية تحملك خلال غداء طويل، وحي جديد، وكل ما هو غير متوقع.', video: 'الطريق الطويل إلى البيت', caption: 'جولة في<br /><strong>فالنسيا</strong>', lessons: [['فن التحية', 'استمع · ٠٦ دقائق'], ['اطلب بثقة', 'تحدث · ٠٧ دقائق'], ['طاولة للمفاجآت', 'لاحظ · ٠٨ دقائق']] },
  },
  english: {
    en: { pulse: 'English path', level: 'B1 / 12 WEEKS', title: 'The room between words', description: 'Build the kind of English that lets you join the table, catch the nuance, and say what you really mean.', video: 'The room between words', caption: 'A walk through<br /><strong>London</strong>', lessons: [['A softer kind of hello', 'Listen · 06 min'], ['Say what you mean', 'Speak · 07 min'], ['The small talk detour', 'Notice · 08 min']] },
    ar: { pulse: 'مسار الإنجليزية', level: 'B1 / ١٢ أسبوعاً', title: 'المساحة بين الكلمات', description: 'ابنِ إنجليزية تتيح لك الانضمام إلى الطاولة، والتقاط المعنى، وقول ما تعنيه حقاً.', video: 'المساحة بين الكلمات', caption: 'جولة في<br /><strong>لندن</strong>', lessons: [['تحية ألطف', 'استمع · ٠٦ دقائق'], ['قل ما تعنيه', 'تحدث · ٠٧ دقائق'], ['جولة الحديث الخفيف', 'لاحظ · ٠٨ دقائق']] },
  },
  arabic: {
    en: { pulse: 'Arabic path', level: 'A1 / 12 WEEKS', title: 'The language of connection', description: 'Build clear, confident Arabic for school, conversation, and the moments that bring people closer.', video: 'The language of connection', caption: 'A walk through<br /><strong>Cairo</strong>', lessons: [['A first greeting', 'Listen · 06 min'], ['Build a clear sentence', 'Speak · 07 min'], ['Words that connect', 'Notice · 08 min']] },
    es: { pulse: 'Ruta de árabe', level: 'A1 / 12 SEMANAS', title: 'El idioma de la conexión', description: 'Construye un árabe claro y seguro para la escuela y la conversación.', video: 'El idioma de la conexión', caption: 'Un paseo por<br /><strong>El Cairo</strong>', lessons: [['Un primer saludo', 'Escucha · 06 min'], ['Construye una frase', 'Habla · 07 min'], ['Palabras que conectan', 'Observa · 08 min']] },
    ar: { pulse: 'مسار العربية', level: 'A1 / ١٢ أسبوعاً', title: 'لغة التواصل', description: 'ابنِ عربية واضحة وواثقة للمدرسة والمحادثة واللحظات التي تقرّب الناس.', video: 'لغة التواصل', caption: 'جولة في<br /><strong>القاهرة</strong>', lessons: [['تحية أولى', 'استمع · ٠٦ دقائق'], ['كوّن جملة واضحة', 'تحدث · ٠٧ دقائق'], ['كلمات تصلنا', 'لاحظ · ٠٨ دقائق']] },
  },
};

const localizedFlash = {
  arabic: {
    en: [{ back: 'the language of connection', example: '“Marhaba” means hello.' }, { back: 'thank you', example: '“Shukran” is a warm thank you.' }, { back: 'welcome', example: '“Ahlan wa sahlan” means welcome.' }, { back: 'school', example: '“Madrasa” means school.' }, { back: 'friend', example: '“Sadiq” means friend.' }],
    es: [{ back: 'el idioma de la conexión', example: '“Marhaba” significa hola.' }, { back: 'gracias', example: '“Shukran” es una forma cálida de dar las gracias.' }, { back: 'bienvenido', example: '“Ahlan wa sahlan” significa bienvenido.' }, { back: 'escuela', example: '“Madrasa” significa escuela.' }, { back: 'amigo', example: '“Sadiq” significa amigo.' }],
    ar: [{ back: 'لغة التواصل', example: '«مرحبا» تعني تحية.' }, { back: 'شكراً', example: '«شكراً» كلمة امتنان.' }, { back: 'أهلاً وسهلاً', example: 'تقال للترحيب.' }, { back: 'مدرسة', example: '«مدرسة» مكان التعلم.' }, { back: 'صديق', example: '«صديق» شخص قريب منك.' }],
  },
  spanish: [
    { back: 'الحديث الذي يستمر بعد الوجبة', example: '“بقينا نتحدث بعد الغداء حتى السادسة.”' },
    { back: 'كم هو رائع / جميل', example: '“يا له من مكان رائع!”' },
    { back: 'مرتاح، على سجيته', example: '“أشعر بالراحة هنا.”' },
    { back: 'الاستيقاظ مبكراً', example: '“غداً علينا الاستيقاظ مبكراً.”' },
    { back: 'الاستفادة القصوى من', example: '“لنستفد من هذا اليوم.”' },
  ],
  english: [
    { back: 'اكتشاف سعيد أو صدفة موفقة', example: '“التقينا بمحض صدفة جميلة.”' },
    { back: 'أن تبقى مدة أطول قليلاً', example: '“دع المحادثة تستمر قليلاً.”' },
    { back: 'بهدوء ومن دون لفت الانتباه', example: '“أنا متحمس بهدوء.”' },
    { back: 'المشي بلا خطة محددة', example: '“تجولنا في السوق.”' },
    { back: 'مرتاح ومطمئن', example: '“يمكنك أن تكون مرتاحاً تماماً.”' },
  ],
};

const faqData = [
  { en: { q: 'Is Linguora for complete beginners?', a: 'Absolutely. Every path begins with a first hello and grows in small, usable steps. Choose Spanish or English and we’ll meet you where you are.' }, ar: { q: 'هل لينغورا مناسبة للمبتدئين تماماً؟', a: 'بالتأكيد. يبدأ كل مسار بتحية أولى وينمو بخطوات صغيرة ومفيدة. اختر الإسبانية أو الإنجليزية وسنقابلك حيث أنت.' } },
  { en: { q: 'How long is a daily lesson?', a: 'Most lessons take seven minutes. Some days you’ll want to stay longer — the important part is building a rhythm that feels possible.' }, ar: { q: 'كم يستغرق الدرس اليومي؟', a: 'تستغرق معظم الدروس سبع دقائق. قد ترغب في البقاء أطول في بعض الأيام — الأهم هو بناء إيقاع ممكن.' } },
  { en: { q: 'Can I switch between Spanish and English?', a: 'Yes. Your subject switcher stays with you at the top of the page, so you can explore both paths whenever curiosity takes the lead.' }, ar: { q: 'هل يمكنني التبديل بين الإسبانية والإنجليزية؟', a: 'نعم. يبقى مفتاح المادة في أعلى الصفحة، لتستكشف المسارين كلما قادك الفضول.' } },
  { en: { q: 'Do I need to speak out loud?', a: 'Only if you want the good stuff. Linguora gently invites you to listen, notice, and then try the words in your own voice.' }, ar: { q: 'هل أحتاج إلى التحدث بصوت عالٍ؟', a: 'فقط إن أردت الفائدة الأكبر. تدعوك لينغورا بلطف إلى الاستماع والملاحظة ثم تجربة الكلمات بصوتك.' } },
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const currentCopy = () => ({ ...copy.en, ...(copy[state.uiLanguage] || {}) });

function applyCopy() {
  const langCopy = currentCopy();
  applyDocumentLanguage(state.uiLanguage, { persist: false });
  const languageButton = $('#lang-toggle');
  if (languageButton) languageButton.textContent = languageButtonLabel(state.uiLanguage);
  $$('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (langCopy[key]) el.innerHTML = langCopy[key];
  });
}

function renderLessons() {
  const subject = subjects[state.subject];
  const localized = localizedSubjects[state.subject][state.uiLanguage] || localizedSubjects[state.subject].en;
  $('#subject-pulse-label').textContent = localized.pulse;
  $('#course-level').textContent = localized.level;
  $('#course-title')?.replaceChildren(document.createTextNode(localized.title));
  $('#video-title').textContent = localized.video;
  $('.video-caption').innerHTML = localized.caption;
  $('#course-description').textContent = localized.description;
  document.documentElement.style.setProperty('--subject-accent', subject.accent);
  const list = $('#lesson-list');
  list.innerHTML = localized.lessons.map((lesson, index) => `<button type="button" class="lesson-row ${subject.lessons[index].active ? 'is-active' : ''} ${subject.lessons[index].done ? 'is-done' : ''}" data-lesson="${index}"><span class="lesson-check">${subject.lessons[index].done ? '✓' : index + 1}</span><span class="lesson-row-copy"><strong>${lesson[0]}</strong><small>${lesson[1]}</small></span><span class="lesson-row-arrow">${subject.lessons[index].active ? '↗' : '→'}</span></button>`).join('');
  $$('.lesson-row').forEach((row) => row.addEventListener('click', () => {
    $$('.lesson-row').forEach((item) => item.classList.remove('is-active'));
    row.classList.add('is-active');
    showToast(state.uiLanguage === 'ar' ? 'تم اختيار درس جديد.' : 'Lesson selected — your preview is ready.');
  }));
  renderFlashcard();
}

function renderFlashcard() {
  const subject = subjects[state.subject];
  const card = subject.flash[state.flashIndex];
  const localizedCard = localizedFlash[state.subject]?.[state.uiLanguage]?.[state.flashIndex] || (state.uiLanguage === 'ar' ? localizedFlash[state.subject]?.ar?.[state.flashIndex] : card) || card;
  $('#flash-language').textContent = state.subject === 'arabic' ? 'العربية' : subject.language;
  $('#flash-front').textContent = card.front;
  $('#flash-back').textContent = localizedCard.back;
  $('#flash-example').textContent = localizedCard.example;
  $('#flash-count').textContent = `${state.flashIndex + 1} / ${subject.flash.length}`;
  $('#flashcard').classList.toggle('is-flipped', state.flashFlipped);
  $('#tiny-bars').innerHTML = subject.flash.map((_, index) => `<span class="tiny-bar ${index === state.flashIndex ? 'is-current' : ''} ${index < state.flashIndex ? 'is-done' : ''}"></span>`).join('');
}

function renderFaq() {
  $('#faq-list').innerHTML = faqData.map((item, index) => { const localized = item[state.uiLanguage] || item.en; return `<article class="faq-item ${index === state.faqOpen ? 'is-open' : ''}"><button type="button" class="faq-question" aria-expanded="${index === state.faqOpen}" aria-controls="faq-answer-${index}"><span class="faq-number">0${index + 1}</span><strong>${localized.q}</strong><span class="faq-plus">+</span></button><div class="faq-answer" id="faq-answer-${index}"><p>${localized.a}</p></div></article>`; }).join('');
  $$('.faq-question').forEach((button, index) => button.addEventListener('click', () => {
    state.faqOpen = state.faqOpen === index ? -1 : index;
    renderFaq();
  }));
}

function setSubject(subject) {
  state.subject = subject;
  $$('.subject-btn').forEach((button) => button.classList.toggle('is-active', button.dataset.subject === subject));
  renderLessons();
  showToast(state.uiLanguage === 'ar' ? (subject === 'spanish' ? 'تم فتح مسار الإسبانية.' : 'تم فتح مسار الإنجليزية.') : `${subject === 'spanish' ? 'Spanish' : 'English'} path selected.`);
}

function setLanguage(language) {
  state.uiLanguage = applyDocumentLanguage(language);
  $('#lang-toggle').classList.toggle('is-ar', language === 'ar');
  $('#lang-toggle').textContent = languageButtonLabel(state.uiLanguage);
  persistLanguage(state.uiLanguage);
  applyCopy();
  $('#password-toggle').textContent = $('#admin-password').type === 'text' ? (language === 'ar' ? 'إخفاء' : 'Hide') : (language === 'ar' ? 'إظهار' : 'Show');
  renderLessons();
  renderFaq();
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

function toggleModal(open) {
  const modal = $('#teacher-modal');
  modal.classList.toggle('is-visible', open);
  modal.setAttribute('aria-hidden', String(!open));
  document.body.classList.toggle('modal-open', open);
  if (open) setTimeout(() => $('#admin-username').focus(), 100);
}

function setVideoState(playing) {
  state.videoPlaying = playing;
  $('#video-play').textContent = playing ? 'Ⅱ' : '▶';
  $('#video-center-play').textContent = playing ? 'Ⅱ' : '▶';
  $('#video-player').classList.toggle('is-playing', playing);
}

function updateVideoTimeline() {
  const progress = Math.max(0, Math.min(100, state.videoProgress));
  $('#video-progress').querySelector('span').style.width = `${progress}%`;
  const totalSeconds = 138;
  const currentSeconds = Math.round((progress / 100) * totalSeconds);
  const minutes = String(Math.floor(currentSeconds / 60)).padStart(2, '0');
  const seconds = String(currentSeconds % 60).padStart(2, '0');
  $('#video-time').textContent = `${minutes}:${seconds} / 02:18`;
}

function initEvents() {
  $$('.subject-btn').forEach((button) => button.addEventListener('click', () => setSubject(button.dataset.subject)));
  $('#lang-toggle').addEventListener('click', () => setLanguage(nextLanguage(state.uiLanguage)));
  $('#menu-toggle').addEventListener('click', () => $('#mobile-nav').classList.toggle('is-open'));
  $$('.mobile-nav a').forEach((link) => link.addEventListener('click', () => $('#mobile-nav').classList.remove('is-open')));
  $$('.teacher-trigger').forEach((button) => button.addEventListener('click', () => toggleModal(true)));
  $('#modal-close').addEventListener('click', () => toggleModal(false));
  $('#teacher-modal').addEventListener('click', (event) => { if (event.target.id === 'teacher-modal') toggleModal(false); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') toggleModal(false);
    if (event.key === ' ' && document.activeElement === $('#flashcard')) { event.preventDefault(); state.flashFlipped = !state.flashFlipped; renderFlashcard(); }
  });
  $('#password-toggle').addEventListener('click', () => {
    const input = $('#admin-password');
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    $('#password-toggle').textContent = showing ? (state.uiLanguage === 'ar' ? 'إظهار' : 'Show') : (state.uiLanguage === 'ar' ? 'إخفاء' : 'Hide');
  });
  $('#teacher-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const username = $('#admin-username'); const password = $('#admin-password'); const message = $('#form-message');
    const langCopy = currentCopy();
    if (!username.value.trim()) { message.textContent = langCopy.usernameRequired; message.className = 'form-message is-error'; username.focus(); return; }
    if (!password.value.trim()) { message.textContent = langCopy.passwordRequired; message.className = 'form-message is-error'; password.focus(); return; }
    message.textContent = state.uiLanguage === 'ar' ? 'جارٍ التحقق من الحساب…' : 'Checking your teacher account…'; message.className = 'form-message';
  });
  $('#flashcard').addEventListener('click', () => { state.flashFlipped = !state.flashFlipped; renderFlashcard(); });
  $('#flash-next').addEventListener('click', () => { state.flashIndex = (state.flashIndex + 1) % subjects[state.subject].flash.length; state.flashFlipped = false; renderFlashcard(); });
  $('#flash-prev').addEventListener('click', () => { state.flashIndex = (state.flashIndex - 1 + subjects[state.subject].flash.length) % subjects[state.subject].flash.length; state.flashFlipped = false; renderFlashcard(); });
  $('#video-play').addEventListener('click', () => setVideoState(!state.videoPlaying));
  $('#video-center-play').addEventListener('click', () => setVideoState(!state.videoPlaying));
  $('#volume-toggle').addEventListener('click', (event) => { event.currentTarget.classList.toggle('is-muted'); event.currentTarget.textContent = event.currentTarget.classList.contains('is-muted') ? '×' : '◖'; });
  $('#fullscreen-toggle').addEventListener('click', () => { $('#video-player').classList.toggle('is-focused'); showToast(state.uiLanguage === 'ar' ? 'تم توسيع مشغل المعاينة.' : 'Preview player expanded.'); });
  $('#video-progress').addEventListener('click', (event) => { const rect = event.currentTarget.getBoundingClientRect(); const value = document.documentElement.dir === 'rtl' ? ((rect.right - event.clientX) / rect.width) * 100 : ((event.clientX - rect.left) / rect.width) * 100; state.videoProgress = Math.max(0, Math.min(100, value)); updateVideoTimeline(); });
  $$('#student-portal, #student-header-portal, #closing-cta').forEach((button) => button.addEventListener('click', () => { document.querySelector('#courses').scrollIntoView({ behavior: 'smooth' }); showToast(currentCopy().toastStudent); }));
  $('#continue-course').addEventListener('click', () => showToast(currentCopy().toastContinue));
  $$('.price-card button').forEach((button) => button.addEventListener('click', () => showToast(currentCopy().toastPlan)));
}

function initReveal() {
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('is-visible'); }), { threshold: 0.12 });
  $$('.reveal, .feature-card, .price-card, .faq-item, .flashcard-copy, .flashcard-stage').forEach((element) => observer.observe(element));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));
}

function renderStudentTable(query = '') {
  const normalized = query.trim().toLowerCase();
  const students = dashboardState.students.filter((student) => !normalized || `${student.name} ${student.email} ${student.phone}`.toLowerCase().includes(normalized));
  $('#student-table-body').innerHTML = students.map((student, index) => `<tr><td><span class="student-person"><i class="student-avatar avatar-${index % 4}">${student.initials}</i><strong>${escapeHtml(student.name)}</strong></span></td><td>${escapeHtml(student.email)}</td><td>${escapeHtml(student.phone)}</td><td>${escapeHtml(student.date)}</td><td><span class="course-count">${student.courses} ${student.courses === 1 ? 'course' : 'courses'}</span></td><td><button class="row-more" type="button" aria-label="More options">···</button></td></tr>`).join('') || '<tr><td colspan="6" class="table-empty">No students match that search.</td></tr>';
  $('#student-count').textContent = students.length;
}

function parseQuestionText(text) {
  return text.trim().split(/\n(?=\s*\d+[.)]\s)/).map((block) => block.trim()).filter(Boolean).map((block, index) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    const questionLine = lines.find((line) => !/^\s*[A-D][.)]\s/i.test(line) && !/^answer\s*:/i.test(line)) || `Question ${index + 1}`;
    const question = questionLine.replace(/^\s*\d+[.)]\s*/, '');
    const choices = lines.filter((line) => /^[A-D][.)]\s/i.test(line)).map((line) => ({ key: line.charAt(0).toUpperCase(), text: line.replace(/^[A-D][.)]\s*/i, '') }));
    const answerLine = lines.find((line) => /^answer\s*:/i.test(line));
    const answer = answerLine ? (answerLine.match(/answer\s*:\s*([A-D])/i)?.[1] || '').toUpperCase() : '';
    return { question, choices, answer };
  });
}

function renderQuestions() {
  const target = $('#question-preview');
  $('#parsed-question-count').textContent = `${dashboardState.questions.length} question${dashboardState.questions.length === 1 ? '' : 's'} ready`;
  if (!dashboardState.questions.length) {
    target.innerHTML = '<div class="question-empty"><span>⌁</span><strong>Your parsed questions will live here.</strong><small>Use the format guide to the left and tap parse.</small></div>';
    return;
  }
  target.innerHTML = dashboardState.questions.map((item, index) => `<article class="parsed-question"><div class="parsed-question-top"><span>0${index + 1}</span><b>${item.answer ? `Answer ${item.answer}` : 'Answer needed'}</b></div><h4>${escapeHtml(item.question)}</h4><div class="parsed-choices">${item.choices.map((choice) => `<span class="${choice.key === item.answer ? 'is-answer' : ''}"><i>${choice.key}</i>${escapeHtml(choice.text)}</span>`).join('')}</div></article>`).join('');
}

function setDashboardTab(tab) {
  dashboardState.activeTab = tab;
  $$('.dashboard-tab').forEach((button) => button.classList.toggle('is-active', button.dataset.dashboardTab === tab));
  $$('.dashboard-panel').forEach((panel) => panel.classList.toggle('is-active', panel.dataset.dashboardPanel === tab));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openDashboard() {
  dashboardState.isAuthenticated = true;
  $('#teacher-modal').classList.remove('is-visible');
  $('#teacher-modal').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  document.body.classList.add('dashboard-mode');
  $('#dashboard-view').classList.add('is-visible');
  $('#dashboard-view').setAttribute('aria-hidden', 'false');
  renderStudentTable();
  renderQuestions();
  setDashboardTab('overview');
}
window.openDashboard = openDashboard;

function closeDashboard() {
  dashboardState.isAuthenticated = false;
  document.body.classList.remove('dashboard-mode');
  $('#dashboard-view').classList.remove('is-visible');
  $('#dashboard-view').setAttribute('aria-hidden', 'true');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initDashboardEvents() {
  $$('.dashboard-tab').forEach((button) => button.addEventListener('click', () => setDashboardTab(button.dataset.dashboardTab)));
  $$('[data-dashboard-jump]').forEach((button) => button.addEventListener('click', () => setDashboardTab(button.dataset.dashboardJump)));
  $('#dashboard-logout').addEventListener('click', closeDashboard);
  $$('.graph-filter button').forEach((button) => button.addEventListener('click', () => { $$('.graph-filter button').forEach((item) => item.classList.remove('is-active')); button.classList.add('is-active'); showToast(`${button.textContent} engagement view selected.`); }));
  $$('[data-video-mode]').forEach((button) => button.addEventListener('click', () => { $$('[data-video-mode]').forEach((item) => item.classList.toggle('is-active', item === button)); $$('[data-video-field]').forEach((field) => field.classList.toggle('is-visible', field.dataset.videoField === button.dataset.videoMode)); }));
  $('#lesson-video-file').addEventListener('change', (event) => { $('#video-file-name').textContent = event.target.files[0]?.name || 'No file selected'; });
  $('#lesson-pdf').addEventListener('change', (event) => { $('#pdf-file-name').textContent = event.target.files[0]?.name || 'Choose a PDF study sheet'; });
  $('#lesson-cover').addEventListener('change', (event) => { const file = event.target.files[0]; const preview = $('#cover-preview'); if (file) { preview.style.backgroundImage = `url(${URL.createObjectURL(file)})`; preview.classList.add('has-image'); preview.innerHTML = ''; } });
  $('#lesson-form').addEventListener('submit', (event) => { event.preventDefault(); const title = $('#lesson-title').value.trim(); const feedback = $('#lesson-feedback'); if (!title) { feedback.textContent = 'Add a lesson title before saving.'; feedback.className = 'cms-feedback is-error'; $('#lesson-title').focus(); return; } const lesson = { subject: state.subject, grade: $('#lesson-grade').value, unit: $('#lesson-unit').value || '—', title, video: $('#lesson-youtube').value || $('#lesson-video-file').files[0]?.name || 'No video attached', pdf: $('#lesson-pdf').files[0]?.name || 'No PDF attached', cover: $('#lesson-cover').files[0]?.name || 'No cover attached' }; dashboardState.lessons.unshift(lesson); feedback.textContent = `“${title}” saved to your local lesson hub.`; feedback.className = 'cms-feedback is-success'; $('[data-metric="views"]').textContent = (8492 + dashboardState.lessons.length * 37).toLocaleString(); setTimeout(() => setDashboardTab('overview'), 900); });
  $('#question-source').addEventListener('input', (event) => { $('#question-char-count').textContent = `${event.target.value.length} characters`; });
  window.runQuestionParser = () => { dashboardState.questions = parseQuestionText($('#question-source').value); renderQuestions(); showToast(dashboardState.questions.length ? `${dashboardState.questions.length} questions parsed into a local quiz.` : 'Add a question block to start parsing.'); }; $('#parse-questions').onclick = window.runQuestionParser;
  $('#student-search').addEventListener('input', (event) => renderStudentTable(event.target.value));
  $('#invite-student').addEventListener('click', () => { const next = dashboardState.students.length + 1; dashboardState.students.unshift({ name: `New Learner ${String(next).padStart(2, '0')}`, email: `learner${next}@linguora.local`, phone: 'Pending invite', date: 'Today', courses: 0, initials: 'NL' }); renderStudentTable($('#student-search').value); $('[data-metric="students"]').textContent = (1284 + dashboardState.students.length - 5).toLocaleString(); showToast('Local student invite row added.'); });
}

applyCopy(); renderLessons(); renderFaq(); initEvents(); updateVideoTimeline(); initReveal();
initDashboardEvents();
initPhase3();
setTimeout(() => document.body.classList.add('is-loaded'), 250);
