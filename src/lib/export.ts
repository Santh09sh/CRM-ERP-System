export function exportToCsv(filename: string, columns: string[], rows: any[][]) {
  const separator = ",";
  const csvContent =
    columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(separator) +
    "\n" +
    rows
      .map((row) => {
        return row
          .map((cell) => {
            let str = cell === null || cell === undefined ? "" : String(cell);
            str = str.replace(/"/g, '""');
            if (str.search(/("|,|\n)/g) >= 0) {
              str = `"${str}"`;
            }
            return str;
          })
          .join(separator);
      })
      .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export async function exportToPdf(filename: string, title: string, columns: string[], rows: any[][]) {
  // Dynamically import to avoid SSR issues
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on ${new Date().toLocaleString("en-IN")}`, 14, 22);

  // Table
  autoTable(doc, {
    startY: 30,
    head: [columns],
    body: rows,
    theme: "grid",
    headStyles: { fillColor: [34, 34, 34] }, // dark gray header
    styles: { fontSize: 9 },
  });

  doc.save(filename);
}

// For complex reports with multiple sections
export async function exportDashboardReport(
  filename: string, 
  title: string, 
  sections: { title: string; columns: string[]; rows: any[][] }[]
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on ${new Date().toLocaleString("en-IN")}`, 14, 22);

  let currentY = 35;

  sections.forEach((section) => {
    // Check if we need a new page for the section title
    if (currentY > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      currentY = 20;
    }

    // Section Title
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(section.title, 14, currentY);
    currentY += 6;

    // Section Table
    autoTable(doc, {
      startY: currentY,
      head: [section.columns],
      body: section.rows,
      theme: "grid",
      headStyles: { fillColor: [34, 34, 34] },
      styles: { fontSize: 9 },
      margin: { bottom: 20 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;
  });

  doc.save(filename);
}
