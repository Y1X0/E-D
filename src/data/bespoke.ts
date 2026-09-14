/**
 * The made-to-order process.
 *
 * Written as the stages of a bespoke commission, without timings, prices or
 * counts — none has been published, and none is invented here. Adjust the
 * wording to the atelier's actual working method (see CONTENT.md).
 */
export const steps = [
  {
    n: '01',
    title: 'Consultation',
    body: 'We begin with a conversation: the occasion, the room, how you want to feel in the dress and what you never want to wear again. References are welcome; so is a blank page.',
  },
  {
    n: '02',
    title: 'Concept',
    body: 'The idea is drawn. Silhouette, neckline and proportion are settled on paper, and fabrics are chosen in the hand rather than from a screen.',
  },
  {
    n: '03',
    title: 'Pattern',
    body: 'A pattern is cut for your measurements alone and made up in calico first, so the shape can be judged and corrected before a single length of the real cloth is touched.',
  },
  {
    n: '04',
    title: 'Fitting',
    body: 'The dress is fitted on the body and adjusted until the line is right standing still, seated, and moving. Nothing is signed off from a photograph.',
  },
  {
    n: '05',
    title: 'Finishing',
    body: 'Hems, closures and inner structure are completed by hand, the dress is pressed and packed, and it leaves the atelier ready for its day.',
  },
] as const;
