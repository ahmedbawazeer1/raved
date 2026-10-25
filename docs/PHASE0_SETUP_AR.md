# المرحلة 0: خطوات النشر والتجربة

## 1. ربط المستودع بـ Vercel
1. ادخل [vercel.com](https://vercel.com) وسجّل الدخول بحساب GitHub.
2. اضغط **Add New…** ثم **Project**.
3. بجانب مستودع `raved` اضغط **Import**. (إن لم يظهر: **Adjust GitHub App Permissions** واسمح لـ Vercel بالوصول إلى `raved`).
4. لا تغيّر أي إعداد، واضغط **Deploy**. بعد دقيقتين يظهر رابط مثل `raved-xxxx.vercel.app`.

## 2. نسخ مفاتيح Supabase
1. ادخل [supabase.com/dashboard](https://supabase.com/dashboard) وافتح مشروع `raved`.
2. من القائمة الجانبية: **Project Settings** (رمز الترس) ثم **Data API**: انسخ **Project URL**.
3. ثم **API Keys**:
   - انسخ **Publishable key** (يبدأ بـ `sb_publishable_`). إن لم تجده، انسخ **anon public** من تبويب Legacy.
   - اضغط **Reveal** بجانب **Secret key** (يبدأ بـ `sb_secret_`) وانسخه. إن لم تجده، انسخ **service_role** من تبويب Legacy. **هذا المفتاح سري جداً.**

## 3. إضافة المفاتيح في Vercel
1. في Vercel افتح مشروع `raved` ← **Settings** ← **Environment Variables**.
2. أضف ثلاثة متغيرات، واترك كل البيئات مختارة:

| Key | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `SUPABASE_SECRET_KEY` | Secret key |

3. اضغط **Save**، ثم من تبويب **Deployments** اضغط **⋯** بجانب آخر نشر ← **Redeploy**.

> لا تلصق هذه المفاتيح في أي محادثة أو ملف في GitHub.

## 4. التجربة على الهاتف
1. افتح الرابط في **Chrome** على هاتفك. يجب أن ترى الصفحة الرئيسية بالعربية.
2. اضغط ⋮ (أعلى الشاشة) ← **إضافة إلى الشاشة الرئيسية** (أو **تثبيت التطبيق**). يظهر شعار رفد على الشاشة.
3. افتح رفد من الأيقونة، وانتظر 5 ثوانٍ، ثم أغلقه وافتحه مرة ثانية (ليحفظ ما يحتاجه).
4. فعّل **وضع الطيران**، ثم اضغط «المسارات» أو حدّث الصفحة: يجب أن تظهر صفحة **«لا يوجد اتصال بالإنترنت»** بدلاً من رسالة خطأ المتصفح.
5. أطفئ وضع الطيران.

ملاحظة: أزرار «تسجيل الدخول» و«ابدأ مجاناً» و«المسارات» تفتح صفحة «غير موجودة» الآن، وستُبنى في المرحلة 1.
