import { defineArrayMember, defineField, defineType } from 'sanity';

/** The three lines the atelier works in. Ordered as they appear on the site. */
export const collection = defineType({
  name: 'collection',
  title: 'Collection',
  type: 'document',
  fields: [
    defineField({
      name: 'slug', title: 'Web address', type: 'slug',
      options: { source: 'name.en', maxLength: 40 },
      validation: (r) => r.required(),
      description: 'Changing this changes the page URL. Leave it alone unless you mean to.',
    }),
    defineField({ name: 'order', title: 'Position', type: 'number', initialValue: 1, validation: (r) => r.required() }),
    defineField({ name: 'name', title: 'Name', type: 'localeString', validation: (r) => r.required() }),
    defineField({ name: 'kicker', title: 'Line under the name', type: 'localeString' }),
    defineField({ name: 'summary', title: 'Short summary', type: 'localeText' }),
    defineField({
      name: 'intro', title: 'Introduction', type: 'array',
      of: [defineArrayMember({ type: 'localeText' })],
      description: 'One or two paragraphs, shown at the top of the collection page.',
    }),
    defineField({ name: 'cover', title: 'Cover photograph', type: 'photo' }),
    defineField({
      name: 'plates', title: 'More photographs', type: 'array',
      of: [defineArrayMember({ type: 'photo' })],
      options: { layout: 'grid' },
    }),
  ],
  orderings: [{ title: 'Position', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'name.en', subtitle: 'kicker.en', media: 'cover' } },
});

/** An individual piece. Numbered rather than named, as the atelier shows them. */
export const look = defineType({
  name: 'look',
  title: 'Look',
  type: 'document',
  fields: [
    defineField({
      name: 'collection', title: 'Collection', type: 'reference',
      to: [{ type: 'collection' }], validation: (r) => r.required(),
    }),
    defineField({
      name: 'number', title: 'Number', type: 'number',
      validation: (r) => r.required().min(1),
      description: 'Shown as "Look 01". Each collection numbers its own looks.',
    }),
    defineField({ name: 'note', title: 'One-line note', type: 'localeText' }),
    defineField({
      name: 'photos', title: 'Photographs', type: 'array',
      of: [defineArrayMember({ type: 'photo' })],
      options: { layout: 'grid' },
      description: 'The first photograph is the one shown on cards and in the gallery.',
    }),
  ],
  orderings: [{ title: 'Number', name: 'number', by: [{ field: 'number', direction: 'asc' }] }],
  preview: {
    select: { n: 'number', c: 'collection.name.en', media: 'photos.0' },
    prepare: ({ n, c, media }) => ({ title: `Look ${String(n ?? 0).padStart(2, '0')}`, subtitle: c, media }),
  },
});

/** One-of-a-kind settings. */
export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Atelier settings',
  type: 'document',
  groups: [
    { name: 'brand', title: 'Brand', default: true },
    { name: 'contact', title: 'Contact' },
    { name: 'home', title: 'Home page' },
  ],
  fields: [
    defineField({ name: 'tagline', title: 'Tagline', type: 'localeString', group: 'brand' }),
    defineField({ name: 'booking', title: 'Booking button', type: 'localeString', group: 'brand' }),
    defineField({
      name: 'hero', title: 'Home page photograph', type: 'photo', group: 'home',
      description: 'A wide, high-resolution frame. Leave empty for the dark typographic opening.',
    }),
    defineField({ name: 'instagramHandle', title: 'Instagram handle', type: 'string', group: 'contact' }),
    defineField({
      name: 'phone', title: 'Telephone', type: 'string', group: 'contact',
      description: 'As it should read, e.g. +972 53-468-0084. Clear it to hide the row.',
    }),
    defineField({
      name: 'whatsapp', title: 'WhatsApp number', type: 'string', group: 'contact',
      description: 'Digits only, with the country code: 972534680084. Clear it to hide the row.',
    }),
    defineField({ name: 'email', title: 'Email', type: 'string', group: 'contact' }),
    defineField({
      name: 'formEndpoint', title: 'Enquiry form endpoint', type: 'url', group: 'contact',
      description: 'Optional. Without it the form hands enquiries to Instagram.',
    }),
    defineField({ name: 'street', title: 'Street', type: 'string', group: 'contact' }),
    defineField({ name: 'city', title: 'City', type: 'string', group: 'contact' }),
    defineField({ name: 'streetLocal', title: 'Street (Hebrew)', type: 'string', group: 'contact' }),
    defineField({ name: 'cityLocal', title: 'City (Hebrew)', type: 'string', group: 'contact' }),
  ],
  preview: { prepare: () => ({ title: 'Atelier settings' }) },
});
