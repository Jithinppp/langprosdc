import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const INK = [17, 17, 17]
const GRAY = [120, 120, 120]
const LINE = [220, 220, 220]
const RED = [185, 28, 28]

function fmt(n, digits = 1) {
  const v = Number(n)
  return Number.isFinite(v) ? v.toFixed(digits) : '0.0'
}

function ensureSpace(doc, y, needed, marginTop) {
  const pageH = doc.internal.pageSize.getHeight()
  if (y + needed > pageH - 16) {
    doc.addPage()
    return marginTop
  }
  return y
}

// Minimal flow: [TX] → [R1] → [R2] → ...
function drawFlow(doc, startY, radiators, margin, width) {
  const perRow = radiators.length > 12 ? 6 : radiators.length > 6 ? 5 : 4
  const gapX = 8
  const boxW = (width - gapX * (perRow - 1)) / perRow
  const boxH = 20
  const rowGap = 10
  let y = startY

  const rows = []
  for (let i = 0; i < radiators.length; i += perRow) rows.push(radiators.slice(i, i + perRow))

  // TX node width is smaller; prepend TX to first row only
  rows.forEach((row, rowIdx) => {
    y = ensureSpace(doc, y, boxH + rowGap, margin.top)
    const isFirstRow = rowIdx === 0
    const items = isFirstRow ? [{ isTx: true }, ...row] : row
    // recompute widths when TX present (TX box narrower)
    const txW = 16
    let rowBoxW = boxW
    let rowGapX = gapX
    if (isFirstRow) {
      rowBoxW = (width - txW - gapX * row.length) / Math.max(row.length, 1)
    }

    let x = margin.left
    items.forEach((item, idx) => {
      const w = isFirstRow && idx === 0 ? txW : rowBoxW
      const over = !item.isTx && item.isOverMax

      if (item.isTx) {
        doc.setDrawColor(...LINE)
        doc.setFillColor(255, 255, 255)
        doc.setLineWidth(0.4)
        doc.roundedRect(x, y, w, boxH, 1.5, 1.5, 'FD')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(...INK)
        doc.text('TX', x + w / 2, y + 12, { align: 'center' })
      } else {
        doc.setDrawColor(...(over ? RED : LINE))
        doc.setFillColor(255, 255, 255)
        doc.setLineWidth(over ? 0.6 : 0.4)
        doc.roundedRect(x, y, w, boxH, 1.5, 1.5, 'FD')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(...(over ? RED : INK))
        doc.text(`R${item.radNr}`, x + w / 2, y + 7, { align: 'center' })

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(...GRAY)
        doc.text(`${fmt(item.cableLength)} m · ${fmt(item.delayNs)} ns`, x + w / 2, y + 11.5, { align: 'center' })

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(...(over ? RED : INK))
        doc.text(`SW ${item.switchHex}`, x + w / 2, y + 16.5, { align: 'center' })
      }

      // connector
      const isLast = idx === items.length - 1
      if (!isLast) {
        const x1 = x + w
        const nextW = isFirstRow && idx === 0 ? rowBoxW : w
        void nextW
        const x2 = x + w + rowGapX
        const midY = y + boxH / 2
        doc.setDrawColor(...LINE)
        doc.setLineWidth(0.4)
        doc.line(x1, midY, x2, midY)
        doc.setFillColor(...GRAY)
        doc.triangle(x2 - 1.6, midY - 1.2, x2 - 1.6, midY + 1.2, x2, midY, 'F')
      }
      x += w + rowGapX
    })

    y += boxH + rowGap
  })

  return y
}

export function generateDelayPdf({ results, cableDelay, constants, title }) {
  const active = results.filter(r => r.radiators.length > 0)
  const docTitle = (title || '').trim() || 'Delay Switch Report'
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  doc.setProperties({ title: docTitle })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = { left: 16, right: 16, top: 16 }
  const width = pageW - margin.left - margin.right

  const cableDelayNum = parseFloat(cableDelay) || 0
  const systemMaxLen = active.reduce((m, r) => Math.max(m, ...r.radiators.map(x => x.cableLength || 0)), 0)
  const systemMaxDelay = systemMaxLen * cableDelayNum

  // ---- Minimal header ----
  let y = margin.top
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...INK)
  doc.text(docTitle, margin.left, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text(new Date().toLocaleDateString(), pageW - margin.right, y, { align: 'right' })
  y += 5
  doc.setFontSize(8.5)
  doc.text(`Cable ${fmt(cableDelayNum, 2)} ns/m  ·  Max ${fmt(systemMaxLen)} m (${fmt(systemMaxDelay)} ns)`, margin.left, y)
  y += 3
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.4)
  doc.line(margin.left, y, margin.left + width, y)
  y += 8

  // ---- Outputs ----
  active.forEach((out, idx) => {
    y = ensureSpace(doc, y, 36, margin.top)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...INK)
    doc.text(`Output ${out.outputNr}`, margin.left, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text(`${fmt(out.totalLength)} m · ${fmt(out.maxDelay)} ns`, pageW - margin.right, y, { align: 'right' })
    y += 5

    y = drawFlow(doc, y, out.radiators, margin, width)

    // compact table: radiator / delay / switch only
    y = ensureSpace(doc, y, 20, margin.top)
    autoTable(doc, {
      startY: y,
      margin: { left: margin.left, right: margin.right },
      head: [['Radiator', 'Delay', 'Switch']],
      body: out.radiators.map(rad => [
        `RAD-${String(rad.radNr).padStart(2, '0')}  ·  ${fmt(rad.cableLength)} m`,
        `${fmt(rad.delayNs)} ns`,
        `${rad.switchHex}`,
      ]),
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.8, textColor: INK, lineColor: LINE, lineWidth: 0 },
      headStyles: { fontSize: 7, textColor: GRAY, fontStyle: 'normal' },
      bodyStyles: { lineWidth: 0 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'right' },
        2: { halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const rad = out.radiators[data.row.index]
          if (rad?.isOverMax) data.cell.styles.textColor = RED
        }
      },
      didDrawPage: () => {},
    })
    y = doc.lastAutoTable.finalY + 2

    if (out.maxDelay > constants.THEORETICAL_MAX_DELAY) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...RED)
      doc.text('Exceeds maximum — shorten cable.', margin.left, y + 4)
      y += 8
    }

    if (idx < active.length - 1) {
      y += 4
      doc.setDrawColor(...LINE)
      doc.line(margin.left, y, margin.left + width, y)
      y += 8
    }
  })

  // ---- one-line footer ----
  y = ensureSpace(doc, y, 10, margin.top)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('SW = ROUND((system max − local) / 33).  Set each radiator switch to its SW value.', margin.left, y)

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.text(`${i} / ${pages}`, pageW - margin.right, doc.internal.pageSize.getHeight() - 10, { align: 'right' })
  }

  const stamp = new Date().toISOString().slice(0, 10)
  const slug = docTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'delay-switch-report'
  doc.save(`${slug}-${stamp}.pdf`)
}
