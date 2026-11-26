import { NOTE_FONT, NOTE_PAPER, notePreviewCents, reserveNoteDesign, type NoteRail } from '../../receiz/note-design';

/** A denomination preview only. It contains no issued source, serial or claim authority. */
export function OfflineNotePreview({ amount, rail = 'reserve' }: { amount: string; rail?: NoteRail }) {
  const cents = notePreviewCents(amount), design = reserveNoteDesign(cents ?? '10000', '00000000-0000-4000-8000-000000000000', rail);
  const value = cents ? design.denomination.display : 'Your amount';
  return <figure className="offline-note-preview" aria-label={`Unissued ${design.title.toLowerCase()} preview, ${value}`}>
    <svg viewBox="0 0 810 486" role="img" aria-label={`${design.title} · ${design.subtitle} · ${value} · NOT ISSUED`}>
      <image href={NOTE_PAPER} width="810" height="486" />
      {design.images.filter(image => cents || image.asset.includes('masthead')).map((image, i) => <svg key={i} x={image.x} y={image.y} width={image.width} height={image.height} viewBox={image.crop.join(' ')} preserveAspectRatio="none" overflow="hidden"><image href={image.asset} width={image.asset.includes('masthead') ? 2164 : 1536} height={image.asset.includes('masthead') ? 727 : 1024} /></svg>)}
      <g fill="#152e43" fontFamily={NOTE_FONT} fontWeight="700" style={{ fontKerning: 'none' }}>
        {!cents && <text x="258" y="240" textAnchor="middle" fontSize="27">YOUR AMOUNT</text>}
        {design.texts.filter(text => text.value !== design.serial && (cents || (!text.corner && text.value !== design.denomination.words))).map((text, i) => <text key={i} x={text.x} y={text.y} fontSize={text.size} letterSpacing={text.tracking} textLength={text.width} lengthAdjust="spacingAndGlyphs" stroke={text.corner ? '#f4eedb' : undefined} strokeWidth={text.corner ? 3.4 : undefined} strokeLinejoin="round" paintOrder="stroke fill">{text.value}</text>)}
      </g>
    </svg><figcaption>Note preview · {value} · PREVIEW — NOT ISSUED. Value is committed only when issuance completes.</figcaption>
  </figure>;
}
