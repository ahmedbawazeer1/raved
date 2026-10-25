# المرحلة 0: خطوات النشر والتجربة

## 1. ربط المستودع بـ Vercel
1. ادخل [vercel.com](https://vercel.com) وسجّل الدخول بحساب GitHub.
2. اضغط **Add New…** ثم **Project**.
3. بجانب مستودع `raved` اضغط **Import**. (إن لم يظهر: **Adjust GitHub App Permissions** واسمح لـ Vercel بالوصول إلى `raved`).
4. لا تغيّر أي إعداد، واضغط **Deploy**. بعد دقيقتين يظهر رابط مثل `raved-xxxx.vercel.app`.

## 2. ربط Supabase بـ Vercel تلقائياً (بلا نسخ مفاتيح)
1. ادخل [supabase.com/dashboard](https://supabase.com/dashboard) وافتح مشروع `raved`.
2. من القائمة الجانبية: **Project Settings** (رمز الترس) ← **Integrations**.
3. في قسم **Vercel Integration** اضغط **Install Vercel Integration** (أو **Connect**)، ووافق في النافذة التي تفتح.
4. اختر مشروع Vercel `raved` ثم **Connect project**. Supabase يضع المفاتيح في Vercel بنفسه.
5. ارجع إلى Vercel ← مشروع `raved` ← تبويب **Deployments** ← اضغط **⋯** بجانب آخر نشر ← **Redeploy**.

### طريقة بديلة يدوية (فقط إن لم تنجح الطريقة السابقة)
1. في Supabase: **Project Settings** ← **Data API**: انسخ **Project URL**.
2. ثم **API Keys**: انسخ **Publishable key**، واضغط **Reveal** بجانب **Secret key** وانسخه. **هذا المفتاح سري جداً.**
3. في Vercel ← مشروع `raved` ← **Settings** ← **Environment Variables**، أضف:

| Key | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `SUPABASE_SECRET_KEY` | Secret key |

4. **Save** ثم **Redeploy** كما في الخطوة 5 أعلاه.

> لا تلصق هذه المفاتيح في أي محادثة أو ملف في GitHub.

## 4. التجربة على الهاتف
1. افتح الرابط في **Chrome** على هاتفك. يجب أن ترى الصفحة الرئيسية بالعربية.
2. اضغط ⋮ (أعلى الشاشة) ← **إضافة إلى الشاشة الرئيسية** (أو **تثبيت التطبيق**). يظهر شعار رفد على الشاشة.
3. افتح رفد من الأيقونة، وانتظر 5 ثوانٍ، ثم أغلقه وافتحه مرة ثانية (ليحفظ ما يحتاجه).
4. فعّل **وضع الطيران**، ثم اضغط «المسارات» أو حدّث الصفحة: يجب أن تظهر صفحة **«لا يوجد اتصال بالإنترنت»** بدلاً من رسالة خطأ المتصفح.
5. أطفئ وضع الطيران.

ملاحظة: أزرار «تسجيل الدخول» و«ابدأ مجاناً» و«المسارات» تفتح صفحة «غير موجودة» الآن، وستُبنى في المرحلة 1.
