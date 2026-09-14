import { defineArrayMember, defineField, defineType } from 'sanity';

/**
 * The panel is used from a phone, by the person who sews the dresses. So every
 * document opens on its photographs: drop a picture in, press Publish, done.
 * The words sit in a second tab, and the things that should almost never change
 * — the web address, the position — in a third.
 */
const PHOTOS = { name: 'photos', title: 'الصور · Photos', default: true };
const WORDS = { name: 'words', title: 'النصوص · Words' };
const SETUP = { name: 'setup', title: 'إعدادات · Setup' };

/** A line of work — bridal, evening, couture, boutique. */
export const collection = defineType({
  name: 'collection',
  title: 'التشكيلة · Collection',
  type: 'document',
  groups: [PHOTOS, WORDS, SETUP],
  fields: [
    defineField({
      name: 'cover', title: 'الصورة الرئيسية · Cover photograph', type: 'photo', group: 'photos',
    }),
    defineField({
      name: 'plates', title: 'صور إضافية · More photographs', type: 'array',
      of: [defineArrayMember({ type: 'photo' })],
      options: { layout: 'grid' },
      group: 'photos',
      description: 'اسحبي الصور هنا. بدون صور تبقى الألواح المرسومة كما هي.',
    }),
    defineField({ name: 'name', title: 'الاسم · Name', type: 'localeString', group: 'words' }),
    defineField({ name: 'kicker', title: 'سطر تحت الاسم · Line under the name', type: 'localeString', group: 'words' }),
    defineField({ name: 'summary', title: 'وصف قصير · Short summary', type: 'localeText', group: 'words' }),
    defineField({
      name: 'intro', title: 'المقدمة · Introduction', type: 'array',
      of: [defineArrayMember({ type: 'localeText' })],
      group: 'words',
      description: 'فقرة أو فقرتان في أعلى صفحة التشكيلة.',
    }),
    defineField({
      name: 'slug', title: 'عنوان الصفحة · Web address', type: 'slug',
      options: { source: 'name.en', maxLength: 40 },
      validation: (r) => r.required(),
      group: 'setup',
      description: 'تغييره يغيّر رابط الصفحة. اتركيه كما هو. للخطوط الجاهزة: bridal · evening · couture · boutique',
    }),
    defineField({
      name: 'order', title: 'الترتيب · Position', type: 'number', initialValue: 1,
      validation: (r) => r.required(), group: 'setup',
    }),
  ],
  orderings: [{ title: 'Position', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: {
    select: { en: 'name.en', ar: 'name.ar', he: 'name.he', subtitle: 'slug.current', media: 'cover' },
    prepare: ({ en, ar, he, subtitle, media }) => ({ title: ar || en || he || 'بلا اسم', subtitle, media }),
  },
});

/** An individual piece. Numbered rather than named, as the atelier shows them. */
export const look = defineType({
  name: 'look',
  title: 'الإطلالة · Look',
  type: 'document',
  groups: [PHOTOS, WORDS, SETUP],
  fields: [
    defineField({
      name: 'photos', title: 'الصور · Photographs', type: 'array',
      of: [defineArrayMember({ type: 'photo' })],
      options: { layout: 'grid' },
      group: 'photos',
      description: 'الصورة الأولى هي التي تظهر في البطاقات والمعرض.',
    }),
    defineField({ name: 'note', title: 'سطر واحد عن القطعة · One-line note', type: 'localeText', group: 'words' }),
    defineField({
      name: 'collection', title: 'التشكيلة · Collection', type: 'reference',
      to: [{ type: 'collection' }], validation: (r) => r.required(), group: 'setup',
    }),
    defineField({
      name: 'number', title: 'الرقم · Number', type: 'number', initialValue: 1,
      validation: (r) => r.required().min(1), group: 'setup',
      description: 'تظهر بصيغة "إطلالة ٠١". كل تشكيلة ترقّم إطلالاتها وحدها.',
    }),
  ],
  orderings: [{ title: 'Number', name: 'number', by: [{ field: 'number', direction: 'asc' }] }],
  preview: {
    select: { n: 'number', ar: 'collection.name.ar', en: 'collection.name.en', media: 'photos.0' },
    prepare: ({ n, ar, en, media }) => ({
      title: `إطلالة ${String(n ?? 0).padStart(2, '0')}`,
      subtitle: ar || en,
      media,
    }),
  },
});

/** One-of-a-kind settings. */
export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'إعدادات الأتيليه · Atelier settings',
  type: 'document',
  groups: [
    { name: 'contact', title: 'التواصل · Contact', default: true },
    { name: 'home', title: 'الصفحة الرئيسية · Home' },
    { name: 'brand', title: 'النصوص · Words' },
  ],
  fields: [
    defineField({
      name: 'phone', title: 'الهاتف · Telephone', type: 'string', group: 'contact',
      description: 'كما يُقرأ، مثل ‎+972 53-468-0084. امسحيه ليختفي السطر.',
    }),
    defineField({
      name: 'whatsapp', title: 'واتساب · WhatsApp', type: 'string', group: 'contact',
      description: 'أرقام فقط مع رمز الدولة: 972534680084. امسحيه ليختفي السطر.',
    }),
    defineField({ name: 'email', title: 'البريد · Email', type: 'string', group: 'contact' }),
    defineField({ name: 'instagramHandle', title: 'إنستغرام · Instagram handle', type: 'string', group: 'contact' }),
    defineField({ name: 'street', title: 'الشارع · Street', type: 'string', group: 'contact' }),
    defineField({ name: 'city', title: 'المدينة · City', type: 'string', group: 'contact' }),
    defineField({ name: 'streetLocal', title: 'الشارع بالعبرية · Street (Hebrew)', type: 'string', group: 'contact' }),
    defineField({ name: 'cityLocal', title: 'المدينة بالعبرية · City (Hebrew)', type: 'string', group: 'contact' }),
    defineField({
      name: 'formEndpoint', title: 'رابط نموذج الطلبات · Enquiry form endpoint', type: 'url', group: 'contact',
      description: 'اختياري. بدونه يذهب الطلب إلى إنستغرام.',
    }),
    defineField({
      name: 'hero', title: 'صورة الصفحة الرئيسية · Home page photograph', type: 'photo', group: 'home',
      description: 'صورة عريضة وعالية الدقة. اتركيها فارغة لتبقى الافتتاحية الداكنة.',
    }),
    defineField({ name: 'tagline', title: 'الجملة تحت الاسم · Tagline', type: 'localeString', group: 'brand' }),
    defineField({ name: 'booking', title: 'زر الحجز · Booking button', type: 'localeString', group: 'brand' }),
  ],
  preview: { prepare: () => ({ title: 'إعدادات الأتيليه' }) },
});
