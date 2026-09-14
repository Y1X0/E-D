import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './src/sanity/schema';

/**
 * The atelier's own workspace, served at /admin on the site itself.
 *
 * Structure is arranged the way the work is: the three collections, the looks
 * inside them, and one settings document — rather than a flat list of types.
 */
export default defineConfig({
  name: 'elite-evening-design',
  title: 'Elite Evening Design',
  projectId: process.env.SANITY_PROJECT_ID ?? '',
  dataset: process.env.SANITY_DATASET ?? 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Atelier')
          .items([
            S.listItem()
              .title('Collections')
              .child(S.documentTypeList('collection').title('Collections')),
            S.listItem()
              .title('Looks')
              .child(S.documentTypeList('look').title('Looks')),
            S.divider(),
            S.listItem()
              .title('Settings')
              .child(
                S.document().schemaType('siteSettings').documentId('siteSettings').title('Atelier settings'),
              ),
          ]),
    }),
  ],
  schema: { types: schemaTypes },
});
