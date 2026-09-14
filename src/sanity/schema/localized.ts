import { defineField, defineType } from 'sanity';

/**
 * The atelier publishes in three languages, so any field a visitor reads is an
 * object with one value per language rather than a bare string. Arabic comes
 * first because that is the language the panel is used in; any language left
 * empty falls back to the copy that ships with the site.
 */
export const LANGS = [
  { id: 'ar', title: 'العربية' },
  { id: 'he', title: 'עברית' },
  { id: 'en', title: 'English' },
] as const;

// No language is required: a line written in Arabic alone publishes fine, and
// any language left empty falls back to the copy that ships with the site.
const localeFields = (rows?: number) =>
  LANGS.map((lang) =>
    defineField({
      name: lang.id,
      title: lang.title,
      type: rows ? 'text' : 'string',
      ...(rows ? { rows } : {}),
    }),
  );

export const localeString = defineType({
  name: 'localeString',
  title: 'Text',
  type: 'object',
  options: { collapsible: true, collapsed: false },
  fields: localeFields(),
});

export const localeText = defineType({
  name: 'localeText',
  title: 'Paragraph',
  type: 'object',
  options: { collapsible: true, collapsed: false },
  fields: localeFields(3),
});

/**
 * A photograph. Sanity keeps the original and serves crops from its CDN, so the
 * hotspot chosen here is what keeps a head or a hemline in frame at every size.
 */
export const photo = defineType({
  name: 'photo',
  title: 'Photograph',
  type: 'image',
  options: { hotspot: true },
  fields: [
    defineField({
      name: 'alt',
      title: 'وصف الصورة · Description',
      type: 'localeString',
      description: 'اختياري — يقرأه محرك البحث وقارئ الشاشة. صِفي الفستان لا الملف.',
      options: { collapsible: true, collapsed: true },
    }),
    defineField({
      name: 'ratio',
      title: 'شكل القصّ · Crop',
      type: 'string',
      initialValue: '2/3',
      options: {
        list: [
          { title: 'طولية 2:3 — الأقل قصّاً', value: '2/3' },
          { title: 'طولية 3:4', value: '3/4' },
          { title: 'طولية 4:5', value: '4/5' },
          { title: 'مربّعة 1:1', value: '1/1' },
          { title: 'عرضية 3:2', value: '3/2' },
          { title: 'عريضة 16:9', value: '16/9' },
        ],
      },
    }),
  ],
});
