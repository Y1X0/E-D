import { defineField, defineType } from 'sanity';

/**
 * The atelier publishes in three languages, so any field a visitor reads is an
 * object with one value per language rather than a bare string. English is
 * required; the other two fall back to it when left empty.
 */
export const LANGS = [
  { id: 'en', title: 'English' },
  { id: 'he', title: 'עברית' },
  { id: 'ar', title: 'العربية' },
] as const;

const localeFields = (rows?: number) =>
  LANGS.map((lang, i) =>
    defineField({
      name: lang.id,
      title: lang.title,
      type: rows ? 'text' : 'string',
      ...(rows ? { rows } : {}),
      ...(i === 0 ? { validation: (r: any) => r.required() } : {}),
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
      title: 'Description (for screen readers and search)',
      type: 'localeString',
      description: 'Describe the garment, not the file — "Bias-cut evening gown, full length".',
    }),
    defineField({
      name: 'ratio',
      title: 'Crop',
      type: 'string',
      initialValue: '2/3',
      options: {
        list: [
          { title: 'Tall — 2:3 (portrait, least cropping)', value: '2/3' },
          { title: 'Portrait — 3:4', value: '3/4' },
          { title: 'Portrait — 4:5', value: '4/5' },
          { title: 'Square — 1:1', value: '1/1' },
          { title: 'Landscape — 3:2', value: '3/2' },
          { title: 'Wide — 16:9', value: '16/9' },
        ],
      },
    }),
  ],
});
