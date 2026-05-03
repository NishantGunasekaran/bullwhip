/**
 * One-off generator: INSTRUCTOR_QUICK_START.docx from fixed content.
 * Run: node scripts/generate-instructor-docx.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function p(text, opts = {}) {
  return new Paragraph({ children: [new TextRun({ text, ...opts })] });
}

function boldLead(lead, rest) {
  return new Paragraph({
    children: [
      new TextRun({ text: lead, bold: true }),
      new TextRun({ text: rest }),
    ],
  });
}

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          heading: HeadingLevel.TITLE,
          children: [new TextRun('Instructor quick start — Bullwhip (Beer Game)')],
        }),
        new Paragraph({ text: '' }),

        boldLead(
          'What it is. ',
          'A browser-based four-role supply chain simulation (retailer → wholesaler → distributor → factory). Students place weekly orders under delays and costs; you debrief on inventory, backlog, orders, and total system cost (bullwhip effect).'
        ),

        boldLead(
          'Before you run a class. ',
          'Open the app URL. On the welcome screen, set Demand & AI (used for solo practice and for tournaments you create). Students who join someone else’s session use your session/tournament settings, not their own.'
        ),

        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun('Option A — One cohort, four humans (single session)')],
        }),
        p('1. Create session → enter your name → Create session.'),
        p('2. Share the 6-digit code with exactly four players (e.g. slide, LMS, chat).'),
        p('3. Each player: Join session → name + code → they get a role at random (not shown to others during play).'),
        p('4. You stay as instructor (no role): you see progress and start when ready; you may submit for AI/ghost roles if your setup uses ghosts.'),
        p('5. Each week: every player enters an order and submits; the chain advances when orders are in. 20 weeks complete one run.'),
        p('6. Debrief: use totals, charts, and export if available. Roles can be revealed after discussion.'),
        new Paragraph({
          children: [new TextRun({ text: 'Tip: ', italics: true }), new TextRun('Run through Solo play once yourself so you know the flow.')],
        }),

        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun('Option B — Multiple teams (tournament)')],
        }),
        p('1. Create tournament → choose number of teams (each team = up to 4 players). Demand/AI are the same for every team (from Demand & AI above).'),
        p('2. Share the tournament code. Players: Join tournament → name + code → auto-assigned team and role.'),
        p('3. Optional: as creator, you can set team names before start (saved per team).'),
        p('4. Start tournament when ready. Empty seats become AI players for that team.'),
        p('5. After play: tournament results compare teams (same demand curve); use analytics / CSV per team if offered.'),

        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun('During play (what to say)')],
        }),
        p('• Each week: receive → see demand or incoming orders → ship what you can → place order upstream.'),
        p('• Lead times: 2 weeks for shipments and for orders (as shown in-app).'),
        p('• Goal: lower total system cost over 20 weeks (holding + backlog), not “winning” one role.'),

        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun('If something goes wrong')],
        }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Issue', bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'What to try', bold: true })] })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [p('White screen / “missing tournament”')] }),
                new TableCell({
                  children: [
                    p('Refresh; confirm Supabase is configured and migrations applied for your project.'),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [p('Team name won’t save')] }),
                new TableCell({
                  children: [
                    p('Database needs sessions.team_label column (migration); check RLS allows updates.'),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [p('Stuck between weeks')] }),
                new TableCell({
                  children: [p('Ensure all four roles (or ghosts) have submitted for that week.')],
                }),
              ],
            }),
          ],
        }),

        new Paragraph({ text: '' }),
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun('Support line for your syllabus')],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '“Use Chrome or Edge; one device per player. Have the 6-digit code ready before class. Instructor creates the session or tournament; do not use ‘Create’ if you are only joining.”',
              italics: true,
            }),
          ],
        }),

        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Document version: matches in-app flows (Create session, Join session, Create / Join tournament). Point students to the same URL you use.',
              italics: true,
              size: 20,
            }),
          ],
        }),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
const out = path.join(root, 'INSTRUCTOR_QUICK_START.docx');
fs.writeFileSync(out, buffer);
console.log('Wrote', out);
